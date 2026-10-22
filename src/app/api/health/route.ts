import { appWallet } from "@/lib/server/a2u";
import { demoSellerUsername, getDemoOwner, storageMisconfigured, storageMode } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { piMock } from "@/lib/server/pi";
import { feePercent } from "@/lib/server/settlement";

export const dynamic = "force-dynamic";

/** 배포 설정 점검용. 비밀값은 내보내지 않고 설정 여부만 알려준다(앱 지갑은 공개 주소만). */
export async function GET() {
  let appWalletAddress: string | null = null;
  let walletError: string | null = null;
  try {
    appWalletAddress = appWallet().publicKey();
  } catch (e) {
    walletError = e instanceof Error ? e.message : "invalid";
  }
  const demoOwner = !!(await getDemoOwner().catch(() => undefined));
  const env = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const checks = {
    piApiKey: !!process.env.PI_API_KEY,
    sessionSecret: !!process.env.SESSION_SECRET,
    appWallet: !!appWalletAddress,
    redis: storageMode === "redis",
    mockOff: !piMock && process.env.NEXT_PUBLIC_PI_MOCK !== "1",
    blob: !!process.env.BLOB_READ_WRITE_TOKEN,
  };
  const warnings = [
    !checks.piApiKey && "PI_API_KEY 없음: 로그인 검증·결제 승인 불가",
    !checks.sessionSecret && "SESSION_SECRET 없음: PI_API_KEY로 세션 서명(키 교체 시 전원 로그아웃)",
    walletError && `앱 지갑: ${walletError} → 판매자 정산·환불(A2U) 불가`,
    !checks.redis && (storageMisconfigured ? "운영 환경에 Redis 미연결: 저장이 차단됨" : "메모리 저장소 사용 중(개발용)"),
    !checks.mockOff && "PI_MOCK이 켜져 있음: 운영 배포에서는 반드시 끄세요",
    !demoSellerUsername && "DEMO_SELLER_USERNAME 없음: 예시 상품 구매·관리 불가",
    demoSellerUsername && !demoOwner && "예시 상품 운영자 계정 미연결: DEMO_SELLER_USERNAME 계정으로 한 번 로그인하세요",
    !checks.blob && "BLOB_READ_WRITE_TOKEN 없음: 동영상 업로드 불가, 사진은 판매글에 직접 저장(용량 제한)",
  ].filter(Boolean);
  return json({
    ok: Object.values(checks).every(Boolean),
    env,
    storage: storageMode,
    sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
    platformFeePercent: feePercent(),
    appWalletAddress,
    demoSeller: { username: demoSellerUsername ?? null, connected: demoOwner },
    checks,
    warnings,
  });
}
