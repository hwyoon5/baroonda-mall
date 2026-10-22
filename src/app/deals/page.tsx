import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import { listListings } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function DealsPage() {
  return (
    <>
      <SubHeader title="오늘의 특가" />
      <ListingGrid items={await listListings({ dealsOnly: true })} emptyText="오늘의 특가 상품이 없어요." />
    </>
  );
}
