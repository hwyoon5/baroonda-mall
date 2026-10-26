import BestBanner from "@/components/BestBanner";
import CategoryGrid from "@/components/CategoryGrid";
import ListingGrid from "@/components/ListingGrid";
import SearchHeader from "@/components/SearchHeader";
import TodayDeals from "@/components/TodayDeals";
import { listListings, withStats } from "@/lib/server/db";
import type { Listing } from "@/lib/types";

/** 실시간 인기 점수: 구매 > 후기 > 조회 */
const hot = (l: Listing) => (l.soldCount ?? 0) * 10 + (l.stats?.reviews ?? 0) * 5 + (l.stats?.rating ?? 0) * 2 + (l.stats?.views ?? 0);

export const dynamic = "force-dynamic";

export default async function Home() {
  const [allDeals, allRecent] = await Promise.all([listListings({ dealsOnly: true }), listListings()]);
  const pool = await withStats(allRecent.filter((l) => l.condition === "new" && l.status === "selling").slice(0, 200));
  const best = [...pool].sort((a, b) => hot(b) - hot(a)).slice(0, 5);
  const at = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Seoul" });
  const shown = await withStats([...allDeals.slice(0, 10), ...allRecent.slice(0, 20)]);
  const deals = shown.slice(0, Math.min(10, allDeals.length));
  const recent = shown.slice(deals.length);
  return (
    <>
      <SearchHeader />
      <main>
        <BestBanner items={best} at={at} />
        <CategoryGrid />
        <TodayDeals deals={deals} />
        <ListingGrid title="방금 올라온 상품" items={recent} />
      </main>
    </>
  );
}
