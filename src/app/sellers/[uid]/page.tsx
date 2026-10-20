import { notFound } from "next/navigation";
import ListingGrid from "@/components/ListingGrid";
import SubHeader from "@/components/SubHeader";
import { timeAgo } from "@/lib/format";
import { getSellerProfile } from "@/lib/server/sellers";

export const dynamic = "force-dynamic";

const stars = (n: number) => "★★★★★".slice(0, Math.round(n)) + "☆☆☆☆☆".slice(0, 5 - Math.round(n));

export default async function SellerPage({ params }: { params: Promise<{ uid: string }> }) {
  const profile = await getSellerProfile(decodeURIComponent((await params).uid));
  if (!profile) notFound();
  const { seller, stats, listings, reviews } = profile;
  return (
    <>
      <SubHeader title="판매자 프로필" />
      <section className="flex items-center gap-3 bg-white px-4 py-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pi text-xl font-black text-white">{seller.username.slice(0, 1)}</span>
        <div className="flex-1">
          <p className="text-base font-extrabold text-gray-900">{seller.username}</p>
          <p className="text-xs text-gray-500">Pi 인증 판매자</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-black text-amber-500">{stats.rating ?? "-"}</p>
          <p className="text-[11px] text-gray-500">후기 {stats.reviews}개</p>
        </div>
      </section>
      <section className="grid grid-cols-3 border-t border-gray-100 bg-white py-3 text-center">
        {[
          ["판매중", stats.selling],
          ["거래완료", stats.sold],
          ["거래 후기", stats.reviews],
        ].map(([t, n]) => (
          <div key={t}>
            <p className="text-base font-extrabold text-pi">{n}</p>
            <p className="text-[11px] text-gray-500">{t}</p>
          </div>
        ))}
      </section>
      <section className="mt-2 bg-white px-4 py-4">
        <h2 className="mb-2 text-base font-extrabold text-gray-900">받은 거래 후기</h2>
        {reviews.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-500">아직 받은 후기가 없어요.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reviews.map((r) => (
              <li key={r.id} className="py-3">
                <p className="text-xs">
                  <span className="text-amber-500">{stars(r.rating)}</span>
                  <span className="ml-1.5 font-semibold text-gray-800">{r.buyer.username}</span>
                  <span className="ml-1 text-gray-400">· {timeAgo(r.createdAt)}</span>
                </p>
                <p className="mt-0.5 truncate text-[11px] text-gray-400">{r.listingTitle}</p>
                {r.text && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{r.text}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ListingGrid title={`판매 상품 ${listings.length}`} items={listings} />
    </>
  );
}
