"use client";

import { useDummyFill } from "@/lib/client/dummy";

/** 테스트 환경(로컬 mock·관리자)에서만 보이는 '테스트 데이터 자동 채우기' 버튼. */
export default function DummyFillButton({ onClick, disabled, label = "테스트 데이터 자동 채우기" }: { onClick: () => void; disabled?: boolean; label?: string }) {
  if (!useDummyFill()) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="tap w-full rounded-lg border border-dashed border-amber-400 bg-amber-50 py-2.5 text-xs font-bold text-amber-700 disabled:opacity-50"
    >
      🧪 {label} <span className="font-normal">(테스트 전용)</span>
    </button>
  );
}
