import Link from "next/link";
import SubHeader from "@/components/SubHeader";

export const metadata = { title: "파이 결제 가이드 · 바로온다" };

const steps: [string, string][] = [
  ["Pi Browser로 접속", "π 결제는 Pi Browser 앱에서만 할 수 있어요. Pi Browser에서 바로온다 주소를 열어 주세요."],
  ["Pi 계정으로 로그인", "마이 화면에서 로그인하고, Pi 앱이 묻는 사용자 이름·결제 권한을 허용해 주세요."],
  ["상품 고르고 'π로 구매하기'", "옵션이 있으면 먼저 고르세요. 결제 금액에는 상품 가격과 배송비가 함께 들어가요."],
  ["Pi 결제창에서 승인", "금액과 받는 곳(바로온다)을 확인하고 결제를 승인하면 주문이 완료돼요."],
  ["안전 보관 후 구매 확정", "결제한 π는 바로온다 앱 지갑에 보관돼요. 물건을 받고 구매 확정하면 판매자에게 전달돼요."],
];

const faqs: [string, string][] = [
  ["결제창이 뜨지 않아요", "일반 브라우저에서는 결제할 수 없어요. Pi Browser를 완전히 닫았다가 다시 열고 로그인해 주세요."],
  ["결제 중에 앱이 꺼졌어요", "다시 로그인하면 끝나지 않은 결제를 자동으로 확인해 주문을 마무리하거나 정리해요."],
  ["취소·환불은 어떻게 하나요?", "발송 전에는 주문 상세에서 바로 취소하고 π를 돌려받아요. 발송 후에는 환불을 요청하면 판매자가 확인해요."],
  ["배송은 어디서 보나요?", "마이 > 구매 내역에서 배송 상태와 택배사·송장번호를 볼 수 있어요."],
];

export default function PiGuidePage() {
  return (
    <>
      <SubHeader title="파이 결제 가이드" />
      <main className="space-y-2 pb-6">
        <section className="bg-white p-4">
          <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-r from-pi to-violet-500 p-4 text-white">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pi-gold text-2xl font-black text-pi">π</span>
            <div>
              <p className="text-[11px] opacity-80">Pi 계정만 있으면 누구나</p>
              <h2 className="text-base font-extrabold">π로 안전하게 사고팔기</h2>
            </div>
          </div>
        </section>

        <section className="bg-white px-4 py-4">
          <h2 className="text-sm font-extrabold text-gray-900">결제 순서</h2>
          <ol className="mt-3 space-y-3">
            {steps.map(([t, d], i) => (
              <li key={t} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pi text-xs font-black text-white">{i + 1}</span>
                <span>
                  <b className="block text-sm text-gray-900">{t}</b>
                  <span className="text-xs leading-relaxed text-gray-500">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-white px-4 py-4">
          <h2 className="text-sm font-extrabold text-gray-900">자주 묻는 질문</h2>
          <div className="mt-2 divide-y divide-gray-100">
            {faqs.map(([q, a]) => (
              <details key={q} className="group py-3">
                <summary className="tap flex cursor-pointer list-none items-center justify-between text-sm font-bold text-gray-800">
                  {q}
                  <span className="text-gray-300 transition-transform group-open:rotate-90" aria-hidden>
                    ›
                  </span>
                </summary>
                <p className="mt-2 text-xs leading-relaxed text-gray-500">{a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-2 bg-white p-4">
          <Link href="/sell" className="tap rounded-xl bg-pi py-3 text-center text-sm font-bold text-white">
            π로 판매하기
          </Link>
          <Link href="/orders" className="tap rounded-xl border border-gray-200 py-3 text-center text-sm font-bold text-gray-700">
            구매 내역 보기
          </Link>
        </section>
      </main>
    </>
  );
}
