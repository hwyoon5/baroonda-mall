import Link from "next/link";
import { discountRate, formatPi } from "@/lib/format";
import type { Listing } from "@/lib/types";
import Countdown from "./Countdown";
import ListingThumb from "./ListingThumb";
import PiPrice from "./PiPrice";

export default function TodayDeals({ deals }: { deals: Listing[] }) {
  if (deals.length === 0) return null;
  return (
    <section aria-labelledby="today-deals" className="mt-2 bg-white py-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <h2 id="today-deals" className="text-lg font-extrabold text-gray-900">
            오늘의 특가
          </h2>
          <Countdown />
        </div>
        <Link href="/deals" className="tap -m-2 p-2 text-xs font-medium text-gray-500">
          전체보기 &rsaquo;
        </Link>
      </div>

      <ul className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1">
        {deals.map((d) => (
          <li key={d.id} className="w-36 shrink-0 snap-start">
            <Link href={`/listings/${d.id}`} className="tap block">
              <div className="relative">
                <ListingThumb listing={d} className="aspect-square rounded-xl" />
                <span className="absolute left-0 top-0 rounded-br-xl rounded-tl-xl bg-red-500 px-2 py-1 text-xs font-extrabold text-white">
                  {discountRate(d.pricePi, d.originalPricePi)}%
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-snug text-gray-800">{d.title}</p>
              {d.originalPricePi && <p className="mt-1 text-[11px] text-gray-400 line-through">π {formatPi(d.originalPricePi)}</p>}
              <PiPrice value={d.pricePi} size="md" />
              <p className="mt-0.5 truncate text-[10px] text-gray-500">{d.seller.username}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
