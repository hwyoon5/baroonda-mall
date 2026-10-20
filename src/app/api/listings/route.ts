import { listListings, newId, saveListing } from "@/lib/server/db";
import { handle, json, readJson, requireUser } from "@/lib/server/http";
import { assertCanPublish } from "@/lib/server/business-input";
import { parseListingInput, type ListingInput } from "@/lib/server/listing-input";
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
  });
  return json({ listings });
});

/** 상품 등록. draft: true 면 임시저장(공개 목록에 노출되지 않음) */
export const POST = handle(async (req) => {
  const seller = requireUser(req);
  const b = await readJson<ListingInput>(req);
  const draft = b.draft === true;
  const input = parseListingInput(b, draft);
  await assertCanPublish(seller.uid, input.condition, draft);
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
