import { getListing, getOrder, saveListing, saveOrder, withLock } from "@/lib/server/db";
import { listingLock } from "@/lib/server/orders";
import { carriers } from "@/lib/types";
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
  const b = await readJson<{ action?: string; method?: string; carrier?: string; trackingNumber?: string }>(req);
  const { action } = b;

  if (action === "ship") {
    if (order.seller.uid !== user.uid) throw new HttpError(403, "판매자만 발송 처리할 수 있어요.");
    if (order.status !== "paid") throw new HttpError(409, "결제 완료된 주문만 발송 처리할 수 있어요.");
    // Shopify fulfillment: 택배는 택배사 + 송장번호 필수, 직거래는 전달 완료만 기록
    const method = b.method === "direct" ? "direct" : "delivery";
    const carrier = typeof b.carrier === "string" ? b.carrier : "";
    const trackingNumber = typeof b.trackingNumber === "string" ? b.trackingNumber.replace(/\s/g, "") : "";
    if (method === "delivery") {
      if (!(carriers as readonly string[]).includes(carrier)) throw new HttpError(400, "택배사를 선택해 주세요.");
      if (!/^[0-9-]{8,20}$/.test(trackingNumber)) throw new HttpError(400, "송장번호를 숫자 8~20자리로 입력해 주세요.");
    }
    order.fulfillment = { method, ...(method === "delivery" ? { carrier, trackingNumber } : {}), shippedAt: new Date().toISOString() };
    order.status = "shipped";
  } else if (action === "confirm") {
    if (order.buyer.uid !== user.uid) throw new HttpError(403, "구매자만 구매 확정할 수 있어요.");
    if (order.status !== "paid" && order.status !== "shipped") throw new HttpError(409, "구매 확정할 수 없는 상태예요.");
    order.status = "completed";
    order.payout = "pending";
    await withLock(listingLock(order.listingId), async () => {
      const listing = await getListing(order.listingId);
      if (!listing) return;
      if (listing.condition === "new") listing.soldCount = (listing.soldCount ?? 0) + 1;
      else listing.status = "sold";
      await saveListing(listing);
    });
  } else {
    throw new HttpError(400, "알 수 없는 요청이에요.");
  }
  await saveOrder(order);
  return json({ order });
});
