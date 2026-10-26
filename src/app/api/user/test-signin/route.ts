import { handle, json, readJson } from "@/lib/server/http";
import { checkTestSecret, limitAttempts, PC_SESSION_TTL_MS, testLoginEnabled, testLoginNeedsSecret, testUser } from "@/lib/server/pc-login";
import { createSessionToken } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export const GET = handle(async () => json({ enabled: testLoginEnabled(), needsSecret: testLoginEnabled() && testLoginNeedsSecret() }));

/** 개발자/테스트 계정 로그인: name 없으면 테스트 관리자(test-admin), 있으면 test-<name> 일반 사용자 */
export const POST = handle(async (req) => {
  const { name, secret } = await readJson<{ name?: string; secret?: string }>(req);
  if (testLoginEnabled()) await limitAttempts(req, "test");
  checkTestSecret(secret);
  const user = testUser(name);
  return json({ user, token: createSessionToken(user, PC_SESSION_TTL_MS) });
});
