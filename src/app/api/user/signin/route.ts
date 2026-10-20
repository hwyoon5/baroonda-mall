import { HttpError, handle, json, readJson } from "@/lib/server/http";
import { PiApiError, verifyAccessToken } from "@/lib/server/pi";
import { createSessionToken } from "@/lib/server/session";

/** Pi 공식 데모의 POST /user/signin: Pi.authenticate() 결과를 Platform API /v2/me로 검증한다. */
export const POST = handle(async (req) => {
  const { authResult } = await readJson<{ authResult?: PiAuthResult }>(req);
  if (!authResult?.accessToken) throw new HttpError(400, "authResult가 필요해요.");
  const user = await verifyAccessToken(authResult.accessToken).catch((e) => {
    if (e instanceof PiApiError && e.status === 401) throw new HttpError(401, "Pi 인증이 만료됐어요. 다시 로그인해 주세요.");
    throw e;
  });
  if (authResult.user?.uid && authResult.user.uid !== user.uid) throw new HttpError(401, "Pi 사용자 정보가 일치하지 않아요.");
  return json({ user, token: createSessionToken(user) });
});
