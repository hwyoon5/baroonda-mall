"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** 휴대폰은 기존 한 단 레이아웃, PC는 넓은 화면. 관리자 화면은 PC에서 전체 폭 대시보드 */
export default function AppFrame({ children, nav }: { children: ReactNode; nav: ReactNode }) {
  const wide = usePathname()?.startsWith("/admin") ?? false;
  return (
    <div className={wide ? "wide" : undefined}>
      <div className={`frame min-h-dvh bg-gray-100 pb-20 shadow-xl ${wide ? "lg:pb-0" : ""}`}>{children}</div>
      {nav}
    </div>
  );
}
