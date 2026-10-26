"use client";

import Link from "next/link";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import PiPrice from "@/components/PiPrice";
import { countBy, kstDay, type AdminOrdersData } from "@/lib/admin";
import type { BusinessReviewStatus } from "@/lib/business";
import { orderStageLabel } from "@/lib/types";

/** 관리자 대시보드: 처리할 일(주문·배송·반품·판매자 승인)과 매출·정산 요약 */
export default function AdminDashboard() {
  const orders = useAdminApi<AdminOrdersData>("/api/admin/orders");
  const sellers = useAdminApi<{ sellers: { status: BusinessReviewStatus }[] }>("/api/admin/sellers");
  const d = orders.data;
  const today = kstDay(Date.now());
  const todays = d?.orders.filter((o) => kstDay(o.createdAt) === today && ["paid", "shipped", "completed", "refunded"].includes(o.status)) ?? [];
  const pending = sellers.data?.sellers.filter((s) => s.status === "pending").length ?? 0;

  const todo: [string, number, string, string][] = d
    ? [
        ["신규 주문", countBy(d.orders, "ready"), "/admin/orders?filter=ready", "발송 준비 필요"],
        ["상품 준비중", countBy(d.orders, "preparing"), "/admin/orders?filter=preparing", "송장 입력 필요"],
        ["배송중", countBy(d.orders, "shipping"), "/admin/orders?filter=shipping", "배송 완료 확인"],
        ["반품·교환 요청", countBy(d.orders, "claim"), "/admin/orders?filter=claim", "판매자 처리 대기"],
        ["판매자 승인 대기", pending, "/admin/sellers", "사업자 서류 확인"],
        ["정산 실패", d.orders.filter((o) => o.status === "completed" && o.payout === "failed").length, "/admin/settlement", "송금 재시도 필요"],
      ]
    : [];

  return (
    <AdminShell title="대시보드" error={orders.error ?? sellers.error} loading={!d || !sellers.data}>
      {d && (
        <>
          <section className="p-4">
            <h2 className="text-sm font-extrabold text-gray-900">처리할 일</h2>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {todo.map(([t, n, href, desc]) => (
                <Link key={t} href={href} className={`tap rounded-xl p-3 ${n > 0 ? "bg-white ring-1 ring-pi/30" : "bg-white"}`}>
                  <p className="text-[11px] text-gray-500">{t}</p>
                  <p className={`text-xl font-extrabold tabular-nums ${n > 0 ? "text-pi" : "text-gray-300"}`}>{n}</p>
                  <p className="text-[10px] leading-tight text-gray-400">{desc}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="px-4">
            <h2 className="text-sm font-extrabold text-gray-900">매출·정산</h2>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(
                [
                  ["오늘 결제", todays.reduce((a, o) => a + o.amount, 0), `${todays.length}건`],
                  ["매출 (구매 확정)", d.summary.confirmedSales, `${d.summary.confirmedCount}건`],
                  ["보관 중 (확정 전)", d.summary.escrow, `${d.summary.escrowCount}건`],
                  ["플랫폼 수수료", d.summary.platformFee, `수수료율 ${d.feePercent}%`],
                ] as const
              ).map(([t, v, sub]) => (
                <Link key={t} href="/admin/settlement" className="tap rounded-xl bg-white p-3">
                  <p className="text-[11px] text-gray-500">{t}</p>
                  <p className="text-lg font-extrabold tabular-nums text-gray-900">π {Math.round(v * 1e7) / 1e7}</p>
                  <p className="text-[10px] text-gray-400">{sub}</p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-4 bg-white">
            <div className="flex items-center justify-between px-4 pt-4">
              <h2 className="text-sm font-extrabold text-gray-900">최근 주문</h2>
              <Link href="/admin/orders" className="text-xs text-gray-400">
                전체 보기 ›
              </Link>
            </div>
            {d.orders.length === 0 ? (
              <p className="p-8 text-center text-sm text-gray-400">아직 주문이 없어요.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {d.orders.slice(0, 5).map((o) => (
                  <li key={o.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-gray-900">{o.listingTitle}</span>
                      <span className="block text-[11px] text-gray-500">
                        {o.buyer.username} → {o.seller.username} · {new Date(o.createdAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <PiPrice value={o.amount} size="sm" />
                      <span className="block text-[11px] text-gray-500">{orderStageLabel(o)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
