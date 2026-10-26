import { requireAdmin } from "@/lib/server/admin";
import { handle, json } from "@/lib/server/http";
import { issuePcCode } from "@/lib/server/pc-login";

/** 관리자: PC 브라우저 로그인용 1회용 코드 발급(5분, 새로 받으면 이전 코드 무효) */
export const POST = handle(async (req) => json(await issuePcCode(requireAdmin(req))));
