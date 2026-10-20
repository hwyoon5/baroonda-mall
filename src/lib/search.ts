import { listingCategories } from "./categories";
import { discountRate } from "./format";
import type { Listing, TradeMethod } from "./types";

export const SORTS = [
  { id: "recent", label: "최신순" },
  { id: "popular", label: "인기순(판매량)" },
  { id: "priceAsc", label: "낮은 가격순" },
  { id: "priceDesc", label: "높은 가격순" },
  { id: "discount", label: "할인율순" },
  { id: "brand", label: "브랜드순(가나다)" },
] as const;
export type SortId = (typeof SORTS)[number]["id"];

export const PRICE_RANGES: { label: string; min?: number; max?: number }[] = [
  { label: "1π 이하", max: 1 },
  { label: "1~5π", min: 1, max: 5 },
  { label: "5~10π", min: 5, max: 10 },
  { label: "10π 이상", min: 10 },
];

export type SearchState = {
  q: string;
  sort: SortId;
  min?: number;
  max?: number;
  kind?: "new" | "used";
  cat?: string;
  brands: string[];
  trade?: TradeMethod;
  fast: boolean;
  avail: boolean;
};

type Raw = URLSearchParams | Record<string, string | string[] | undefined>;
const get = (p: Raw, k: string) => {
  const v = p instanceof URLSearchParams ? p.get(k) : p[k];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};
const amount = (v: string) => {
  if (!v.trim()) return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};
export const brandKey = (b: string) => b.trim().toLowerCase();

/** URL 검색 조건 파싱. 잘못된 값은 무시하고 기본값을 쓴다. (서버·화면 공용) */
export function parseSearch(p: Raw): SearchState {
  const sort = get(p, "sort");
  const kind = get(p, "kind");
  const trade = get(p, "trade");
  const cat = get(p, "cat");
  let min = amount(get(p, "min"));
  let max = amount(get(p, "max"));
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min];
  return {
    q: get(p, "q").trim().slice(0, 50),
    sort: SORTS.some((s) => s.id === sort) ? (sort as SortId) : "recent",
    min,
    max,
    kind: kind === "new" || kind === "used" ? kind : undefined,
    cat: listingCategories.some((c) => c.id === cat) ? cat : undefined,
    brands: [...new Set(get(p, "brand").split(",").map((b) => b.trim().slice(0, 30)).filter(Boolean))].slice(0, 10),
    trade: trade === "direct" || trade === "delivery" ? trade : undefined,
    fast: get(p, "fast") === "1",
    avail: get(p, "avail") === "1",
  };
}

export function toQuery(s: SearchState) {
  const p = new URLSearchParams();
  if (s.q) p.set("q", s.q);
  if (s.sort !== "recent") p.set("sort", s.sort);
  if (s.min !== undefined) p.set("min", String(s.min));
  if (s.max !== undefined) p.set("max", String(s.max));
  if (s.kind) p.set("kind", s.kind);
  if (s.cat) p.set("cat", s.cat);
  if (s.brands.length) p.set("brand", s.brands.join(","));
  if (s.trade) p.set("trade", s.trade);
  if (s.fast) p.set("fast", "1");
  if (s.avail) p.set("avail", "1");
  return p.toString();
}

export const activeFilterCount = (s: SearchState) =>
  [s.min !== undefined || s.max !== undefined, s.kind, s.cat, s.brands.length, s.trade, s.fast, s.avail].filter(Boolean).length;

export const NO_FILTERS: Partial<SearchState> = { min: undefined, max: undefined, kind: undefined, cat: undefined, brands: [], trade: undefined, fast: false, avail: false };

export const isAvailable = (l: Listing) => l.status === "selling" && !(l.condition === "new" && (l.stock ?? 1) <= 0);

/** skip: 해당 필터를 빼고 걸러 패싯 개수를 셀 때 사용 */
export function filterListings(items: Listing[], s: SearchState, skip?: "brand" | "cat") {
  const brands = new Set(s.brands.map(brandKey));
  return items.filter(
    (l) =>
      (s.min === undefined || l.pricePi >= s.min) &&
      (s.max === undefined || l.pricePi <= s.max) &&
      (!s.kind || l.condition === s.kind) &&
      (skip === "cat" || !s.cat || l.category === s.cat) &&
      (skip === "brand" || !brands.size || (!!l.brand && brands.has(brandKey(l.brand)))) &&
      (!s.trade || l.tradeMethods.includes(s.trade)) &&
      (!s.fast || l.fastShipping) &&
      (!s.avail || isAvailable(l)),
  );
}

const recent = (a: Listing, b: Listing) => b.createdAt.localeCompare(a.createdAt);
const comparators: Record<SortId, (a: Listing, b: Listing) => number> = {
  recent,
  popular: (a, b) => (b.soldCount ?? 0) - (a.soldCount ?? 0) || recent(a, b),
  priceAsc: (a, b) => a.pricePi - b.pricePi || recent(a, b),
  priceDesc: (a, b) => b.pricePi - a.pricePi || recent(a, b),
  discount: (a, b) => discountRate(b.pricePi, b.originalPricePi) - discountRate(a.pricePi, a.originalPricePi) || recent(a, b),
  brand: (a, b) =>
    Number(!a.brand) - Number(!b.brand) || brandKey(a.brand ?? "").localeCompare(brandKey(b.brand ?? ""), "ko") || a.title.localeCompare(b.title, "ko"),
};

export const sortListings = (items: Listing[], sort: SortId) => [...items].sort(comparators[sort]);
export const applySearch = (items: Listing[], s: SearchState) => sortListings(filterListings(items, s), s.sort);

export function searchFacets(items: Listing[], s: SearchState) {
  const brands = new Map<string, { name: string; count: number }>();
  for (const l of filterListings(items, s, "brand")) {
    if (!l.brand) continue;
    const e = brands.get(brandKey(l.brand)) ?? { name: l.brand.trim(), count: 0 };
    e.count++;
    brands.set(brandKey(l.brand), e);
  }
  const cats = new Map<string, number>();
  for (const l of filterListings(items, s, "cat")) cats.set(l.category, (cats.get(l.category) ?? 0) + 1);
  return {
    brands: [...brands.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ko")).slice(0, 30),
    cats: listingCategories.filter((c) => cats.has(c.id)).map((c) => ({ id: c.id, name: c.name, count: cats.get(c.id)! })),
  };
}
export type SearchFacets = ReturnType<typeof searchFacets>;
