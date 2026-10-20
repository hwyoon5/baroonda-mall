import { timeAgo } from "@/lib/format";
import type { PiUser } from "@/lib/types";

const colors = ["bg-sky-500", "bg-emerald-500", "bg-orange-500", "bg-rose-500", "bg-violet-500", "bg-amber-500"];
const colorFor = (uid: string) => colors[[...uid].reduce((a, c) => a + c.charCodeAt(0), 0) % colors.length];

export default function SellerInfo({ seller, location, createdAt }: { seller: PiUser; location?: string; createdAt: string }) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${colorFor(seller.uid)}`}
        aria-hidden
      >
        {seller.username.slice(0, 1)}
      </span>
      <span className="truncate text-[11px] font-semibold text-gray-700">{seller.username}</span>
      <span className="shrink-0 text-[11px] text-gray-400">
        {location ? `· ${location} ` : ""}· {timeAgo(createdAt)}
      </span>
    </div>
  );
}
