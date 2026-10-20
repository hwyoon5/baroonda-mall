# 운영 배포 체크리스트 (Vercel + Upstash Redis + Pi)

PR을 `main`에 머지하기 전에 아래를 Vercel 프로젝트(`taxitago/baroonda-mall`) → Settings → Environment Variables에 설정합니다.
설정 후 `https://baroonda-mall.vercel.app/api/health` 의 `ok`가 `true`인지 확인하세요(비밀값은 노출하지 않고 설정 여부만 보여줌).

## 1. 환경변수

| 이름 | 환경 | 값 / 얻는 곳 | 없으면 |
|---|---|---|---|
| `PI_API_KEY` | Production, Preview | Pi Developer Portal(Pi Browser → develop.pi) → 내 앱 → API Key | 로그인 검증·결제 승인 불가 |
| `PI_WALLET_PRIVATE_SEED` | Production(필요 시 Preview) | Developer Portal → 내 앱 → App Wallet 생성 시 받은 비밀 시드(`S…`, 56자) | 판매자 정산·환불(A2U) 불가 |
| `SESSION_SECRET` | Production, Preview | 임의의 긴 문자열 (`openssl rand -base64 48`) | PI_API_KEY로 서명(키 교체 시 전원 로그아웃) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Production, Preview | 아래 2번 Upstash 연결 시 자동 생성 (`UPSTASH_REDIS_REST_URL/TOKEN`도 인식) | 운영에서는 저장이 차단됨(데이터 유실 방지) |
| `BLOB_READ_WRITE_TOKEN` | Production, Preview | 아래 2-1 Vercel Blob 연결 시 자동 생성 | 동영상 업로드 불가, 사진은 판매글에 data URL로 저장(장당 약 720px) |
| `PLATFORM_FEE_PERCENT` | 선택 | 정산 시 차감할 수수료 % (0~30, 기본 0) | 0% |
| `NEXT_PUBLIC_PI_SANDBOX` | 선택 | Pi Testnet Sandbox로 테스트할 때만 `true` | `false` |

**절대 설정하지 말 것**: `PI_MOCK`, `NEXT_PUBLIC_PI_MOCK` (로컬 테스트 전용, 누구나 로그인 가능해짐)

- `NEXT_PUBLIC_*` 값은 빌드 시점에 들어가므로 바꾼 뒤 **Redeploy** 해야 반영됩니다.
- 앱 지갑 시드는 송금 권한 그 자체입니다. Vercel에서 **Sensitive** 옵션으로 저장하고, 코드·채팅·로그에 남기지 마세요.
- `/api/health`의 `appWalletAddress`(공개 주소)가 Developer Portal의 App Wallet 주소와 같은지 확인하세요.

## 2. Upstash Redis 연결

1. Vercel 프로젝트 → **Storage** → **Create Database** → Marketplace의 **Upstash for Redis** 선택 (무료 플랜 가능, 리전은 Functions 리전과 가깝게 — 기본 `iad1`이면 `us-east-1`).
2. 프로젝트에 Connect 하면서 Production·Preview 환경을 체크 → `KV_REST_API_URL`, `KV_REST_API_TOKEN` 이 자동 추가됩니다.
3. Redeploy 후 `/api/health`에서 `"storage": "redis"` 확인.

저장 키는 모두 `bo:` 접두사(Hash)이고, 재고·주문·정산은 Redis `SET NX PX` 락으로 직렬화합니다.

## 2-1. Vercel Blob 연결 (판매글 사진·동영상)

1. Vercel 프로젝트 → **Storage** → **Create Database** → **Blob** 선택 → 프로젝트에 연결(Production·Preview).
2. `BLOB_READ_WRITE_TOKEN`이 자동 추가되면 다시 배포합니다. `/api/health`의 `checks.blob`이 `true`면 완료.
3. 사진은 최대 10장(브라우저에서 1280px JPEG로 줄여 업로드), 동영상은 최대 2개·개당 60초·50MB 이하(MP4/MOV/WebM)입니다. 파일은 브라우저에서 Blob으로 직접 올라가고, 서버(`/api/upload`)는 로그인 사용자에게만 형식·용량이 제한된 업로드 토큰을 발급합니다.
4. Hobby 플랜 Blob 무료 한도(저장 용량·전송량)를 넘으면 과금되거나 업로드가 막힐 수 있으니 Vercel → Usage에서 확인하세요.

## 3. Pi Developer Portal

1. App URL / Development URL: `https://baroonda-mall.vercel.app`
2. 도메인 인증: `public/validation-key.txt` (`/validation-key.txt` 200 확인)
3. App Wallet 생성 → 시드를 `PI_WALLET_PRIVATE_SEED`에, 테스트넷 Pi를 지갑에 충전 (A2U 송금액 + 건당 네트워크 수수료 0.01π)
4. 메인넷 전환 전에는 Testnet(Sandbox)로 결제 → 구매 확정 → 정산, 환불을 한 번씩 실제로 확인

## 4. 머지 직후 확인

- [ ] `/api/health` → `ok: true`, `storage: "redis"`, `warnings: []`
- [ ] Pi Browser에서 로그인 → 상품 등록 → 다른 계정으로 결제 → 발송 → 구매 확정 → `/my/payouts`에 정산 완료
- [ ] 소액으로 환불(발송 전 취소) 1회

## 5. Pi Browser 로그인이 안 될 때

| 증상 | 원인 / 조치 |
|---|---|
| "Pi 로그인 연동은 준비 중이에요" | 운영(`main`)에 Pi 로그인 코드가 아직 없음 → 이 PR 머지 |
| "Pi 인증 응답이 없어요" (60초) | Pi Browser가 아닌 브라우저이거나, 개발자 포털의 App URL·Development URL이 접속한 주소와 다름 |
| Pi Browser에서 아무 반응 없음 | `NEXT_PUBLIC_PI_SANDBOX=true`로 배포됨 → Pi Browser에서는 `false`(Sandbox는 데스크톱 `sandbox.minepi.com` 전용) 후 Redeploy |
| "세션 서명 키(SESSION_SECRET)…" (503) | `SESSION_SECRET` 미설정 |
| "Pi 서버에 연결하지 못했어요" (502) | `api.minepi.com` 일시 장애/타임아웃 → 재시도 |

로그인 자체(`/v2/me` 검증)는 `PI_API_KEY` 없이도 되지만, 결제·정산에는 필요합니다.
