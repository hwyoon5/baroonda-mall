import { isListingCategory } from "@/lib/categories";
import { listListings, newId, saveListing } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import type { Listing, TradeMethod } from "@/lib/types";

const MAX_IMAGES = 3;
const MAX_IMAGE_CHARS = 400_000;

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
  });
  return json({ listings });
});

type Input = Partial<{
  title: string;
  description: string;
  category: string;
  condition: string;
  pricePi: number;
  originalPricePi: number | null;
  negotiable: boolean;
  tradeMethods: string[];
  meetingPlace: string;
  location: string;
  fastShipping: boolean;
  images: string[];
}>;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const piAmount = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1_000_000 ? Math.round(v * 1e7) / 1e7 : null;

export const POST = handle(async (req) => {
  const seller = requireUser(req);
  const b = await readJson<Input>(req);

  const title = str(b.title, 40);
  if (!title) throw new HttpError(400, "제목을 입력해 주세요.");
  const category = str(b.category, 20);
  if (!isListingCategory(category)) throw new HttpError(400, "카테고리를 선택해 주세요.");
  const pricePi = piAmount(b.pricePi);
  if (pricePi === null) throw new HttpError(400, "판매 가격을 π 단위로 올바르게 입력해 주세요.");
  const originalPricePi = b.originalPricePi == null ? undefined : piAmount(b.originalPricePi) ?? undefined;
  const tradeMethods = (b.tradeMethods ?? []).filter((m): m is TradeMethod => m === "direct" || m === "delivery");
  if (tradeMethods.length === 0) throw new HttpError(400, "거래 방식을 하나 이상 선택해 주세요.");
  const images = (b.images ?? []).slice(0, MAX_IMAGES);
  if (images.some((src) => typeof src !== "string" || !src.startsWith("data:image/") || src.length > MAX_IMAGE_CHARS)) {
    throw new HttpError(400, "사진 형식이 올바르지 않거나 너무 커요.");
  }

  const listing: Listing = {
    id: newId("l_"),
    title,
    description: str(b.description, 2000),
    category,
    condition: b.condition === "new" ? "new" : "used",
    pricePi,
    originalPricePi: originalPricePi && originalPricePi > pricePi ? originalPricePi : undefined,
    negotiable: Boolean(b.negotiable),
    tradeMethods: [...new Set(tradeMethods)],
    meetingPlace: tradeMethods.includes("direct") ? str(b.meetingPlace, 60) || undefined : undefined,
    location: str(b.location, 30) || undefined,
    fastShipping: tradeMethods.includes("delivery") && Boolean(b.fastShipping),
    images,
    emoji: "📦",
    bg: "bg-violet-50",
    seller,
    status: "selling",
    createdAt: new Date().toISOString(),
  };
  await saveListing(listing);
  return json({ listing }, 201);
});
