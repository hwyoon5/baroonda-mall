"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";

/** 관리자 대시보드: PC 브라우저 로그인용 1회용 코드 발급 */
export default function PcCodeCard() {
  const [issued, setIssued] = useState<{ code: string; expiresAt: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const left = issued ? Math.max(0, Math.round((Date.parse(issued.expiresAt) - now) / 1000)) : 0;

  useEffect(() => {
    if (!issued) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [issued]);

  return (
    <section className="mt-2 bg-white px-4 py-4">
      <h2 className="text-sm font-extrabold text-gray-900">PC에서 관리자 화면 열기</h2>
      <p className="mt-1 text-xs leading-relaxed text-gray-500">코드를 받아 PC 브라우저에서 이 사이트의 관리자 화면(/admin)에 입력하세요. 코드는 5분 동안 한 번만 쓸 수 있어요. 다른 사람에게 알려 주지 마세요.</p>
      {issued && left > 0 ? (
        <div className="mt-3 rounded-xl bg-gray-50 p-4 text-center">
          <p className="font-mono text-3xl font-black tracking-[0.2em] text-gray-900" aria-label="PC 로그인 코드">
            {issued.code}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")} 남음
          </p>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(issued.code).then(() => setMsg("복사했어요."), () => setMsg("직접 적어 주세요."))}
            className="tap mt-2 rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-600"
          >
            코드 복사
          </button>
        </div>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMsg("");
          try {
            setIssued(await api<{ code: string; expiresAt: string }>("/api/admin/pc-code", {}));
            setNow(Date.now());
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "코드를 받지 못했어요.");
          } finally {
            setBusy(false);
          }
        }}
        className="tap mt-3 w-full rounded-xl border border-pi py-2.5 text-sm font-bold text-pi disabled:opacity-50"
      >
        {issued && left > 0 ? "새 코드 받기" : "PC 로그인 코드 받기"}
      </button>
      {msg && <p className="mt-2 text-center text-xs text-gray-500">{msg}</p>}
    </section>
  );
}
