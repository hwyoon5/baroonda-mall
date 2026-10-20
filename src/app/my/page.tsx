"use client";

import Link from "next/link";
import SubHeader from "@/components/SubHeader";
import { useStore } from "@/components/store/StoreProvider";

export default function MyPage() {
  const { wishlist, cartCount, showToast } = useStore();
  const menus = [
    { label: "찜한 상품", href: "/wishlist", value: `${wishlist.length}` },
    { label: "장바구니", href: "/cart", value: `${cartCount}` },
    { label: "주문내역", href: "/orders" },
    { label: "내 중고 판매글", href: "/market" },
  ];

  return (
    <>
      <SubHeader title="마이바로온다" back={false} />
      <section className="flex items-center gap-3 bg-white px-4 py-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pi text-2xl font-black text-pi-gold">π</span>
        <div className="flex-1">
          <p className="text-base font-bold text-gray-900">파이오니어님</p>
          <p className="text-xs text-gray-500">Pi 계정으로 로그인하면 주문·결제를 할 수 있어요</p>
        </div>
      </section>
      <div className="bg-white px-4 pb-4">
        <button
          type="button"
          onClick={() => showToast("Pi 로그인 연동은 준비 중이에요")}
          className="tap h-11 w-full rounded-xl bg-pi text-sm font-bold text-white"
        >
          Pi 계정으로 로그인
        </button>
      </div>
      <ul className="mt-2 divide-y divide-gray-100 bg-white">
        {menus.map((m) => (
          <li key={m.label}>
            <Link href={m.href} className="tap flex items-center px-4 py-4 text-sm text-gray-900">
              <span className="flex-1">{m.label}</span>
              {m.value && <span className="mr-2 font-bold text-pi">{m.value}</span>}
              <span className="text-gray-300">&rsaquo;</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
