import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import { listListings, withStats } from "@/lib/server/db";
import { PAGE_SIZE } from "@/lib/paging";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  const all = await listListings({ dealsOnly: true });
  return (
    <>
      <SubHeader title="오늘의 특가" />
      <ListingGrid
        items={await withStats(all.slice(0, PAGE_SIZE))}
        more={{ total: all.length, query: "deals=1" }}
        emptyText="오늘의 특가 상품이 없어요."
      />
    </>
  );
}
