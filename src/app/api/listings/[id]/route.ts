import { getListing } from "@/lib/server/db";
import { HttpError, handle, json } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const listing = await getListing((await params).id);
  if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
  return json({ listing });
});
