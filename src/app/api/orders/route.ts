import { addPi, effectiveShipping, shippingFeeFor } from "@/lib/business";
import { getBusiness, getListing, isUnclaimedDemo, listOrdersFor, newId, saveOrder } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { formatOption } from "@/lib/format";
import type { Order } from "@/lib/types";

import { withAutoConfirm } from "@/lib/server/settlement";

/** 자동 구매 확정 후 정산(A2U)을 응답 뒤에 이어서 보낸다. */
export const maxDuration = 60;

export const GET = handle(async (req) => {
  const { purchases, sales } = await listOrdersFor(requireUser(req).uid);
  return json({ purchases: await withAutoConfirm(purchases), sales: await withAutoConfirm(sales) });
});

/** 구매 시작: 주문을 만들고 Pi.createPayment에 넘길 결제 데이터를 돌려준다. */
export const POST = handle(async (req) => {
  const buyer = requireUser(req);
  const { listingId, option, remoteArea, pickup } = await readJson<{ listingId?: string; option?: Record<string, unknown>; remoteArea?: boolean; pickup?: boolean }>(req);
  const listing = listingId ? await getListing(listingId) : undefined;
  if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
  if (listing.condition !== "new") throw new HttpError(409, "더 이상 판매하지 않는 개인 중고 상품이에요.");
  if (isUnclaimedDemo(listing)) throw new HttpError(503, "예시 상품 판매자(운영자) 계정이 아직 연결되지 않아 결제할 수 없어요. 잠시 후 다시 시도해 주세요.");
  if (listing.seller.uid === buyer.uid) throw new HttpError(400, "내가 올린 상품은 구매할 수 없어요.");
  if (listing.status !== "selling" || (listing.condition === "new" && (listing.stock ?? 0) < 1)) {
    throw new HttpError(409, "판매 중인 상품이 아니거나 품절됐어요.");
  }
  let selected: Record<string, string> | undefined;
  if (listing.options?.length) {
    selected = {};
    for (const o of listing.options) {
      const v = option?.[o.name];
      if (typeof v !== "string" || !o.values.includes(v)) throw new HttpError(400, `${o.name} 옵션을 선택해 주세요.`);
      selected[o.name] = v;
    }
  }
  let variantId: string | undefined;
  if (listing.variants?.length) {
    const variant = listing.variants.find((v) => Object.entries(v.options).every(([k, val]) => selected?.[k] === val));
    if (!variant) throw new HttpError(400, "옵션을 선택해 주세요.");
    if (variant.stock < 1) throw new HttpError(409, "선택한 옵션이 품절됐어요.");
    variantId = variant.id;
  }
  const delivery = listing.tradeMethods.includes("delivery");
  if (pickup === true && !listing.tradeMethods.includes("direct")) throw new HttpError(400, "직거래를 지원하지 않는 상품이에요.");
  const shipped = delivery && pickup !== true;
  const terms = shipped && listing.condition === "new" ? effectiveShipping(listing, await getBusiness(listing.seller.uid)) : undefined;
  const shippingFee = shippingFeeFor(terms, listing.pricePi, remoteArea === true);

  const now = new Date().toISOString();
  const order: Order = {
    id: newId("o_"),
    listingId: listing.id,
    listingTitle: listing.title,
    listingThumb: listing.images[0] ? undefined : listing.emoji,
    option: selected,
    variantId,
    amount: addPi(listing.pricePi, shippingFee),
    itemAmount: listing.pricePi,
    shippingFee,
    remoteArea: shipped && remoteArea === true ? true : undefined,
    pickup: delivery && pickup === true ? true : undefined,
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
        memo: `바로온다 | ${listing.title}${selected ? ` (${formatOption(selected)})` : ""}`.slice(0, 60),
        metadata: { productId: listing.id, orderId: order.id },
      },
    },
    201,
  );
});
