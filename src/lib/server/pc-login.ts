import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import type { PiUser } from "../types";
import { countLoginAttempt, listLoginCodes, saveLoginCode, withLock } from "./db";
import { HttpError } from "./http";
import { piMock } from "./pi";

export const PC_CODE_TTL_MS = 5 * 60_000;
/** PC(코드·테스트 계정) 세션은 Pi 로그인(7일)보다 짧게 */
export const PC_SESSION_TTL_MS = 12 * 3_600_000;
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const sha256 = (s: string) => createHash("sha256").update(s).digest();
export const normalizeCode = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, "");

/** 무차별 대입 방지: IP별 10분에 20회, 전체 10분에 300회 */
export async function limitAttempts(req: Request, kind: string) {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const w = Math.floor(Date.now() / 600_000);
  const [mine, all] = await Promise.all([countLoginAttempt(`${kind}:${w}:${ip}`), countLoginAttempt(`${kind}:${w}`)]);
  if (mine > 20 || all > 300) throw new HttpError(429, "시도가 너무 많아요. 10분 뒤에 다시 해 주세요.");
}

/** Pi Browser에서 로그인한 관리자가 PC 브라우저 로그인용 1회용 코드(5분)를 받는다. */
export async function issuePcCode(user: PiUser, now = Date.now()) {
  const raw = Array.from({ length: 8 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  const exp = now + PC_CODE_TTL_MS;
  await saveLoginCode({ hash: sha256(raw).toString("hex"), uid: user.uid, username: user.username, exp });
  return { code: `${raw.slice(0, 4)}-${raw.slice(4)}`, expiresAt: new Date(exp).toISOString() };
}

export async function redeemPcCode(input: string, now = Date.now()): Promise<PiUser> {
  const code = normalizeCode(input);
  if (code.length !== 8) throw new HttpError(400, "8자리 코드를 입력해 주세요.");
  const hash = sha256(code).toString("hex");
  return withLock("login-code", async () => {
    const c = (await listLoginCodes()).find((x) => x.hash === hash);
    if (!c || c.used || c.exp < now) throw new HttpError(401, "코드가 맞지 않거나 만료됐어요. Pi Browser에서 새 코드를 받아 주세요.");
    await saveLoginCode({ ...c, used: true });
    return { uid: c.uid, username: c.username };
  });
}

/** 개발자/테스트 계정: 로컬 PI_MOCK이거나 TEST_LOGIN_SECRET이 설정된 환경에서만. uid가 test-로 시작해 실제 Pi 계정(UUID)과 겹치지 않는다. */
export const TEST_ADMIN: PiUser = { uid: "test-admin", username: "test-admin" };
export const testLoginEnabled = () => piMock || !!process.env.TEST_LOGIN_SECRET;
export const testLoginNeedsSecret = () => !piMock;

export function checkTestSecret(given: string | undefined) {
  if (!testLoginEnabled()) throw new HttpError(404, "테스트 로그인이 꺼져 있어요.");
  if (!testLoginNeedsSecret()) return;
  if (!timingSafeEqual(sha256(given ?? ""), sha256(process.env.TEST_LOGIN_SECRET!))) throw new HttpError(401, "테스트 비밀번호가 맞지 않아요.");
}

export function testUser(name?: string): PiUser {
  const n = (name ?? "").toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 20);
  if (!n || n === "admin") return TEST_ADMIN;
  return { uid: `test-${n}`, username: `test-${n}` };
}
