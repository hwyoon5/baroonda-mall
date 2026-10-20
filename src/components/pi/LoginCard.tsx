"use client";

import { useState } from "react";
import { usePi } from "./PiProvider";

export default function LoginCard({ message = "Pi 계정으로 로그인하면 이용할 수 있어요." }: { message?: string }) {
  const { login } = usePi();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  return (
    <div className="m-4 rounded-2xl bg-white p-6 text-center">
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pi text-2xl font-black text-pi-gold">π</span>
      <p className="mt-3 text-sm text-gray-600">{message}</p>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            await login();
          } catch (e) {
            setError(e instanceof Error ? e.message : "로그인에 실패했어요.");
          } finally {
            setBusy(false);
          }
        }}
        className="tap mt-4 w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy ? "Pi 인증 중…" : "Pi로 로그인"}
      </button>
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
