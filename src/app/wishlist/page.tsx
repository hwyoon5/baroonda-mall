"use client";

import Link from "next/link";
import ProductGrid from "@/components/ProductGrid";
import SubHeader from "@/components/SubHeader";
import { useStore } from "@/components/store/StoreProvider";
import { findProduct, type Product } from "@/data/mall";

export default function WishlistPage() {
  const { wishlist } = useStore();
  const items = wishlist.map(findProduct).filter((p): p is Product => Boolean(p));

  return (
    <>
      <SubHeader title="찜한 상품" back={false} />
      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 bg-white py-24 text-sm text-gray-500">
          <p>아직 찜한 상품이 없어요.</p>
          <Link href="/" className="tap rounded-full bg-pi px-4 py-2 font-bold text-white">
            상품 보러가기
          </Link>
        </div>
      ) : (
        <ProductGrid title={`찜한 상품 ${items.length}개`} items={items} />
      )}
    </>
  );
}
