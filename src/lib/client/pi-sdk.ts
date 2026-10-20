import { api } from "./api";

export const PI_MOCK = process.env.NEXT_PUBLIC_PI_MOCK === "1";
const SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
/** Pi 공식 데모와 같은 scope */
export const PI_SCOPES: PiScope[] = ["username", "payments", "roles", "in_app_notifications"];

let initialized = false;
let authenticated = false;

export function initPiSdk() {
  if (initialized || typeof window === "undefined" || !window.Pi) return;
  window.Pi.init({ version: "2.0", sandbox: SANDBOX });
  initialized = true;
}

export async function waitForPi(): Promise<PiSDK> {
  for (let i = 0; i < 100; i++) {
    initPiSdk();
    if (initialized && window.Pi) return window.Pi;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error("Pi SDK를 불러오지 못했어요. Pi Browser에서 열어 주세요.");
}

export function onIncompletePaymentFound(payment: PiPaymentDTO) {
  return api("/api/payments/incomplete", { payment }).catch((e) => console.error("Error handling incomplete payment:", e));
}

export async function piAuthenticate(): Promise<PiAuthResult> {
  const Pi = await waitForPi();
  const result = await Promise.race([
    Pi.authenticate(PI_SCOPES, onIncompletePaymentFound),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Pi 인증 응답이 없어요. Pi Browser에서 열었는지 확인해 주세요.")), 60_000)),
  ]);
  authenticated = true;
  return result;
}

/** Pi SDK는 페이지를 열 때마다 authenticate를 거쳐야 createPayment를 허용한다. */
export async function ensurePiAuthenticated() {
  if (!PI_MOCK && !authenticated) await piAuthenticate();
}

export function resetPiAuth() {
  authenticated = false;
}
