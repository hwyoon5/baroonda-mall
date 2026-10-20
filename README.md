# 바로온다 (Baroonda)

Pi 계정을 가진 일반 사용자가 직접 상품을 올리고, 구매자는 **오직 π(Pi)로만 결제**하는 Pi Browser용 P2P 오픈마켓입니다.
Next.js 15 (App Router) + Tailwind CSS v4.

## 라우팅
| 경로 | 설명 |
| --- | --- |
| `/` | 홈: 검색, 카테고리 그리드, 오늘의 특가, 방금 올라온 상품 |
| `/categories`, `/category/[id]` | 카테고리 목록 / 카테고리별 상품 (`used` = 중고마켓) |
| `/search?q=`, `/deals` | 검색 결과 / 할인 상품 |
| `/listings/[id]` | 상품 상세 + π로 구매하기 |
| `/sell` | 상품 등록 (Pi 로그인 필요). 상단에서 [개인 중고](1개·사용감 등급/설명) / [새 상품(정식 판매)](재고 수량·옵션) 선택 |
| `/orders`, `/orders/[id]` | 구매·판매 내역, 주문 상세(발송 처리 / 구매 확정) |
| `/my`, `/my/listings`, `/wishlist` | 마이페이지(판매 관리·구매 메뉴) / 내 상품 관리(판매 중지·재개, 재고 수정) / 찜 목록 |

## API
| 메서드 · 경로 | 설명 |
| --- | --- |
| `POST /api/user/signin` | `Pi.authenticate()` 결과(authResult)의 accessToken을 Pi `/v2/me`로 검증하고 세션 토큰 발급 (Pi 공식 데모 표준, `docs/PI_STANDARD.md`) |
| `GET /api/me` | 현재 로그인 사용자 |
| `GET/POST /api/listings`, `GET/PUT/PATCH /api/listings/[id]` | 판매글 조회 / 등록·임시저장(`draft: true`) / 임시저장 이어서 작성·게시 / 판매자 상태·재고(옵션별 `variants`) 수정 |
| `GET/POST /api/orders/[id]/review` | 거래 후기 조회 / 작성(구매 확정한 구매자, 주문당 1회, 별점 1~5) |
| `GET /api/sellers/[uid]` | 판매자 프로필(판매 상품·판매중/거래완료 수·평균 별점·후기) |
| `GET/POST /api/chats`, `GET/POST /api/chats/[id]` | 1:1 채팅 목록·방 열기(상품+구매자당 1개) / 메시지 조회(`?after=`, 읽음 처리)·전송 |
| `GET/POST /api/orders`, `GET/POST /api/orders/[id]` | 주문 목록 / 주문 생성(결제 데이터 반환) / 발송·구매확정 |
| `POST /api/payments/approve` | `onReadyForServerApproval` → 결제 내용 검증 후 Pi `/approve` |
| `POST /api/payments/complete` | `onReadyForServerCompletion` → Pi `/complete`(txid) |
| `POST /api/payments/cancelled_payment` | `onCancel`/`onError` → 주문 취소, 상품 예약 해제 |
| `POST /api/payments/incomplete` | `onIncompletePaymentFound` → 미완료 결제 마무리 |

## 결제 흐름 (에스크로)
1. 구매자가 `π로 구매하기` → 서버가 주문 생성 → `Pi.createPayment()` (구매자 → 앱 지갑)
2. 서버 승인: 금액·주문번호·구매자 일치 검증 후 `/approve`, 상품은 `예약중`
3. 구매자 서명 → 서버 완료: `/complete` → 주문 `결제 완료`
4. 판매자 발송 → 구매자 구매 확정 → 주문 `구매 확정`
5. 구매 확정 즉시 앱 지갑 → 판매자 A2U 정산(`payout: paid`). 구매 확정 전에는 환불(A2U로 구매자에게 반환) 가능

## 환경변수
`.env.example` 참고. Vercel에는 `PI_API_KEY`, `SESSION_SECRET`, 그리고 Upstash Redis(`KV_REST_API_URL`, `KV_REST_API_TOKEN`)를 설정하세요.
Redis가 없으면 메모리 저장이라 서버리스 환경에서는 등록글·주문이 유지되지 않습니다.

## 실행
```bash
npm install
npm run dev   # http://localhost:3000
# Pi Browser 없이 로그인·결제 흐름 테스트
PI_MOCK=1 NEXT_PUBLIC_PI_MOCK=1 npm run dev
```

> `demo*` 상품은 화면 예시용이며 구매할 수 없습니다.

## 설계 표준
- [docs/PRODUCT_STANDARD.md](docs/PRODUCT_STANDARD.md): 당근마켓·쿠팡 모바일 UX + Shopify 상품·재고·주문 구조 + Pi 공식 데모 로그인·결제
- [docs/PI_STANDARD.md](docs/PI_STANDARD.md): Pi 인증·결제 연동 상세

## 핵심 로직 테스트
브라우저 없이 API로 재고·결제·임시저장·발송 규칙을 검증합니다.

```bash
PI_MOCK=1 NEXT_PUBLIC_PI_MOCK=1 npm run build && npm run test:logic
```

## 정산·환불 (P3, Pi A2U)

| API | 설명 |
|---|---|
| `POST /api/orders/[id] {action:"confirm"}` | 구매 확정 → 판매자에게 A2U 정산(수수료 `PLATFORM_FEE_PERCENT` 차감). 실패 시 `payout:"failed"`, 판매자가 `payout_retry` |
| `refund_request {reason}` | 구매자 환불 요청. 발송 전(`paid`)이면 즉시 A2U 환불, 발송 후면 판매자 승인 대기 |
| `refund_approve` / `refund_reject {reason?}` / `refund_withdraw` | 판매자 승인·거절 / 구매자 철회 |
| `seller_cancel {reason?}` / `refund_retry` | 판매자 판매 취소(전액 환불) / 실패한 환불 송금 재시도 |
| `GET /api/health` | 배포 설정 점검(설정 여부만, 비밀값 비노출) |

배포 설정은 [docs/DEPLOY.md](docs/DEPLOY.md) 참고.
