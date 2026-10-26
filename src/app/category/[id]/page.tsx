import { notFound, redirect } from "next/navigation";
import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import { findCategory, normalizeCategory } from "@/lib/categories";
import { PAGE_SIZE } from "@/lib/paging";
import { listListings, withStats } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 예전 '중고마켓' 주소는 메인으로 보낸다.
  if (id === "used") redirect("/");
  if (normalizeCategory(id) !== id) redirect(`/category/${normalizeCategory(id)}`);
  const category = findCategory(id);
  if (!category) notFound();
  const all = await listListings({ category: id });
  const items = await withStats(all.slice(0, PAGE_SIZE));
  return (
    <>
      <SubHeader title={category.name} />
      <ListingGrid items={items} more={{ total: all.length, query: `category=${encodeURIComponent(id)}` }} emptyText={`${category.name}에 등록된 상품이 아직 없어요.`} />
    </>
  );
}
