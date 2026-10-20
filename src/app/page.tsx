import CategoryGrid from "@/components/CategoryGrid";
import ListingGrid from "@/components/ListingGrid";
import SearchHeader from "@/components/SearchHeader";
import TodayDeals from "@/components/TodayDeals";
import Link from "next/link";
import { listListings } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [deals, recent] = await Promise.all([listListings({ dealsOnly: true }), listListings()]);
  return (
    <>
      <SearchHeader />
      <main>
        <div className="bg-white px-4 pt-3">
          <Link href="/sell" className="tap flex items-center justify-between rounded-xl bg-gradient-to-r from-pi to-violet-500 px-4 py-3 text-white">
            <div>
              <p className="text-[11px] font-medium opacity-80">Pi 계정만 있으면 누구나</p>
              <p className="text-sm font-bold">내 물건 올리고 π로 판매하기 &rsaquo;</p>
            </div>
            <span className="text-3xl font-black text-pi-gold">π</span>
          </Link>
        </div>
        <CategoryGrid />
        <TodayDeals deals={deals.slice(0, 10)} />
        <ListingGrid title="방금 올라온 상품" items={recent.slice(0, 20)} />
      </main>
    </>
  );
}
