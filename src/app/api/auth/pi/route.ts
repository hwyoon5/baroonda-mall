import { HttpError, handle, json, readJson } from "@/lib/server/http";
import { PiApiError, verifyAccessToken } from "@/lib/server/pi";
import { createSessionToken } from "@/lib/server/session";

export const POST = handle(async (req) => {
  const { accessToken } = await readJson<{ accessToken?: string }>(req);
  if (!accessToken) throw new HttpError(400, "accessToken이 필요해요.");
  const user = await verifyAccessToken(accessToken).catch((e) => {
    if (e instanceof PiApiError && e.status === 401) throw new HttpError(401, "Pi 인증이 만료됐어요. 다시 로그인해 주세요.");
    throw e;
  });
  return json({ user, token: createSessionToken(user) });
});
