"use client";

import SubHeader from "@/components/SubHeader";
import SellForm from "@/components/SellForm";
import LoginCard from "@/components/pi/LoginCard";
import { usePi } from "@/components/pi/PiProvider";

export default function SellPage() {
  const { user, ready } = usePi();
  return (
    <>
      <SubHeader title="내 물건 판매하기" />
      {!ready ? null : user ? <SellForm /> : <LoginCard message="Pi 계정으로 로그인하면 누구나 상품을 등록할 수 있어요." />}
    </>
  );
}
