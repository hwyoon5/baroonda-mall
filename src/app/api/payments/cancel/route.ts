import { getOrder, getOrderByPayment } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { cancelOrder } from "@/lib/server/orders";

/** Pi SDK onCancel / onError → 주문 취소, 상품 예약 해제 */
export const POST = handle(async (req) => {
  const user = requireUser(req);
  const { paymentId, orderId } = await readJson<{ paymentId?: string; orderId?: string }>(req);
  const order = (paymentId && (await getOrderByPayment(paymentId))) || (orderId && (await getOrder(orderId))) || undefined;
  if (!order || order.buyer.uid !== user.uid) throw new HttpError(404, "주문을 찾을 수 없어요.");
  return json({ order: await cancelOrder(order) });
});
