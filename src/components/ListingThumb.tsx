import type { Listing } from "@/lib/types";

export default function ListingThumb({ listing, className = "", emojiClass = "text-6xl" }: { listing: Listing; className?: string; emojiClass?: string }) {
  const src = listing.images[0];
  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${listing.bg ?? "bg-gray-100"} ${className}`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className={emojiClass} aria-hidden>
          {listing.emoji ?? "📦"}
        </span>
      )}
      {listing.status !== "selling" && (
        <span className="absolute inset-0 flex items-center justify-center bg-black/45 text-sm font-extrabold text-white">
          {listing.status === "reserved" ? "예약중" : "거래완료"}
        </span>
      )}
    </div>
  );
}
