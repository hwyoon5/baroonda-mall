"use client";

import Script from "next/script";
import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, TOKEN_KEY } from "@/lib/client/api";
import { flushIncompletePayment, initPiSdk, markPiSdkFailed, PI_MOCK, piAuthenticate, resetPiAuth } from "@/lib/client/pi-sdk";
import type { PiUser } from "@/lib/types";
import SignIn from "./SignIn";

export type AuthContextValue = {
  user: PiUser | null;
  isAuthenticated: boolean;
  /** 저장된 세션 확인이 끝났는지 */
  ready: boolean;
  isLoading: boolean;
  error: string;
  showSignIn: boolean;
  signIn: () => Promise<PiUser | null>;
  signOut: () => Promise<void>;
  requireAuth: () => void;
  closeSignIn: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

/** Pi 공식 데모의 useAuth 상태를 앱 전체에서 공유하기 위한 Provider */
export function PiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null);
  const [ready, setReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSignIn, setShowSignIn] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return setReady(true);
    api<{ user: PiUser | null }>("/api/me")
      .then((r) => {
        if (r.user) setUser(r.user);
        else localStorage.removeItem(TOKEN_KEY);
      })
      .catch(() => undefined)
      .finally(() => setReady(true));
  }, []);

  const signInUser = useCallback(async (authResult: PiAuthResult) => {
    const r = await api<{ user: PiUser; token: string }>("/api/user/signin", { authResult });
    localStorage.setItem(TOKEN_KEY, r.token);
    setUser(r.user);
    setShowSignIn(false);
    void flushIncompletePayment();
    return r.user;
  }, []);

  const signIn = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const authResult: PiAuthResult = PI_MOCK
        ? (() => {
            const name = window.prompt("테스트용 Pi 사용자 이름", "pioneer") || "pioneer";
            return { accessToken: `mock:${name}`, user: { uid: `mock-${name}`, username: name } };
          })()
        : await piAuthenticate();
      return await signInUser(authResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인에 실패했어요.");
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [signInUser]);

  const signOut = useCallback(async () => {
    await api("/api/user/signout").catch(() => undefined);
    localStorage.removeItem(TOKEN_KEY);
    resetPiAuth();
    setUser(null);
  }, []);

  const requireAuth = useCallback(() => setShowSignIn(true), []);
  const closeSignIn = useCallback(() => setShowSignIn(false), []);

  const value = useMemo(
    () => ({ user, isAuthenticated: Boolean(user), ready, isLoading, error, showSignIn, signIn, signOut, requireAuth, closeSignIn }),
    [user, ready, isLoading, error, showSignIn, signIn, signOut, requireAuth, closeSignIn],
  );

  return (
    <AuthContext.Provider value={value}>
      {!PI_MOCK && <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="afterInteractive" onLoad={initPiSdk} onError={markPiSdkFailed} />}
      {children}
      {showSignIn && <SignIn onSignIn={signIn} onModalClose={closeSignIn} disabled={isLoading} error={error} />}
    </AuthContext.Provider>
  );
}
