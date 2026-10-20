import ListingGrid from "@/components/ListingGrid";
import SearchHeader from "@/components/SearchHeader";
import { listListings } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = ((await searchParams).q ?? "").trim();
  const items = q ? await listListings({ q }) : [];
  return (
    <>
      <SearchHeader initialQuery={q} />
      <ListingGrid title={q ? `'${q}' 검색 결과 ${items.length}개` : "검색어를 입력해 주세요"} items={items} emptyText="검색 결과가 없어요." />
    </>
  );
}
