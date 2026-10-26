"use client";

import { useEffect, useState } from "react";
import { api, TOKEN_KEY } from "./api";

/** 테스트 데이터 자동 채우기 버튼을 보여 줄지: 로컬 mock·NEXT_PUBLIC_DUMMY_FILL=1 이거나 관리자 계정. */
export function useDummyFill() {
  const forced = process.env.NEXT_PUBLIC_PI_MOCK === "1" || process.env.NEXT_PUBLIC_DUMMY_FILL === "1";
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    if (forced || !localStorage.getItem(TOKEN_KEY)) return;
    api<{ isAdmin?: boolean }>("/api/me")
      .then((r) => setAdmin(!!r.isAdmin))
      .catch(() => {});
  }, [forced]);
  return forced || admin;
}

export const TEST_BUSINESS = {
  bizName: "바로온다 테스트상점",
  ownerName: "홍길동",
  bizRegNo: "123-45-67891",
  mailOrderNo: "2024-서울강남-01234",
  mailOrderExempt: false,
  address: "서울특별시 강남구 테헤란로 123, 4층",
  phone: "02-1234-5678",
  email: "test@baroonda.example",
  piWallet: "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
};

export const TEST_SHIPPING = { method: "택배", courier: "CJ대한통운", fee: "0.5", freeOver: "10", remoteFee: "0.3", returnFee: "0.5", exchangeFee: "1", requestDays: "7" };

/** 캔버스로 그린 테스트용 PNG. 실제 첨부와 같은 경로(리사이즈·업로드)로 올린다. */
export async function dummyImage(title: string, lines: string[] = [], size: [number, number] = [800, 1100]): Promise<File> {
  const c = document.createElement("canvas");
  [c.width, c.height] = size;
  const g = c.getContext("2d")!;
  const hue = Math.floor(Math.random() * 360);
  g.fillStyle = `hsl(${hue} 70% 96%)`;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = "#6b3fa0";
  g.lineWidth = 8;
  g.strokeRect(30, 30, c.width - 60, c.height - 60);
  g.fillStyle = "#111";
  g.textAlign = "center";
  g.font = "bold 56px sans-serif";
  g.fillText(title, c.width / 2, c.height * 0.25);
  g.font = "32px sans-serif";
  [...lines, new Date().toLocaleString("ko-KR")].forEach((t, i) => g.fillText(t, c.width / 2, c.height * 0.25 + 100 + i * 60));
  g.fillStyle = "#dc2626";
  g.font = "bold 64px sans-serif";
  g.fillText("테스트용 더미", c.width / 2, c.height * 0.85);
  const blob = await new Promise<Blob>((ok, fail) => c.toBlob((b) => (b ? ok(b) : fail(new Error("더미 파일을 만들지 못했어요."))), "image/png"));
  return new File([blob], `${title}-test.png`, { type: "image/png" });
}
