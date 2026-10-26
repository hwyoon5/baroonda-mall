"use client";

import { formatOption, formatPi } from "@/lib/format";
import Link from "next/link";
import { use, useCallback, useEffect, useState } from "react";
import DeliveryControl from "@/components/DeliveryControl";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import PiPrice from "@/components/PiPrice";
import OrderSettlement from "@/components/OrderSettlement";
import ReviewBox from "@/components/ReviewBox";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import { canReview, deliveryStage, refundOpen, type Order } from "@/lib/types";

const steps = ["결제 완료", "상품 준비중", "배송중", "배송 완료", "구매 확정"];
function progress(o: Order) {
  if (o.status === "completed") return 5;
  const st = deliveryStage(o);
  return st === "delivered" ? 4 : st === "shipping" ? 3 : st === "preparing" ? 2 : st === "ready" ? 1 : 0;
}
const time = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "");

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    api<{ order: Order }>(`/api/orders/${id}`)
      .then((r) => setOrder(r.order))
      .catch((e) => setError(e.message));
  }, [id]);
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  // 구매자는 판매자가 바꾼 배송 상태·송장을 새로고침 없이 본다.
  useLiveRefresh(load, !!user && !busy && (order?.status === "paid" || order?.status === "shipped"));

  const act = async (action: string, extra?: Record<string, string>) => {
    setBusy(true);
    try {
      const r = await api<{ order: Order }>(`/api/orders/${id}`, { action, ...extra });
      setOrder(r.order);
      const done: Record<string, string> = {
        confirm: "구매를 확정했어요. 판매자에게 정산돼요.",
        refund_request: r.order.status === "refunded" ? "주문을 취소하고 π를 환불했어요." : "신청했어요. 판매자 응답을 기다려 주세요.",
        refund_withdraw: "요청을 철회했어요.",
        refund_reject: "요청을 거절했어요.",
        refund_approve: r.order.refund?.status === "exchanged" ? "교환을 승인했어요. 새 상품을 보내고 송장을 수정해 주세요." : "환불했어요.",
      };
      const failed = r.order.refund?.status === "failed" || r.order.payout === "failed";
      showToast(failed ? "π 송금에 실패했어요. 잠시 후 다시 시도해 주세요." : (done[action] ?? "처리했어요."));
    } catch (e) {
      showToast(e instanceof Error ? e.message : "처리에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const isBuyer = order && user && order.buyer.uid === user.uid;
  const isSeller = order && user && order.seller.uid === user.uid;

  return (
    <>
      <SubHeader title="주문 상세" />
      {!ready ? null : !user ? (
        <LoginCard />
      ) : error ? (
        <p className="p-8 text-center text-sm text-red-500">{error}</p>
      ) : !order ? null : (
        <>
          <section className="bg-white px-4 py-4">
            <div className="flex items-center justify-between">
              <OrderStatusBadge order={order} />
              <span className="text-[11px] text-gray-400">주문번호 {order.id}</span>
            </div>
            <Link href={`/listings/${order.listingId}`} className="tap mt-3 flex items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-50 text-2xl">{order.listingThumb ?? "📦"}</span>
              <span className="flex-1 text-sm text-gray-800">
                {order.listingTitle}
                {order.option && <span className="block text-xs text-gray-500">{formatOption(order.option)}</span>}
              </span>
              <PiPrice value={order.amount} size="lg" />
            </Link>
          </section>

          {order.status !== "cancelled" && order.status !== "refunded" && (
            <ol aria-label="배송 진행 단계" className="mt-2 grid grid-cols-5 bg-white px-2 py-4 text-center text-[11px]">
              {steps.map((label, i) => {
                const done = progress(order) > i;
                const now = progress(order) === i + 1;
                return (
                  <li key={label} aria-current={now ? "step" : undefined} className={done ? "font-bold text-pi" : "text-gray-400"}>
                    <span className={`mx-auto mb-1 block h-2.5 w-2.5 rounded-full ${done ? "bg-pi" : "bg-gray-200"} ${now ? "ring-4 ring-pi/20" : ""}`} />
                    {label}
                  </li>
                );
              })}
            </ol>
          )}

          <section className="mt-2 space-y-1.5 bg-white px-4 py-4 text-sm">
            <p>
              <span className="inline-block w-20 text-gray-500">판매자</span>
              {order.seller.username}
            </p>
            <p>
              <span className="inline-block w-20 text-gray-500">구매자</span>
              {order.buyer.username}
            </p>
            {order.shippingFee !== undefined && (
              <p>
                <span className="inline-block w-20 text-gray-500">결제 내역</span>
                상품 π {formatPi(order.itemAmount ?? order.amount - order.shippingFee)} + 배송비 {order.shippingFee ? `π ${formatPi(order.shippingFee)}` : "무료"}
                {order.remoteArea && <span className="text-gray-500"> (제주·도서산간)</span>}
                {order.pickup && <span className="text-gray-500"> · 직거래 수령</span>}
              </p>
            )}
            {deliveryStage(order) && (
              <p>
                <span className="inline-block w-20 text-gray-500">배송 상태</span>
                <span className="font-semibold text-gray-900">
                  {deliveryStage(order) === "ready"
                    ? "판매자가 주문을 확인하고 있어요"
                    : deliveryStage(order) === "preparing"
                      ? `상품 준비중 (${time(order.preparingAt)})`
                      : deliveryStage(order) === "shipping"
                        ? `배송중 (${time(order.fulfillment?.shippedAt)} 발송)`
                        : `배송 완료 (${time(order.fulfillment?.deliveredAt)})`}
                </span>
              </p>
            )}
            {order.fulfillment && (
              <p>
                <span className="inline-block w-20 text-gray-500">{order.fulfillment.method === "delivery" ? "택배사·송장" : "배송"}</span>
                {order.fulfillment.method === "delivery" ? (
                  <>
                    {order.fulfillment.carrier} <span className="font-semibold">{order.fulfillment.trackingNumber}</span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard?.writeText(order.fulfillment?.trackingNumber ?? "").then(() => showToast("송장번호를 복사했어요."))}
                      className="tap ml-1.5 rounded border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600"
                    >
                      복사
                    </button>
                  </>
                ) : (
                  "직거래로 전달"
                )}
              </p>
            )}
            {order.status === "completed" && order.confirmedAt && (
              <p>
                <span className="inline-block w-20 text-gray-500">구매 확정</span>
                {time(order.confirmedAt)} {order.confirmedBy === "auto" ? "(배송 완료 후 자동 확정)" : "(구매자 확정)"}
              </p>
            )}
            {order.txid && (
              <p className="break-all">
                <span className="inline-block w-20 text-gray-500">거래 ID</span>
                <span className="text-xs text-gray-600">{order.txid}</span>
              </p>
            )}
          </section>

          {(isBuyer || isSeller) && <OrderSettlement order={order} role={isSeller ? "seller" : "buyer"} busy={busy} act={act} />}

          {canReview(order) && <div className="mt-2"><ReviewBox orderId={order.id} canWrite={!!isBuyer} /></div>}

          <div className="space-y-2 p-4">
            {isSeller && (order.status === "paid" || order.status === "shipped") && !refundOpen(order) && (
              <DeliveryControl key={`${order.status}-${order.updatedAt}`} order={order} onSaved={setOrder} />
            )}
            {isBuyer && order.status === "shipped" && !refundOpen(order) && (
              <div className={`rounded-xl p-3 ${deliveryStage(order) === "delivered" ? "border border-pi/30 bg-pi/5" : ""}`}>
                {deliveryStage(order) === "delivered" && (
                  <p className="mb-2 text-xs text-gray-700">
                    <b className="text-gray-900">배송이 완료됐어요.</b> 상품을 확인하고 구매 확정해 주세요.
                    {order.autoConfirmAt && ` ${time(order.autoConfirmAt)}까지 확정이나 반품·교환 신청이 없으면 자동으로 구매 확정돼요.`}
                  </p>
                )}
                <button type="button" disabled={busy} onClick={() => act("confirm")} className="tap w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60">
                  물건 잘 받았어요 (구매 확정)
                </button>
                <p className="mt-1 text-center text-[11px] text-gray-400">구매 확정 후에는 반품·교환·환불을 신청할 수 없어요.</p>
              </div>
            )}
            {isSeller && order.status === "shipped" && order.autoConfirmAt && !refundOpen(order) && (
              <p className="text-center text-[11px] text-gray-500">{time(order.autoConfirmAt)}에 자동 구매 확정되고 정산돼요.</p>
            )}
          </div>
        </>
      )}
    </>
  );
}
