import ProductGrid from "@/components/ProductGrid";
import SearchHeader from "@/components/SearchHeader";
import { allProducts } from "@/data/mall";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const term = q.trim().toLowerCase();
  const items = term ? allProducts.filter((p) => p.name.toLowerCase().includes(term)) : [];

  return (
    <>
      <SearchHeader key={q} initialQuery={q} />
      <ProductGrid
        title={term ? `'${q}' 검색결과 ${items.length}개` : "검색어를 입력해 주세요"}
        items={items}
        emptyText="검색 결과가 없어요. 다른 검색어를 입력해 보세요."
      />
    </>
  );
}
