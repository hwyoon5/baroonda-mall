import { notFound } from "next/navigation";
import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import UsedSubCategories, { usedSubCategories } from "@/components/UsedSubCategories";
import { findCategory } from "@/lib/categories";
import { listListings } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ sub?: string }> }) {
  const { id } = await params;
  const category = findCategory(id);
  if (!category) notFound();
  const items = await listListings({ category: id });
  if (id !== "used") {
    return (
      <>
        <SubHeader title={category.name} />
        <ListingGrid items={items} emptyText={`${category.name}에 등록된 상품이 아직 없어요.`} />
      </>
    );
  }
  const subId = (await searchParams).sub;
  const sub = usedSubCategories.find((c) => c.id === subId);
  return (
    <>
      <SubHeader title={category.name} />
      <UsedSubCategories items={items} active={sub?.id} />
      <ListingGrid
        items={sub ? items.filter((l) => l.category === sub.id) : items}
        layout="list"
        emptyText={sub ? `중고 ${sub.name} 상품이 아직 없어요.` : `${category.name}에 등록된 상품이 아직 없어요.`}
      />
    </>
  );
}
