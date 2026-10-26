"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PiPrice from "@/components/PiPrice";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import { payoutStatusLabel, claimStatusText, type Order } from "@/lib/types";

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 1e7) / 1e7;

/** 판매자 정산 내역: 구매 확정 주문의 A2U 정산 상태와 환불 내역 */
export default function PayoutsPage() {
  const { user, ready } = useAuth();
  const [sales, setSales] = useState<Order[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api<{ sales: Order[] }>("/api/orders")
      .then((r) => setSales(r.sales.filter((o) => o.status === "completed" || o.refund)))
      .catch((e) => setError(e.message));
  }, [user]);

  const done = sales?.filter((o) => o.status === "completed") ?? [];
  const paid = done.filter((o) => o.payout === "paid");
  const waiting = done.filter((o) => o.payout !== "paid");
  const refunded = sales?.filter((o) => o.status === "refunded") ?? [];

  return (
    <>
      <SubHeader title="정산·환불 내역" />
      {!ready ? null : !user ? (
        <LoginCard />
      ) : error ? (
        <p className="p-8 text-center text-sm text-red-500">{error}</p>
      ) : !sales ? null : (
        <>
          <section className="grid grid-cols-3 bg-white px-4 py-5 text-center">
            {(
              [
                ["정산 완료", sum(paid.map((o) => o.payoutTransfer?.amount ?? 0)), "text-emerald-600"],
                ["정산 대기", sum(waiting.map((o) => o.payoutTransfer?.amount ?? o.amount)), "text-amber-600"],
                ["환불", sum(refunded.map((o) => o.amount)), "text-rose-600"],
              ] as const
            ).map(([t, v, c]) => (
              <div key={t}>
                <p className={`text-base font-extrabold ${c}`}>π {v}</p>
                <p className="text-[11px] text-gray-500">{t}</p>
              </div>
            ))}
          </section>
          <p className="px-4 py-2 text-[11px] text-gray-400">구매자가 구매를 확정하면 바로온다 앱 지갑에서 판매자 Pi 지갑으로 판매대금을 보내드려요(Pi A2U).</p>
          {sales.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">아직 정산·환불 내역이 없어요.</p>
          ) : (
            <ul className="divide-y divide-gray-100 bg-white">
              {sales.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="tap flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-gray-900">{o.listingTitle}</span>
                      <span className="block text-[11px] text-gray-500">
                        {o.buyer.username} · {new Date(o.updatedAt).toLocaleDateString("ko-KR")}
                      </span>
                    </span>
                    <span className="text-right">
                      <PiPrice value={o.status === "completed" ? (o.payoutTransfer?.amount ?? o.amount) : o.amount} />
                      <span className={`block text-[11px] font-bold ${o.status === "refunded" || o.payout === "failed" ? "text-rose-600" : o.payout === "paid" ? "text-emerald-600" : "text-amber-600"}`}>
                        {o.status === "completed" ? payoutStatusLabel[o.payout] : o.refund ? claimStatusText(o.refund) : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
