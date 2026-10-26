import { requireAdmin } from "@/lib/server/admin";
import { dailyVisitors, listAllOrders, listListings, listUsers } from "@/lib/server/db";
import { HttpError, handle, json } from "@/lib/server/http";
import { payoutBreakdown } from "@/lib/server/settlement";
import { STATS_RANGES, buildStats, type StatsRange } from "@/lib/stats";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 관리자: 기간별 거래액·주문·이용자 통계 (?range=today|7d|30d|90d) */
export const GET = handle(async (req) => {
  requireAdmin(req);
  const range = (new URL(req.url).searchParams.get("range") ?? "7d") as StatsRange;
  if (!STATS_RANGES.some((r) => r.id === range)) throw new HttpError(400, "range는 today, 7d, 30d, 90d 중 하나여야 해요.");
  const [orders, listings, users, dau] = await Promise.all([listAllOrders(), listListings({ includeDrafts: true, includeSold: true }), listUsers(), dailyVisitors()]);

  // 이용자 기록은 이 기능 도입 후부터 쌓인다 → 그 전 주문·상품 활동도 '처음 활동'으로 반영해 신규 가입자가 부풀지 않게 한다.
  const firstSeen = new Map<string, string>();
  const seen = (uid: string, iso: string) => {
    const cur = firstSeen.get(uid);
    if (!cur || iso < cur) firstSeen.set(uid, iso);
  };
  for (const u of users) seen(u.uid, u.firstSeenAt);
  for (const o of orders) {
    seen(o.buyer.uid, o.createdAt);
    seen(o.seller.uid, o.createdAt);
  }
  for (const l of listings) if (!l.demo) seen(l.seller.uid, l.createdAt);

  return json(buildStats(range, { orders, listings, firstSeen, dau, feeOf: (o) => o.platformFee ?? payoutBreakdown(o.amount).fee }));
});
