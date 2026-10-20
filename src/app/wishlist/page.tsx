"use client";

import { useEffect, useState } from "react";
import ListingCard from "@/components/ListingCard";
import SubHeader from "@/components/SubHeader";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import type { Listing } from "@/lib/types";

export default function WishlistPage() {
  const { wishlist } = useStore();
  const [items, setItems] = useState<Listing[] | null>(null);

  useEffect(() => {
    if (wishlist.length === 0) return setItems([]);
    api<{ listings: Listing[] }>(`/api/listings?includeSold=1&ids=${wishlist.join(",")}`)
      .then((r) => setItems(r.listings))
      .catch(() => setItems([]));
  }, [wishlist]);

  return (
    <>
      <SubHeader title="찜 목록" />
      <section className="bg-white px-4 py-4">
        {items && items.length === 0 && <p className="py-16 text-center text-sm text-gray-500">찜한 상품이 없어요.</p>}
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
          {items?.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </ul>
      </section>
    </>
  );
}
