"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ListingThumb from "@/components/ListingThumb";
import SubHeader from "@/components/SubHeader";
import { cartKey, useStore } from "@/components/store/StoreProvider";
import { cardShippingText } from "@/lib/business";
import { api } from "@/lib/client/api";
import { formatPi } from "@/lib/format";
import { listingStatusText, type Listing } from "@/lib/types";

const btn = "tap rounded-lg px-3 py-1.5 text-xs";

export default function CartPage() {
  const { cart, cartLoaded, removeFromCart } = useStore();
  const [byId, setById] = useState<Record<string, Listing> | null>(null);
  const ids = [...new Set(cart.map((c) => c.listingId))].join(",");

  useEffect(() => {
    if (!cartLoaded) return;
    if (!ids) return setById({});
    api<{ listings: Listing[] }>(`/api/listings?includeSold=1&ids=${ids}`)
      .then((r) => setById(Object.fromEntries(r.listings.map((l) => [l.id, l]))))
      .catch(() => setById({}));
  }, [ids, cartLoaded]);

  return (
    <>
      <SubHeader title="장바구니" />
      {byId && cart.length === 0 && (
        <section className="bg-white px-4 py-16 text-center">
          <p className="text-sm text-gray-500">장바구니가 비어 있어요.</p>
          <Link href="/" className="tap mt-4 inline-block rounded-xl bg-pi px-5 py-2.5 text-sm font-bold text-white">
            상품 보러 가기
          </Link>
        </section>
      )}
      {byId && cart.length > 0 && (
        <section className="bg-white px-4">
          <p className="border-b border-gray-100 py-3 text-xs text-gray-500">
            담은 상품 <b className="text-gray-900">{cart.length}</b>개 · π 결제는 상품별로 진행돼요.
          </p>
          <ul className="divide-y divide-gray-100">
            {cart.map((c) => {
              const l = byId[c.listingId];
              const opt = c.option && Object.entries(c.option).map(([k, v]) => `${k}: ${v}`).join(" / ");
              const remove = (
                <button type="button" onClick={() => removeFromCart(c.listingId, c.option)} className={`${btn} border border-gray-200 text-gray-600`}>
                  삭제
                </button>
              );
              if (!l)
                return (
                  <li key={cartKey(c)} className="flex items-center justify-between py-4">
                    <span className="text-sm text-gray-400">판매가 끝난 상품이에요.</span>
                    {remove}
                  </li>
                );
              const ship = cardShippingText(l, l.stats?.shipping);
              const buyHref = `/listings/${l.id}?buy=1${c.option ? `&opt=${encodeURIComponent(JSON.stringify(c.option))}` : ""}`;
              return (
                <li key={cartKey(c)} className="flex gap-3 py-4">
                  <Link href={`/listings/${l.id}`} className="tap shrink-0">
                    <ListingThumb listing={l} className="h-20 w-20 rounded-lg" emojiClass="text-3xl" />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/listings/${l.id}`} className="line-clamp-2 text-sm leading-snug text-gray-800">
                      {l.title}
                    </Link>
                    {opt && <p className="mt-0.5 truncate text-xs text-gray-500">{opt}</p>}
                    <p className="mt-1 text-base font-extrabold text-gray-900">π {formatPi(l.pricePi)}</p>
                    {ship && <p className="text-[11px] text-gray-500">{ship}</p>}
                    <div className="mt-2 flex gap-2">
                      {remove}
                      {l.status === "selling" ? (
                        <Link href={buyHref} className={`${btn} bg-pi font-bold text-white`}>
                          구매하기
                        </Link>
                      ) : (
                        <span className={`${btn} bg-gray-100 text-gray-400`}>{listingStatusText(l)}</span>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}
