import type { PiUser } from "../types";

const PI_API = "https://api.minepi.com/v2";

/** 로컬 테스트 전용: Pi Browser 없이 로그인·결제 흐름을 흉내 낸다. 배포 환경에서는 절대 켜지 말 것. */
export const piMock = process.env.PI_MOCK === "1";

export class PiConfigError extends Error {}

export class PiApiError extends Error {
  constructor(
    public status: number,
    public body: unknown,
  ) {
    super(`Pi API ${status}`);
  }
}

async function piFetch<T>(path: string, auth: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${PI_API}${path}`, {
    ...init,
    headers: { Authorization: auth, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new PiApiError(res.status, body);
  return body as T;
}

function serverKey() {
  const key = process.env.PI_API_KEY;
  if (!key) throw new PiConfigError("결제 서버 설정(PI_API_KEY)이 아직 안 되어 있어요.");
  return `Key ${key}`;
}

/** Pi.authenticate()로 받은 accessToken을 /me로 검증해 사용자를 확정한다. */
export async function verifyAccessToken(accessToken: string): Promise<PiUser> {
  if (piMock && accessToken.startsWith("mock:")) {
    const username = accessToken.slice(5) || "tester";
    return { uid: `mock-${username}`, username };
  }
  const me = await piFetch<{ uid: string; username?: string }>("/me", `Bearer ${accessToken}`);
  return { uid: me.uid, username: me.username ?? "Pioneer" };
}

export function getPayment(paymentId: string) {
  return piFetch<PiPaymentDTO>(`/payments/${encodeURIComponent(paymentId)}`, serverKey());
}

export function approvePayment(paymentId: string) {
  return piFetch<PiPaymentDTO>(`/payments/${encodeURIComponent(paymentId)}/approve`, serverKey(), { method: "POST" });
}

export function completePayment(paymentId: string, txid: string) {
  return piFetch<PiPaymentDTO>(`/payments/${encodeURIComponent(paymentId)}/complete`, serverKey(), {
    method: "POST",
    body: JSON.stringify({ txid }),
  });
}

export function cancelPayment(paymentId: string) {
  return piFetch<PiPaymentDTO>(`/payments/${encodeURIComponent(paymentId)}/cancel`, serverKey(), { method: "POST" });
}
