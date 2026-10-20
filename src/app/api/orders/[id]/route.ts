import { getListing, getOrder, saveListing, saveOrder } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

async function load(req: Request, { params }: Ctx) {
  const user = requireUser(req);
  const order = await getOrder((await params).id);
  if (!order || (order.buyer.uid !== user.uid && order.seller.uid !== user.uid)) {
    throw new HttpError(404, "주문을 찾을 수 없어요.");
  }
  return { user, order };
}

export const GET = handle<Ctx>(async (req, ctx) => json({ order: (await load(req, ctx)).order }));

/** 판매자 발송 처리(ship) / 구매자 구매 확정(confirm) */
export const POST = handle<Ctx>(async (req, ctx) => {
  const { user, order } = await load(req, ctx);
  const { action } = await readJson<{ action?: string }>(req);

  if (action === "ship") {
    if (order.seller.uid !== user.uid) throw new HttpError(403, "판매자만 발송 처리할 수 있어요.");
    if (order.status !== "paid") throw new HttpError(409, "결제 완료된 주문만 발송 처리할 수 있어요.");
    order.status = "shipped";
  } else if (action === "confirm") {
    if (order.buyer.uid !== user.uid) throw new HttpError(403, "구매자만 구매 확정할 수 있어요.");
    if (order.status !== "paid" && order.status !== "shipped") throw new HttpError(409, "구매 확정할 수 없는 상태예요.");
    order.status = "completed";
    order.payout = "pending";
    const listing = await getListing(order.listingId);
    if (listing) {
      listing.status = "sold";
      await saveListing(listing);
    }
  } else {
    throw new HttpError(400, "알 수 없는 요청이에요.");
  }
  await saveOrder(order);
  return json({ order });
});
