"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PAGE_SIZE } from "@/lib/paging";
import type { Listing } from "@/lib/types";
import ListingCard from "./ListingCard";

/** 첫 페이지는 서버에서 받고, 이후는 스크롤이 끝에 닿거나 '더 보기'를 누르면 /api/listings에서 이어 받는다. */
export default function ListingFeed({ initial, total, query }: { initial: Listing[]; total: number; query: string }) {
  const [items, setItems] = useState(initial);
  const [done, setDone] = useState(initial.length >= total);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const busy = useRef(false);
  const sentinel = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (busy.current || done) return;
    busy.current = true;
    setLoading(true);
    setFailed(false);
    try {
      const r = await fetch(`/api/listings?${query ? `${query}&` : ""}offset=${items.length}&limit=${PAGE_SIZE}`);
      if (!r.ok) throw new Error(String(r.status));
      const d = (await r.json()) as { listings: Listing[]; nextOffset: number | null };
      setItems((cur) => {
        const seen = new Set(cur.map((l) => l.id));
        return [...cur, ...d.listings.filter((l) => !seen.has(l.id))];
      });
      if (d.nextOffset === null || d.listings.length === 0) setDone(true);
    } catch {
      setFailed(true);
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [done, items.length, query]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || done || failed || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((es) => es[0]?.isIntersecting && void load(), { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [load, done, failed]);

  return (
    <>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
        {items.map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </ul>
      {!done && (
        <div ref={sentinel} className="pt-6 text-center">
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="tap rounded-full border border-gray-300 px-5 py-2 text-xs font-bold text-gray-700 disabled:opacity-60"
          >
            {loading ? "불러오는 중…" : failed ? "다시 불러오기" : `더 보기 (${items.length}/${total})`}
          </button>
        </div>
      )}
    </>
  );
}
