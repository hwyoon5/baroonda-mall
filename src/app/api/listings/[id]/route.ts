import { getListing, saveListing, withLock } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { parseListingInput, type ListingInput } from "@/lib/server/listing-input";
import { listingLock } from "@/lib/server/orders";
import type { Listing } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

async function loadOwn(req: Request, id: string) {
  const user = requireUser(req);
  const listing = await getListing(id);
  if (!listing || listing.seller.uid !== user.uid) throw new HttpError(404, "내 상품을 찾을 수 없어요.");
  if (listing.demo) throw new HttpError(400, "예시 상품은 수정할 수 없어요.");
  return { user, listing };
}

export const GET = handle<Ctx>(async (req, { params }) => {
  const id = (await params).id;
  const listing = await getListing(id);
  if (!listing) throw new HttpError(404, "상품을 찾을 수 없어요.");
  if (listing.status === "draft") return json({ listing: (await loadOwn(req, id)).listing });
  return json({ listing });
});

/** 임시저장 상품 이어서 작성: draft: true 면 다시 임시저장, 아니면 판매 시작(공개) */
export const PUT = handle<Ctx>(async (req, { params }) => {
  const { listing } = await loadOwn(req, (await params).id);
  if (listing.status !== "draft") throw new HttpError(409, "임시저장 상품만 이어서 작성할 수 있어요.");
  const b = await readJson<ListingInput>(req);
  const draft = b.draft === true;
  const next: Listing = {
    id: listing.id,
    seller: listing.seller,
    ...parseListingInput(b, draft),
    status: draft ? "draft" : "selling",
    createdAt: draft ? listing.createdAt : new Date().toISOString(),
  };
  await saveListing(next);
  return json({ listing: next });
});

/** 판매자 내 상품 관리: 판매 중지/재개(status), 재고 수정(stock 또는 옵션별 variants) */
export const PATCH = handle<Ctx>(async (req, { params }) => {
  const id = (await params).id;
  await loadOwn(req, id);
  const b = await readJson<{ status?: string; stock?: number; variants?: { id?: string; stock?: number }[] }>(req);
  const isQty = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 9999;

  const listing = await withLock(listingLock(id), async () => {
    const l = (await getListing(id))!;
    if (b.stock !== undefined || b.variants !== undefined) {
      if (l.condition !== "new") throw new HttpError(400, "재고 수량은 새 상품만 수정할 수 있어요.");
      if (l.variants?.length) {
        if (!Array.isArray(b.variants)) throw new HttpError(400, "옵션별 재고를 입력해 주세요.");
        for (const v of b.variants) {
          const target = l.variants.find((x) => x.id === v.id);
          if (!target) throw new HttpError(400, "옵션을 찾을 수 없어요.");
          if (!isQty(v.stock)) throw new HttpError(400, "재고 수량은 0~9999개로 입력해 주세요.");
          target.stock = v.stock;
        }
        l.stock = l.variants.reduce((s, v) => s + v.stock, 0);
      } else {
        if (!isQty(b.stock)) throw new HttpError(400, "재고 수량은 0~9999개로 입력해 주세요.");
        l.stock = b.stock;
      }
      if (l.status === "sold" && (l.stock ?? 0) > 0) l.status = "selling";
      if (l.status === "selling" && !l.stock) l.status = "sold";
    }
    if (b.status === "paused") {
      if (l.status !== "selling") throw new HttpError(409, "판매 중인 상품만 판매 중지할 수 있어요.");
      l.status = "paused";
    } else if (b.status === "selling") {
      if (l.status !== "paused") throw new HttpError(409, "판매 중지된 상품만 다시 판매할 수 있어요.");
      l.status = l.condition === "new" && !l.stock ? "sold" : "selling";
    } else if (b.status !== undefined) {
      throw new HttpError(400, "알 수 없는 상태예요.");
    }
    await saveListing(l);
    return l;
  });
  return json({ listing });
});
