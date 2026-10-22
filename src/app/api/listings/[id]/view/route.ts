import { addListingView, getListing } from "@/lib/server/db";
import { HttpError, handle, json } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

/** 상세 화면 조회 1회 기록(기기당 24시간 1회는 화면의 ViewTracker가 거른다) */
export const POST = handle<Ctx>(async (_req, { params }) => {
  const id = (await params).id;
  const listing = await getListing(id);
  if (!listing || listing.status === "draft") throw new HttpError(404, "상품을 찾을 수 없어요.");
  return json({ views: await addListingView(id) });
});
