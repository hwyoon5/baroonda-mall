"use client";

import Link from "next/link";
import { formatTimeAgo, tradeMethodLabel } from "@/data/p2p";
import PiPrice from "./PiPrice";
import SubHeader from "./SubHeader";
import TradeMethodTag from "./TradeMethodTag";
import { useStore } from "./store/StoreProvider";

export default function ListingDetail({ id }: { id: string }) {
  const { listings, showToast } = useStore();
  const item = listings.find((l) => l.id === id);

  if (!item) {
    return (
      <>
        <SubHeader title="중고 매물" />
        <div className="flex flex-col items-center gap-3 bg-white py-24 text-sm text-gray-500">
          <p>삭제되었거나 존재하지 않는 매물이에요.</p>
          <Link href="/market" className="tap rounded-full bg-pi px-4 py-2 font-bold text-white">
            중고장터로 가기
          </Link>
        </div>
      </>
    );
  }

  const s = item.seller;
  const statusText = item.status === "reserved" ? "예약중" : item.status === "sold" ? "거래완료" : null;

  return (
    <>
      <SubHeader title={item.title} />
      <div className={`flex aspect-square items-center justify-center overflow-hidden text-[9rem] ${item.bg ?? "bg-gray-100"}`}>
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          item.emoji ?? "📦"
        )}
      </div>

      <section className="flex items-center gap-3 border-b border-gray-100 bg-white px-4 py-3">
        <span className={`flex h-10 w-10 items-center justify-center rounded-full text-base font-bold text-white ${s.avatarColor}`}>
          {s.nickname.slice(0, 1)}
        </span>
        <div className="flex-1">
          <p className="flex items-center gap-1 text-sm font-bold text-gray-900">
            {s.nickname}
            {s.piVerified && (
              <span className="rounded bg-pi px-1 py-0.5 text-[9px] font-bold text-pi-gold">π KYC 인증</span>
            )}
          </p>
          <p className="text-xs text-gray-500">{s.location}</p>
        </div>
        <div className="text-right text-xs text-gray-500">
          <p className="font-bold text-amber-500">★ {s.rating.toFixed(1)}</p>
          <p>거래 {s.trades}회</p>
        </div>
      </section>

      <section className="bg-white px-4 py-4">
        <div className="flex flex-wrap gap-1">
          {statusText && (
            <span className="rounded-sm bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{statusText}</span>
          )}
          {item.tradeMethods.map((m) => (
            <TradeMethodTag key={m} method={m} />
          ))}
        </div>
        <h2 className="mt-2 text-lg font-bold text-gray-900">{item.title}</h2>
        <p className="mt-1 text-xs text-gray-400">
          {item.category} · {formatTimeAgo(item.minutesAgo)} · 채팅 {item.chats} · 관심 {item.likes}
        </p>
        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gray-800">
          {item.description || "판매자가 작성한 설명이 없어요. 채팅으로 상태를 문의해 보세요."}
        </p>
        <dl className="mt-4 space-y-1 rounded-xl bg-gray-50 p-3 text-xs">
          <div className="flex gap-2">
            <dt className="w-16 text-gray-500">거래 방식</dt>
            <dd className="text-gray-800">{item.tradeMethods.map((m) => tradeMethodLabel[m]).join(", ")}</dd>
          </div>
          {item.meetingPlace && (
            <div className="flex gap-2">
              <dt className="w-16 text-gray-500">희망 장소</dt>
              <dd className="text-gray-800">{item.meetingPlace}</dd>
            </div>
          )}
        </dl>
      </section>

      <div className="h-16" aria-hidden />
      <div className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-center gap-3 border-t border-gray-100 bg-white px-4 py-2.5">
        <div className="flex-1">
          <PiPrice value={item.pricePi} size="lg" />
          <p className="text-[11px] text-gray-400">{item.negotiable ? "가격 제안 가능" : "가격 제안 불가"}</p>
        </div>
        <button
          type="button"
          disabled={item.status === "sold"}
          onClick={() => showToast("채팅 기능은 준비 중이에요")}
          className="tap h-11 rounded-xl bg-pi px-6 text-sm font-bold text-white disabled:bg-gray-300"
        >
          {item.status === "sold" ? "거래완료" : "채팅하기"}
        </button>
      </div>
    </>
  );
}
