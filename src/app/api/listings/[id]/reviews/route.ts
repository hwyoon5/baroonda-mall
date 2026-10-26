import { getListing, getReviewByOrder, listOrdersFor, listReviewsForListing } from "@/lib/server/db";
import { HttpError, handle, json } from "@/lib/server/http";
import { getSessionUser } from "@/lib/server/session";
import { canReview } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** 이름 일부만 공개 (예: hwyoon5 → hw*****) */
const mask = (name: string) => (name.length <= 2 ? `${name[0] ?? ""}*` : `${name.slice(0, 2)}${"*".repeat(Math.min(name.length - 2, 5))}`);

/** 상품 후기 목록·평균 별점. 로그인한 구매자에게는 후기를 쓸 수 있는 주문을 알려 준다. */
export const GET = handle<Ctx>(async (req, { params }) => {
  const id = (await params).id;
  if (!(await getListing(id))) throw new HttpError(404, "상품을 찾을 수 없어요.");
  const reviews = await listReviewsForListing(id);
  const count = reviews.length;
  const average = count ? Math.round((reviews.reduce((a, r) => a + r.rating, 0) / count) * 10) / 10 : 0;
  const distribution = [5, 4, 3, 2, 1].map((n) => reviews.filter((r) => r.rating === n).length);

  const user = getSessionUser(req);
  let writable: { orderId: string; option?: Record<string, string> } | null = null;
  let purchase: "none" | "waiting" | "reviewed" | null = null;
  if (user) {
    const mine = (await listOrdersFor(user.uid)).purchases.filter((o) => o.listingId === id && o.status !== "cancelled" && o.status !== "refunded" && o.status !== "approved");
    for (const o of mine.filter(canReview)) {
      if (!(await getReviewByOrder(o.id))) {
        writable = { orderId: o.id, ...(o.option ? { option: o.option } : {}) };
        break;
      }
    }
    purchase = writable ? null : !mine.length ? "none" : mine.some((o) => !canReview(o)) ? "waiting" : "reviewed";
  }

  return json({
    count,
    average,
    distribution,
    reviews: reviews.map((r) => ({ id: r.id, rating: r.rating, text: r.text, option: r.option, createdAt: r.createdAt, buyer: mask(r.buyer.username), mine: r.buyer.uid === user?.uid })),
    writable,
    purchase,
  });
});
