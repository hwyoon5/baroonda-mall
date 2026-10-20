import { createHmac, timingSafeEqual } from "node:crypto";
import type { PiUser } from "../types";
import { PiConfigError } from "./pi";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function secret() {
  const s = process.env.SESSION_SECRET ?? process.env.PI_API_KEY;
  if (s) return s;
  if (process.env.NODE_ENV !== "production" || process.env.PI_MOCK === "1") return "baroonda-dev-secret";
  throw new PiConfigError("세션 서명 키(SESSION_SECRET)가 설정되지 않았어요.");
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

/** Pi Browser는 앱을 iframe으로 띄울 수 있어 쿠키 대신 Bearer 토큰을 쓴다. */
export function createSessionToken(user: PiUser) {
  const payload = Buffer.from(JSON.stringify({ ...user, exp: Date.now() + TTL_MS })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function getSessionUser(req: Request): PiUser | null {
  const header = req.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const [payload, sig] = header.slice(7).split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as PiUser & { exp: number };
    if (data.exp < Date.now()) return null;
    return { uid: data.uid, username: data.username };
  } catch {
    return null;
  }
}
