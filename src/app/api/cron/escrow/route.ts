import { requireAdmin } from "@/lib/server/admin";
import { HttpError, handle, json } from "@/lib/server/http";
import { runEscrowJob } from "@/lib/server/settlement";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * 에스크로 예약 작업: 배송 완료 후 기한이 지난 주문 자동 구매 확정 + 멈춘 판매자 정산 재시도.
 * Vercel Cron은 CRON_SECRET이 있으면 Authorization: Bearer <CRON_SECRET>을 보낸다. 없으면 관리자만 실행할 수 있다.
 * (주문 목록·상세를 볼 때도 같은 자동 확정이 적용되므로 이 작업은 보조 수단이다.)
 */
export const GET = handle(async (req) => {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    if (req.headers.get("authorization") !== `Bearer ${secret}`) throw new HttpError(401, "인증이 필요해요.");
  } else {
    requireAdmin(req);
  }
  return json(await runEscrowJob());
});
