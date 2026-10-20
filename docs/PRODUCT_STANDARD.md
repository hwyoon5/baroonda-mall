# 바로온다 설계 표준: UI/UX · 커머스 구조 · Pi 연동

앞으로의 화면, 데이터 모델, 판매 프로세스는 아래 세 기준을 함께 따른다.

| 영역 | 기준 | 문서 |
| --- | --- | --- |
| 모바일 UI/UX | 국내 e커머스·중고 플랫폼(당근마켓, 쿠팡)의 표준 패턴 | 이 문서 §1 |
| 상품·재고·주문 구조 | Shopify의 Product / Variant / Inventory / Order / Fulfillment 모델 | 이 문서 §2 |
| 로그인·결제 | Pi 공식 데모 앱 (`useAuth`, `usePayments`, `/user/*`, `/payments/*`) | [PI_STANDARD.md](./PI_STANDARD.md) |

세 기준이 충돌하면 **결제·인증 안전성(Pi 표준) > 데이터 정합성(Shopify 구조) > 화면 관례(국내 UX)** 순으로 우선한다.

---

## 1. 모바일 UI/UX (당근마켓 · 쿠팡)

### 공통 골격
- 최대 폭 `max-w-md`, 하단 탭 5개: 홈 / 카테고리 / **판매하기(가운데 +, 당근의 글쓰기 버튼)** / 거래내역 / 마이
- 상단: 쿠팡식 고정 검색바와 인기 검색어 칩. 상세 화면은 뒤로가기가 있는 `SubHeader`
- 결정 버튼은 화면 하단에 고정한다. 상세 화면은 `BuyBar`(찜 + 가격 + 구매 버튼), 등록 폼은 맨 아래 제출 버튼
- 터치 영역 44px 이상, 누르면 `.tap` 피드백. 링크는 `href="#"` 금지, 반드시 실제 route로 연결한다
- 문구는 해요체로 짧게 쓴다("판매글이 등록됐어요"). 결과 알림은 토스트로, 빈 목록에는 안내 문구와 다음 행동 버튼을 둔다

### 판매 유형별 화면 관례
| | 개인 중고 (당근마켓 패턴) | 새 상품·정식 판매 (쿠팡 패턴) |
| --- | --- | --- |
| 목록 카드 | 왼쪽 정사각 사진 + 제목 · 동네 · 시간 · 가격 · 관심 수 | 2열 그리드: 사진, 할인율, π 가격, 빠른배송 배지, 판매량 |
| 신뢰 정보 | 판매자 프로필(Pi 인증 배지), 사용감 등급과 설명 | 재고·판매 수, 옵션, 배송 안내 |
| 구매 버튼 | 바로 π 결제, 직거래/택배 표시 | **옵션 선택 바텀시트** → π 결제 |
| 상태 표시 | 예약중 · 거래완료 | 품절 · 판매중지 |

### 마이페이지
당근의 '나의 당근'처럼 **판매 관리**(내 상품 관리 상태별 개수, 판매 내역, 상품 등록)와 **구매**(구매 내역, 찜)를 섹션으로 나눈다. 목록의 탭 상태는 URL(`?tab=`)과 맞춘다.

---

## 2. 커머스 구조 (Shopify 모델)

개인 중고와 새 상품을 **같은 모델**로 다룬다. 중고는 "옵션이 없고 재고가 1개인 상품"이다.

| Shopify | 바로온다 현재 (`src/lib/types.ts`) | 목표 |
| --- | --- | --- |
| Product | `Listing` | 그대로 |
| Product status (active / draft / archived) | `status`: selling / paused / sold (+ reserved) | `draft`(임시저장) 추가 |
| Product type / condition | `condition`: used(개인 중고) / new(정식 판매) | 그대로 |
| Options + Variants (조합별 가격·SKU·재고) | `options[]`만 있고 재고는 상품 단위 `stock` | `variants[]`: `{ id, options, pricePi?, stock }` |
| Inventory (available / committed) | approve 시 `stock -= 1` | `available`과 `committed` 분리. approve 시 committed, complete 시 확정, cancel 시 되돌림 |
| Collections | 카테고리 | 그대로 (+ 기획전) |
| Order financial_status (pending / authorized / paid / refunded) | `OrderStatus` created / approved / paid / cancelled | `refunded` 추가 (A2U 환불) |
| Order fulfillment_status + Fulfillment(tracking) | shipped | 송장번호·택배사 `fulfillment` 필드 |
| Payout | `payout: "pending"` | Pi A2U 송금으로 실제 정산 |

### 재고 원칙
- 재고 변경은 서버에서만 한다(`src/lib/server/orders.ts`, `PATCH /api/listings/[id]`). 클라이언트 값은 신뢰하지 않는다.
- 재고 차감은 Pi 결제 **approve** 시점에 한다(결제를 보장받는 시점). 취소나 미완료 결제가 생기면 반드시 복구한다.
- 동시 결제로 재고보다 많이 팔리지 않도록, 재고 차감은 원자적으로 처리해야 한다(목표: Redis Lua/트랜잭션).

---

## 3. 판매 프로세스 = Shopify 주문 흐름 × Pi 결제 콜백

장바구니 없이 **바로구매** 방식이다(당근·쿠팡 바로구매와 같다).

| 단계 | 사용자 화면 | Pi SDK / API | 주문 · 재고 상태 |
| --- | --- | --- | --- |
| 1. 상품 선택 | 상세 → (옵션 시트) → π로 구매 | 로그인 안 했으면 `requireAuth()` → `SignIn` | — |
| 2. 주문 생성 | | `POST /api/orders` (판매 상태·재고·옵션 검증) | `created` (Shopify pending) |
| 3. 결제 승인 | Pi 결제창 | `onReadyForServerApproval` → `/api/payments/approve` → Pi `/approve` | `approved` (authorized), 재고 committed / 중고는 예약중 |
| 4. 결제 완료 | 서명 | `onReadyForServerCompletion` → `/api/payments/complete` → Pi `/complete` | `paid` |
| 5. 발송 | 판매 내역에서 발송 처리 | — | `shipped` (fulfilled, 목표: 송장) |
| 6. 구매 확정 | 구매 내역에서 확정 | — | `completed`, 중고는 거래완료, 새 상품은 `soldCount + 1`, 정산 대기 |
| 취소 / 오류 | 토스트 | `onCancel` / `onError` → `/api/payments/cancelled_payment` | `cancelled`, 재고·예약 복구 |
| 미완료 결제 | 다음 로그인 때 | `onIncompletePaymentFound` → Horizon memo 검증 → `/complete` | `paid` 또는 `cancelled` |

---

## 4. 개선 로드맵 (우선순위)

1. **P1 · 커머스 정합성**
   - 옵션 조합별 재고(`variants`)
   - 원자적 재고 차감과 committed 분리
   - 발송 시 송장번호 입력
   - 상품 임시저장(`draft`)
2. **P2 · 국내 UX**
   - 중고 목록을 당근식 리스트 카드로
   - 동네·관심 수 표시
   - 판매자 프로필과 거래 후기
   - 1:1 채팅
   - 구매 후기·별점(쿠팡)
3. **P3 · 운영**
   - Pi A2U 정산·환불
   - Pi `in_app_notifications` 알림
   - 이미지 오브젝트 스토리지
   - 신고·차단

## 5. 코드 위치 규칙
- 타입·라벨: `src/lib/types.ts`
- 서버 규칙(검증·상태 전이·재고): `src/lib/server/*`
- API: `src/app/api/*` (Pi 표준 경로 이름 유지)
- Pi 연동: `src/hooks/useAuth.ts`, `src/hooks/usePayments.ts`, `src/lib/client/pi-sdk.ts`. 페이지에서 `window.Pi`를 직접 호출하지 않는다
- 화면: `src/app/*`, 공통 UI는 `src/components/*`, 스타일은 Tailwind만 쓴다
