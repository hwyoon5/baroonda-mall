"use client";

import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { dailyStats, orderMetrics, type AdminOrdersData } from "@/lib/admin";

/** 관리자: 구매 확정 기준 매출·정산 집계, 판매자별 정산, 최근 14일 통계 */
export default function AdminSettlementPage() {
  const { data, error } = useAdminApi<AdminOrdersData>("/api/admin/orders");
  const s = data?.summary;
  const daily = data ? dailyStats(data.orders) : [];
  const max = Math.max(1, ...daily.map((d) => Math.max(d.paid, d.confirmed)));
  const m = data ? orderMetrics(data.orders) : null;

  return (
    <AdminShell title="정산·통계" error={error} loading={!data}>
      {data && s && m && (
        <>
          <section className="grid grid-cols-2 gap-2 p-4">
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

          <section className="mt-2 bg-white px-4 py-4">
            <h2 className="text-sm font-extrabold text-gray-900">최근 14일</h2>
            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["평균 결제액", `π ${m.avgAmount}`],
                  ["구매 확정률", `${m.confirmRate}%`],
                  ["반품·환불률", `${m.refundRate}%`],
                ] as const
              ).map(([t, v]) => (
                <div key={t} className="rounded-lg bg-gray-50 p-2">
                  <p className="text-[10px] text-gray-500">{t}</p>
                  <p className="text-sm font-extrabold tabular-nums text-gray-900">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 flex gap-3 text-[10px] text-gray-500">
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-violet-200" />
                결제액(주문일)
              </span>
              <span>
                <i className="mr-1 inline-block h-2 w-2 rounded-sm bg-pi" />
                확정 매출(확정일)
              </span>
            </p>
            <div className="mt-2 flex h-32 items-end gap-1" role="img" aria-label="최근 14일 일별 결제액과 구매 확정 매출">
              {daily.map((d) => (
                <div key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day} 주문 ${d.orders}건 · 결제 π ${d.paid} · 확정 π ${d.confirmed}`}>
                  <div className="flex flex-1 items-end gap-px">
                    <span className="flex-1 rounded-t bg-violet-200" style={{ height: `${(d.paid / max) * 100}%` }} />
                    <span className="flex-1 rounded-t bg-pi" style={{ height: `${(d.confirmed / max) * 100}%` }} />
                  </div>
                  <span className="mt-1 text-center text-[9px] tabular-nums text-gray-400">{Number(d.day.slice(8))}</span>
                </div>
              ))}
            </div>
            <table className="mt-3 w-full text-[11px] tabular-nums">
              <thead className="text-gray-400">
                <tr>
                  <th className="py-1 text-left font-normal">날짜</th>
                  <th className="text-right font-normal">주문</th>
                  <th className="text-right font-normal">결제액</th>
                  <th className="text-right font-normal">확정 매출</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-gray-700">
                {[...daily]
                  .reverse()
                  .filter((d) => d.orders || d.confirmed)
                  .map((d) => (
                    <tr key={d.day}>
                      <td className="py-1">{d.day.slice(5).replace("-", "/")}</td>
                      <td className="text-right">{d.orders}건</td>
                      <td className="text-right">π {d.paid}</td>
                      <td className="text-right font-bold">π {d.confirmed}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {daily.every((d) => !d.orders && !d.confirmed) && <p className="py-3 text-center text-xs text-gray-400">최근 14일 주문이 없어요.</p>}
          </section>

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
