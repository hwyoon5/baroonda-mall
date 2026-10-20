import type { Order } from "../types";
import { getListing, getOrder, saveListing, saveOrder } from "./db";
import { HttpError } from "./http";
import { approvePayment, cancelPayment, completePayment, getPayment, piMock } from "./pi";

const STALE_APPROVAL_MS = 10 * 60 * 1000;

async function releaseListing(order: Order) {
  const listing = await getListing(order.listingId);
  if (listing && listing.reservedOrderId === order.id && listing.status === "reserved") {
    listing.status = "selling";
    listing.reservedOrderId = undefined;
    await saveListing(listing);
  }
}

/** 다른 주문이 결제 승인만 받고 오래 방치된 경우 예약을 풀어준다. */
async function ensureListingAvailable(order: Order) {
  const listing = await getListing(order.listingId);
  if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
  if (listing.status === "reserved" && listing.reservedOrderId && listing.reservedOrderId !== order.id) {
    const other = await getOrder(listing.reservedOrderId);
    if (other && other.status === "approved" && Date.now() - new Date(other.updatedAt).getTime() > STALE_APPROVAL_MS) {
      other.status = "cancelled";
      await saveOrder(other);
      listing.status = "selling";
    }
  }
  if (listing.status !== "selling" && listing.reservedOrderId !== order.id) {
    throw new HttpError(409, "이미 다른 분이 구매 중이거나 판매가 끝난 상품이에요.");
  }
  return listing;
}

/** 결제 내용이 우리 주문과 일치하는지 Pi 서버 기준으로 검증 */
function assertPaymentMatches(payment: PiPaymentDTO, order: Order) {
  if (payment.metadata?.orderId !== order.id) throw new HttpError(400, "결제 정보가 주문과 일치하지 않아요.");
  if (payment.user_uid !== order.buyer.uid) throw new HttpError(403, "결제한 사용자가 주문자와 달라요.");
  if (Math.abs(payment.amount - order.amount) > 1e-7) throw new HttpError(400, "결제 금액이 주문 금액과 달라요.");
  if (payment.direction !== "user_to_app") throw new HttpError(400, "잘못된 결제 방향이에요.");
}

export async function approveOrder(order: Order, paymentId: string) {
  if (order.paymentId === paymentId && order.status !== "created") return order;
  if (order.status !== "created") throw new HttpError(409, "이미 처리된 주문이에요.");
  const listing = await ensureListingAvailable(order);
  if (!piMock) {
    assertPaymentMatches(await getPayment(paymentId), order);
    await approvePayment(paymentId);
  }
  order.status = "approved";
  order.paymentId = paymentId;
  await saveOrder(order);
  listing.status = "reserved";
  listing.reservedOrderId = order.id;
  await saveListing(listing);
  return order;
}

export async function completeOrder(order: Order, paymentId: string, txid: string) {
  if (order.status === "paid" || order.status === "shipped" || order.status === "completed") return order;
  if (order.paymentId && order.paymentId !== paymentId) throw new HttpError(400, "결제 정보가 주문과 일치하지 않아요.");
  if (!piMock) {
    const payment = await getPayment(paymentId);
    assertPaymentMatches(payment, order);
    if (!payment.status.developer_completed) await completePayment(paymentId, txid);
  }
  order.status = "paid";
  order.paymentId = paymentId;
  order.txid = txid;
  await saveOrder(order);
  const listing = await getListing(order.listingId);
  if (listing && listing.status !== "sold") {
    listing.status = "reserved";
    listing.reservedOrderId = order.id;
    await saveListing(listing);
  }
  return order;
}

export async function cancelOrder(order: Order, { notifyPi = false } = {}) {
  if (order.status !== "created" && order.status !== "approved") return order;
  if (notifyPi && order.paymentId && !piMock) await cancelPayment(order.paymentId).catch(() => undefined);
  order.status = "cancelled";
  await saveOrder(order);
  await releaseListing(order);
  return order;
}
