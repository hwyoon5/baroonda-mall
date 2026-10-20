import { HttpError, handle, json } from "@/lib/server/http";
import { getSellerProfile } from "@/lib/server/sellers";

type Ctx = { params: Promise<{ uid: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const profile = await getSellerProfile(decodeURIComponent((await params).uid));
  if (!profile) throw new HttpError(404, "판매자를 찾을 수 없어요.");
  return json(profile);
});
