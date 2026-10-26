import type { PiUser } from "../types";
import { demoSellerUsername } from "./db";
import { HttpError, requireUser } from "./http";
import { TEST_ADMIN, testLoginEnabled } from "./pc-login";

/** 관리자 Pi 계정: 예시 상품 운영자(DEMO_SELLER_USERNAME, 기본 hwyoon5) + ADMIN_USERNAMES(쉼표 구분). 사용자 이름은 로그인 때 Pi API(/v2/me)로 검증된 값이다. */
export function adminUsernames() {
  const extra = (process.env.ADMIN_USERNAMES ?? "").split(",").map((s) => s.trim().replace(/^@/, ""));
  return new Set([demoSellerUsername, ...extra].filter(Boolean).map((s) => s.toLowerCase()));
}

export const isAdmin = (user: PiUser | null) =>
  !!user && (user.uid.startsWith("test-") ? user.uid === TEST_ADMIN.uid && testLoginEnabled() : adminUsernames().has(user.username.toLowerCase()));

export function requireAdmin(req: Request) {
  const user = requireUser(req);
  if (!isAdmin(user)) throw new HttpError(403, "관리자만 볼 수 있어요.");
  return user;
}
