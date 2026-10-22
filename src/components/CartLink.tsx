"use client";

import Link from "next/link";
import { useStore } from "./store/StoreProvider";

export default function CartLink({ className = "" }: { className?: string }) {
  const { cart } = useStore();
  const n = cart.length;
  return (
    <Link href="/cart" aria-label={n ? `장바구니 ${n}개` : "장바구니"} className={`tap relative rounded-full ${className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
        <path d="M2.5 3.5h2.4l2.4 11.5h11.4L21 7.5H6" />
        <circle cx="9.5" cy="19.5" r="1.5" />
        <circle cx="17" cy="19.5" r="1.5" />
      </svg>
      {n > 0 && (
        <span className="absolute right-0 top-0 min-w-4 rounded-full bg-red-500 px-1 text-center text-[10px] font-bold leading-4 text-white">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
