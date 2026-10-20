"use client";

/** Pi 공식 데모의 SignIn 모달: 로그인이 필요한 동작에서 requireAuth()로 띄운다. */
export default function SignIn({ onSignIn, onModalClose, disabled, error }: { onSignIn: () => void; onModalClose: () => void; disabled?: boolean; error?: string }) {
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="signin-title" className="fixed inset-0 z-50 mx-auto flex max-w-md items-end bg-black/50" onClick={onModalClose}>
      <div className="w-full rounded-t-2xl bg-white px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6 text-center" onClick={(e) => e.stopPropagation()}>
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-pi text-2xl font-black text-pi-gold">π</span>
        <h2 id="signin-title" className="mt-3 text-base font-extrabold text-gray-900">
          Pi 로그인이 필요해요
        </h2>
        <p className="mt-1 text-sm text-gray-500">Pi 계정으로 로그인하면 상품을 등록하고 π로 결제할 수 있어요.</p>
        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
        <button type="button" onClick={onSignIn} disabled={disabled} className="tap mt-5 w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60">
          {disabled ? "로그인 중…" : "Pi로 로그인"}
        </button>
        <button type="button" onClick={onModalClose} className="tap mt-2 w-full py-2 text-sm text-gray-500">
          닫기
        </button>
      </div>
    </div>
  );
}
