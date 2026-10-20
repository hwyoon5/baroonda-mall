import { storageMode } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";

export const GET = handle(async (req) => json({ user: getSessionUser(req), storage: storageMode }));
