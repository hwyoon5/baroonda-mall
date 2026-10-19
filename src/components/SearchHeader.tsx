"use client";

import { useState } from "react";

const keywords = ["감귤", "이어폰", "한우", "세제", "생수"];

export default function SearchHeader() {
  const [query, setQuery] = useState("");

  return (
    <header className="sticky top-0 z-20 bg-pi px-4 pb-3 pt-3 shadow-md">
      <div className="mb-2.5 flex items-center justify-between">
        <h1 className="flex items-center gap-1.5 text-xl font-black tracking-tight text-white">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-pi-gold text-base text-pi">
            π
          </span>
          바로온다
        </h1>
        <div className="flex items-center gap-3 text-white">
          <button aria-label="알림" className="relative">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-pi-gold" />
          </button>
          <button aria-label="장바구니" className="relative">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="9" cy="21" r="1" />
              <circle cx="20" cy="21" r="1" />
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-pi-gold px-1 text-[10px] font-bold text-pi">
              3
            </span>
          </button>
        </div>
      </div>

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="오늘 주문하면 내일 바로온다!"
          className="w-full bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
          aria-label="상품 검색"
        />
      </form>

      <div className="no-scrollbar -mx-4 mt-2.5 flex gap-2 overflow-x-auto px-4">
        {keywords.map((k) => (
          <button
            key={k}
            onClick={() => setQuery(k)}
            className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white"
          >
            #{k}
          </button>
        ))}
      </div>
    </header>
  );
}
