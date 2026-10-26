"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import DeliveryControl from "@/components/DeliveryControl";
import PiPrice from "@/components/PiPrice";
import { ORDER_FILTERS, type AdminOrdersData } from "@/lib/admin";
import { formatOption } from "@/lib/format";
import { claimKind, claimKindLabel, claimStatusText, orderStageLabel, payoutStatusLabel, refundOpen, type Order } from "@/lib/types";

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "");
const short = (s?: string) => (s ? `${s.slice(0, 8)}…` : "-");

/** Pi 결제 단계: 서버 승인(approve) → 블록체인 완료(complete) */
function paymentState(o: Order): [string, string] {
  if (o.status === "approved") return ["승인", "bg-amber-50 text-amber-700"];
  if (o.status === "cancelled") return ["취소", "bg-gray-100 text-gray-500"];
  if (o.status === "refunded") return ["환불", "bg-rose-50 text-rose-600"];
  return ["완료", "bg-emerald-50 text-emerald-700"];
}

export default function AdminOrdersPage() {
  return (
    <Suspense>
      <AdminOrders />
    </Suspense>
  );
}

/** 관리자: 전체 주문의 결제·배송 상태 확인, 상품 준비중·배송중(송장)·배송 완료 처리 */
function AdminOrders() {
  const router = useRouter();
  const filterId = useSearchParams().get("filter") ?? "all";
  const { data, setData, error } = useAdminApi<AdminOrdersData>("/api/admin/orders");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const replace = (o: Order) => setData((d) => d && { ...d, orders: d.orders.map((x) => (x.id === o.id ? o : x)) });

  const match = ORDER_FILTERS.find((f) => f.id === filterId)?.match ?? null;
  const needle = q.trim().toLowerCase();
  const orders =
    data?.orders.filter(
      (o) => (!match || match(o)) && (!needle || [o.id, o.listingTitle, o.buyer.username, o.seller.username, o.fulfillment?.trackingNumber ?? ""].some((s) => s.toLowerCase().includes(needle))),
    ) ?? [];

  return (
    <AdminShell title="주문·배송" error={error} loading={!data}>
      {data && (
        <>
          <div className="bg-white px-4 pt-3">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="주문번호·상품명·주문자·판매자·송장 검색"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-pi"
            />
          </div>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto bg-white px-4 py-3">
            {ORDER_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => router.replace(f.id === "all" ? "/admin/orders" : `/admin/orders?filter=${f.id}`, { scroll: false })}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs ${filterId === f.id ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`}
              >
                {f.label} {f.match ? data.orders.filter(f.match).length : data.orders.length}
              </button>
            ))}
          </div>
          {orders.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">해당하는 주문이 없어요.</p>
          ) : (
            <ul className="divide-y divide-gray-100 bg-white">
              {orders.map((o) => {
                const [pay, payClass] = paymentState(o);
                return (
                  <li key={o.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-900">{o.listingTitle}</span>
                        {o.option && <span className="block truncate text-[11px] text-gray-500">{formatOption(o.option)}</span>}
                        <span className="block text-[11px] text-gray-500">
                          주문자 {o.buyer.username} · 판매자 {o.seller.username}
                        </span>
                        <span className="block text-[11px] text-gray-400">
                          {new Date(o.createdAt).toLocaleString("ko-KR")} · 주문 {o.id}
                        </span>
                        <span className="block text-[11px] text-gray-400">
                          결제 ID {short(o.paymentId)} · txid {short(o.txid)}
                        </span>
                        {o.refund && o.refund.status !== "withdrawn" && (
                          <span className={`block text-[11px] font-bold ${refundOpen(o) ? "text-rose-600" : "text-gray-500"}`}>
                            {claimKindLabel[claimKind(o.refund)]} · {claimStatusText(o.refund)}
                          </span>
                        )}
                        {o.autoConfirmAt && o.status === "shipped" && !refundOpen(o) && <span className="block text-[11px] text-teal-700">{day(o.autoConfirmAt)} 자동 구매 확정 예정</span>}
                        {o.fulfillment?.method === "delivery" && (
                          <span className="block text-[11px] font-medium text-sky-700">
                            {o.fulfillment.carrier} {o.fulfillment.trackingNumber}
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <PiPrice value={o.amount} size="sm" />
                        <span className={`mt-1 block rounded px-1.5 py-0.5 text-[11px] font-bold ${payClass}`}>결제 {pay}</span>
                        <span className="mt-0.5 block text-[11px] text-gray-500">{orderStageLabel(o)}</span>
                        {o.status === "completed" && (
                          <span className="block text-[11px] text-gray-500">
                            {o.confirmedBy === "auto" ? "자동 확정 · " : ""}
                            {payoutStatusLabel[o.payout]}
                          </span>
                        )}
                      </span>
                    </div>
                    {(o.status === "paid" || o.status === "shipped") && !refundOpen(o) && (
                      <>
                        <button
                          type="button"
                          aria-expanded={open === o.id}
                          onClick={() => setOpen(open === o.id ? null : o.id)}
                          className="tap mt-2 w-full rounded-lg border border-gray-200 py-1.5 text-xs font-bold text-gray-700"
                        >
                          {open === o.id ? "배송 관리 닫기" : "배송 상태·송장 관리"}
                        </button>
                        {open === o.id && (
                          <div className="mt-2 rounded-xl bg-gray-50 p-1">
                            <DeliveryControl key={o.updatedAt} order={o} onSaved={replace} />
                          </div>
                        )}
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
}
