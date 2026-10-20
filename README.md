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
| `GET/POST /api/listings`, `GET/PATCH /api/listings/[id]` | 판매글 조회 / 등록 / 판매자 상태·재고 수정 |
| `GET/POST /api/orders`, `GET/POST /api/orders/[id]` | 주문 목록 / 주문 생성(결제 데이터 반환) / 발송·구매확정 |
| `POST /api/payments/approve` | `onReadyForServerApproval` → 결제 내용 검증 후 Pi `/approve` |
| `POST /api/payments/complete` | `onReadyForServerCompletion` → Pi `/complete`(txid) |
| `POST /api/payments/cancelled_payment` | `onCancel`/`onError` → 주문 취소, 상품 예약 해제 |
| `POST /api/payments/incomplete` | `onIncompletePaymentFound` → 미완료 결제 마무리 |

## 결제 흐름 (에스크로)
1. 구매자가 `π로 구매하기` → 서버가 주문 생성 → `Pi.createPayment()` (구매자 → 앱 지갑)
2. 서버 승인: 금액·주문번호·구매자 일치 검증 후 `/approve`, 상품은 `예약중`
3. 구매자 서명 → 서버 완료: `/complete` → 주문 `결제 완료`
4. 판매자 발송 → 구매자 구매 확정 → 주문 `구매 확정`, 판매자 정산 대기
5. 판매자 정산(앱 → 판매자, A2U)은 아직 미구현. 현재는 `payout: pending`으로 기록만 됨

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
