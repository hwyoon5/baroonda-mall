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

/**
 * Pi 공식 데모 표준: 미완료 결제는 블록체인(Horizon) 거래의 memo가 paymentId와 같은지 확인한 뒤에만 완료한다.
 */
export async function verifyTransactionOnChain(payment: PiPaymentDTO) {
  if (piMock) return;
  const link = payment.transaction?._link;
  if (!link) throw new PiApiError(400, "블록체인 거래 정보가 없어요.");
  const res = await fetch(link, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  if (!res.ok) throw new PiApiError(502, "블록체인 거래를 조회하지 못했어요.");
  const tx = (await res.json()) as { memo?: string };
  if (tx.memo !== payment.identifier) throw new PiApiError(400, "블록체인 거래가 결제 정보와 일치하지 않아요.");
}

// ---------- App-to-User (A2U): 판매자 정산·구매자 환불 ----------
/** Pi Platform API `POST /v2/payments` (pi-apps/pi-nodejs의 createPayment와 같은 요청) */
export function createA2UPayment(payment: { amount: number; memo: string; metadata: Record<string, unknown>; uid: string }) {
  return piFetch<PiPaymentDTO>("/payments", serverKey(), { method: "POST", body: JSON.stringify({ payment }) });
}

export async function listIncompleteServerPayments() {
  const r = await piFetch<{ incomplete_server_payments?: PiPaymentDTO[] }>("/payments/incomplete_server_payments", serverKey());
  return r.incomplete_server_payments ?? [];
}
