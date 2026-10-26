import { isAdmin } from "@/lib/server/admin";
import { storageMode } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";

export const GET = handle(async (req) => {
  const user = getSessionUser(req);
  return json({ user, isAdmin: isAdmin(user), storage: storageMode });
});
