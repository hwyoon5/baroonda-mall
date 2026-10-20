"use client";

import Link from "next/link";
import PiPrice from "@/components/PiPrice";
import SubHeader from "@/components/SubHeader";
import { useStore } from "@/components/store/StoreProvider";
import { findProduct } from "@/data/mall";

export default function CartPage() {
  const { cart, setCartQty, showToast } = useStore();
  const lines = Object.entries(cart)
    .map(([id, qty]) => ({ product: findProduct(id), qty }))
    .filter((l) => l.product);
  const total = lines.reduce((sum, l) => sum + (l.product!.pricePi * l.qty), 0);

  return (
    <>
      <SubHeader title="장바구니" right={<span />} />
      {lines.length === 0 ? (
        <div className="flex flex-col items-center gap-3 bg-white py-24 text-sm text-gray-500">
          <p>장바구니가 비어 있어요.</p>
          <Link href="/" className="tap rounded-full bg-pi px-4 py-2 font-bold text-white">
            쇼핑 계속하기
          </Link>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-gray-100 bg-white">
            {lines.map(({ product: p, qty }) => (
              <li key={p!.id} className="flex gap-3 px-4 py-3">
                <Link href={`/product/${p!.id}`} className={`tap flex h-20 w-20 shrink-0 items-center justify-center rounded-xl text-4xl ${p!.bg}`}>
                  {p!.emoji}
                </Link>
                <div className="flex flex-1 flex-col">
                  <Link href={`/product/${p!.id}`} className="line-clamp-2 text-sm text-gray-900">
                    {p!.name}
                  </Link>
                  <PiPrice value={Math.round(p!.pricePi * qty * 10000) / 10000} />
                  <div className="mt-auto flex items-center gap-2">
                    <div className="flex items-center rounded-lg border border-gray-200">
                      <button type="button" aria-label="수량 감소" onClick={() => setCartQty(p!.id, qty - 1)} className="tap h-8 w-8 text-gray-600">
                        −
                      </button>
                      <span className="w-6 text-center text-sm tabular-nums">{qty}</span>
                      <button type="button" aria-label="수량 증가" onClick={() => setCartQty(p!.id, qty + 1)} className="tap h-8 w-8 text-gray-600">
                        +
                      </button>
                    </div>
                    <button type="button" onClick={() => setCartQty(p!.id, 0)} className="tap ml-auto text-xs text-gray-400">
                      삭제
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          <div className="h-16" aria-hidden />
          <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 border-t border-gray-100 bg-white px-4 py-2.5">
            <div className="flex-1">
              <p className="text-[11px] text-gray-500">총 결제금액</p>
              <PiPrice value={Math.round(total * 10000) / 10000} size="lg" />
            </div>
            <button
              type="button"
              onClick={() => showToast("Pi 결제 연동은 준비 중이에요")}
              className="tap h-11 rounded-xl bg-pi px-6 text-sm font-bold text-white"
            >
              π로 결제하기
            </button>
          </div>
        </>
      )}
    </>
  );
}
