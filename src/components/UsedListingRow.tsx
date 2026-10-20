import Link from "next/link";
import { timeAgo } from "@/lib/format";
import { listingStatusText, type Listing } from "@/lib/types";
import ListingThumb from "./ListingThumb";
import PiPrice from "./PiPrice";
import TradeMethodTag from "./TradeMethodTag";

/** 당근마켓식 중고 리스트 행: 왼쪽 정사각 사진 + 제목 · 동네 · 시간 · 가격 */
export default function UsedListingRow({ listing: l }: { listing: Listing }) {
  return (
    <li>
      <Link href={`/listings/${l.id}`} className="tap flex gap-3 border-b border-gray-100 py-3">
        <ListingThumb listing={l} className="h-24 w-24 shrink-0 rounded-xl" emojiClass="text-4xl" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[15px] leading-snug text-gray-900">{l.title}</p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {l.seller.username}
            {l.location ? ` · ${l.location}` : ""} · {timeAgo(l.createdAt)}
          </p>
          <div className="mt-1 flex items-center gap-1.5">
            {l.status !== "selling" && <span className="rounded bg-gray-700 px-1.5 py-0.5 text-[10px] font-bold text-white">{listingStatusText(l)}</span>}
            <PiPrice value={l.pricePi} size="md" />
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {l.tradeMethods.map((m) => (
              <TradeMethodTag key={m} method={m} />
            ))}
            {l.negotiable && <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">가격제안</span>}
          </div>
        </div>
      </Link>
    </li>
  );
}
