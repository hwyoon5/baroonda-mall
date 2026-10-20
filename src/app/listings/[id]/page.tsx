import Link from "next/link";
import { notFound } from "next/navigation";
import BuyBar from "@/components/BuyBar";
import FastDeliveryTag from "@/components/FastDeliveryTag";
import ListingThumb from "@/components/ListingThumb";
import SellerInfo from "@/components/SellerInfo";
import SubHeader from "@/components/SubHeader";
import TradeMethodTag from "@/components/TradeMethodTag";
import { findCategory } from "@/lib/categories";
import { discountRate, formatPi } from "@/lib/format";
import { getListing } from "@/lib/server/db";
import { listingKindLabel, usageGradeLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const listing = await getListing((await params).id);
  if (!listing) notFound();
  const category = findCategory(listing.category);
  const rate = discountRate(listing.pricePi, listing.originalPricePi);

  return (
    <>
      <SubHeader title={listing.title} />
      {listing.images.length > 1 ? (
        <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {listing.images.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt={`${listing.title} 사진 ${i + 1}`} className="aspect-square w-full shrink-0 snap-start object-cover" />
          ))}
        </div>
      ) : (
        <ListingThumb listing={listing} className="aspect-square" emojiClass="text-[9rem]" />
      )}

      <section className="bg-white px-4 py-4">
        <SellerInfo seller={listing.seller} location={listing.location} createdAt={listing.createdAt} />
        <div className="mt-3 text-xs text-gray-400">
          {category && (
            <Link href={category.href} className="tap underline-offset-2 hover:underline">
              {category.name}
            </Link>
          )}
          {" · "}
          {listingKindLabel[listing.condition]}
        </div>
        <h1 className="mt-1 text-lg font-bold text-gray-900">{listing.title}</h1>
        {listing.originalPricePi && <p className="mt-2 text-sm text-gray-400 line-through">π {formatPi(listing.originalPricePi)}</p>}
        <p className="flex items-baseline gap-2">
          {rate > 0 && <span className="text-2xl font-extrabold text-red-500">{rate}%</span>}
          <span className="text-2xl font-black text-gray-900">
            <span className="text-pi">π</span> {formatPi(listing.pricePi)}
          </span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1">
          <span
            className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${listing.condition === "new" ? "bg-pi text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {listingKindLabel[listing.condition]}
          </span>
          {listing.fastShipping && <FastDeliveryTag />}
          {listing.tradeMethods.map((m) => (
            <TradeMethodTag key={m} method={m} />
          ))}
        </div>
      </section>

      <section className="mt-2 space-y-2 bg-white px-4 py-4 text-sm">
        {listing.meetingPlace && (
          <p>
            <span className="inline-block w-20 text-gray-500">직거래 장소</span>
            {listing.meetingPlace}
          </p>
        )}
        {listing.condition === "used" ? (
          <>
            {listing.usageGrade && (
              <p>
                <span className="inline-block w-20 text-gray-500">사용감</span>
                {usageGradeLabel[listing.usageGrade]}
              </p>
            )}
            {listing.usageNote && (
              <p className="flex">
                <span className="inline-block w-20 shrink-0 text-gray-500">사용감 설명</span>
                <span className="whitespace-pre-line text-gray-800">{listing.usageNote}</span>
              </p>
            )}
            <p>
              <span className="inline-block w-20 text-gray-500">수량</span>1개 (개인 중고)
            </p>
          </>
        ) : (
          <>
            <p>
              <span className="inline-block w-20 text-gray-500">재고</span>
              {listing.stock ? `${listing.stock}개 남음` : "품절"}
              {listing.soldCount ? <span className="text-gray-400"> · {listing.soldCount}개 판매</span> : null}
            </p>
            {listing.options?.map((o) => (
              <p key={o.name}>
                <span className="inline-block w-20 text-gray-500">{o.name}</span>
                {o.values.join(", ")}
              </p>
            ))}
          </>
        )}
        <p>
          <span className="inline-block w-20 text-gray-500">결제</span>
          <span className="font-semibold text-pi">π 안전결제</span> (구매 확정 후 판매자 정산)
        </p>
        <p className="whitespace-pre-line pt-2 leading-relaxed text-gray-700">{listing.description || "판매자가 설명을 남기지 않았어요."}</p>
      </section>

      <div className="h-16" aria-hidden />
      <BuyBar listing={listing} />
    </>
  );
}
