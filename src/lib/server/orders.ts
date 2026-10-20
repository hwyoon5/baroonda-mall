import type { Listing, Order } from "../types";
import { getListing, getOrder, saveListing, saveOrder, withLock } from "./db";
import { HttpError } from "./http";
import { approvePayment, cancelPayment, completePayment, getPayment, piMock } from "./pi";

const STALE_APPROVAL_MS = 10 * 60 * 1000;
export const listingLock = (id: string) => `listing:${id}`;
export const orderLock = (id: string) => `order:${id}`;

/** 판매 가능한 재고(available). 옵션 조합이 있으면 해당 variant 기준 */
export function availableStock(listing: Listing, variantId?: string) {
  if (listing.variants?.length) return listing.variants.find((v) => v.id === variantId)?.stock ?? 0;
  return listing.stock ?? 0;
}

/** Shopify처럼 available(stock)과 committed를 나눠 움직인다. 반드시 listingLock 안에서 호출 */
export function adjustStock(listing: Listing, variantId: string | undefined, dAvailable: number, dCommitted: number) {
  if (listing.variants?.length) {
    const v = listing.variants.find((x) => x.id === variantId);
    if (!v) throw new HttpError(409, "선택한 옵션을 찾을 수 없어요.");
    v.stock = Math.max(0, v.stock + dAvailable);
    v.committed = Math.max(0, (v.committed ?? 0) + dCommitted);
    listing.stock = listing.variants.reduce((s, x) => s + x.stock, 0);
    listing.committed = listing.variants.reduce((s, x) => s + (x.committed ?? 0), 0);
  } else {
    listing.stock = Math.max(0, (listing.stock ?? 0) + dAvailable);
    listing.committed = Math.max(0, (listing.committed ?? 0) + dCommitted);
  }
  if (listing.status === "selling" && listing.stock === 0) listing.status = "sold";
  if (listing.status === "sold" && listing.stock > 0) listing.status = "selling";
}

/** 개인 중고: 다른 주문이 결제 승인만 받고 오래 방치된 경우 예약을 풀어준다. */
async function freeStaleReservation(listing: Listing, order: Order) {
  if (listing.status !== "reserved" || !listing.reservedOrderId || listing.reservedOrderId === order.id) return;
  const other = await getOrder(listing.reservedOrderId);
  if (other && other.status === "approved" && Date.now() - new Date(other.updatedAt).getTime() > STALE_APPROVAL_MS) {
    other.status = "cancelled";
    await saveOrder(other);
    listing.status = "selling";
    listing.reservedOrderId = undefined;
  }
}

/** 결제 승인 시점: 새 상품은 재고 commit, 개인 중고는 예약 */
async function reserve(order: Order) {
  await withLock(listingLock(order.listingId), async () => {
    const listing = await getListing(order.listingId);
    if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
    if (listing.condition === "new") {
      if (listing.status !== "selling" || availableStock(listing, order.variantId) < 1) {
        throw new HttpError(409, "품절됐거나 판매 중지된 상품이에요.");
      }
      adjustStock(listing, order.variantId, -1, +1);
    } else {
      await freeStaleReservation(listing, order);
      if (listing.status !== "selling" && listing.reservedOrderId !== order.id) {
        throw new HttpError(409, "이미 다른 분이 구매 중이거나 판매가 끝난 상품이에요.");
      }
      listing.status = "reserved";
      listing.reservedOrderId = order.id;
    }
    await saveListing(listing);
  });
}

/** 승인된 주문이 취소될 때: commit된 재고/예약을 되돌린다. */
async function release(order: Order) {
  await withLock(listingLock(order.listingId), async () => {
    const listing = await getListing(order.listingId);
    if (!listing) return;
    if (listing.condition === "new") adjustStock(listing, order.variantId, +1, -1);
    else if (listing.status === "reserved" && listing.reservedOrderId === order.id) {
      listing.status = "selling";
      listing.reservedOrderId = undefined;
    } else return;
    await saveListing(listing);
  });
}

/** 결제 내용이 우리 주문과 일치하는지 Pi 서버 기준으로 검증 */
function assertPaymentMatches(payment: PiPaymentDTO, order: Order) {
  if (payment.metadata?.orderId !== order.id || payment.metadata?.productId !== order.listingId) {
    throw new HttpError(400, "결제 정보가 주문과 일치하지 않아요.");
  }
  if (payment.user_uid !== order.buyer.uid) throw new HttpError(403, "결제한 사용자가 주문자와 달라요.");
  if (Math.abs(payment.amount - order.amount) > 1e-7) throw new HttpError(400, "결제 금액이 주문 금액과 달라요.");
  if (payment.direction !== "user_to_app") throw new HttpError(400, "잘못된 결제 방향이에요.");
}

export function approveOrder(order: Order, paymentId: string) {
  return withLock(orderLock(order.id), async () => {
    const cur = (await getOrder(order.id)) ?? order;
    if (cur.paymentId === paymentId && cur.status !== "created") return cur;
    if (cur.status !== "created") throw new HttpError(409, "이미 처리된 주문이에요.");
    if (!piMock) assertPaymentMatches(await getPayment(paymentId), cur);
    await reserve(cur);
    try {
      if (!piMock) await approvePayment(paymentId);
    } catch (e) {
      await release(cur);
      throw e;
    }
    cur.status = "approved";
    cur.paymentId = paymentId;
    await saveOrder(cur);
    return cur;
  });
}

export function completeOrder(order: Order, paymentId: string, txid: string) {
  return withLock(orderLock(order.id), async () => {
    const cur = (await getOrder(order.id)) ?? order;
    if (cur.status === "paid" || cur.status === "shipped" || cur.status === "completed") return cur;
    if (cur.paymentId && cur.paymentId !== paymentId) throw new HttpError(400, "결제 정보가 주문과 일치하지 않아요.");
    if (!piMock) {
      const payment = await getPayment(paymentId);
      assertPaymentMatches(payment, cur);
      if (!payment.status.developer_completed) await completePayment(paymentId, txid);
    }
    // 블록체인 결제가 끝났으므로 재고를 확정한다. 승인 기록 없이 완료되는 경우(미완료 결제 복구)는 바로 차감.
    const wasApproved = cur.status === "approved";
    await withLock(listingLock(cur.listingId), async () => {
      const listing = await getListing(cur.listingId);
      if (!listing) return;
      if (listing.condition === "new") adjustStock(listing, cur.variantId, wasApproved ? 0 : -1, wasApproved ? -1 : 0);
      else if (listing.status !== "sold") {
        listing.status = "reserved";
        listing.reservedOrderId = cur.id;
      }
      await saveListing(listing);
    });
    cur.status = "paid";
    cur.paymentId = paymentId;
    cur.txid = txid;
    await saveOrder(cur);
    return cur;
  });
}

export function cancelOrder(order: Order, { notifyPi = false } = {}) {
  return withLock(orderLock(order.id), async () => {
    const cur = (await getOrder(order.id)) ?? order;
    if (cur.status !== "created" && cur.status !== "approved") return cur;
    if (notifyPi && cur.paymentId && !piMock) await cancelPayment(cur.paymentId).catch(() => undefined);
    const wasApproved = cur.status === "approved";
    cur.status = "cancelled";
    await saveOrder(cur);
    if (wasApproved) await release(cur);
    return cur;
  });
}
