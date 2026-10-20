"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import type { Listing, ListingStatus } from "@/lib/types";

function MenuRow({ href, icon, label, desc }: { href: string; icon: string; label: string; desc?: string }) {
  return (
    <li>
      <Link href={href} className="tap flex items-center gap-3 px-4 py-3.5">
        <span className="text-xl" aria-hidden>
          {icon}
        </span>
        <span className="flex-1">
          <span className="block text-sm font-bold text-gray-900">{label}</span>
          {desc && <span className="block text-[11px] text-gray-500">{desc}</span>}
        </span>
        <span className="text-gray-300" aria-hidden>
          ›
        </span>
      </Link>
    </li>
  );
}

const summary: [ListingStatus, string][] = [
  ["selling", "판매중"],
  ["reserved", "거래중"],
  ["sold", "판매완료"],
  ["paused", "판매중지"],
];

export default function MyPage() {
  const { user, ready, signOut } = useAuth();
  const [mine, setMine] = useState<Listing[] | null>(null);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) return;
    api<{ listings: Listing[] }>("/api/listings?seller=me")
      .then((r) => setMine(r.listings))
      .catch(() => setMine([]));
    api<{ unread: number }>("/api/chats")
      .then((r) => setUnread(r.unread))
      .catch(() => undefined);
  }, [user]);

  return (
    <>
      <SubHeader title="마이" back={false} />
      {!ready ? null : !user ? (
        <LoginCard message="Pi 계정으로 로그인하고 바로온다에서 사고팔아 보세요." />
      ) : (
        <>
          <section className="flex items-center gap-3 bg-white px-4 py-5">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pi text-xl font-black text-pi-gold">π</span>
            <div className="flex-1">
              <p className="text-base font-extrabold text-gray-900">{user.username}</p>
              <p className="text-xs text-gray-500">Pi 계정으로 로그인됨</p>
            </div>
            <button type="button" onClick={signOut} className="tap rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
              로그아웃
            </button>
          </section>

          <section className="mt-2 bg-white pb-1">
            <h2 className="px-4 pt-4 text-sm font-extrabold text-gray-900">판매 관리</h2>
            <Link href="/my/listings" className="tap mx-4 mt-3 block rounded-xl border border-gray-100 p-3">
              <span className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-900">내 상품 관리</span>
                <span className="text-xs text-gray-400">전체 {mine?.length ?? 0}개 ›</span>
              </span>
              <span className="mt-2 grid grid-cols-4 text-center">
                {summary.map(([s, t]) => (
                  <span key={s}>
                    <span className="block text-base font-extrabold text-pi">{mine ? mine.filter((l) => l.status === s).length : "-"}</span>
                    <span className="block text-[11px] text-gray-500">{t}</span>
                  </span>
                ))}
              </span>
            </Link>
            <ul className="mt-1 divide-y divide-gray-100">
              <MenuRow href="/orders?tab=sales" icon="📦" label="판매 내역" desc="결제 완료·발송·구매 확정 현황" />
              <MenuRow href="/sell" icon="✏️" label="상품 등록하기" desc="개인 중고 / 새 상품(정식 판매)" />
            </ul>
          </section>

          <section className="mt-2 bg-white">
            <h2 className="px-4 pt-4 text-sm font-extrabold text-gray-900">구매</h2>
            <ul className="divide-y divide-gray-100">
              <MenuRow href="/chats" icon="💬" label="채팅" desc={unread ? `읽지 않은 메시지 ${unread}개` : "구매자·판매자와 1:1 대화"} />
              <MenuRow href="/orders" icon="🧾" label="구매 내역" />
              <MenuRow href="/wishlist" icon="❤️" label="찜 목록" />
            </ul>
          </section>
        </>
      )}
    </>
  );
}
