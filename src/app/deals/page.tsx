import ProductGrid from "@/components/ProductGrid";
import SubHeader from "@/components/SubHeader";
import { todayDeals } from "@/data/mall";

export default function DealsPage() {
  return (
    <>
      <SubHeader title="오늘의 특가" />
      <ProductGrid title={null} items={todayDeals} />
    </>
  );
}
