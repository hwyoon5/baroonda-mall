import type { BusinessReview } from "@/lib/business";
import { requireAdmin } from "@/lib/server/admin";
import { getBusiness, saveBusiness, withLock } from "@/lib/server/db";
import { HttpError, handle, json, readJson } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ uid: string }> };

/** 관리자: 사업자 승인 / 반려(사유 필수). 반려된 판매자는 새 상품 게시와 판매가 막힌다. */
export const POST = handle(async (req, ctx: Ctx) => {
  const admin = requireAdmin(req);
  const uid = (await ctx.params).uid;
  const { action, reason } = (await readJson(req)) as { action?: unknown; reason?: unknown };
  if (action !== "approve" && action !== "reject") throw new HttpError(400, "action은 approve 또는 reject여야 해요.");
  const why = typeof reason === "string" ? reason.trim().slice(0, 200) : "";
  if (action === "reject" && why.length < 2) throw new HttpError(400, "반려 사유를 입력해 주세요.");
  return withLock(`business:${uid}`, async () => {
    const business = await getBusiness(uid);
    if (!business) throw new HttpError(404, "사업자 정보가 없어요.");
    const now = new Date().toISOString();
    const review: BusinessReview = {
      status: action === "approve" ? "approved" : "rejected",
      submittedAt: business.review?.submittedAt ?? business.updatedAt,
      reason: action === "reject" ? why : undefined,
      reviewedAt: now,
      reviewedBy: admin.username,
    };
    const next = { ...business, review };
    await saveBusiness(uid, next);
    return json({ business: next });
  });
});
