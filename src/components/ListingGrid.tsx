import Link from "next/link";
import type { Listing } from "@/lib/types";
import ListingCard from "./ListingCard";
import ListingFeed from "./ListingFeed";

export default function ListingGrid({
  title,
  items,
  emptyText = "등록된 상품이 없어요.",
  more,
}: {
  title?: string;
  items: Listing[];
  emptyText?: string;
  /** 주면 첫 페이지 뒤로 /api/listings?{query}에서 이어 불러온다. */
  more?: { total: number; query: string };
}) {
  return (
    <section aria-label={title ?? "상품 목록"} className="mt-2 bg-white px-4 py-4">
      {title && <h2 className="mb-3 text-lg font-extrabold text-gray-900">{title}</h2>}
      {items.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500">
          <p>{emptyText}</p>
          <Link href="/sell" className="tap mt-3 inline-block rounded-full bg-pi px-4 py-2 text-xs font-bold text-white">
            내 물건 판매하기
          </Link>
        </div>
      ) : more ? (
        <ListingFeed key={more.query} initial={items} total={more.total} query={more.query} />
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
          {items.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </ul>
      )}
    </section>
  );
}
