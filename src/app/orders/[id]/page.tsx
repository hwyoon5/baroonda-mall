"use client";

import { formatOption } from "@/lib/format";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import OrderStatusBadge from "@/components/OrderStatusBadge";
import PiPrice from "@/components/PiPrice";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import type { Order, OrderStatus } from "@/lib/types";

const steps: { status: OrderStatus; label: string }[] = [
  { status: "paid", label: "π 결제 완료" },
  { status: "shipped", label: "발송/전달" },
  { status: "completed", label: "구매 확정" },
];
const rank: Record<OrderStatus, number> = { created: 0, approved: 0, cancelled: 0, paid: 1, shipped: 2, completed: 3 };

export default function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    api<{ order: Order }>(`/api/orders/${id}`)
      .then((r) => setOrder(r.order))
      .catch((e) => setError(e.message));
  }, [user, id]);

  const act = async (action: "ship" | "confirm") => {
    setBusy(true);
    try {
      const r = await api<{ order: Order }>(`/api/orders/${id}`, { action });
      setOrder(r.order);
      showToast(action === "ship" ? "발송 완료로 변경했어요." : "구매를 확정했어요.");
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

          {order.status !== "cancelled" && (
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
            {order.txid && (
              <p className="break-all">
                <span className="inline-block w-20 text-gray-500">거래 ID</span>
                <span className="text-xs text-gray-600">{order.txid}</span>
              </p>
            )}
            {order.status === "completed" && (
              <p className="pt-2 text-xs text-gray-500">
                판매대금 정산: {order.payout === "paid" ? "완료" : "대기 중 (바로온다가 판매자 지갑으로 π를 보내드려요)"}
              </p>
            )}
          </section>

          <div className="space-y-2 p-4">
            {isSeller && order.status === "paid" && (
              <button type="button" disabled={busy} onClick={() => act("ship")} className="tap w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60">
                발송/전달 완료
              </button>
            )}
            {isBuyer && (order.status === "paid" || order.status === "shipped") && (
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
