"use client";

import { useEffect, useState } from "react";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import type { PiUser } from "@/lib/types";

type Session = { user: PiUser; token: string };

/** 관리자 로그인: Pi Browser는 Pi 로그인, PC 브라우저는 1회용 코드, 개발·테스트 환경은 테스트 계정 */
export default function AdminLogin() {
  const { adoptSession } = useAuth();
  const [code, setCode] = useState("");
  const [test, setTest] = useState<{ enabled: boolean; needsSecret: boolean } | null>(null);
  const [secret, setSecret] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ enabled: boolean; needsSecret: boolean }>("/api/user/test-signin").then(setTest, () => undefined);
  }, []);

  const run = async (key: string, path: string, body: unknown) => {
    setBusy(key);
    setError("");
    try {
      adoptSession(await api<Session>(path, body));
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했어요.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="pb-6 lg:mx-auto lg:max-w-md lg:pt-8">
      <LoginCard message="Pi Browser에서는 관리자 Pi 계정으로 로그인해 주세요." />

      <form
        className="mx-4 rounded-2xl bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault();
          void run("code", "/api/user/code-signin", { code });
        }}
      >
        <h2 className="text-sm font-extrabold text-gray-900">PC 브라우저에서 로그인</h2>
        <p className="mt-1 text-xs leading-relaxed text-gray-500">
          Pi Browser에서 관리자 대시보드 맨 아래 <b>‘PC 로그인 코드 받기’</b>를 누르고, 나온 8자리 코드를 5분 안에 입력하세요. 코드는 한 번만 쓸 수 있고, PC 로그인은 12시간 유지돼요.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABCD-EFGH"
          aria-label="PC 로그인 코드"
          autoComplete="one-time-code"
          maxLength={9}
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-3 text-center font-mono text-lg font-bold tracking-[0.3em] outline-none focus:border-pi"
        />
        <button type="submit" disabled={!!busy || code.replace(/[^A-Za-z0-9]/g, "").length !== 8} className="tap mt-2 w-full rounded-xl bg-gray-900 py-3 text-sm font-bold text-white disabled:opacity-40">
          {busy === "code" ? "확인 중…" : "코드로 로그인"}
        </button>
      </form>

      {test?.enabled && (
        <div className="mx-4 mt-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-extrabold text-amber-900">🧪 개발자/테스트 계정으로 로그인</h2>
          <p className="mt-1 text-xs leading-relaxed text-amber-800">테스트 환경에서만 보여요. 실제 Pi 계정이 아닌 테스트 계정으로 로그인해요.</p>
          {test.needsSecret && (
            <input
              type="password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="테스트 비밀번호 (TEST_LOGIN_SECRET)"
              aria-label="테스트 비밀번호"
              className="mt-3 w-full rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500"
            />
          )}
          <button
            type="button"
            disabled={!!busy || (test.needsSecret && !secret)}
            onClick={() => void run("admin", "/api/user/test-signin", { secret })}
            className="tap mt-2 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {busy === "admin" ? "로그인 중…" : "테스트 관리자로 로그인"}
          </button>
          <div className="mt-2 flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="사용자 이름 (예: buyer1)"
              aria-label="테스트 사용자 이름"
              className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500"
            />
            <button
              type="button"
              disabled={!!busy || !name.trim() || (test.needsSecret && !secret)}
              onClick={() => void run("user", "/api/user/test-signin", { secret, name })}
              className="tap shrink-0 rounded-xl border border-amber-400 bg-white px-3 text-xs font-bold text-amber-800 disabled:opacity-40"
            >
              {busy === "user" ? "…" : "일반 사용자로"}
            </button>
          </div>
        </div>
      )}
      {error && <p className="mx-4 mt-3 text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
