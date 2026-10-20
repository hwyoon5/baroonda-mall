import Link from "next/link";
import { discountRate, type Product } from "@/data/mall";
import FastDeliveryTag from "./FastDeliveryTag";
import PiPrice, { formatPi } from "./PiPrice";
import WishButton from "./WishButton";

export default function ProductCard({ product: p }: { product: Product }) {
  const rate = discountRate(p.pricePi, p.originalPi);
  return (
    <div className="relative">
      <Link href={`/product/${p.id}`} className="tap block">
        <div className={`aspect-square overflow-hidden rounded-xl ${p.bg}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.image} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
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

        {p.originalPi && <p className="mt-1 text-[11px] text-gray-400 line-through">π {formatPi(p.originalPi)}</p>}
        <div className="flex items-baseline gap-1.5">
          {rate > 0 && <span className="text-base font-extrabold text-red-500">{rate}%</span>}
          <PiPrice value={p.pricePi} size="lg" />
        </div>

        <p className="mt-0.5 flex items-center gap-0.5 text-[11px] text-gray-500">
          <span className="text-amber-400">★</span>
          {p.rating.toFixed(1)}
          <span className="text-gray-400">({p.reviews.toLocaleString("ko-KR")})</span>
        </p>

        {p.fastDelivery && <p className="mt-0.5 text-[11px] font-semibold text-pi">내일 도착 보장</p>}
      </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
        <WishButton id={p.id} className="pointer-events-auto absolute bottom-2 right-2" />
      </div>
    </div>
  );
}
