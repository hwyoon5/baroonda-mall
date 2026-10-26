import { getOrder, saveOrder, withLock } from "@/lib/server/db";
import { orderLock } from "@/lib/server/orders";
import { piMock } from "@/lib/server/pi";
import { autoConfirmAtFrom, confirmOrder, payoutOrder, refundOrder, withAutoConfirm } from "@/lib/server/settlement";
import { carriers, isTrackingNumber, refundOpen, type Order, type PiUser } from "@/lib/types";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { isAdmin } from "@/lib/server/admin";

/** A2U(블록체인 전송)를 기다릴 수 있도록 */
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
type Body = { action?: string; method?: string; carrier?: string; trackingNumber?: string; reason?: string; stage?: string; kind?: string; testDeliveredAt?: string };

async function load(req: Request, { params }: Ctx) {
  const user = requireUser(req);
  const order = await getOrder((await params).id);
  // 관리자는 모든 주문을 조회하고 배송 상태를 관리할 수 있다(환불·구매 확정·정산은 당사자만).
  if (!order || (order.buyer.uid !== user.uid && order.seller.uid !== user.uid && !isAdmin(user))) {
    throw new HttpError(404, "주문을 찾을 수 없어요.");
  }
  const [current] = await withAutoConfirm([order]);
  return { user, order: current };
}

export const GET = handle<Ctx>(async (req, ctx) => json({ order: (await load(req, ctx)).order }));

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Shopify fulfillment: 택배는 택배사 + 송장번호 필수, 직거래는 전달 완료만 기록 */
function shipment(b: Body) {
  const method = b.method === "direct" ? "direct" : "delivery";
  if (method === "direct") return { method } as const;
  const carrier = typeof b.carrier === "string" ? b.carrier : "";
  const trackingNumber = typeof b.trackingNumber === "string" ? b.trackingNumber.replace(/\s/g, "") : "";
  if (!(carriers as readonly string[]).includes(carrier)) throw new HttpError(400, "택배사를 선택해 주세요.");
  if (!isTrackingNumber(trackingNumber)) throw new HttpError(400, "송장번호는 숫자와 - 로 8~20자 입력해 주세요.");
  return { method, carrier, trackingNumber } as const;
}

/** 상태 전이만 주문 락 안에서 처리하고, 이어서 필요한 A2U 송금 종류를 돌려준다. */
async function transition(order: Order, user: PiUser, b: Body): Promise<"payout" | "refund" | null> {
  const isSeller = order.seller.uid === user.uid;
  const isBuyer = order.buyer.uid === user.uid;
  const now = new Date().toISOString();
  const open = order.status === "paid" || order.status === "shipped";

  switch (b.action) {
    case "ship": {
      if (!isSeller) throw new HttpError(403, "판매자만 발송 처리할 수 있어요.");
      if (order.status !== "paid") throw new HttpError(409, "결제 완료된 주문만 발송 처리할 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "환불 요청을 먼저 처리해 주세요.");
      order.fulfillment = { ...shipment(b), shippedAt: now };
      order.status = "shipped";
      return null;
    }
    case "delivery": {
      // 상품 준비중 → 배송중(택배사·송장 등록) → 배송 완료. 송장 수정·단계 되돌리기도 허용한다.
      if (!isSeller && !isAdmin(user)) throw new HttpError(403, "판매자 또는 관리자만 배송 상태를 바꿀 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "환불 요청을 먼저 처리해 주세요.");
      if (b.stage === "preparing") {
        if (order.status !== "paid") throw new HttpError(409, "발송 전 주문만 상품 준비중으로 바꿀 수 있어요.");
        order.preparingAt ??= now;
        return null;
      }
      if (b.stage !== "shipping" && b.stage !== "delivered") throw new HttpError(400, "배송 상태를 선택해 주세요.");
      if (order.status === "paid") {
        order.fulfillment = { ...shipment(b), shippedAt: now };
        order.status = "shipped";
      } else if (order.status === "shipped" && order.fulfillment) {
        if (order.fulfillment.method === "delivery" && (b.carrier !== undefined || b.trackingNumber !== undefined)) {
          order.fulfillment = { ...order.fulfillment, ...shipment({ ...b, method: "delivery" }) };
        }
      } else {
        throw new HttpError(409, "결제 완료 또는 배송중인 주문만 배송 상태를 바꿀 수 있어요.");
      }
      if (b.stage === "delivered") {
        // 로컬 모의 결제에서만: 자동 구매 확정 테스트용으로 과거 배송 완료 시각을 받는다.
        const at = piMock && b.testDeliveredAt && !Number.isNaN(Date.parse(b.testDeliveredAt)) ? new Date(b.testDeliveredAt).toISOString() : now;
        order.fulfillment.deliveredAt ??= at;
        order.autoConfirmAt ??= autoConfirmAtFrom(order.fulfillment.deliveredAt);
      } else {
        delete order.fulfillment.deliveredAt;
        delete order.autoConfirmAt;
      }
      return null;
    }
    case "confirm": {
      if (!isBuyer) throw new HttpError(403, "구매자만 구매 확정할 수 있어요.");
      // 에스크로: 상품이 발송되기 전에는 판매대금을 풀지 않는다.
      if (order.status !== "shipped") throw new HttpError(409, order.status === "paid" ? "상품이 발송된 뒤에 구매 확정할 수 있어요." : "구매 확정할 수 없는 상태예요.");
      if (refundOpen(order)) throw new HttpError(409, "진행 중인 반품·교환·환불 요청을 먼저 철회해 주세요.");
      await confirmOrder(order, "buyer");
      return "payout";
    }
    case "refund_request": {
      if (!isBuyer) throw new HttpError(403, "구매자만 환불을 요청할 수 있어요.");
      if (!open) throw new HttpError(409, "구매 확정 전 주문만 환불을 요청할 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "이미 환불이 진행 중이에요.");
      // 쿠팡식: 발송 전 취소는 바로 환불, 발송 후 반품·교환은 판매자 승인 필요
      const auto = order.status === "paid";
      const kind = auto ? "cancel" : b.kind === "exchange" ? "exchange" : "return";
      const reason = text(b.reason, 300);
      if (!reason) throw new HttpError(400, `${kind === "exchange" ? "교환" : kind === "return" ? "반품" : "취소"} 사유를 입력해 주세요.`);
      order.refund = { status: auto ? "processing" : "requested", by: "buyer", kind, reason, requestedAt: now };
      return auto ? "refund" : null;
    }
    case "refund_withdraw": {
      if (!isBuyer) throw new HttpError(403, "구매자만 철회할 수 있어요.");
      if (order.refund?.status !== "requested") throw new HttpError(409, "철회할 환불 요청이 없어요.");
      order.refund.status = "withdrawn";
      order.refund.resolvedAt = now;
      if (order.fulfillment?.deliveredAt) order.autoConfirmAt = autoConfirmAtFrom(now);
      return null;
    }
    case "refund_reject": {
      if (!isSeller) throw new HttpError(403, "판매자만 처리할 수 있어요.");
      if (order.refund?.status !== "requested") throw new HttpError(409, "처리할 환불 요청이 없어요.");
      order.refund.status = "rejected";
      order.refund.rejectReason = text(b.reason, 300) || undefined;
      order.refund.resolvedAt = now;
      // 분쟁이 끝난 뒤 구매자가 다시 확인할 수 있도록 자동 확정 기한을 새로 잡는다.
      if (order.fulfillment?.deliveredAt) order.autoConfirmAt = autoConfirmAtFrom(now);
      return null;
    }
    case "refund_approve": {
      if (!isSeller) throw new HttpError(403, "판매자만 처리할 수 있어요.");
      if (order.refund?.status !== "requested") throw new HttpError(409, "처리할 환불 요청이 없어요.");
      if (order.refund.kind === "exchange") {
        // 교환: π는 그대로 보관하고, 판매자가 새 상품을 다시 보내면(송장 수정 → 배송 완료) 자동 확정 기한이 다시 시작된다.
        order.refund.status = "exchanged";
        order.refund.resolvedAt = now;
        if (order.fulfillment) delete order.fulfillment.deliveredAt;
        delete order.autoConfirmAt;
        return null;
      }
      order.refund.status = "processing";
      return "refund";
    }
    case "seller_cancel": {
      if (!isSeller) throw new HttpError(403, "판매자만 판매를 취소할 수 있어요.");
      if (!open) throw new HttpError(409, "구매 확정 전 주문만 취소할 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "이미 환불이 진행 중이에요.");
      order.refund = { status: "processing", by: "seller", reason: text(b.reason, 300) || "판매자 판매 취소", requestedAt: now };
      return "refund";
    }
    case "refund_retry": {
      if (!isSeller) throw new HttpError(403, "판매자만 재시도할 수 있어요.");
      if (order.refund?.status !== "failed" && order.refund?.status !== "processing") throw new HttpError(409, "재시도할 환불이 없어요.");
      return "refund";
    }
    case "payout_retry": {
      if (!isSeller) throw new HttpError(403, "판매자만 정산을 요청할 수 있어요.");
      if (order.status !== "completed" || order.payout === "paid") throw new HttpError(409, "정산할 주문이 아니에요.");
      return "payout";
    }
    default:
      throw new HttpError(400, "알 수 없는 요청이에요.");
  }
}

export const POST = handle<Ctx>(async (req, ctx) => {
  const { user, order: loaded } = await load(req, ctx);
  const b = await readJson<Body>(req);
  const { order, next } = await withLock(orderLock(loaded.id), async () => {
    const cur = (await getOrder(loaded.id))!;
    const next = await transition(cur, user, b);
    await saveOrder(cur);
    return { order: cur, next };
  });
  // A2U는 주문 락을 다시 잡고 실행한다. 실패해도 주문 상태(구매 확정 등)는 유지되고 재시도할 수 있다.
  if (next === "payout") return json({ order: await payoutOrder(order.id) });
  if (next === "refund") return json({ order: await refundOrder(order.id) });
  return json({ order });
});
