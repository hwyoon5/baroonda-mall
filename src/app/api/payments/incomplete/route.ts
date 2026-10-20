import { getOrder, getOrderByPayment } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { cancelOrder, completeOrder } from "@/lib/server/orders";
import { cancelPayment, completePayment, getPayment, piMock, verifyTransactionOnChain } from "@/lib/server/pi";

/**
 * Pi.authenticate()의 onIncompletePaymentFound 처리.
 * 블록체인 전송까지 끝났지만 /complete 되지 않은 결제를 마무리해야 새 결제가 가능하다.
 */
export const POST = handle(async (req) => {
  const user = requireUser(req);
  const { payment: fromClient } = await readJson<{ payment?: PiPaymentDTO }>(req);
  if (!fromClient?.identifier) throw new HttpError(400, "payment 정보가 필요해요.");
  const payment = piMock ? fromClient : await getPayment(fromClient.identifier);
  if (payment.user_uid !== user.uid) throw new HttpError(403, "본인 결제만 처리할 수 있어요.");

  if (payment.transaction?.txid) await verifyTransactionOnChain(payment);

  const orderId = typeof payment.metadata?.orderId === "string" ? payment.metadata.orderId : undefined;
  const order = (await getOrderByPayment(payment.identifier)) ?? (orderId ? await getOrder(orderId) : undefined);
  const txid = payment.transaction?.txid;

  if (txid) {
    if (order) return json({ order: await completeOrder(order, payment.identifier, txid) });
    if (!piMock && !payment.status.developer_completed) await completePayment(payment.identifier, txid);
    return json({ order: null });
  }
  if (order) return json({ order: await cancelOrder(order, { notifyPi: true }) });
  if (!piMock) await cancelPayment(payment.identifier).catch(() => undefined);
  return json({ order: null });
});
