import Link from "next/link";
import { discountRate } from "@/lib/format";
import type { Listing } from "@/lib/types";
import CardMeta from "./CardMeta";
import FastDeliveryTag from "./FastDeliveryTag";
import ListingThumb from "./ListingThumb";
import PiPrice from "./PiPrice";
import SellerInfo from "./SellerInfo";
import TradeMethodTag from "./TradeMethodTag";
import WishButton from "./WishButton";

export default function ListingCard({ listing: l }: { listing: Listing }) {
  const rate = discountRate(l.pricePi, l.originalPricePi);
  return (
    <li className="relative">
      <Link href={`/listings/${l.id}`} className="tap block">
        <ListingThumb listing={l} className="aspect-square rounded-xl" />
        <div className="mt-2 flex flex-wrap gap-1">
          {l.fastShipping && <FastDeliveryTag compact />}
          {l.condition === "used" && (
            <span className="rounded-sm bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold leading-none text-pi">중고</span>
          )}
          {l.tradeMethods.map((m) => (
            <TradeMethodTag key={m} method={m} />
          ))}
        </div>
        {l.brand && <p className="mt-1.5 truncate text-[11px] font-bold text-gray-500">{l.brand}</p>}
        <p className={`${l.brand ? "mt-0.5" : "mt-1.5"} line-clamp-2 text-[13px] leading-snug text-gray-800`}>{l.title}</p>
        <div className="mt-1 flex items-baseline gap-1.5">
          {rate > 0 && <span className="text-sm font-extrabold text-red-500">{rate}%</span>}
          <PiPrice value={l.pricePi} size="lg" />
        </div>
        <CardMeta listing={l} />
        <div className="mt-1">
          <SellerInfo seller={l.seller} location={l.location} createdAt={l.createdAt} />
        </div>
      </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 aspect-square">
        <WishButton id={l.id} className="pointer-events-auto absolute bottom-2 right-2" />
      </div>
    </li>
  );
}
