import { cardShippingText } from "@/lib/business";
import { formatCount } from "@/lib/format";
import type { Listing } from "@/lib/types";

const icon = "h-3 w-3 shrink-0";

/** 상품 카드 하단: 배송 조건 · 별점(후기 수) · 구매 건수 · 구경한 사람 수 */
export default function CardMeta({ listing: l }: { listing: Listing }) {
  const s = l.stats;
  const ship = cardShippingText(l, s?.shipping);
  const bought = l.condition === "new" ? (l.soldCount ?? 0) : 0;
  const views = s?.views ?? 0;
  const rated = s?.rating !== undefined && s.reviews > 0;
  if (!ship && !rated && !bought && !views) return null;
  return (
    <div className="mt-1 space-y-0.5 text-[11px] leading-tight">
      {ship && (
        <p className={`flex items-center gap-1 ${ship === "무료배송" ? "font-bold text-emerald-600" : "text-gray-500"}`}>
          <svg viewBox="0 0 24 24" className={`${icon} fill-none stroke-current`} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M1 4h13v11H1zM14 8h4l3 3v4h-7" />
            <circle cx="5.5" cy="17.5" r="1.8" />
            <circle cx="17.5" cy="17.5" r="1.8" />
          </svg>
          <span className="truncate">{ship}</span>
        </p>
      )}
      {(rated || bought > 0) && (
        <p className="flex flex-wrap items-center gap-x-1 text-gray-500">
          {rated && (
            <span className="inline-flex items-center gap-0.5" aria-label={`별점 ${s!.rating!.toFixed(1)}, 후기 ${s!.reviews}개`}>
              <svg viewBox="0 0 24 24" className={`${icon} fill-amber-400`} aria-hidden>
                <path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z" />
              </svg>
              <b className="font-bold text-gray-800">{s!.rating!.toFixed(1)}</b>
              <span>{`(${formatCount(s!.reviews)})`}</span>
            </span>
          )}
          {rated && bought > 0 && <span className="text-gray-300">·</span>}
          {bought > 0 && <span>{`구매 ${formatCount(bought)}건`}</span>}
        </p>
      )}
      {views > 0 && (
        <p className="flex items-center gap-1 text-gray-400">
          <svg viewBox="0 0 24 24" className={`${icon} fill-none stroke-current`} strokeWidth={2} aria-hidden>
            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          {`${formatCount(views)}명 구경함`}
        </p>
      )}
    </div>
  );
}
