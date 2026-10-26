import { after } from "next/server";
import { refundOpen, type A2UTransfer, type Order, type PiUser } from "../types";
import { appWallet, findA2UTransaction, submitA2UTransaction, TX_TIMEOUT_S } from "./a2u";
import { getListing, getOrder, listAllOrders, saveListing, saveOrder, withLock } from "./db";
import { HttpError } from "./http";
import { adjustStock, listingLock, orderLock } from "./orders";
import { completePayment, createA2UPayment, getPayment, listIncompleteServerPayments, PiApiError, PiConfigError, piMock } from "./pi";

/**
 * P3 정산·환불: 구매자 결제금은 앱 지갑에 보관(에스크로)되고,
 *  - 구매 확정 → 판매자에게 A2U 정산 (수수료 PLATFORM_FEE_PERCENT 차감)
 *  - 구매 확정 전 환불 → 구매자에게 A2U로 전액 반환
 * 한 주문은 정산과 환불 중 하나만 일어난다(주문 락 + 상태 검사).
 */
const A2U_LOCK_MS = 90_000;
const round7 = (n: number) => Math.round(n * 1e7) / 1e7;

export function feePercent() {
  const v = Number(process.env.PLATFORM_FEE_PERCENT ?? 0);
  return Number.isFinite(v) ? Math.min(Math.max(v, 0), 30) : 0;
}

/** 배송 완료 후 자동 구매 확정까지 기간(일). 기본 7일 */
export function autoConfirmDays() {
  const v = Number(process.env.AUTO_CONFIRM_DAYS ?? 7);
  return Number.isFinite(v) && v > 0 ? Math.min(v, 30) : 7;
}
export const autoConfirmAtFrom = (iso: string) => new Date(new Date(iso).getTime() + autoConfirmDays() * 86_400_000).toISOString();

/** 배송 완료 + 기한 경과 + 진행 중인 반품·교환·환불 요청 없음 */
export const isAutoConfirmDue = (o: Order, now = Date.now()) =>
  o.status === "shipped" && !!o.fulfillment?.deliveredAt && !!o.autoConfirmAt && !refundOpen(o) && new Date(o.autoConfirmAt).getTime() <= now;

/** 구매 확정: 에스크로 해제 → 정산 대기. 반드시 주문 락 안에서 호출하고, 이어서 payoutOrder를 실행한다. */
export async function confirmOrder(o: Order, by: "buyer" | "auto") {
  o.status = "completed";
  o.payout = "pending";
  o.confirmedAt = new Date().toISOString();
  o.confirmedBy = by;
  await withLock(listingLock(o.listingId), async () => {
    const listing = await getListing(o.listingId);
    if (!listing) return;
    if (listing.condition === "new") listing.soldCount = (listing.soldCount ?? 0) + 1;
    else listing.status = "sold";
    await saveListing(listing);
  });
}

/** 기한이 지난 주문을 자동 구매 확정한다. 확정된 주문 ID를 돌려준다. */
export async function autoConfirmDue(candidates: Order[]) {
  const ids: string[] = [];
  for (const c of candidates.filter((o) => isAutoConfirmDue(o))) {
    const done = await withLock(orderLock(c.id), async () => {
      const o = await getOrder(c.id);
      if (!o || !isAutoConfirmDue(o)) return false;
      await confirmOrder(o, "auto");
      await saveOrder(o);
      return true;
    });
    if (done) ids.push(c.id);
  }
  return ids;
}

/** 주문을 보여 주기 전에 자동 구매 확정을 반영하고, 판매자 정산(A2U)은 응답 후 이어서 보낸다. */
export async function withAutoConfirm(orders: Order[]) {
  const ids = await autoConfirmDue(orders);
  if (!ids.length) return orders;
  after(async () => {
    for (const id of ids) await payoutOrder(id).catch(() => undefined);
  });
  return Promise.all(orders.map(async (o) => (ids.includes(o.id) ? ((await getOrder(o.id)) ?? o) : o)));
}

/** 예약 실행(cron): 자동 구매 확정 + 멈춘 정산(대기 10분 이상, 실패 3회 미만) 재시도 */
export async function runEscrowJob() {
  const orders = await listAllOrders();
  const confirmed = await autoConfirmDue(orders);
  const stale = Date.now() - 10 * 60_000;
  const retry = orders
    .filter((o) => o.status === "completed" && !confirmed.includes(o.id))
    .filter((o) => (o.payout === "pending" && new Date(o.confirmedAt ?? o.updatedAt).getTime() < stale) || (o.payout === "failed" && (o.payoutTransfer?.attempts ?? 0) < 3))
    .map((o) => o.id);
  const results: { id: string; payout: string }[] = [];
  for (const id of [...confirmed, ...retry]) {
    const o = await payoutOrder(id).catch(() => undefined);
    results.push({ id, payout: o?.payout ?? "error" });
  }
  return { confirmed, retried: retry, results };
}

export function payoutBreakdown(amount: number) {
  const fee = round7((amount * feePercent()) / 100);
  return { fee, net: round7(amount - fee) };
}

function errorText(e: unknown) {
  if (e instanceof PiConfigError || e instanceof HttpError) return e.message;
  if (e instanceof PiApiError) return `Pi 서버 오류(${e.status}) ${JSON.stringify(e.body ?? "").slice(0, 160)}`;
  return e instanceof Error ? e.message.slice(0, 200) : "알 수 없는 오류";
}

type Kind = "payout" | "refund";
const mockFailed = ((globalThis as { __baroondaMockA2U?: Set<string> }).__baroondaMockA2U ??= new Set());

/** Pi A2U 3단계(create → submit → complete). 단계마다 저장해서 재시도 시 이어서 처리하고 이중 송금을 막는다. */
async function sendA2U(t: A2UTransfer, to: PiUser, kind: Kind, orderId: string, save: () => Promise<void>) {
  if (piMock) {
    // 로컬 테스트: 'flaky'로 시작하는 수신자는 첫 시도만 실패시켜 재시도 흐름을 검증한다.
    if (to.username.startsWith("flaky") && !mockFailed.has(`${kind}:${orderId}`)) {
      mockFailed.add(`${kind}:${orderId}`);
      throw new Error("모의 A2U 전송 실패");
    }
    t.paymentId ??= `mock_a2u_${kind}_${orderId}`;
    t.txid = `mock_tx_${kind}_${orderId}`;
    return;
  }
  appWallet();
  const metadata = { kind, orderId };
  let payment = t.paymentId ? await getPayment(t.paymentId) : undefined;
  if (payment && (payment.status.cancelled || payment.status.user_cancelled)) {
    payment = undefined;
    t.paymentId = t.submittedAt = undefined;
  }
  if (!payment) {
    const memo = kind === "payout" ? "바로온다 판매대금 정산" : "바로온다 환불";
    payment = await createA2UPayment({ amount: t.amount, memo, metadata, uid: to.uid }).catch(async (e) => {
      const found = (await listIncompleteServerPayments()).find((p) => p.metadata?.orderId === orderId && p.metadata?.kind === kind);
      if (!found) throw e;
      return found;
    });
    t.paymentId = payment.identifier;
    await save();
  }
  if (payment.direction !== "app_to_user" || payment.user_uid !== to.uid || Math.abs(payment.amount - t.amount) > 1e-7) {
    throw new PiApiError(400, "A2U 결제 정보가 주문과 일치하지 않아요.");
  }
  if (payment.status.developer_completed) {
    t.txid = payment.transaction?.txid ?? t.txid;
    return;
  }
  let txid = payment.transaction?.txid ?? t.txid;
  if (!txid && t.submittedAt) {
    txid = await findA2UTransaction(payment);
    if (!txid && Date.now() - new Date(t.submittedAt).getTime() < (TX_TIMEOUT_S + 30) * 1000) {
      throw new Error("이전 송금의 블록체인 반영을 확인 중이에요. 3분 뒤 다시 시도해 주세요.");
    }
  }
  if (!txid) {
    t.submittedAt = new Date().toISOString();
    await save();
    txid = await submitA2UTransaction(payment);
  }
  t.txid = txid;
  await save();
  await completePayment(payment.identifier, txid);
}

async function runTransfer(o: Order, t: A2UTransfer, kind: Kind) {
  const now = () => new Date().toISOString();
  t.attempts += 1;
  t.error = undefined;
  t.updatedAt = now();
  await saveOrder(o);
  try {
    await sendA2U(t, kind === "payout" ? o.seller : o.buyer, kind, o.id, () => saveOrder(o));
    t.completedAt = now();
    return true;
  } catch (e) {
    t.error = errorText(e);
    return false;
  } finally {
    t.updatedAt = now();
  }
}

/** 구매 확정된 주문의 판매대금을 판매자에게 보낸다. 실패하면 payout=failed로 남기고 재시도할 수 있다. */
export function payoutOrder(orderId: string) {
  return withLock(
    orderLock(orderId),
    async () => {
      const o = await getOrder(orderId);
      if (!o) throw new HttpError(404, "주문을 찾을 수 없어요.");
      if (o.status !== "completed") throw new HttpError(409, "구매 확정된 주문만 정산할 수 있어요.");
      if (o.payout === "paid") return o;
      if (!o.payoutTransfer) {
        const { fee, net } = payoutBreakdown(o.amount);
        o.platformFee = fee;
        o.payoutTransfer = { amount: net, attempts: 0, updatedAt: new Date().toISOString() };
      }
      o.payout = "processing";
      const ok = await runTransfer(o, o.payoutTransfer, "payout");
      o.payout = ok ? "paid" : "failed";
      await saveOrder(o);
      return o;
    },
    A2U_LOCK_MS,
  );
}

/** 환불 송금(구매자에게 전액). 성공하면 주문은 refunded, 재고·예약은 되돌린다. */
export function refundOrder(orderId: string) {
  return withLock(
    orderLock(orderId),
    async () => {
      const o = await getOrder(orderId);
      if (!o) throw new HttpError(404, "주문을 찾을 수 없어요.");
      if (o.status === "refunded") return o;
      if ((o.status !== "paid" && o.status !== "shipped") || !o.refund || !["processing", "failed"].includes(o.refund.status)) {
        throw new HttpError(409, "환불할 수 없는 상태예요.");
      }
      const r = o.refund;
      r.transfer ??= { amount: o.amount, attempts: 0, updatedAt: new Date().toISOString() };
      r.status = "processing";
      const ok = await runTransfer(o, r.transfer, "refund");
      r.status = ok ? "refunded" : "failed";
      if (ok) {
        o.status = "refunded";
        await restock(o);
      }
      await saveOrder(o);
      return o;
    },
    A2U_LOCK_MS,
  );
}

async function restock(o: Order) {
  await withLock(listingLock(o.listingId), async () => {
    const listing = await getListing(o.listingId);
    if (!listing) return;
    if (listing.condition === "new") adjustStock(listing, o.variantId, +1, 0);
    else if (listing.reservedOrderId === o.id) {
      listing.status = "selling";
      listing.reservedOrderId = undefined;
    } else return;
    await saveListing(listing);
  });
}
