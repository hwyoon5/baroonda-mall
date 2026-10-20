import Link from "next/link";
import { discountRate, todayDeals } from "@/data/mall";
import Countdown from "./Countdown";
import PiPrice, { formatPi } from "./PiPrice";

export default function TodayDeals() {
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
        {todayDeals.map((d) => {
          const rate = discountRate(d.pricePi, d.originalPi);
          return (
            <li key={d.id} className="w-36 shrink-0 snap-start">
              <Link href={`/product/${d.id}`} className="tap block">
                <div className={`relative flex aspect-square items-center justify-center rounded-xl bg-gradient-to-br text-6xl ${d.gradient}`}>
                  {d.emoji}
                  <span className="absolute left-0 top-0 rounded-br-xl rounded-tl-xl bg-red-500 px-2 py-1 text-xs font-extrabold text-white">
                    {rate}%
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-snug text-gray-800">{d.name}</p>
                <p className="mt-1 text-[11px] text-gray-400 line-through">π {formatPi(d.originalPi)}</p>
                <PiPrice value={d.pricePi} size="md" />
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-pi" style={{ width: `${d.soldPercent}%` }} />
                </div>
                <p className="mt-1 text-[10px] font-medium text-pi">{d.soldPercent}% 판매</p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
