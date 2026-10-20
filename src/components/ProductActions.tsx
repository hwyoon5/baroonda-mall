"use client";

import { useRouter } from "next/navigation";
import WishButton from "./WishButton";
import { useStore } from "./store/StoreProvider";

export default function ProductActions({ id }: { id: string }) {
  const router = useRouter();
  const { addToCart, showToast } = useStore();

  return (
    <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-2 border-t border-gray-100 bg-white px-4 py-2.5">
      <WishButton id={id} className="h-11 w-11 shrink-0 border border-gray-200 shadow-none" />
      <button
        type="button"
        onClick={() => {
          addToCart(id);
          showToast("장바구니에 담았어요");
        }}
        className="tap h-11 flex-1 rounded-xl border border-pi text-sm font-bold text-pi"
      >
        장바구니
      </button>
      <button
        type="button"
        onClick={() => {
          addToCart(id);
          router.push("/cart");
        }}
        className="tap h-11 flex-1 rounded-xl bg-pi text-sm font-bold text-white"
      >
        바로구매
      </button>
    </div>
  );
}
