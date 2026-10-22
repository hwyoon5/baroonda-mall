import ListingGrid from "@/components/ListingGrid";
import SearchControls from "@/components/SearchControls";
import SearchHeader from "@/components/SearchHeader";
import { listListings, withStats } from "@/lib/server/db";
import { activeFilterCount, applySearch, parseSearch, searchFacets } from "@/lib/search";

export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = parseSearch(await searchParams);
  const active = !!s.q || activeFilterCount(s) > 0;
  const base = active ? await listListings({ q: s.q || undefined }) : [];
  const items = await withStats(applySearch(base, s));
  return (
    <>
      <SearchHeader initialQuery={s.q} />
      {active && <SearchControls state={s} facets={searchFacets(base, s)} />}
      <ListingGrid
        title={!active ? "검색어를 입력해 주세요" : `${s.q ? `'${s.q}' 검색 결과` : "필터 결과"} ${items.length}개`}
        items={items}
        emptyText={activeFilterCount(s) ? "조건에 맞는 상품이 없어요. 필터를 줄여 보세요." : "검색 결과가 없어요."}
      />
    </>
  );
}
