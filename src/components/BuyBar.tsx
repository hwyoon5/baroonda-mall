"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { addPi, shippingFeeFor, type ShippingTerms } from "@/lib/business";
import { formatPi } from "@/lib/format";
import { listingStatusText, type Listing } from "@/lib/types";
import PiPrice from "./PiPrice";
import { useAuth } from "@/hooks/useAuth";
import { PaymentCancelled, usePayments } from "@/hooks/usePayments";
import { useStore } from "./store/StoreProvider";
import WishButton from "./WishButton";

export default function BuyBar({ listing, shipping: terms }: { listing: Listing; shipping?: ShippingTerms }) {
  const { user, requireAuth } = useAuth();
  const { orderProduct } = usePayments();
  const { showToast, addToCart, removeFromCart } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<false | "buy" | "cart">(false);
  const cartMode = sheet === "cart";
  const [picked, setPicked] = useState<Record<string, string>>({});
  const mine = user?.uid === listing.seller.uid;
  const options = listing.options ?? [];
  const allPicked = options.every((o) => picked[o.name]);
  const variants = listing.variants ?? [];
  // 다른 옵션 선택과 조합했을 때 재고가 남은 variant가 있는 값만 고를 수 있다.
  const valueAvailable = (name: string, value: string) =>
    !variants.length ||
    variants.some((v) => v.options[name] === value && v.stock > 0 && Object.entries(picked).every(([k, pv]) => k === name || v.options[k] === pv));
  const selectedVariant = variants.length && allPicked ? variants.find((v) => Object.entries(v.options).every(([k, val]) => picked[k] === val)) : undefined;
  const canDeliver = listing.tradeMethods.includes("delivery");
  const canPickup = listing.tradeMethods.includes("direct");
  const shipping = canDeliver ? terms : undefined;
  const [pickup, setPickup] = useState(false);
  const [remoteArea, setRemoteArea] = useState(false);
  const shipped = !!shipping && !pickup;
  const hasRemote = shipped && !!shipping?.remoteFee;
  const fee = shipped ? shippingFeeFor(shipping, listing.pricePi, hasRemote && remoteArea) : 0;
  const total = addPi(listing.pricePi, fee);
  // 배송비가 붙을 수 있으면 결제 전에 주문 확인(금액 내역) 시트를 띄운다.
  const checkout = options.length > 0 || shippingFeeFor(shipping, listing.pricePi, true) > 0;
  const variantSoldOut = Boolean(variants.length && allPicked && (!selectedVariant || selectedVariant.stock < 1));

  // 장바구니의 [구매하기]: /listings/:id?buy=1&opt={...} 로 들어오면 담아 둔 옵션으로 주문 확인을 연다.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    if (q.get("buy") !== "1") return;
    try {
      const opt = JSON.parse(q.get("opt") ?? "{}") as Record<string, string>;
      setPicked(Object.fromEntries((listing.options ?? []).filter((o) => o.values.includes(opt[o.name])).map((o) => [o.name, opt[o.name]])));
    } catch {
      // 잘못된 옵션은 무시하고 직접 고르게 한다
    }
    setSheet("buy");
  }, [listing.options]);

  const pay = async () => {
    setBusy(true);
    try {
      const orderId = await orderProduct(listing.id, options.length ? picked : undefined, { remoteArea: hasRemote && remoteArea, pickup: !!shipping && canPickup && pickup });
      if (!orderId) return;
      removeFromCart(listing.id, options.length ? picked : undefined);
      setSheet(false);
      showToast("π 결제가 완료됐어요!");
      router.push(`/orders/${orderId}`);
    } catch (e) {
      if (!(e instanceof PaymentCancelled)) showToast(e instanceof Error ? e.message : "결제에 실패했어요.");
      else showToast(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openChat = async () => {
    if (!user) return requireAuth();
    try {
      const { room } = await api<{ room: { id: string } }>("/api/chats", { listingId: listing.id });
      router.push(`/chats/${room.id}`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "채팅을 열지 못했어요.");
    }
  };

  const onBuy = () => {
    if (!user) return requireAuth();
    if (listing.demo) showToast("테스트로 진행합니다");
    if (checkout) setSheet("buy");
    else void pay();
  };

  const putInCart = () => {
    const added = addToCart(listing.id, options.length ? picked : undefined);
    setSheet(false);
    showToast(added ? "장바구니에 담았어요" : "이미 장바구니에 있어요");
  };
  const onCart = () => (options.length ? setSheet("cart") : putInCart());
  const canCart = !mine && listing.status === "selling";

  let action;
  if (mine) {
    action = (
      <Link href="/my/listings" className="tap flex-1 rounded-xl border border-pi py-3 text-center text-sm font-bold text-pi">
        내 상품 관리
      </Link>
    );
  } else if (listing.status !== "selling") {
    action = (
      <button type="button" disabled className="flex-1 rounded-xl bg-gray-200 py-3 text-sm font-bold text-gray-500">
        {listing.status === "paused" ? "판매 중지된 상품" : listing.status === "reserved" ? "예약중인 상품" : listingStatusText(listing)}
      </button>
    );
  } else {
    action = (
      <button type="button" onClick={onBuy} disabled={busy} className="tap flex-1 rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60">
        {busy ? "결제 진행 중…" : options.length ? "옵션 선택 후 구매" : "π로 구매하기"}
      </button>
    );
  }

  return (
    <>
      <div className="frame fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 border-t border-gray-100 bg-white px-4 py-2.5">
        <WishButton id={listing.id} className="h-11 w-11 shrink-0 border border-gray-200 !bg-white" />
        {canCart && (
          <button
            type="button"
            onClick={onCart}
            aria-label="장바구니 담기"
            className="tap flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-gray-200 text-gray-600"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round">
              <path d="M2.5 3.5h2.4l2.4 11.5h11.4L21 7.5H6" />
              <circle cx="9.5" cy="19.5" r="1.5" />
              <circle cx="17" cy="19.5" r="1.5" />
            </svg>
          </button>
        )}
        <div className="shrink-0">
          <PiPrice value={listing.pricePi} size="lg" />
          <p className="text-[10px] text-gray-400">
            {listing.condition === "new" ? (listing.stock ? `재고 ${listing.stock}개` : "품절") : listing.negotiable ? "가격제안 가능" : "가격제안 불가"}
            {shipping && ` · 배송비 ${shippingFeeFor(shipping, listing.pricePi) ? `${shippingFeeFor(shipping, listing.pricePi)}π` : "무료"}`}
          </p>
        </div>
        {!mine && (
          <button type="button" onClick={() => void openChat()} className="tap shrink-0 rounded-xl border border-gray-200 px-3 py-3 text-sm font-bold text-gray-700">
            채팅
          </button>
        )}
        {action}
      </div>

      {sheet && (
        <div role="dialog" aria-modal="true" aria-labelledby="option-sheet-title" className="fixed inset-0 z-50 mx-auto flex max-w-md items-end bg-black/50" onClick={() => !busy && setSheet(false)}>
          <div className="w-full rounded-t-2xl bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5" onClick={(e) => e.stopPropagation()}>
            <h2 id="option-sheet-title" className="text-base font-extrabold text-gray-900">
              {options.length ? "옵션 선택" : "주문 확인"}
            </h2>
            <div className="mt-3 space-y-4">
              {options.map((o) => (
                <fieldset key={o.name}>
                  <legend className="mb-1.5 text-sm font-bold text-gray-800">{o.name}</legend>
                  <div className="flex flex-wrap gap-2">
                    {o.values.map((v) => {
                      const on = picked[o.name] === v;
                      const available = valueAvailable(o.name, v);
                      return (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={on}
                          disabled={!available && !on}
                          onClick={() => setPicked((cur) => ({ ...cur, [o.name]: v }))}
                          className={`tap rounded-lg border px-3 py-2 text-sm ${on ? "border-pi bg-pi text-white" : available ? "border-gray-200 text-gray-700" : "border-gray-100 text-gray-300 line-through"}`}
                        >
                          {v}
                          {!available && <span className="ml-1 text-[10px] no-underline">품절</span>}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              ))}
            </div>
            {selectedVariant && selectedVariant.stock > 0 && (
              <p className="mt-4 text-xs text-gray-500">선택한 옵션 남은 수량 {selectedVariant.stock}개</p>
            )}
            {!cartMode && shipping && canPickup && (
              <fieldset className="mt-4">
                <legend className="mb-1.5 text-sm font-bold text-gray-800">받는 방법</legend>
                <div className="flex gap-2">
                  {[false, true].map((p) => (
                    <button
                      key={String(p)}
                      type="button"
                      aria-pressed={pickup === p}
                      onClick={() => setPickup(p)}
                      className={`tap rounded-lg border px-3 py-2 text-sm ${pickup === p ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-700"}`}
                    >
                      {p ? "직거래 (배송비 없음)" : "택배 배송"}
                    </button>
                  ))}
                </div>
              </fieldset>
            )}
            {!cartMode && hasRemote && shipping && (
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-800">
                <input type="checkbox" checked={remoteArea} onChange={(e) => setRemoteArea(e.target.checked)} className="h-4 w-4 accent-pi" />
                제주·도서산간 지역으로 받아요 (+{shipping.remoteFee}π)
              </label>
            )}
            {cartMode ? (
              <button
                type="button"
                onClick={putInCart}
                disabled={!allPicked || variantSoldOut}
                className="tap mt-5 w-full rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
              >
                {!allPicked ? "옵션을 모두 선택해 주세요" : variantSoldOut ? "선택한 옵션은 품절이에요" : "장바구니 담기"}
              </button>
            ) : (
              <>
              <dl className="mt-4 space-y-1 rounded-xl bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">상품 금액</dt>
                  <dd>π {formatPi(listing.pricePi)}</dd>
                </div>
                {shipping && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">배송비</dt>
                    <dd>{!shipped ? "직거래 (0π)" : fee ? `π ${formatPi(fee)}` : "무료"}</dd>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-1.5 font-extrabold">
                  <dt>총 결제 금액</dt>
                  <dd className="text-pi">π {formatPi(total)}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={() => void pay()}
                disabled={!allPicked || busy || variantSoldOut}
                className="tap mt-5 w-full rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
              >
                {busy ? "결제 진행 중…" : !allPicked ? "옵션을 모두 선택해 주세요" : variantSoldOut ? "선택한 옵션은 품절이에요" : `π ${formatPi(total)} 결제하기`}
              </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
