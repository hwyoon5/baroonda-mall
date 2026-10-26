import { isAdmin } from "@/lib/server/admin";
import { storageMode, touchUser } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";

export const GET = handle(async (req) => {
  const user = getSessionUser(req);
  // 앱을 열 때마다 호출된다 → 일별 방문자 집계(하루 한 번만 기록)
  if (user) await touchUser(user).catch(() => undefined);
  return json({ user, isAdmin: isAdmin(user), storage: storageMode });
});
