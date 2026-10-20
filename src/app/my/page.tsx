"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { usePi } from "@/components/pi/PiProvider";
import { api } from "@/lib/client/api";
import type { Listing } from "@/lib/types";

export default function MyPage() {
  const { user, ready, logout } = usePi();
  const [mine, setMine] = useState<Listing[] | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ listings: Listing[] }>("/api/listings?seller=me")
      .then((r) => setMine(r.listings))
      .catch(() => setMine([]));
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
            <button type="button" onClick={logout} className="tap rounded-full border border-gray-200 px-3 py-1.5 text-xs text-gray-600">
              로그아웃
            </button>
          </section>
          <nav className="mt-2 grid grid-cols-3 bg-white py-3 text-center text-xs text-gray-700">
            <Link href="/wishlist" className="tap py-2">
              <span className="block text-xl">❤️</span>찜 목록
            </Link>
            <Link href="/orders" className="tap py-2">
              <span className="block text-xl">🧾</span>거래내역
            </Link>
            <Link href="/sell" className="tap py-2">
              <span className="block text-xl">✏️</span>판매하기
            </Link>
          </nav>
          <section className="mt-2 bg-white px-4 py-4">
            <h2 className="mb-3 text-base font-extrabold text-gray-900">내 판매글 {mine ? mine.length : ""}</h2>
            {mine && mine.length === 0 && <p className="py-8 text-center text-sm text-gray-500">아직 등록한 상품이 없어요.</p>}
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
              {mine?.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}
