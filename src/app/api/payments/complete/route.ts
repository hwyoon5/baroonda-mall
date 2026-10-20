import { getOrderByPayment } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { completeOrder } from "@/lib/server/orders";

/** Pi SDK onReadyForServerCompletion → 서버 완료(txid 확인) */
export const POST = handle(async (req) => {
  const user = requireUser(req);
  const { paymentId, txid } = await readJson<{ paymentId?: string; txid?: string }>(req);
  if (!paymentId || !txid) throw new HttpError(400, "paymentId와 txid가 필요해요.");
  const order = await getOrderByPayment(paymentId);
  if (!order || order.buyer.uid !== user.uid) throw new HttpError(404, "주문을 찾을 수 없어요.");
  return json({ order: await completeOrder(order, paymentId, txid) });
});
