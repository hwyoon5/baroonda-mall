import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import BuyBar from "@/components/BuyBar";
import FastDeliveryTag from "@/components/FastDeliveryTag";
import ListingThumb from "@/components/ListingThumb";
import SellerInfo from "@/components/SellerInfo";
import SubHeader from "@/components/SubHeader";
import TradeMethodTag from "@/components/TradeMethodTag";
import { findCategory } from "@/lib/categories";
import { discountRate, formatPi } from "@/lib/format";
import ShippingTable from "@/components/ShippingTable";
import { POLICY_FIELDS, formatBizRegNo, hasPolicy, pickPolicy } from "@/lib/business";
import { getBusiness, getListing, listReviewsForSeller } from "@/lib/server/db";
import { listingKindLabel, usageGradeLabel } from "@/lib/types";

export const dynamic = "force-dynamic";

function ListingVideo({ src, poster }: { src: string; poster?: string }) {
  return <video src={src} poster={poster} controls playsInline preload="metadata" className="aspect-square w-full shrink-0 snap-start bg-black object-contain" />;
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const listing = await getListing((await params).id);
  if (!listing || listing.status === "draft") notFound();
  const sellerReviews = await listReviewsForSeller(listing.seller.uid);
  const business = listing.condition === "new" ? await getBusiness(listing.seller.uid) : undefined;
  const policy = listing.condition === "new" ? (listing.policy ?? (business ? pickPolicy(business) : undefined)) : undefined;
  const sellerRating = sellerReviews.length ? (sellerReviews.reduce((a, r) => a + r.rating, 0) / sellerReviews.length).toFixed(1) : null;
  const category = findCategory(listing.category);
  const videos = listing.videos ?? [];
  const rate = discountRate(listing.pricePi, listing.originalPricePi);

  return (
    <>
      <SubHeader title={listing.title} />
      {listing.images.length > 1 || videos.length ? (
        <div className="relative">
          <div className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {listing.images.map((src, i) => (
              <Fragment key={i}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={`${listing.title} 사진 ${i + 1}`} className="aspect-square w-full shrink-0 snap-start object-cover" />
                {i === 0 && videos.map((v) => <ListingVideo key={v} src={v} poster={src} />)}
              </Fragment>
            ))}
            {!listing.images.length && videos.map((v) => <ListingVideo key={v} src={v} />)}
          </div>
          <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/55 px-2.5 py-1 text-[11px] font-bold text-white">
            {videos.length ? `▶ 동영상 ${videos.length} · ` : ""}사진 {listing.images.length}
          </span>
        </div>
      ) : (
        <ListingThumb listing={listing} className="aspect-square" emojiClass="text-[9rem]" />
      )}

      <section className="bg-white px-4 py-4">
        <Link href={`/sellers/${encodeURIComponent(listing.seller.uid)}`} className="tap flex items-center justify-between gap-2">
          <SellerInfo seller={listing.seller} location={listing.location} createdAt={listing.createdAt} />
          <span className="shrink-0 text-xs text-gray-500">
            {sellerReviews.length ? <span className="font-bold text-amber-500">★ {sellerRating} </span> : null}
            후기 {sellerReviews.length} · 프로필 ›
          </span>
        </Link>
        <div className="mt-3 text-xs text-gray-400">
          {category && (
            <Link href={category.href} className="tap underline-offset-2 hover:underline">
              {category.name}
            </Link>
          )}
          {" · "}
          {listingKindLabel[listing.condition]}
        </div>
        {listing.brand && (
          <Link href={`/search?brand=${encodeURIComponent(listing.brand)}`} className="tap mt-1 inline-block text-xs font-bold text-pi">
            {listing.brand} 상품 더보기 ›
          </Link>
        )}
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

      {policy && hasPolicy(policy) && (
        <section aria-label="반품·교환·환불 안내" className="mt-2 space-y-3 bg-white px-4 py-4 text-xs leading-relaxed text-gray-600">
          {policy.shipping && (
            <div>
              <h2 className="mb-1 text-sm font-bold text-gray-900">배송·반품 조건</h2>
              <ShippingTable terms={policy.shipping} />
            </div>
          )}
          {POLICY_FIELDS.filter((f) => policy[f.key]?.trim()).map((f) => (
            <div key={f.key}>
              <h2 className="mb-1 text-sm font-bold text-gray-900">{f.label}</h2>
              <p className="whitespace-pre-line">{policy[f.key]}</p>
            </div>
          ))}
        </section>
      )}

      {business && (
        <section aria-label="판매자 정보" className="mt-2 bg-white px-4 py-4 text-xs leading-relaxed text-gray-600">
          <h2 className="mb-2 text-sm font-bold text-gray-900">판매자 정보</h2>
          {(
            [
              ["상호", business.bizName],
              ["대표자", business.ownerName],
              ["사업자등록번호", formatBizRegNo(business.bizRegNo)],
              ["통신판매업 신고", business.mailOrderNo ?? "신고 면제 대상"],
              ["사업장 주소", business.address],
              ["고객센터", business.phone],
              ...(business.email ? [["이메일", business.email]] : []),
            ] as [string, string][]
          ).map(([k, v]) => (
            <p key={k}>
              <span className="inline-block w-28 text-gray-400">{k}</span>
              {v}
            </p>
          ))}
          <p className="mt-2 text-[11px] text-gray-400">바로온다는 통신판매중개자이며, 상품·거래에 관한 의무와 책임은 판매자에게 있어요.</p>
        </section>
      )}

      <div className="h-16" aria-hidden />
      <BuyBar listing={listing} />
    </>
  );
}
