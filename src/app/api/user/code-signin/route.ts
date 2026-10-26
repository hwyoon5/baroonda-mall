import { isAdmin } from "@/lib/server/admin";
import { HttpError, handle, json, readJson } from "@/lib/server/http";
import { limitAttempts, PC_SESSION_TTL_MS, redeemPcCode } from "@/lib/server/pc-login";
import { createSessionToken } from "@/lib/server/session";

/** PC 브라우저: Pi Browser에서 받은 1회용 코드로 같은 관리자 계정 세션(12시간)을 받는다. */
export const POST = handle(async (req) => {
  const { code } = await readJson<{ code?: string }>(req);
  await limitAttempts(req, "pc");
  const user = await redeemPcCode(String(code ?? ""));
  if (!isAdmin(user)) throw new HttpError(403, "관리자 권한이 없는 계정이에요.");
  return json({ user, token: createSessionToken(user, PC_SESSION_TTL_MS) });
});
