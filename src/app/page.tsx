import CategoryGrid from "@/components/CategoryGrid";
import ListingGrid from "@/components/ListingGrid";
import SearchHeader from "@/components/SearchHeader";
import TodayDeals from "@/components/TodayDeals";
import { listListings, withStats } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [allDeals, allRecent] = await Promise.all([listListings({ dealsOnly: true }), listListings()]);
  const shown = await withStats([...allDeals.slice(0, 10), ...allRecent.slice(0, 20)]);
  const deals = shown.slice(0, Math.min(10, allDeals.length));
  const recent = shown.slice(deals.length);
  return (
    <>
      <SearchHeader />
      <main>
        <div className="bg-white px-4 pt-3">
          <a
            href="https://naver.me/FTdj3KY8"
            target="_blank"
            rel="noopener noreferrer"
            className="tap flex items-center justify-between rounded-xl bg-gradient-to-r from-pi to-violet-500 px-4 py-3 text-white"
          >
            <div>
              <p className="text-[11px] font-medium opacity-80">네이버 지도에서 열기</p>
              <p className="text-sm font-bold">Korea 생태계 매장 지도 &rsaquo;</p>
            </div>
            <span className="text-3xl">🗺️</span>
          </a>
        </div>
        <CategoryGrid />
        <TodayDeals deals={deals} />
        <ListingGrid title="방금 올라온 상품" items={recent} />
      </main>
    </>
  );
}
