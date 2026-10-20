import { getOrder } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { approveOrder } from "@/lib/server/orders";

/** Pi SDK onReadyForServerApproval → 서버 승인 */
export const POST = handle(async (req) => {
  const user = requireUser(req);
  const { paymentId, orderId } = await readJson<{ paymentId?: string; orderId?: string }>(req);
  if (!paymentId || !orderId) throw new HttpError(400, "paymentId와 orderId가 필요해요.");
  const order = await getOrder(orderId);
  if (!order || order.buyer.uid !== user.uid) throw new HttpError(404, "주문을 찾을 수 없어요.");
  return json({ order: await approveOrder(order, paymentId) });
});
