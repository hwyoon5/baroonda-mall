"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import type { P2PListing, TradeMethod } from "@/data/p2p";
import P2PList from "./P2PList";
import SellModal from "./SellModal";
import { useStore } from "./store/StoreProvider";

type Filter = "all" | TradeMethod;

const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "direct", label: "직거래" },
  { id: "delivery", label: "택배" },
];

export default function P2PMarket({ limit, showHeader = true }: { limit?: number; showHeader?: boolean }) {
  const { listings, addListing, showToast } = useStore();
  const [filter, setFilter] = useState<Filter>("all");
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = () => setModalOpen(true);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleSubmit = (listing: P2PListing) => {
    addListing(listing);
    setFilter("all");
    showToast("판매글이 등록되었어요!");
    document.getElementById("p2p")?.scrollIntoView({ behavior: "smooth" });
  };

  const filtered = filter === "all" ? listings : listings.filter((i) => i.tradeMethods.includes(filter));
  const visible = limit ? filtered.slice(0, limit) : filtered;

  return (
    <section id="p2p" aria-labelledby="p2p-title" className="mt-2 scroll-mt-36 bg-white px-4 pt-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <h2 id="p2p-title" className="flex items-center gap-1.5 text-lg font-extrabold text-gray-900">
              P2P 중고장터
              <span className="rounded bg-pi/10 px-1.5 py-0.5 text-[10px] font-bold text-pi">파이 안전결제</span>
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">파이오니어끼리 π로 사고팔아요</p>
          </div>
          <button
            type="button"
            onClick={openModal}
            className="tap flex items-center gap-1 rounded-full border border-pi px-3 py-1.5 text-xs font-bold text-pi"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            판매하기
          </button>
        </div>
      )}

      <div className={`flex gap-2 ${showHeader ? "mt-3" : ""}`} role="tablist" aria-label="거래 방식 필터">
        {filters.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            onClick={() => setFilter(f.id)}
            className={`tap rounded-full px-3 py-1 text-xs font-semibold ${
              filter === f.id ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <P2PList items={visible} />

      {limit && filtered.length > limit && (
        <Link
          href="/market"
          className="tap -mx-4 flex items-center justify-center gap-1 border-t border-gray-100 py-3.5 text-sm font-semibold text-gray-700"
        >
          중고 매물 {filtered.length - limit}개 더보기 &rsaquo;
        </Link>
      )}

      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 mx-auto flex max-w-md justify-end px-4">
        <button
          type="button"
          onClick={openModal}
          className="tap pointer-events-auto flex items-center gap-1.5 rounded-full bg-pi px-4 py-3 text-sm font-bold text-white shadow-lg shadow-pi/30"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          판매하기
        </button>
      </div>

      <SellModal open={modalOpen} onClose={closeModal} onSubmit={handleSubmit} />
    </section>
  );
}
