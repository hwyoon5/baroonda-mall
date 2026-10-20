import { getOrder, getReviewByOrder, newId, saveReview, withLock } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import type { Review } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

/** 구매 확정한 구매자만, 주문당 한 번 후기를 남길 수 있다. */
export const POST = handle<Ctx>(async (req, { params }) => {
  const user = requireUser(req);
  const order = await getOrder((await params).id);
  if (!order || order.buyer.uid !== user.uid) throw new HttpError(404, "주문을 찾을 수 없어요.");
  if (order.status !== "completed") throw new HttpError(409, "구매 확정 후에 후기를 남길 수 있어요.");
  const { rating, text } = await readJson<{ rating?: number; text?: string }>(req);
  if (!Number.isInteger(rating) || rating! < 1 || rating! > 5) throw new HttpError(400, "별점을 1~5점으로 선택해 주세요.");
  const body = typeof text === "string" ? text.trim().slice(0, 500) : "";
  const review = await withLock(`review:${order.id}`, async () => {
    if (await getReviewByOrder(order.id)) throw new HttpError(409, "이미 후기를 남긴 주문이에요.");
    const r: Review = {
      id: newId("r_"),
      orderId: order.id,
      listingId: order.listingId,
      listingTitle: order.listingTitle,
      sellerUid: order.seller.uid,
      buyer: order.buyer,
      rating: rating!,
      text: body,
      createdAt: new Date().toISOString(),
    };
    await saveReview(r);
    return r;
  });
  return json({ review }, 201);
});

export const GET = handle<Ctx>(async (req, { params }) => {
  const user = requireUser(req);
  const order = await getOrder((await params).id);
  if (!order || (order.buyer.uid !== user.uid && order.seller.uid !== user.uid)) throw new HttpError(404, "주문을 찾을 수 없어요.");
  return json({ review: (await getReviewByOrder(order.id)) ?? null });
});
