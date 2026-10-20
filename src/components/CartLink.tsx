"use client";

import Link from "next/link";
import { useStore } from "./store/StoreProvider";

export default function CartLink({ className = "", badgeClassName = "bg-pi text-white" }: { className?: string; badgeClassName?: string }) {
  const { cartCount } = useStore();
  return (
    <Link href="/cart" aria-label={`장바구니 ${cartCount}개`} className={`tap relative rounded-full ${className}`}>
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {cartCount > 0 && (
        <span className={`absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${badgeClassName}`}>
          {cartCount}
        </span>
      )}
    </Link>
  );
}
