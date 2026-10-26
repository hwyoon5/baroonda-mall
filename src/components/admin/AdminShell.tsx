"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api, ApiError } from "@/lib/client/api";

export const ADMIN_MENU = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/orders", label: "주문·배송" },
  { href: "/admin/sellers", label: "판매자 승인" },
  { href: "/admin/settlement", label: "정산·통계" },
] as const;

/** 관리자 API 호출. 권한은 서버(requireAdmin)가 확인하고, 화면은 403이면 안내만 보여 준다. */
export function useAdminApi<T>(path: string) {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<{ status?: number; message: string } | null>(null);
  const load = useCallback(() => {
    setError(null);
    return api<T>(path)
      .then(setData)
      .catch((e) => setError({ status: e instanceof ApiError ? e.status : undefined, message: e.message }));
  }, [path]);
  useEffect(() => {
    if (user) void load();
  }, [user, load]);
  return { data, setData, error, reload: load };
}

/** 관리자 화면 공통 틀: 로그인 확인, 상단 메뉴, 권한 오류·로딩 표시 */
export default function AdminShell({ title, error, loading, children }: { title: string; error?: { status?: number; message: string } | null; loading?: boolean; children: ReactNode }) {
  const { user, ready } = useAuth();
  const path = usePathname();
  return (
    <>
      <SubHeader title={`관리자 · ${title}`} />
      {!ready ? null : !user ? (
        <LoginCard message="관리자 Pi 계정으로 로그인해 주세요." />
      ) : error ? (
        <div className="p-10 text-center">
          <p className="text-sm font-bold text-gray-900">{error.status === 403 ? "관리자만 볼 수 있는 페이지예요." : error.message}</p>
          <Link href="/" className="tap mt-4 inline-block rounded-full border border-gray-200 px-4 py-2 text-xs text-gray-600">
            홈으로
          </Link>
        </div>
      ) : (
        <>
          <nav aria-label="관리자 메뉴" className="no-scrollbar sticky top-14 z-10 flex border-b border-gray-100 bg-white">
            {ADMIN_MENU.map((m) => {
              const active = path === m.href;
              return (
                <Link key={m.href} href={m.href} aria-current={active ? "page" : undefined} className={`flex-1 shrink-0 whitespace-nowrap px-2 py-3 text-center text-[13px] font-bold ${active ? "border-b-2 border-pi text-pi" : "text-gray-400"}`}>
                  {m.label}
                </Link>
              );
            })}
          </nav>
          {loading ? <p className="p-10 text-center text-sm text-gray-400">불러오는 중…</p> : children}
        </>
      )}
    </>
  );
}
