import { notFound, redirect } from "next/navigation";
import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import { findCategory } from "@/lib/categories";
import { listListings, withStats } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 예전 '중고마켓' 주소는 메인으로 보낸다.
  if (id === "used") redirect("/");
  const category = findCategory(id);
  if (!category) notFound();
  const items = await withStats(await listListings({ category: id }));
  return (
    <>
      <SubHeader title={category.name} />
      <ListingGrid items={items} emptyText={`${category.name}에 등록된 상품이 아직 없어요.`} />
    </>
  );
}
