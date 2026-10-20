import { notFound } from "next/navigation";
import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import { findCategory } from "@/lib/categories";
import { listListings } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = findCategory(id);
  if (!category) notFound();
  const items = await listListings({ category: id });
  return (
    <>
      <SubHeader title={`${category.icon} ${category.name}`} />
      <ListingGrid items={items} emptyText={`${category.name}에 등록된 상품이 아직 없어요.`} />
    </>
  );
}
