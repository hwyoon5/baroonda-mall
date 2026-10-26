import { businessStatus } from "@/lib/business";
import { requireAdmin } from "@/lib/server/admin";
import { listBusinesses, listListings } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";

export const dynamic = "force-dynamic";

const ORDER = { pending: 0, rejected: 1, approved: 2 } as const;

/** 관리자: 판매자 사업자 정보·서류와 심사 상태 */
export const GET = handle(async (req) => {
  requireAdmin(req);
  const [businesses, listings] = await Promise.all([listBusinesses(), listListings({ includeDrafts: true, includeSold: true })]);
  const names = new Map<string, string>();
  const selling = new Map<string, number>();
  for (const l of listings) {
    names.set(l.seller.uid, l.seller.username);
    if (l.condition === "new" && l.status === "selling") selling.set(l.seller.uid, (selling.get(l.seller.uid) ?? 0) + 1);
  }
  const sellers = businesses
    .map(([uid, business]) => ({ uid, username: business.username ?? names.get(uid) ?? uid, status: businessStatus(business), sellingCount: selling.get(uid) ?? 0, business }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || (b.business.review?.submittedAt ?? b.business.updatedAt).localeCompare(a.business.review?.submittedAt ?? a.business.updatedAt));
  return json({ sellers });
});
