"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { api, TOKEN_KEY } from "@/lib/client/api";
import type { Order, PiUser } from "@/lib/types";

const MOCK = process.env.NEXT_PUBLIC_PI_MOCK === "1";
const SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
const SCOPES: PiScope[] = ["username", "payments"];

export class PaymentCancelled extends Error {
  constructor() {
    super("결제를 취소했어요.");
  }
}

type PiContext = {
  user: PiUser | null;
  ready: boolean;
  login: () => Promise<PiUser>;
  logout: () => void;
  /** 주문 생성 → Pi 결제창 → 서버 승인/완료까지 진행하고 주문 ID를 돌려준다. */
  buy: (listingId: string) => Promise<string>;
};

const Ctx = createContext<PiContext | null>(null);

function onIncompletePaymentFound(payment: PiPaymentDTO) {
  api("/api/payments/incomplete", { payment }).catch((e) => console.error("incomplete payment", e));
}

function withTimeout<T>(p: Promise<T>, ms: number, message: string) {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error(message)), ms))]);
}

export function PiProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PiUser | null>(null);
  const [ready, setReady] = useState(false);
  const sdkInit = useRef(false);
  const sdkAuthed = useRef(false);

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

  const initSdk = useCallback(() => {
    if (sdkInit.current || !window.Pi) return;
    window.Pi.init({ version: "2.0", sandbox: SANDBOX });
    sdkInit.current = true;
  }, []);

  const waitForSdk = useCallback(async (): Promise<PiSDK> => {
    for (let i = 0; i < 100; i++) {
      initSdk();
      if (sdkInit.current && window.Pi) return window.Pi;
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Pi SDK를 불러오지 못했어요. Pi Browser에서 열어 주세요.");
  }, [initSdk]);

  const piAuthenticate = useCallback(async () => {
    const Pi = await waitForSdk();
    const res = await withTimeout(
      Pi.authenticate(SCOPES, onIncompletePaymentFound),
      60_000,
      "Pi 인증 응답이 없어요. Pi Browser에서 열었는지 확인해 주세요.",
    );
    sdkAuthed.current = true;
    return res;
  }, [waitForSdk]);

  const login = useCallback(async () => {
    const accessToken = MOCK
      ? `mock:${window.prompt("테스트용 Pi 사용자 이름", "pioneer") || "pioneer"}`
      : (await piAuthenticate()).accessToken;
    const r = await api<{ user: PiUser; token: string }>("/api/auth/pi", { accessToken });
    localStorage.setItem(TOKEN_KEY, r.token);
    setUser(r.user);
    return r.user;
  }, [piAuthenticate]);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    sdkAuthed.current = false;
    setUser(null);
  }, []);

  const buy = useCallback(
    async (listingId: string) => {
      if (!user) await login();
      // Pi SDK는 페이지가 열릴 때마다 authenticate 후에만 createPayment를 허용한다.
      if (!MOCK && !sdkAuthed.current) await piAuthenticate();

      const { order, paymentData } = await api<{ order: Order; paymentData: PiPaymentData }>("/api/orders", { listingId });

      if (MOCK) {
        const paymentId = `mock-${order.id}`;
        await api("/api/payments/approve", { paymentId, orderId: order.id });
        await api("/api/payments/complete", { paymentId, txid: `mocktx-${Date.now()}` });
        return order.id;
      }

      const Pi = await waitForSdk();
      return new Promise<string>((resolve, reject) => {
        Pi.createPayment(paymentData, {
          onReadyForServerApproval: (paymentId) => {
            api("/api/payments/approve", { paymentId, orderId: order.id }).catch(reject);
          },
          onReadyForServerCompletion: (paymentId, txid) => {
            api("/api/payments/complete", { paymentId, txid })
              .then(() => resolve(order.id))
              .catch(reject);
          },
          onCancel: (paymentId) => {
            api("/api/payments/cancel", { paymentId, orderId: order.id }).catch(() => undefined);
            reject(new PaymentCancelled());
          },
          onError: (error, payment) => {
            if (payment) onIncompletePaymentFound(payment);
            else api("/api/payments/cancel", { orderId: order.id }).catch(() => undefined);
            reject(error);
          },
        });
      });
    },
    [user, login, piAuthenticate, waitForSdk],
  );

  const value = useMemo(() => ({ user, ready, login, logout, buy }), [user, ready, login, logout, buy]);

  return (
    <Ctx.Provider value={value}>
      {!MOCK && <Script src="https://sdk.minepi.com/pi-sdk.js" strategy="afterInteractive" onLoad={initSdk} />}
      {children}
    </Ctx.Provider>
  );
}

export function usePi() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePi must be used within PiProvider");
  return ctx;
}
