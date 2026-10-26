"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { discountRate, formatCount, formatPi } from "@/lib/format";
import type { Listing } from "@/lib/types";
import ListingThumb from "./ListingThumb";

const grads = ["from-pi to-violet-500", "from-rose-500 to-orange-400", "from-sky-600 to-indigo-500", "from-emerald-600 to-teal-500", "from-fuchsia-600 to-pink-500"];

const slideWidth = (el: HTMLElement) => (el.firstElementChild as HTMLElement | null)?.offsetWidth || el.clientWidth;

/** 홈 상단: 실시간 인기 상품 롤링 배너 (3.5초마다 넘김, 손가락으로 넘기면 잠시 멈춤) */
export default function BestBanner({ items, at }: { items: Listing[]; at: string }) {
  const ref = useRef<HTMLUListElement>(null);
  const paused = useRef(false);
  const resume = useRef<number | undefined>(undefined);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (items.length < 2) return;
    const id = window.setInterval(() => {
      const el = ref.current;
      if (!el || paused.current || document.visibilityState !== "visible") return;
      const w = slideWidth(el);
      const next = (Math.round(el.scrollLeft / w) + 1) % items.length;
      el.scrollTo({ left: next * w > el.scrollWidth - el.clientWidth + 1 ? 0 : next * w, behavior: "smooth" });
    }, 3500);
    return () => window.clearInterval(id);
  }, [items.length]);

  if (!items.length) return null;
  const hold = () => {
    paused.current = true;
    window.clearTimeout(resume.current);
  };
  const release = () => {
    window.clearTimeout(resume.current);
    resume.current = window.setTimeout(() => (paused.current = false), 4000);
  };

  return (
    <section aria-labelledby="best-banner" className="bg-white pb-1 pt-3">
      <div className="mb-2 flex items-center justify-between px-4">
        <h2 id="best-banner" className="flex items-center gap-1.5 text-base font-extrabold text-gray-900">
          <span aria-hidden>🔥</span>실시간 BEST
          <span className="text-[11px] font-medium text-gray-400">{at} 기준</span>
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500" aria-live="polite">
          {idx + 1} / {items.length}
        </span>
      </div>
      <ul
        ref={ref}
        onScroll={(e) => setIdx(Math.min(items.length - 1, Math.round(e.currentTarget.scrollLeft / slideWidth(e.currentTarget))))}
        onTouchStart={hold}
        onTouchEnd={release}
        onMouseEnter={hold}
        onMouseLeave={release}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
      >
        {items.map((l, i) => {
          const off = discountRate(l.pricePi, l.originalPricePi);
          const meta = [
            l.soldCount ? `구매 ${formatCount(l.soldCount)}` : "",
            l.stats?.views ? `조회 ${formatCount(l.stats.views)}` : "",
            l.stats?.rating !== undefined && l.stats.reviews ? `★ ${l.stats.rating.toFixed(1)}` : "",
          ].filter(Boolean);
          return (
            <li key={l.id} className="w-full shrink-0 snap-start px-4 lg:w-1/3 lg:px-2 lg:first:pl-4">
              <Link
                href={`/listings/${l.id}`}
                aria-label={`실시간 BEST ${i + 1}위 ${l.title}`}
                className={`tap flex h-36 items-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-br ${grads[i % grads.length]} p-4 text-white shadow-sm`}
              >
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-full bg-pi-gold px-2 py-0.5 text-[11px] font-black text-pi">BEST {i + 1}</span>
                  <p className="mt-1.5 line-clamp-2 text-sm font-bold leading-snug">{l.title}</p>
                  <p className="mt-1 flex items-baseline gap-1.5">
                    {off > 0 && <span className="text-sm font-black text-pi-gold">{off}%</span>}
                    <span className="text-lg font-black">π {formatPi(l.pricePi)}</span>
                  </p>
                  {meta.length > 0 && <p className="truncate text-[11px] opacity-85">{meta.join(" · ")}</p>}
                </div>
                <ListingThumb listing={l} className="h-28 w-28 shrink-0 rounded-xl ring-2 ring-white/40" emojiClass="text-5xl" />
              </Link>
            </li>
          );
        })}
      </ul>
      {items.length > 1 && (
        <div className="mt-2 flex justify-center gap-1" aria-hidden>
          {items.map((l, i) => (
            <span key={l.id} className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-pi" : "w-1.5 bg-gray-300"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
