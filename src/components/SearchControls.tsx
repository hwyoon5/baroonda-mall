"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { listingCategories } from "@/lib/categories";
import { NO_FILTERS, PRICE_RANGES, SORTS, activeFilterCount, brandKey, toQuery, type SearchFacets, type SearchState, type SortId } from "@/lib/search";

const chip = (on: boolean) =>
  `tap shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-pi bg-pi text-white" : "border-gray-200 bg-white text-gray-700"}`;

const priceLabel = (min?: number, max?: number) =>
  min !== undefined && max !== undefined ? `${min}~${max}π` : min !== undefined ? `${min}π 이상` : `${max}π 이하`;

/** 검색 결과 상단: 빠른 필터, 적용된 필터, 정렬, 상세 필터(가격대·카테고리·브랜드) */
export default function SearchControls({ state, facets }: { state: SearchState; facets: SearchFacets }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const go = (patch: Partial<SearchState>) => {
    const qs = toQuery({ ...state, ...patch });
    router.push(qs ? `/search?${qs}` : "/search", { scroll: false });
  };
  const n = activeFilterCount(state);
  const quick: { label: string; on: boolean; patch: Partial<SearchState> }[] = [
    { label: "빠른배송", on: state.fast, patch: { fast: !state.fast } },
    { label: "구매 가능만", on: state.avail, patch: { avail: !state.avail } },
  ];
  const applied: { label: string; patch: Partial<SearchState> }[] = [
    ...(state.min !== undefined || state.max !== undefined ? [{ label: priceLabel(state.min, state.max), patch: { min: undefined, max: undefined } }] : []),
    ...(state.cat ? [{ label: listingCategories.find((c) => c.id === state.cat)?.name ?? state.cat, patch: { cat: undefined } }] : []),
    ...state.brands.map((b) => ({ label: b, patch: { brands: state.brands.filter((x) => x !== b) } })),
  ];

  return (
    <section aria-label="검색 필터와 정렬" className="bg-white px-4 pt-3 pb-1">
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        <button type="button" onClick={() => setOpen(true)} className={chip(n > 0)}>
          <svg viewBox="0 0 24 24" className="-mt-0.5 mr-1 inline h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          필터{n ? ` ${n}` : ""}
        </button>
        {quick.map((c) => (
          <button key={c.label} type="button" aria-pressed={c.on} onClick={() => go(c.patch)} className={chip(c.on)}>
            {c.label}
          </button>
        ))}
      </div>
      <div className="mt-2.5 flex items-start justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {applied.map((a) => (
            <button key={a.label} type="button" onClick={() => go(a.patch)} aria-label={`${a.label} 필터 해제`} className="tap rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-pi">
              {a.label} ✕
            </button>
          ))}
          {n > 0 && (
            <button type="button" onClick={() => go(NO_FILTERS)} className="tap px-1 py-1 text-[11px] text-gray-400 underline">
              전체 해제
            </button>
          )}
        </div>
        <select
          aria-label="정렬"
          value={state.sort}
          onChange={(e) => go({ sort: e.target.value as SortId })}
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-bold text-gray-800"
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      {open && (
        <FilterSheet
          state={state}
          facets={facets}
          onClose={() => setOpen(false)}
          onApply={(patch) => {
            setOpen(false);
            go(patch);
          }}
        />
      )}
    </section>
  );
}

function FilterSheet({ state, facets, onClose, onApply }: { state: SearchState; facets: SearchFacets; onClose: () => void; onApply: (p: Partial<SearchState>) => void }) {
  const [min, setMin] = useState(state.min?.toString() ?? "");
  const [max, setMax] = useState(state.max?.toString() ?? "");
  const [cat, setCat] = useState(state.cat);
  const [brands, setBrands] = useState(state.brands);
  const num = (v: string) => (v.trim() === "" || !Number.isFinite(Number(v)) || Number(v) < 0 ? undefined : Number(v));
  const has = (b: string) => brands.some((x) => brandKey(x) === brandKey(b));
  const brandList = [
    ...facets.brands,
    ...state.brands.filter((b) => !facets.brands.some((f) => brandKey(f.name) === brandKey(b))).map((name) => ({ name, count: 0 })),
  ];
  const h3 = "mb-2 text-sm font-bold text-gray-900";
  const box = "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-pi focus:outline-none";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button type="button" aria-label="필터 닫기" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div role="dialog" aria-modal="true" aria-label="검색 필터" className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-gray-900">필터</h2>
          <button type="button" onClick={onClose} className="tap p-1 text-sm text-gray-500">
            닫기
          </button>
        </div>

        <h3 className={h3}>가격대</h3>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {PRICE_RANGES.map((r) => {
            const on = num(min) === r.min && num(max) === r.max;
            return (
              <button
                key={r.label}
                type="button"
                aria-pressed={on}
                onClick={() => {
                  setMin(on || r.min === undefined ? "" : String(r.min));
                  setMax(on || r.max === undefined ? "" : String(r.max));
                }}
                className={chip(on)}
              >
                {r.label}
              </button>
            );
          })}
        </div>
        <div className="mb-5 flex items-center gap-2">
          <input aria-label="최소 가격(π)" inputMode="decimal" value={min} onChange={(e) => setMin(e.target.value)} placeholder="최소 π" className={box} />
          <span className="text-gray-400">~</span>
          <input aria-label="최대 가격(π)" inputMode="decimal" value={max} onChange={(e) => setMax(e.target.value)} placeholder="최대 π" className={box} />
        </div>

        <h3 className={h3}>카테고리</h3>
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button type="button" aria-pressed={!cat} onClick={() => setCat(undefined)} className={chip(!cat)}>
            전체
          </button>
          {facets.cats.map((c) => (
            <button key={c.id} type="button" aria-pressed={cat === c.id} onClick={() => setCat(cat === c.id ? undefined : c.id)} className={chip(cat === c.id)}>
              {c.name} <span className="opacity-60">{c.count}</span>
            </button>
          ))}
        </div>

        <h3 className={h3}>브랜드</h3>
        {brandList.length ? (
          <div className="mb-6 flex flex-wrap gap-1.5">
            {brandList.map((b) => (
              <button
                key={b.name}
                type="button"
                aria-pressed={has(b.name)}
                onClick={() => setBrands(has(b.name) ? brands.filter((x) => brandKey(x) !== brandKey(b.name)) : [...brands, b.name])}
                className={chip(has(b.name))}
              >
                {b.name} <span className="opacity-60">{b.count}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mb-6 text-xs text-gray-400">검색 결과에 브랜드를 입력한 상품이 없어요.</p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setMin("");
              setMax("");
              setCat(undefined);
              setBrands([]);
            }}
            className="tap flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-700"
          >
            초기화
          </button>
          <button type="button" onClick={() => onApply({ min: num(min), max: num(max), cat, brands })} className="tap flex-[2] rounded-xl bg-pi py-3 text-sm font-bold text-white">
            적용하기
          </button>
        </div>
      </div>
    </div>
  );
}
