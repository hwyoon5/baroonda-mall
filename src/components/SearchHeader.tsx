"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CartLink from "./CartLink";

const keywords = ["아이패드", "이어폰", "패딩", "감귤", "스위치"];

export default function SearchHeader({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const search = (q: string) => {
    const term = q.trim();
    if (!term) return;
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="sticky top-0 z-20 bg-pi px-4 pb-3 pt-3 shadow-md">
      <div className="mb-2.5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-1.5 text-xl font-black tracking-tight text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pi-gold text-base text-pi">π</span>
          바로온다
        </Link>
        <div className="flex items-center text-white">
          <CartLink className="p-1.5" />
          <Link href="/my" aria-label="마이페이지" className="tap rounded-full p-1.5">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" />
            </svg>
          </Link>
        </div>
      </div>

      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          enterKeyHint="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="파이로 사고파는 우리동네 오픈마켓"
          className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          aria-label="상품 검색"
        />
      </form>

      <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
        {keywords.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setQuery(k);
              search(k);
            }}
            className="tap shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
          >
            #{k}
          </button>
        ))}
      </div>
    </header>
  );
}
