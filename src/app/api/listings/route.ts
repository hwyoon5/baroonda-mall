import { listListings, newId, saveListing, withStats } from "@/lib/server/db";
import { handle, json, readJson, requireUser } from "@/lib/server/http";
import { assertCanPublish } from "@/lib/server/business-input";
import { parseListingInput, type ListingInput } from "@/lib/server/listing-input";
import { assertDailyQuota } from "@/lib/server/limits";
import { MAX_PAGE_SIZE } from "@/lib/paging";
import { applySearch, parseSearch } from "@/lib/search";
import type { Listing } from "@/lib/types";

export const GET = handle(async (req) => {
  const p = new URL(req.url).searchParams;
  const seller = p.get("seller");
  const listings = await listListings({
    category: p.get("category") ?? undefined,
    q: p.get("q") ?? undefined,
    ids: p.get("ids")?.split(",").filter(Boolean),
    sellerUid: seller === "me" ? requireUser(req).uid : (seller ?? undefined),
    dealsOnly: p.get("deals") === "1",
    includeSold: p.get("includeSold") === "1" || seller === "me",
    includeDrafts: seller === "me",
    includeUsed: seller === "me",
  });
  const all = applySearch(listings, parseSearch(p));
  // 내 상품(seller=me)·찜/장바구니(ids)는 전체, 그 밖의 공개 목록은 한 번에 최대 MAX_PAGE_SIZE개씩
  if (seller === "me" || p.has("ids")) return json({ listings: await withStats(all), total: all.length, nextOffset: null });
  const offset = Math.max(0, Math.floor(Number(p.get("offset")) || 0));
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(Number(p.get("limit")) || MAX_PAGE_SIZE)));
  const end = offset + limit;
  return json({ listings: await withStats(all.slice(offset, end)), total: all.length, nextOffset: end < all.length ? end : null });
});

/** 상품 등록. draft: true 면 임시저장(공개 목록에 노출되지 않음) */
export const POST = handle(async (req) => {
  const seller = requireUser(req);
  const b = await readJson<ListingInput>(req);
  const draft = b.draft === true;
  const input = parseListingInput(b, draft);
  await assertCanPublish(seller.uid, input.condition, draft);
  await assertDailyQuota(seller, "listing");
  const listing: Listing = {
    id: newId("l_"),
    ...input,
    seller,
    status: draft ? "draft" : "selling",
    createdAt: new Date().toISOString(),
  };
  await saveListing(listing);
  return json({ listing }, 201);
});
