import { notFound } from "next/navigation";
import ProductGrid from "@/components/ProductGrid";
import SubHeader from "@/components/SubHeader";
import { findCategory, productCategories, productsInCategory } from "@/data/mall";

export function generateStaticParams() {
  return productCategories.map((c) => ({ id: c.id }));
}

export default async function CategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const category = findCategory(id);
  if (!category) notFound();
  const items = productsInCategory(id);

  return (
    <>
      <SubHeader title={category.name} />
      <ProductGrid title={`${category.icon} ${category.name} ${items.length}개`} items={items} emptyText="준비 중인 상품이에요." />
    </>
  );
}
