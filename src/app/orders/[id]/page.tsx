"use client";

import { formatOption } from "@/lib/format";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import PiPrice from "@/components/PiPrice";
import OrderSettlement from "@/components/OrderSettlement";
import ReviewBox from "@/components/ReviewBox";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import { carriers, isTrackingNumber, refundOpen, type Order, type OrderStatus, type TradeMethod } from "@/lib/types";

const steps: { status: OrderStatus; label: string }[] = [
  { status: "paid", label: "π 결제 완료" },
  { status: "shipped", label: "발송/전달" },
  { status: "completed", label: "구매 확정" },
];
const rank: Record<OrderStatus, number> = { created: 0, approved: 0, cancelled: 0, refunded: 0, paid: 1, shipped: 2, completed: 3 };

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [shipMethod, setShipMethod] = useState<TradeMethod>("delivery");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");

  useEffect(() => {
    if (!user) return;
    api<{ order: Order }>(`/api/orders/${id}`)
      .then((r) => setOrder(r.order))
      .catch((e) => setError(e.message));
  }, [user, id]);

  const act = async (action: string, extra?: Record<string, string>) => {
    setBusy(true);
    try {
      const r = await api<{ order: Order }>(`/api/orders/${id}`, { action, ...extra });
      setOrder(r.order);
      const done: Record<string, string> = {
        ship: "발송 완료로 변경했어요.",
        confirm: "구매를 확정했어요.",
        refund_request: r.order.status === "refunded" ? "주문을 취소하고 π를 환불했어요." : "환불을 요청했어요.",
        refund_withdraw: "환불 요청을 철회했어요.",
        refund_reject: "환불 요청을 거절했어요.",
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
              <OrderStatusBadge status={order.status} />
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
            <ol className="mt-2 grid grid-cols-3 bg-white px-4 py-4 text-center text-[11px]">
              {steps.map((s) => {
                const done = rank[order.status] >= rank[s.status];
                return (
                  <li key={s.status} className={done ? "font-bold text-pi" : "text-gray-400"}>
                    <span className={`mx-auto mb-1 block h-2.5 w-2.5 rounded-full ${done ? "bg-pi" : "bg-gray-200"}`} />
                    {s.label}
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
            {order.fulfillment && (
              <p>
                <span className="inline-block w-20 text-gray-500">배송</span>
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
            {order.txid && (
              <p className="break-all">
                <span className="inline-block w-20 text-gray-500">거래 ID</span>
                <span className="text-xs text-gray-600">{order.txid}</span>
              </p>
            )}
          </section>

          {(isBuyer || isSeller) && <OrderSettlement order={order} role={isSeller ? "seller" : "buyer"} busy={busy} act={act} />}

          {order.status === "completed" && <div className="mt-2"><ReviewBox orderId={order.id} canWrite={!isSeller} /></div>}

          <div className="space-y-2 p-4">
            {isSeller && order.status === "paid" && !refundOpen(order) && (
              <div className="space-y-2 rounded-xl bg-white p-4">
                <p className="text-sm font-bold text-gray-900">발송 처리</p>
                <div className="grid grid-cols-2 gap-2">
                  {(
                    [
                      ["delivery", "택배 발송"],
                      ["direct", "직거래 전달"],
                    ] as const
                  ).map(([m, t]) => (
                    <button
                      key={m}
                      type="button"
                      aria-pressed={shipMethod === m}
                      onClick={() => setShipMethod(m)}
                      className={`tap rounded-lg border py-2 text-sm font-medium ${shipMethod === m ? "border-pi bg-pi/5 text-pi ring-1 ring-pi" : "border-gray-200 text-gray-600"}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {shipMethod === "delivery" && (
                  <div className="flex gap-2">
                    <select
                      aria-label="택배사"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="shrink-0 rounded-lg border border-gray-200 px-2 py-2.5 text-sm text-gray-900 focus:border-pi focus:outline-none"
                    >
                      <option value="">택배사 선택</option>
                      {carriers.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                    <input
                      aria-label="송장번호"
                      inputMode="numeric"
                      value={tracking}
                      onChange={(e) => setTracking(e.target.value)}
                      maxLength={24}
                      placeholder="송장번호 (숫자)"
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none"
                    />
                  </div>
                )}
                {shipMethod === "delivery" && tracking.trim() !== "" && !isTrackingNumber(tracking) && (
                  <p className="text-xs text-red-500">송장번호는 숫자와 - 로 8~20자 입력해 주세요.</p>
                )}
                <button
                  type="button"
                  disabled={busy || (shipMethod === "delivery" && (!carrier || !isTrackingNumber(tracking)))}
                  onClick={() => act("ship", { method: shipMethod, carrier, trackingNumber: tracking })}
                  className="tap w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60"
                >
                  {shipMethod === "delivery" ? "송장 등록하고 발송 완료" : "직거래 전달 완료"}
                </button>
              </div>
            )}
            {isBuyer && (order.status === "paid" || order.status === "shipped") && !refundOpen(order) && (
              <button type="button" disabled={busy} onClick={() => act("confirm")} className="tap w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60">
                물건 잘 받았어요 (구매 확정)
              </button>
            )}
          </div>
        </>
      )}
    </>
  );
}
