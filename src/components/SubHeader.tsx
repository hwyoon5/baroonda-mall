"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import HeartLink from "./HeartLink";

export default function SubHeader({ title, right, back = true }: { title: string; right?: ReactNode; back?: boolean }) {
  const router = useRouter();
  const goBack = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-gray-100 bg-white px-2">
      {back ? (
        <button type="button" onClick={goBack} aria-label="뒤로가기" className="tap rounded-full p-2 text-gray-800">
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      ) : (
        <span className="w-2" />
      )}
      <h1 className="flex-1 truncate text-base font-extrabold text-gray-900">{title}</h1>
      {right ?? (
        <div className="flex items-center text-gray-800">
          <Link href="/" aria-label="홈" className="tap rounded-full p-2">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
              <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />
            </svg>
          </Link>
          <HeartLink className="p-2" />
        </div>
      )}
    </header>
  );
}
