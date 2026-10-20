"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import SubHeader from "@/components/SubHeader";
import SellForm from "@/components/SellForm";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";

export default function SellPage() {
  return (
    <Suspense>
      <Sell />
    </Suspense>
  );
}

function Sell() {
  const { user, ready } = useAuth();
  const draftId = useSearchParams().get("draft") ?? undefined;
  return (
    <>
      <SubHeader title={draftId ? "임시저장 이어서 작성" : "내 물건 판매하기"} />
      {!ready ? null : user ? (
        <SellForm key={draftId ?? "new"} draftId={draftId} />
      ) : (
        <LoginCard message="Pi 계정으로 로그인하면 누구나 상품을 등록할 수 있어요." />
      )}
    </>
  );
}
