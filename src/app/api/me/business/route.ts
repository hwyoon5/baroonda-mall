import { REVIEWED_FIELDS, type BusinessReview, type SellerBusiness } from "@/lib/business";
import { isAdmin } from "@/lib/server/admin";
import { getBusiness, saveBusiness } from "@/lib/server/db";
import { parseBusinessInput } from "@/lib/server/business-input";
import { handle, json, readJson, requireUser } from "@/lib/server/http";

export const dynamic = "force-dynamic";

export const GET = handle(async (req) => json({ business: (await getBusiness(requireUser(req).uid)) ?? null }));

const sameReviewed = (a: SellerBusiness, b: SellerBusiness) => REVIEWED_FIELDS.every((k) => String(a[k] ?? "") === String(b[k] ?? ""));

/** 신원·서류·정산 지갑이 바뀌거나 반려 후 다시 제출하면 관리자 승인 대기로 돌아간다. 배송·반품 조건만 고치면 승인 상태를 유지한다. */
export const PUT = handle(async (req) => {
  const user = requireUser(req);
  const input = parseBusinessInput(await readJson(req));
  const prev = await getBusiness(user.uid);
  const now = new Date().toISOString();
  let review: BusinessReview | undefined;
  if (isAdmin(user)) review = { status: "approved", submittedAt: now, reviewedAt: now, reviewedBy: user.username };
  else if (prev && sameReviewed(prev, input) && prev.review?.status !== "rejected") review = prev.review;
  else review = { status: "pending", submittedAt: now };
  const business: SellerBusiness = { ...input, username: user.username, review };
  await saveBusiness(user.uid, business);
  return json({ business });
});
