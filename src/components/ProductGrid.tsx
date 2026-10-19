import { discountRate, products } from "@/data/mall";
import FastDeliveryTag from "./FastDeliveryTag";
import PiPrice, { formatPi } from "./PiPrice";

export default function ProductGrid() {
  return (
    <section aria-labelledby="recommend" className="mt-2 bg-white px-4 py-4">
      <h2 id="recommend" className="mb-3 text-lg font-extrabold text-gray-900">
        바로온다 추천상품
      </h2>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-5">
        {products.map((p) => {
          const rate = discountRate(p.pricePi, p.originalPi);
          return (
            <li key={p.id}>
              <a href={`#${p.id}`} className="block">
                <div className={`relative flex aspect-square items-center justify-center rounded-xl text-7xl ${p.bg}`}>
                  {p.emoji}
                  <button
                    type="button"
                    aria-label="찜하기"
                    className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow-sm"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>

                <div className="mt-2 flex flex-wrap gap-1">
                  {p.fastDelivery && <FastDeliveryTag compact />}
                  {p.freeShipping && (
                    <span className="rounded-sm bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-gray-600">
                      무료배송
                    </span>
                  )}
                </div>

                <p className="mt-1.5 line-clamp-2 text-[13px] leading-snug text-gray-800">{p.name}</p>

                {p.originalPi && (
                  <p className="mt-1 text-[11px] text-gray-400 line-through">π {formatPi(p.originalPi)}</p>
                )}
                <div className="flex items-baseline gap-1.5">
                  {rate > 0 && <span className="text-base font-extrabold text-red-500">{rate}%</span>}
                  <PiPrice value={p.pricePi} size="lg" />
                </div>

                <p className="mt-0.5 flex items-center gap-0.5 text-[11px] text-gray-500">
                  <span className="text-amber-400">★</span>
                  {p.rating.toFixed(1)}
                  <span className="text-gray-400">({p.reviews.toLocaleString("ko-KR")})</span>
                </p>

                {p.fastDelivery && (
                  <p className="mt-0.5 text-[11px] font-semibold text-pi">내일 도착 보장</p>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
