"use client";

import Link from "next/link";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import type { AdminOrdersData } from "@/lib/admin";

/** 관리자: 구매 확정 기준 매출·정산 집계, 판매자별 정산 */
export default function AdminSettlementPage() {
  const { data, error } = useAdminApi<AdminOrdersData>("/api/admin/orders");
  const s = data?.summary;

  return (
    <AdminShell title="정산" error={error} loading={!data}>
      {data && s && (
        <>
          <section className="grid grid-cols-2 gap-2 p-4 lg:grid-cols-4">
            {(
              [
                ["매출 (구매 확정)", s.confirmedSales, `구매 확정 ${s.confirmedCount}건 · 자동 ${s.autoConfirmedCount}건`, "text-gray-900"],
                ["최종 정산 대금", s.settlementAmount, "판매자에게 보낼 금액(수수료 차감)", "text-gray-900"],
                ["플랫폼 수수료", s.platformFee, `수수료율 ${data.feePercent}%`, "text-pi"],
                ["보관 중 (확정 전)", s.escrow, `에스크로 ${s.escrowCount}건 · 반품·교환 ${s.claimOpen}건`, "text-sky-700"],
                ["정산 완료", s.payoutPaid, "판매자 지갑 송금 완료", "text-emerald-600"],
                ["정산 대기", s.payoutPending, "송금 대기·진행 중", "text-amber-600"],
                ["정산 실패", s.payoutFailed, "판매자 재시도 필요", "text-rose-600"],
                ["환불", s.refunded, "구매자에게 반환", "text-rose-600"],
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
            매출과 정산 대금은 구매 확정된 주문만 집계해요. 구매자 결제금(누적 π {s.paidTotal})은 확정 전까지 앱 지갑에 보관되고, 구매 확정(배송 완료 후 {data.autoConfirmDays}일이 지나면 자동) 시 수수료를 뺀 금액이 판매자에게 정산(Pi A2U)돼요.
          </p>

          <Link href="/admin/stats" className="tap mx-4 mt-1 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-xs font-bold text-gray-700">
            기간별 거래액·주문·이용자 추이는 매출·통계에서 볼 수 있어요 <span className="text-pi">›</span>
          </Link>

          <h2 className="px-4 pt-4 text-sm font-extrabold text-gray-900">판매자별 정산</h2>
          {data.sellers.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">아직 판매 내역이 없어요.</p>
          ) : (
            <ul className="mt-2 divide-y divide-gray-100 bg-white">
              {data.sellers.map((x) => (
                <li key={x.key} className="flex items-center gap-3 px-4 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-gray-900">{x.username}</span>
                    <span className="block text-[11px] text-gray-500">
                      구매 확정 {x.confirmedCount}건 · 매출 π {x.confirmedSales}
                    </span>
                    <span className="block text-[11px] text-gray-400">
                      정산 대금 π {x.settlementAmount} · 보관 중 π {x.escrow}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px]">
                    <span className="block font-bold text-emerald-600">정산 완료 π {x.payoutPaid}</span>
                    <span className="block text-amber-600">대기 π {x.payoutPending}</span>
                    {x.payoutFailed > 0 && <span className="block text-rose-600">실패 π {x.payoutFailed}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
}
