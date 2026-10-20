"use client";

import { useStore } from "./store/StoreProvider";

export default function WishButton({ id, className = "" }: { id: string; className?: string }) {
  const { isWished, toggleWish, showToast } = useStore();
  const on = isWished(id);
  return (
    <button
      type="button"
      onClick={() => {
        toggleWish(id);
        showToast(on ? "찜 목록에서 뺐어요" : "찜 목록에 담았어요");
      }}
      aria-label={on ? "찜 해제" : "찜하기"}
      aria-pressed={on}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm active:scale-90 ${
        on ? "text-red-500" : "text-gray-400"
      } ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill={on ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2}>
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
