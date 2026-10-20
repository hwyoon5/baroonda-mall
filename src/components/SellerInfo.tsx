import type { Seller } from "@/data/p2p";

export default function SellerInfo({ seller, timeAgo }: { seller: Seller; timeAgo: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${seller.avatarColor}`}
        aria-hidden
      >
        {seller.nickname.slice(0, 1)}
      </span>
      <span className="truncate text-[11px] font-semibold text-gray-700">{seller.nickname}</span>
      {seller.piVerified && (
        <span
          className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-pi text-[8px] font-black text-pi-gold"
          title="Pi KYC 인증 판매자"
          aria-label="Pi KYC 인증 판매자"
        >
          π
        </span>
      )}
      <span className="shrink-0 text-[11px] text-gray-400">
        · {seller.location} · {timeAgo}
      </span>
    </div>
  );
}
