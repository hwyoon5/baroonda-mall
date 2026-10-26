import { kstDay } from "./admin";
import { listingCategories, normalizeCategory } from "./categories";
import type { Listing, Order } from "./types";

export type StatsRange = "today" | "7d" | "30d" | "90d";
export const STATS_RANGES: { id: StatsRange; label: string; days: number }[] = [
  { id: "today", label: "오늘", days: 1 },
  { id: "7d", label: "7일", days: 7 },
  { id: "30d", label: "30일", days: 30 },
  { id: "90d", label: "90일", days: 90 },
];

export type StatsKpi = {
  /** 거래액(GMV): 결제 완료된 주문 금액 합계(이후 환불된 주문 포함) */
  gmv: number;
  orders: number;
  aov: number;
  buyers: number;
  activeSellers: number;
  /** 결제 시작 대비 결제 완료 비율(%) */
  payRate: number;
  confirmedSales: number;
  platformFee: number;
  refunded: number;
  refundCount: number;
  newUsers: number;
  /** 일 평균 방문자(로그인 이용자) */
  avgDau: number;
  newListings: number;
};
export type StatsPoint = { key: string; label: string; gmv: number; orders: number; buyers: number; newUsers: number; visitors: number | null };
export type StatsRank = { id: string; label: string; sub?: string; gmv: number; orders: number };
export type StatsData = {
  range: StatsRange;
  from: string;
  to: string;
  current: StatsKpi;
  previous: StatsKpi;
  series: StatsPoint[];
  categories: StatsRank[];
  sellers: StatsRank[];
  products: StatsRank[];
  totals: { users: number; buyers: number; sellers: number };
  generatedAt: string;
};

type Input = {
  orders: Order[];
  listings: Listing[];
  /** uid → 처음 활동 시각 */
  firstSeen: Map<string, string>;
  dau: Record<string, number>;
  feeOf: (o: Order) => number;
};

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const KST = 9 * HOUR;
const PAID = ["paid", "shipped", "completed", "refunded"];
const r7 = (n: number) => Math.round(n * 1e7) / 1e7;
const sum = (os: Order[], f: (o: Order) => number) => r7(os.reduce((a, o) => a + f(o), 0));
/** 한국 시간 자정(UTC ms) */
const kstMidnight = (t: number) => Math.floor((t + KST) / DAY) * DAY - KST;
const refundAt = (o: Order) => o.refund?.resolvedAt ?? o.updatedAt;

/** 기간: 오늘 0시(KST)부터 지금까지 / 최근 N일. 비교 기간은 같은 길이만큼 앞당긴 구간(오늘 ↔ 어제 같은 시각까지). */
export function bounds(range: StatsRange, now: number) {
  const days = STATS_RANGES.find((r) => r.id === range)!.days;
  const start = kstMidnight(now) - (days - 1) * DAY;
  const len = days * DAY;
  return { start, end: now, prevStart: start - len, prevEnd: now - len };
}

function kpi(inp: Input, from: number, to: number): StatsKpi {
  const inRange = (iso?: string) => !!iso && Date.parse(iso) >= from && Date.parse(iso) < to;
  const created = inp.orders.filter((o) => inRange(o.createdAt));
  const paid = created.filter((o) => PAID.includes(o.status));
  const attempted = created.filter((o) => PAID.includes(o.status) || o.status === "cancelled" || o.status === "approved");
  const confirmed = inp.orders.filter((o) => o.status === "completed" && inRange(o.confirmedAt));
  const refunds = inp.orders.filter((o) => o.status === "refunded" && inRange(refundAt(o)));
  const gmv = sum(paid, (o) => o.amount);
  const days: number[] = [];
  for (let t = kstMidnight(from); t < to; t += DAY) days.push(inp.dau[kstDay(t)] ?? 0);
  return {
    gmv,
    orders: paid.length,
    aov: paid.length ? r7(gmv / paid.length) : 0,
    buyers: new Set(paid.map((o) => o.buyer.uid)).size,
    activeSellers: new Set(paid.map((o) => o.seller.uid)).size,
    payRate: attempted.length ? Math.round((paid.length / attempted.length) * 1000) / 10 : 0,
    confirmedSales: sum(confirmed, (o) => o.amount),
    platformFee: sum(confirmed, inp.feeOf),
    refunded: sum(refunds, (o) => o.amount),
    refundCount: refunds.length,
    newUsers: [...inp.firstSeen.values()].filter(inRange).length,
    avgDau: days.length ? Math.round((days.reduce((a, n) => a + n, 0) / days.length) * 10) / 10 : 0,
    newListings: inp.listings.filter((l) => !l.demo && l.status !== "draft" && inRange(l.createdAt)).length,
  };
}

function rank(paid: Order[], key: (o: Order) => string, label: (o: Order, id: string) => string, sub?: (o: Order) => string, limit = 5): StatsRank[] {
  const m = new Map<string, StatsRank>();
  for (const o of paid) {
    const id = key(o);
    const r = m.get(id) ?? { id, label: label(o, id), sub: sub?.(o), gmv: 0, orders: 0 };
    r.gmv = r7(r.gmv + o.amount);
    r.orders++;
    m.set(id, r);
  }
  return [...m.values()].sort((a, b) => b.gmv - a.gmv || b.orders - a.orders).slice(0, limit);
}

/** 관리자 매출·통계: 기간 KPI, 비교 기간, 시간/일별 추이, 카테고리·판매자·상품 순위 */
export function buildStats(range: StatsRange, inp: Input, now = Date.now()): StatsData {
  const { start, end, prevStart, prevEnd } = bounds(range, now);
  const hourly = range === "today";
  const step = hourly ? HOUR : DAY;
  const count = hourly ? 24 : Math.round((end - start) / DAY + 0.5);
  const series: StatsPoint[] = Array.from({ length: count }, (_, i) => {
    const t = start + i * step;
    const day = kstDay(t);
    return {
      key: hourly ? `${day}T${String(i).padStart(2, "0")}` : day,
      label: hourly ? `${i}시` : `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`,
      gmv: 0,
      orders: 0,
      buyers: 0,
      newUsers: 0,
      visitors: hourly ? null : (inp.dau[day] ?? 0),
    };
  });
  const slot = (iso: string) => {
    const t = Date.parse(iso);
    if (t < start || t >= end) return undefined;
    return series[Math.floor((t - start) / step)];
  };
  const buyerSets = series.map(() => new Set<string>());
  const paid = inp.orders.filter((o) => PAID.includes(o.status) && Date.parse(o.createdAt) >= start && Date.parse(o.createdAt) < end);
  for (const o of paid) {
    const p = slot(o.createdAt)!;
    p.gmv = r7(p.gmv + o.amount);
    p.orders++;
    buyerSets[series.indexOf(p)].add(o.buyer.uid);
  }
  series.forEach((p, i) => (p.buyers = buyerSets[i].size));
  for (const t of inp.firstSeen.values()) {
    const p = slot(t);
    if (p) p.newUsers++;
  }

  const listingCat = new Map(inp.listings.map((l) => [l.id, normalizeCategory(l.category)]));
  const catName = (id: string) => listingCategories.find((c) => c.id === id)?.name ?? "기타";
  return {
    range,
    from: new Date(start).toISOString(),
    to: new Date(end).toISOString(),
    current: kpi(inp, start, end),
    previous: kpi(inp, prevStart, prevEnd),
    series,
    categories: rank(paid, (o) => listingCat.get(o.listingId) ?? "etc", (_, id) => catName(id), undefined, 10),
    sellers: rank(paid, (o) => o.seller.uid, (o) => o.seller.username),
    products: rank(paid, (o) => o.listingId, (o) => o.listingTitle, (o) => o.seller.username),
    totals: {
      users: inp.firstSeen.size,
      buyers: new Set(inp.orders.filter((o) => PAID.includes(o.status)).map((o) => o.buyer.uid)).size,
      sellers: new Set(inp.listings.filter((l) => !l.demo && l.status !== "draft").map((l) => l.seller.uid)).size,
    },
    generatedAt: new Date(now).toISOString(),
  };
}
