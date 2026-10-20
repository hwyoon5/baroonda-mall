import P2PMarket from "@/components/P2PMarket";
import SubHeader from "@/components/SubHeader";

export default function MarketPage() {
  return (
    <>
      <SubHeader title="P2P 중고장터" />
      <div className="bg-white px-4 pt-3 text-xs text-gray-500">파이오니어끼리 π로 사고팔아요 · 파이 안전결제</div>
      <P2PMarket showHeader={false} />
    </>
  );
}
