import { getListing, saveListing } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (_req, { params }) => {
  const listing = await getListing((await params).id);
  if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
  return json({ listing });
});

/** 판매자 내 상품 관리: 판매 중지/재개(status), 새 상품 재고 수정(stock) */
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const user = requireUser(req);
  const listing = await getListing((await params).id);
  if (!listing || listing.seller.uid !== user.uid) throw new HttpError(404, "내 상품을 찾을 수 없어요.");
  if (listing.demo) throw new HttpError(400, "예시 상품은 수정할 수 없어요.");
  const b = await readJson<{ status?: string; stock?: number }>(req);

  if (b.stock !== undefined) {
    if (listing.condition !== "new") throw new HttpError(400, "재고 수량은 새 상품만 수정할 수 있어요.");
    if (!Number.isInteger(b.stock) || b.stock < 0 || b.stock > 9999) throw new HttpError(400, "재고 수량은 0~9999개로 입력해 주세요.");
    listing.stock = b.stock;
    if (listing.status === "sold" && b.stock > 0) listing.status = "selling";
    if (listing.status === "selling" && b.stock === 0) listing.status = "sold";
  }

  if (b.status === "paused") {
    if (listing.status !== "selling") throw new HttpError(409, "판매 중인 상품만 판매 중지할 수 있어요.");
    listing.status = "paused";
  } else if (b.status === "selling") {
    if (listing.status !== "paused") throw new HttpError(409, "판매 중지된 상품만 다시 판매할 수 있어요.");
    listing.status = listing.condition === "new" && !listing.stock ? "sold" : "selling";
  } else if (b.status !== undefined) {
    throw new HttpError(400, "알 수 없는 상태예요.");
  }

  await saveListing(listing);
  return json({ listing });
});
