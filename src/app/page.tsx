import BottomNav from "@/components/BottomNav";
import CategoryGrid from "@/components/CategoryGrid";
import P2PMarket from "@/components/P2PMarket";
import ProductGrid from "@/components/ProductGrid";
import SearchHeader from "@/components/SearchHeader";
import TodayDeals from "@/components/TodayDeals";

export default function Home() {
  return (
    <div className="mx-auto min-h-dvh max-w-md bg-gray-100 pb-20 shadow-xl">
      <SearchHeader />
      <main>
        <div className="bg-white px-4 pt-3">
          <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-pi to-violet-500 px-4 py-3 text-white">
            <div>
              <p className="text-[11px] font-medium opacity-80">파이브라우저 전용 혜택</p>
              <p className="text-sm font-bold">첫 결제 시 π 0.1 즉시 할인</p>
            </div>
            <span className="text-3xl font-black text-pi-gold">π</span>
          </div>
        </div>
        <CategoryGrid />
        <TodayDeals />
        <P2PMarket />
        <ProductGrid />
      </main>
      <BottomNav />
    </div>
  );
}
