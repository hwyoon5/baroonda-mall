import Link from "next/link";
import SubHeader from "@/components/SubHeader";

export default function OrdersPage() {
  return (
    <>
      <SubHeader title="주문내역" back={false} />
      <div className="flex flex-col items-center gap-3 bg-white py-24 text-sm text-gray-500">
        <p>아직 주문한 상품이 없어요.</p>
        <Link href="/deals" className="tap rounded-full bg-pi px-4 py-2 font-bold text-white">
          오늘의 특가 보러가기
        </Link>
      </div>
    </>
  );
}
