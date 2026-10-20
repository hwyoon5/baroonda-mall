import { isBlobUrl } from "@/lib/media";
import { MAX_SHORT_CAPTION } from "@/lib/shorts";
import { getListing } from "@/lib/server/db";
import { HttpError } from "@/lib/server/http";
import type { Listing, Short, ShortView } from "@/lib/types";

export function parseCaption(v: unknown) {
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") throw new HttpError(400, "설명이 올바르지 않아요.");
  const caption = v.trim();
  if (caption.length > MAX_SHORT_CAPTION) throw new HttpError(400, `설명은 ${MAX_SHORT_CAPTION}자까지 쓸 수 있어요.`);
  return caption;
}

/** 연결 상품은 내가 올린 공개 상품만 허용. 빈 값·null은 연결 해제. */
export async function ownListingId(uid: string, listingId: unknown) {
  if (listingId === undefined || listingId === null || listingId === "") return undefined;
  const l = typeof listingId === "string" ? await getListing(listingId) : undefined;
  if (!l || l.demo || l.seller.uid !== uid || l.status === "draft") throw new HttpError(400, "내가 올린 상품만 연결할 수 있어요.");
  return l.id;
}

const safeImage = (src?: string) => (src && (src.startsWith("/") || isBlobUrl(src, "photo")) ? src : undefined);

export async function toViews(shorts: Short[]): Promise<ShortView[]> {
  const ids = [...new Set(shorts.flatMap((s) => (s.listingId ? [s.listingId] : [])))];
  const found = (await Promise.all(ids.map(getListing))).filter((l): l is Listing => !!l && l.status !== "draft");
  const map = new Map(found.map((l) => [l.id, l]));
  return shorts.map((s) => {
    const l = s.listingId ? map.get(s.listingId) : undefined;
    return l ? { ...s, listing: { id: l.id, title: l.title, pricePi: l.pricePi, image: safeImage(l.images[0]), status: l.status } } : s;
  });
}
