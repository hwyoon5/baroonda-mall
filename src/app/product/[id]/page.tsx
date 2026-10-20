import Link from "next/link";
import { notFound } from "next/navigation";
import FastDeliveryTag from "@/components/FastDeliveryTag";
import PiPrice, { formatPi } from "@/components/PiPrice";
import ProductActions from "@/components/ProductActions";
import SubHeader from "@/components/SubHeader";
import { allProducts, discountRate, findCategory, findProduct, isDeal } from "@/data/mall";

export function generateStaticParams() {
  return allProducts.map((p) => ({ id: p.id }));
}

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const p = findProduct(id);
  if (!p) notFound();
  const rate = discountRate(p.pricePi, p.originalPi);
  const category = findCategory(p.category);

  return (
    <>
      <SubHeader title={p.name} />
      <div className={`flex aspect-square items-center justify-center text-[9rem] ${p.bg}`}>{p.emoji}</div>

      <section className="bg-white px-4 py-4">
        {category && (
          <Link href={category.href} className="tap text-xs font-medium text-gray-500">
            {category.name} &rsaquo;
          </Link>
        )}
        <h2 className="mt-1 text-lg font-bold leading-snug text-gray-900">{p.name}</h2>
        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
          <span className="text-amber-400">★</span>
          {p.rating.toFixed(1)} · 리뷰 {p.reviews.toLocaleString("ko-KR")}개
        </p>

        <div className="mt-3">
          {p.originalPi && <p className="text-sm text-gray-400 line-through">π {formatPi(p.originalPi)}</p>}
          <div className="flex items-baseline gap-2">
            {rate > 0 && <span className="text-2xl font-extrabold text-red-500">{rate}%</span>}
            <PiPrice value={p.pricePi} size="lg" className="[&>span:nth-child(2)]:text-2xl" />
          </div>
        </div>

        {isDeal(p) && (
          <div className="mt-3">
            <div className="h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full rounded-full bg-pi" style={{ width: `${p.soldPercent}%` }} />
            </div>
            <p className="mt-1 text-xs font-medium text-pi">오늘의 특가 · {p.soldPercent}% 판매</p>
          </div>
        )}
      </section>

      <section className="mt-2 space-y-2 bg-white px-4 py-4 text-sm">
        <div className="flex gap-3">
          <span className="w-14 shrink-0 text-gray-500">배송</span>
          <div className="space-y-1">
            {p.fastDelivery ? (
              <>
                <FastDeliveryTag />
                <p className="font-semibold text-pi">오늘 밤 12시 전 주문 시 내일 도착 보장</p>
              </>
            ) : (
              <p className="text-gray-800">일반배송 · 2~3일 내 도착</p>
            )}
          </div>
        </div>
        <div className="flex gap-3">
          <span className="w-14 shrink-0 text-gray-500">배송비</span>
          <p className="text-gray-800">{p.freeShipping ? "무료배송" : "π 0.01 (π 0.5 이상 구매 시 무료)"}</p>
        </div>
        <div className="flex gap-3">
          <span className="w-14 shrink-0 text-gray-500">결제</span>
          <p className="text-gray-800">Pi 지갑 결제 (파이브라우저)</p>
        </div>
      </section>

      <div className="h-16" aria-hidden />
      <ProductActions id={p.id} />
    </>
  );
}
