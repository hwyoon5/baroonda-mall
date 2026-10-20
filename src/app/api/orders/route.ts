import { getListing, listOrdersFor, newId, saveOrder } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import type { Order } from "@/lib/types";

export const GET = handle(async (req) => json(await listOrdersFor(requireUser(req).uid)));

/** 구매 시작: 주문을 만들고 Pi.createPayment에 넘길 결제 데이터를 돌려준다. */
export const POST = handle(async (req) => {
  const buyer = requireUser(req);
  const { listingId } = await readJson<{ listingId?: string }>(req);
  const listing = listingId ? await getListing(listingId) : undefined;
  if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
  if (listing.demo) throw new HttpError(400, "예시 상품은 구매할 수 없어요.");
  if (listing.seller.uid === buyer.uid) throw new HttpError(400, "내가 올린 상품은 구매할 수 없어요.");
  if (listing.status !== "selling") throw new HttpError(409, "판매 중인 상품이 아니에요.");

  const now = new Date().toISOString();
  const order: Order = {
    id: newId("o_"),
    listingId: listing.id,
    listingTitle: listing.title,
    listingThumb: listing.images[0] ? undefined : listing.emoji,
    amount: listing.pricePi,
    buyer,
    seller: listing.seller,
    status: "created",
    payout: "none",
    createdAt: now,
    updatedAt: now,
  };
  await saveOrder(order);
  return json(
    {
      order,
      paymentData: {
        amount: order.amount,
        memo: `바로온다 | ${listing.title}`.slice(0, 60),
        metadata: { orderId: order.id, listingId: listing.id },
      },
    },
    201,
  );
});
