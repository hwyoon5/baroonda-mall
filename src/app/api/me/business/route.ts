import { getBusiness, saveBusiness } from "@/lib/server/db";
import { parseBusinessInput } from "@/lib/server/business-input";
import { handle, json, readJson, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => json({ business: (await getBusiness(requireUser(req).uid)) ?? null }));

export const PUT = handle(async (req) => {
  const user = requireUser(req);
  const business = parseBusinessInput(await readJson(req));
  await saveBusiness(user.uid, business);
  return json({ business });
});
