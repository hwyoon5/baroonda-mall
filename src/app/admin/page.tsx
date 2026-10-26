"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import DeliveryControl from "@/components/DeliveryControl";
import PiPrice from "@/components/PiPrice";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/client/api";
import { formatOption } from "@/lib/format";
import { claimKind, claimKindLabel, claimStatusText, deliveryStage, orderStageLabel, payoutStatusLabel, refundOpen, type Order } from "@/lib/types";

type Settlement = {
  confirmedCount: number;
  autoConfirmedCount: number;
  confirmedSales: number;
  settlementAmount: number;
  platformFee: number;
  escrowCount: number;
  escrow: number;
  claimOpen: number;
  paidTotal: number;
  payoutPaid: number;
  payoutPending: number;
  payoutFailed: number;
  refunded: number;
};
type AdminData = {
  orders: Order[];
  summary: Settlement;
  sellers: (Settlement & { key: string; uid: string; username: string })[];
  feePercent: number;
  autoConfirmDays: number;
};
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }) : "");

const FILTERS: [string, ((o: Order) => boolean) | null][] = [
  ["전체", null],
  ["결제 진행중", (o) => o.status === "approved"],
  ["신규 주문", (o) => deliveryStage(o) === "ready"],
  ["상품 준비중", (o) => deliveryStage(o) === "preparing"],
  ["배송중", (o) => deliveryStage(o) === "shipping"],
  ["배송 완료", (o) => deliveryStage(o) === "delivered"],
  ["반품·교환 요청", (o) => refundOpen(o)],
  ["구매 확정", (o) => o.status === "completed"],
  ["취소·환불", (o) => o.status === "cancelled" || o.status === "refunded"],
];

/** Pi 결제 단계: 서버 승인(approve) → 블록체인 완료(complete) */
function paymentState(o: Order): [string, string] {
  if (o.status === "approved") return ["승인", "bg-amber-50 text-amber-700"];
  if (o.status === "cancelled") return ["취소", "bg-gray-100 text-gray-500"];
  if (o.status === "refunded") return ["환불", "bg-rose-50 text-rose-600"];
  return ["완료", "bg-emerald-50 text-emerald-700"];
}

const short = (s?: string) => (s ? `${s.slice(0, 8)}…` : "-");

/** 관리자 전용: 전체 Pi 주문·결제 상태, 매출·정산 집계. 권한은 서버(/api/admin/orders)가 확인한다. */
export default function AdminPage() {
  const { user, ready } = useAuth();
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const [tab, setTab] = useState<"orders" | "settlement">("orders");
  const [filter, setFilter] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const replace = (o: Order) => setData((d) => d && { ...d, orders: d.orders.map((x) => (x.id === o.id ? o : x)) });

  useEffect(() => {
    if (!user) return;
    setError(null);
    api<AdminData>("/api/admin/orders")
      .then(setData)
      .catch((e) => setError({ status: e instanceof ApiError ? e.status : undefined, message: e.message }));
  }, [user]);

  const match = FILTERS[filter][1];
  const orders = data?.orders.filter((o) => !match || match(o)) ?? [];

  return (
    <>
      <SubHeader title="관리자 · 결제/정산" />
      {!ready ? null : !user ? (
        <LoginCard message="관리자 Pi 계정으로 로그인해 주세요." />
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-sm font-bold text-gray-900">{error.status === 403 ? "관리자만 볼 수 있는 페이지예요." : error.message}</p>
          <Link href="/" className="tap mt-4 inline-block rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-600">
            홈으로
          </Link>
        </div>
      ) : !data ? (
        <p className="p-10 text-center text-sm text-gray-400">불러오는 중…</p>
      ) : (
        <>
          <div role="tablist" className="sticky top-14 z-10 grid grid-cols-2 border-b border-gray-100 bg-white">
            {(
              [
                ["orders", `주문·결제 ${data.orders.length}`],
                ["settlement", "정산 관리"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={`py-3 text-sm font-bold ${tab === id ? "border-b-2 border-pi text-pi" : "text-gray-400"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "orders" ? (
            <>
              <div className="no-scrollbar flex gap-1.5 overflow-x-auto bg-white px-4 py-3">
                {FILTERS.map(([label, m], i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setFilter(i)}
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs ${filter === i ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`}
                  >
                    {label} {m ? data.orders.filter(m).length : data.orders.length}
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
                            {o.autoConfirmAt && o.status === "shipped" && !refundOpen(o) && (
                              <span className="block text-[11px] text-teal-700">{day(o.autoConfirmAt)} 자동 구매 확정 예정</span>
                            )}
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
          ) : (
            <>
              <section className="grid grid-cols-2 gap-2 p-4">
                {(
                  [
                    ["매출 (구매 확정)", data.summary.confirmedSales, `구매 확정 ${data.summary.confirmedCount}건 · 자동 ${data.summary.autoConfirmedCount}건`, "text-gray-900"],
                    ["최종 정산 대금", data.summary.settlementAmount, "판매자에게 보낼 금액(수수료 차감)", "text-gray-900"],
                    ["플랫폼 수수료", data.summary.platformFee, `수수료율 ${data.feePercent}%`, "text-pi"],
                    ["보관 중 (확정 전)", data.summary.escrow, `에스크로 ${data.summary.escrowCount}건 · 반품·교환 ${data.summary.claimOpen}건`, "text-sky-700"],
                    ["정산 완료", data.summary.payoutPaid, "판매자 지갑 송금 완료", "text-emerald-600"],
                    ["정산 대기", data.summary.payoutPending, "송금 대기·진행 중", "text-amber-600"],
                    ["정산 실패", data.summary.payoutFailed, "판매자 재시도 필요", "text-rose-600"],
                    ["환불", data.summary.refunded, "구매자에게 반환", "text-rose-600"],
                  ] as const
                ).map(([t, v, d, c]) => (
                  <div key={t} className="rounded-xl bg-white p-3">
                    <p className="text-[11px] text-gray-500">{t}</p>
                    <p className={`text-lg font-extrabold tabular-nums ${c}`}>π {v}</p>
                    <p className="text-[10px] text-gray-400">{d}</p>
                  </div>
                ))}
              </section>
              <p className="px-4 pb-2 text-[11px] text-gray-400">
                매출과 정산 대금은 구매 확정된 주문만 집계해요. 구매자 결제금(누적 π {data.summary.paidTotal})은 확정 전까지 앱 지갑에 보관되고, 구매 확정(배송 완료 후 {data.autoConfirmDays}일이 지나면 자동) 시 수수료를 뺀 금액이 판매자에게 정산(Pi A2U)돼요.
              </p>
              <h2 className="px-4 pt-2 text-sm font-extrabold text-gray-900">판매자별 정산</h2>
              {data.sellers.length === 0 ? (
                <p className="p-10 text-center text-sm text-gray-400">아직 판매 내역이 없어요.</p>
              ) : (
                <ul className="mt-2 divide-y divide-gray-100 bg-white">
                  {data.sellers.map((s) => (
                    <li key={s.key} className="flex items-center gap-3 px-4 py-3">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold text-gray-900">{s.username}</span>
                        <span className="block text-[11px] text-gray-500">
                          구매 확정 {s.confirmedCount}건 · 매출 π {s.confirmedSales}
                        </span>
                        <span className="block text-[11px] text-gray-400">
                          정산 대금 π {s.settlementAmount} · 보관 중 π {s.escrow}
                        </span>
                      </span>
                      <span className="shrink-0 text-right text-[11px]">
                        <span className="block font-bold text-emerald-600">정산 완료 π {s.payoutPaid}</span>
                        <span className="block text-amber-600">대기 π {s.payoutPending}</span>
                        {s.payoutFailed > 0 && <span className="block text-rose-600">실패 π {s.payoutFailed}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
