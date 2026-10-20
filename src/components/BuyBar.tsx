"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Listing } from "@/lib/types";
import PiPrice from "./PiPrice";
import { PaymentCancelled, usePi } from "./pi/PiProvider";
import { useStore } from "./store/StoreProvider";
import WishButton from "./WishButton";

export default function BuyBar({ listing }: { listing: Listing }) {
  const { user, buy } = usePi();
  const { showToast } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const mine = user?.uid === listing.seller.uid;

  const onBuy = async () => {
    if (listing.demo) return showToast("예시 상품이라 구매할 수 없어요. 직접 등록된 상품을 구매해 보세요.");
    setBusy(true);
    try {
      const orderId = await buy(listing.id);
      showToast("π 결제가 완료됐어요!");
      router.push(`/orders/${orderId}`);
    } catch (e) {
      if (!(e instanceof PaymentCancelled)) showToast(e instanceof Error ? e.message : "결제에 실패했어요.");
      else showToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  let action;
  if (mine) {
    action = (
      <Link href="/my" className="tap flex-1 rounded-xl border border-pi py-3 text-center text-sm font-bold text-pi">
        내 판매글 관리
      </Link>
    );
  } else if (listing.status !== "selling") {
    action = (
      <button type="button" disabled className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-bold text-gray-500">
        {listing.status === "reserved" ? "예약중인 상품" : "거래완료"}
      </button>
    );
  } else {
    action = (
      <button type="button" onClick={onBuy} disabled={busy} className="tap flex-1 rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60">
        {busy ? "결제 진행 중…" : "π로 구매하기"}
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 border-t border-gray-100 bg-white px-4 py-2.5">
      <WishButton id={listing.id} className="h-11 w-11 shrink-0 border border-gray-200 !bg-white" />
      <div className="shrink-0">
        <PiPrice value={listing.pricePi} size="lg" />
        <p className="text-[10px] text-gray-400">{listing.negotiable ? "가격제안 가능" : "가격제안 불가"}</p>
      </div>
      {action}
    </div>
  );
}
