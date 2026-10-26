"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "홈", match: (p: string) => p === "/", icon: "M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" },
  { href: "/shorts", label: "쇼츠", match: (p: string) => p.startsWith("/shorts"), icon: "M5 4h14v16H5zM10 9.5v5l4-2.5z" },
  { href: "/sell", label: "판매하기", match: (p: string) => p.startsWith("/sell"), icon: "M12 5v14M5 12h14", primary: true },
  { href: "/stores", label: "생태계 매장", match: (p: string) => p.startsWith("/stores"), icon: "M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z" },
  { href: "/my", label: "마이", match: (p: string) => ["/my", "/orders", "/wishlist"].some((s) => p.startsWith(s)), icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0" },
];

export default function BottomNav() {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto max-w-md border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(pathname);
          const className = `tap flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${active ? "text-pi" : "text-gray-400"}`;
          const body = (
            <>
                {it.primary ? (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pi text-white">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <path d={it.icon} />
                    </svg>
                  </span>
                ) : (
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
                    <path d={it.icon} />
                  </svg>
                )}
                {it.label}
            </>
          );
          return (
            <li key={it.href}>
              <Link href={it.href} aria-current={active ? "page" : undefined} className={className}>
                {body}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
