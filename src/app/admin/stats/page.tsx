"use client";

import { useState } from "react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { STATS_RANGES, type StatsData, type StatsKpi, type StatsPoint, type StatsRange } from "@/lib/stats";

type Metric = { id: keyof Omit<StatsPoint, "key" | "label">; label: string; pi?: boolean; color: string };
const METRICS: Metric[] = [
  { id: "gmv", label: "거래액", pi: true, color: "#6b3fa0" },
  { id: "orders", label: "주문", color: "#0ea5e9" },
  { id: "buyers", label: "구매자", color: "#10b981" },
  { id: "newUsers", label: "신규 가입", color: "#f59e0b" },
  { id: "visitors", label: "방문자", color: "#ec4899" },
];
const num = (n: number) => (Number.isInteger(n) ? n.toLocaleString("ko-KR") : String(Math.round(n * 100) / 100));

function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev) return <span className="text-[10px] text-gray-400">-</span>;
  const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
  const good = invert ? pct < 0 : pct > 0;
  return <span className={`text-[10px] font-bold ${pct === 0 ? "text-gray-400" : good ? "text-emerald-600" : "text-rose-600"}`}>{pct === 0 ? "변동 없음" : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}%`}</span>;
}

function Card({ label, k, cur, prev, unit, invert }: { label: string; k: keyof StatsKpi; cur: StatsKpi; prev: StatsKpi; unit?: string; invert?: boolean }) {
  return (
    <div className="rounded-xl bg-white p-3">
      <p className="text-[11px] text-gray-500">{label}</p>
      <p className="text-lg font-extrabold tabular-nums text-gray-900">
        {unit === "π" && <span className="mr-0.5 text-pi">π</span>}
        {num(cur[k])}
        {unit && unit !== "π" && <span className="ml-0.5 text-xs font-bold text-gray-500">{unit}</span>}
      </p>
      <p className="flex items-center justify-between gap-1 text-[10px] text-gray-400">
        <span className="truncate">
          이전 {unit === "π" ? "π " : ""}
          {num(prev[k])}
          {unit && unit !== "π" ? unit : ""}
        </span>
        <Delta cur={cur[k]} prev={prev[k]} invert={invert} />
      </p>
    </div>
  );
}

function Chart({ series, metric }: { series: StatsPoint[]; metric: Metric }) {
  const vals = series.map((p) => (p[metric.id] as number | null) ?? 0);
  const max = Math.max(1, ...vals);
  const total = vals.reduce((a, n) => a + n, 0);
  const every = Math.ceil(series.length / 7);
  const peak = vals.indexOf(Math.max(...vals));
  return (
    <div>
      <p className="text-[11px] text-gray-500">
        합계 <b className="text-gray-900">{metric.pi ? "π " : ""}{num(Math.round(total * 1e7) / 1e7)}</b>
        {total > 0 && <span className="ml-2">최고 {series[peak].label} · {metric.pi ? "π " : ""}{num(vals[peak])}</span>}
      </p>
      <div className="mt-2 flex h-36 items-end gap-[2px] lg:h-56" role="img" aria-label={`${metric.label} 추이`}>
        {series.map((p, i) => (
          <div key={p.key} className="flex h-full flex-1 flex-col justify-end" title={`${p.label} · ${metric.label} ${metric.pi ? "π " : ""}${num(vals[i])}`}>
            <span className="w-full rounded-t-sm" style={{ height: `${Math.max(vals[i] ? 3 : 0, (vals[i] / max) * 100)}%`, background: metric.color, opacity: i === peak && total ? 1 : 0.6 }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-[2px]">
        {series.map((p, i) => (
          <span key={p.key} className="flex-1 overflow-visible whitespace-nowrap text-center text-[9px] tabular-nums text-gray-400">
            {i % every === 0 ? p.label : ""}
          </span>
        ))}
      </div>
    </div>
  );
}

function Ranking({ title, rows, total }: { title: string; rows: StatsData["sellers"]; total: number }) {
  return (
    <section className="mt-2 bg-white px-4 py-4 lg:mt-0 lg:rounded-xl">
      <h2 className="text-sm font-extrabold text-gray-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-400">이 기간 거래가 없어요.</p>
      ) : (
        <ol className="mt-2 space-y-2">
          {rows.map((r, i) => (
            <li key={r.id}>
              <div className="flex items-baseline gap-2 text-xs">
                <b className="w-4 text-gray-400">{i + 1}</b>
                <span className="min-w-0 flex-1 truncate text-gray-900">
                  {r.label}
                  {r.sub && <span className="ml-1 text-[10px] text-gray-400">{r.sub}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-gray-500">{r.orders}건</span>
                <b className="w-20 shrink-0 text-right tabular-nums text-gray-900">π {num(r.gmv)}</b>
              </div>
              <div className="ml-6 mt-1 h-1.5 rounded-full bg-gray-100">
                <div className="h-full rounded-full bg-pi/70" style={{ width: `${total ? (r.gmv / total) * 100 : 0}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function downloadCsv(d: StatsData) {
  const head = ["구간", "거래액(π)", "주문", "구매자", "신규 가입", "방문자"];
  const rows = d.series.map((p) => [p.key, p.gmv, p.orders, p.buyers, p.newUsers, p.visitors ?? ""].join(","));
  const blob = new Blob(["\uFEFF" + [head.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `baroonda-stats-${d.range}-${d.to.slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** 관리자 매출·통계: 기간별 거래액(GMV)·주문·이용자 추이와 순위 */
export default function AdminStatsPage() {
  const [range, setRange] = useState<StatsRange>("7d");
  const [metric, setMetric] = useState<Metric>(METRICS[0]);
  const { data, error } = useAdminApi<StatsData>(`/api/admin/stats?range=${range}`);
  const d = data?.range === range ? data : null;
  const prevLabel = range === "today" ? "어제 같은 시각까지" : `직전 ${STATS_RANGES.find((r) => r.id === range)!.days}일`;
  const shown = d && metric.id === "visitors" && range === "today" ? METRICS[0] : metric;

  return (
    <AdminShell title="매출·통계" error={error}>
      <div className="sticky top-[6.5rem] z-[5] lg:top-14 flex gap-1.5 border-b border-gray-100 bg-white px-4 py-2.5">
        {STATS_RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            aria-pressed={range === r.id}
            onClick={() => setRange(r.id)}
            className={`flex-1 rounded-full border py-1 text-xs font-bold ${range === r.id ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`}
          >
            {r.label}
          </button>
        ))}
      </div>
      {!d ? (
        <p className="p-10 text-center text-sm text-gray-400">불러오는 중…</p>
      ) : (
        <>
          <p className="px-4 pt-3 text-[11px] text-gray-400">
            {new Date(d.from).toLocaleDateString("ko-KR")} ~ {new Date(d.to).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · 비교: {prevLabel}
          </p>
          <section className="grid grid-cols-2 gap-2 p-4 pt-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            <Card label="거래액 (GMV)" k="gmv" cur={d.current} prev={d.previous} unit="π" />
            <Card label="주문 건수" k="orders" cur={d.current} prev={d.previous} unit="건" />
            <Card label="평균 결제액" k="aov" cur={d.current} prev={d.previous} unit="π" />
            <Card label="구매자 수" k="buyers" cur={d.current} prev={d.previous} unit="명" />
            <Card label="신규 가입자" k="newUsers" cur={d.current} prev={d.previous} unit="명" />
            <Card label="일 평균 방문자" k="avgDau" cur={d.current} prev={d.previous} unit="명" />
            <Card label="구매 확정 매출" k="confirmedSales" cur={d.current} prev={d.previous} unit="π" />
            <Card label="플랫폼 수수료" k="platformFee" cur={d.current} prev={d.previous} unit="π" />
            <Card label="결제 완료율" k="payRate" cur={d.current} prev={d.previous} unit="%" />
            <Card label="환불" k="refunded" cur={d.current} prev={d.previous} unit="π" invert />
            <Card label="거래 판매자" k="activeSellers" cur={d.current} prev={d.previous} unit="명" />
            <Card label="새로 등록된 상품" k="newListings" cur={d.current} prev={d.previous} unit="개" />
          </section>

          <section className="bg-white px-4 py-4 lg:mx-4 lg:rounded-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-gray-900">{range === "today" ? "시간대별 추이" : "일별 추이"}</h2>
              <button type="button" onClick={() => downloadCsv(d)} className="tap rounded-full border border-gray-200 px-2.5 py-1 text-[11px] text-gray-600">
                CSV 내려받기
              </button>
            </div>
            <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto">
              {METRICS.filter((m) => !(m.id === "visitors" && range === "today")).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  aria-pressed={shown.id === m.id}
                  onClick={() => setMetric(m)}
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${shown.id === m.id ? "text-white" : "bg-gray-100 text-gray-500"}`}
                  style={shown.id === m.id ? { background: m.color } : undefined}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="mt-3">
              <Chart series={d.series} metric={shown} />
            </div>
          </section>

          <section className="mt-2 grid grid-cols-3 gap-2 bg-white px-4 py-4 text-center lg:mx-4 lg:rounded-xl">
            {(
              [
                ["누적 이용자", d.totals.users],
                ["누적 구매자", d.totals.buyers],
                ["상품 등록 판매자", d.totals.sellers],
              ] as const
            ).map(([t, v]) => (
              <div key={t} className="rounded-lg bg-gray-50 p-2">
                <p className="text-[10px] text-gray-500">{t}</p>
                <p className="text-base font-extrabold tabular-nums text-gray-900">{num(v)}</p>
              </div>
            ))}
          </section>

          <div className="lg:mt-4 lg:grid lg:grid-cols-3 lg:items-start lg:gap-4 lg:px-4">
          <Ranking title="카테고리별 거래액" rows={d.categories} total={d.current.gmv} />
          <Ranking title="판매자 TOP 5" rows={d.sellers} total={d.current.gmv} />
          <Ranking title="상품 TOP 5" rows={d.products} total={d.current.gmv} />
          </div>

          <p className="px-4 py-4 text-[10px] leading-relaxed text-gray-400">
            거래액은 결제가 완료된 주문 금액이에요(이후 환불된 주문 포함, 결제일 기준). 구매 확정 매출·수수료는 확정일, 환불은 환불일 기준이에요. 방문자는 Pi 로그인 상태로 앱을 연 이용자 수이고, 이용자 기록은 이 기능 배포 후부터 쌓여요. 그 전 이용자는 첫 주문·상품 등록일을 가입일로 봐요.
          </p>
        </>
      )}
    </AdminShell>
  );
}
