import Link from "next/link";
import SubHeader from "@/components/SubHeader";
import { STORE_MAP_URL } from "@/lib/links";

export const metadata = { title: "내주변 매장 · 바로온다" };

export default function StoresPage() {
  return (
    <>
      <SubHeader title="내주변 매장" />
      <main className="space-y-2 pb-6">
        <section className="bg-white p-4">
          <div className="rounded-2xl bg-gradient-to-br from-pi to-violet-500 p-5 text-white">
            <span className="text-4xl" aria-hidden>
              🗺️
            </span>
            <h2 className="mt-2 text-lg font-extrabold">Korea 생태계 매장 지도</h2>
            <p className="mt-1 text-xs leading-relaxed opacity-90">π로 결제할 수 있는 국내 Pi 생태계 매장을 지도에서 찾아보세요. 내 위치 주변 매장과 길찾기를 네이버 지도에서 볼 수 있어요.</p>
            <a
              href={STORE_MAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="tap mt-4 flex items-center justify-center gap-1 rounded-xl bg-white py-3 text-sm font-extrabold text-pi"
            >
              네이버 지도에서 매장 보기 &rsaquo;
            </a>
          </div>
          <p className="mt-2 text-center text-[11px] text-gray-400">네이버 지도(외부 페이지)가 새 창으로 열려요.</p>
        </section>

        <section className="bg-white px-4 py-4">
          <h2 className="text-sm font-extrabold text-gray-900">이렇게 이용해요</h2>
          <ol className="mt-3 space-y-3 text-sm text-gray-700">
            {[
              ["지도 열기", "위 버튼으로 생태계 매장 지도를 열어요."],
              ["내 주변 찾기", "지도에서 현재 위치 버튼을 눌러 가까운 매장을 확인해요."],
              ["매장에서 π 결제", "방문 전에 매장의 영업시간과 π 결제 방법을 확인해 주세요."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pi/10 text-xs font-black text-pi">{i + 1}</span>
                <span>
                  <b className="block text-gray-900">{t}</b>
                  <span className="text-xs text-gray-500">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white px-4 py-4">
          <Link href="/sell" className="tap flex items-center justify-between rounded-xl border border-gray-100 p-3">
            <span>
              <b className="block text-sm text-gray-900">매장을 운영하시나요?</b>
              <span className="text-[11px] text-gray-500">바로온다에 상품을 올리고 온라인에서도 π로 판매해 보세요.</span>
            </span>
            <span className="text-gray-300" aria-hidden>
              ›
            </span>
          </Link>
        </section>
      </main>
    </>
  );
}
