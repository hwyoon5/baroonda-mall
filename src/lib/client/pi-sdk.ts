import { api, TOKEN_KEY } from "./api";

export const PI_MOCK = process.env.NEXT_PUBLIC_PI_MOCK === "1";
const SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
/** Pi 공식 데모와 같은 scope */
export const PI_SCOPES: PiScope[] = ["username", "payments", "roles", "in_app_notifications"];

let initialized = false;
let authenticated = false;
let sdkFailed = false;
let authInFlight: Promise<PiAuthResult> | null = null;
/** 로그인 전(세션 토큰 없음)에 받은 미완료 결제: 서버 로그인 후 처리한다. */
let pendingIncomplete: PiPaymentDTO | null = null;

export function markPiSdkFailed() {
  sdkFailed = true;
}

export function initPiSdk() {
  if (initialized || typeof window === "undefined" || !window.Pi) return;
  window.Pi.init({ version: "2.0", sandbox: SANDBOX });
  initialized = true;
}

export async function waitForPi(): Promise<PiSDK> {
  for (let i = 0; i < 100 && !sdkFailed; i++) {
    initPiSdk();
    if (initialized && window.Pi) return window.Pi;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    sdkFailed
      ? "Pi SDK(sdk.minepi.com)를 불러오지 못했어요. 네트워크를 확인하고 새로고침해 주세요."
      : "Pi SDK를 불러오지 못했어요. Pi Browser에서 열어 주세요.",
  );
}

function sendIncomplete(payment: PiPaymentDTO) {
  return api("/api/payments/incomplete", { payment }).catch((e) => console.error("Error handling incomplete payment:", e));
}

/** Pi SDK는 authenticate가 끝나기 전에 이 콜백을 부른다. 아직 세션이 없으면 로그인 후 flushIncompletePayment()로 처리한다. */
export function onIncompletePaymentFound(payment: PiPaymentDTO) {
  if (localStorage.getItem(TOKEN_KEY)) return sendIncomplete(payment);
  pendingIncomplete = payment;
}

export async function flushIncompletePayment() {
  const p = pendingIncomplete;
  pendingIncomplete = null;
  if (p) await sendIncomplete(p);
}

/** 버튼을 여러 번 눌러도 Pi.authenticate는 한 번만 호출한다. */
export function piAuthenticate(): Promise<PiAuthResult> {
  authInFlight ??= (async () => {
    const Pi = await waitForPi();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([
        Pi.authenticate(PI_SCOPES, onIncompletePaymentFound),
        new Promise<never>((_, reject) => {
          timer = setTimeout(
            () => reject(new Error("Pi 인증 응답이 없어요. Pi Browser에서 열었는지, 개발자 포털의 앱 URL이 이 주소와 같은지 확인해 주세요.")),
            60_000,
          );
        }),
      ]);
      if (!result?.accessToken) throw new Error("Pi 인증 결과에 accessToken이 없어요. 다시 시도해 주세요.");
      authenticated = true;
      return result;
    } finally {
      clearTimeout(timer);
      authInFlight = null;
    }
  })();
  return authInFlight;
}

/** Pi SDK는 페이지를 열 때마다 authenticate를 거쳐야 createPayment를 허용한다. */
export async function ensurePiAuthenticated() {
  if (!PI_MOCK && !authenticated) await piAuthenticate();
}

export function resetPiAuth() {
  authenticated = false;
}
