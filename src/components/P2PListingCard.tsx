import Link from "next/link";
import { formatTimeAgo, type P2PListing } from "@/data/p2p";
import PiPrice from "./PiPrice";
import SellerInfo from "./SellerInfo";
import TradeMethodTag from "./TradeMethodTag";

const statusBadge = {
  selling: null,
  reserved: { label: "예약중", className: "bg-emerald-500" },
  sold: { label: "거래완료", className: "bg-gray-500" },
} as const;

export default function P2PListingCard({ item }: { item: P2PListing }) {
  const badge = statusBadge[item.status];
  const sold = item.status === "sold";

  return (
    <Link href={`/market/${item.id}`} className={`tap flex gap-3 py-3.5 ${sold ? "opacity-60" : ""}`}>
      <div
        className={`relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl text-5xl ${item.bg ?? "bg-gray-100"}`}
      >
        {item.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          item.emoji ?? "📦"
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <p className="line-clamp-2 text-[13px] leading-snug text-gray-900">{item.title}</p>

        <div className="mt-1">
          <SellerInfo seller={item.seller} timeAgo={formatTimeAgo(item.minutesAgo)} />
        </div>

        <div className="mt-1.5 flex flex-wrap items-center gap-1">
          {badge && (
            <span className={`rounded-sm px-1.5 py-0.5 text-[10px] font-bold leading-none text-white ${badge.className}`}>
              {badge.label}
            </span>
          )}
          {item.tradeMethods.map((m) => (
            <TradeMethodTag key={m} method={m} />
          ))}
          {item.negotiable && (
            <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-gray-500">
              가격제안
            </span>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between pt-1">
          <PiPrice value={item.pricePi} size="lg" />
          <span className="flex items-center gap-2 text-[11px] text-gray-400">
            {item.chats > 0 && (
              <span className="flex items-center gap-0.5" aria-label={`채팅 ${item.chats}`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z" strokeLinejoin="round" />
                </svg>
                {item.chats}
              </span>
            )}
            {item.likes > 0 && (
              <span className="flex items-center gap-0.5" aria-label={`관심 ${item.likes}`}>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" />
                </svg>
                {item.likes}
              </span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}
