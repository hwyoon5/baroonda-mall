"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import type { SellerBusiness } from "@/lib/business";

/** 로그인 → 사업자 정보 등록 → 상품 등록 중 지금 필요한 단계로 보낸다. */
export default function StartSellingButton() {
  const router = useRouter();
  const { user, ready, requireAuth } = useAuth();
  const [busy, setBusy] = useState(false);

  const start = async () => {
    if (!ready || busy) return;
    if (!user) return requireAuth();
    setBusy(true);
    try {
      const { business } = await api<{ business: SellerBusiness | null }>("/api/me/business");
      router.push(business ? "/sell" : "/my/business?next=/sell");
    } catch {
      router.push("/sell");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void start()}
        disabled={busy}
        className="tap mt-3 w-full rounded-xl bg-pi py-3 text-sm font-extrabold text-white disabled:opacity-60"
      >
        {busy ? "확인 중…" : "지금 판매 시작하기 ›"}
      </button>
      <p className="mt-1.5 text-center text-[11px] text-gray-400">
        {user ? "사업자 정보를 등록하면 바로 상품을 올릴 수 있어요." : "Pi 계정으로 로그인하고 시작해요."}
      </p>
    </>
  );
}
