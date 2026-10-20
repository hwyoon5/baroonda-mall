# 바로온다 개발 표준: Pi 공식 데모 앱 기준

> 전체 설계 기준(UI/UX·커머스 구조·Pi 연동)은 [PRODUCT_STANDARD.md](./PRODUCT_STANDARD.md)를 먼저 본다. 이 문서는 그중 로그인·결제 부분이다.

이 프로젝트의 Pi 플랫폼 연동, 코드 구조, 개발 절차는 [Pi 공식 데모 앱](https://github.com/pi-apps/demo)과 [FLOWS.md](https://github.com/pi-apps/demo/blob/main/FLOWS.md)를 기준으로 한다.
스택은 Next.js(App Router) + Tailwind + Vercel을 유지하며, 데모의 `frontend/`는 `src/app`·`src/components`·`src/hooks`에, `backend/`는 `src/app/api`(Route Handlers)·`src/lib/server`에 대응한다.

## 1. 인증 (데모: `useAuth`, `POST /user/signin`)
- 클라이언트: `useAuth()` (`src/hooks/useAuth.ts`) → `{ user, isAuthenticated, signIn, signOut, requireAuth, showSignIn, closeSignIn, isLoading }`
- `Pi.init({ version: "2.0", sandbox })` 후 `Pi.authenticate(["username","payments","roles","in_app_notifications"], onIncompletePaymentFound)`
- `POST /api/user/signin { authResult }` → 서버가 Platform API `GET /v2/me`(Bearer accessToken)로 검증. **클라이언트가 보낸 사용자 정보는 신뢰하지 않는다.**
- `GET /api/user/signout`
- 로그인이 필요한 동작은 `requireAuth()`로 `SignIn` 모달(`src/components/pi/SignIn.tsx`)을 띄운다.
- 차이점: 데모의 express-session 쿠키 대신 서버 서명 Bearer 토큰을 쓴다(Pi Browser iframe/Sandbox에서 쿠키 미저장 이슈, 데모 README 경고 참고).

## 2. 결제 (데모: `usePayments`, `/payments/*`)
- 클라이언트: `usePayments().orderProduct(productId)` (`src/hooks/usePayments.ts`)
- `Pi.createPayment({ amount, memo, metadata: { productId, ... } }, callbacks)`

| SDK 콜백 | API | 서버 처리 |
| --- | --- | --- |
| `onReadyForServerApproval(paymentId)` | `POST /api/payments/approve` | `GET /v2/payments/:id`로 조회·검증 후 `POST /v2/payments/:id/approve` |
| `onReadyForServerCompletion(paymentId, txid)` | `POST /api/payments/complete` | `POST /v2/payments/:id/complete { txid }` 성공 후에만 결제 완료 처리 |
| `onCancel(paymentId)` / `onError` | `POST /api/payments/cancelled_payment` | 주문 취소 |
| `onIncompletePaymentFound(payment)` | `POST /api/payments/incomplete` | Horizon 거래(`transaction._link`)의 `memo === paymentId` 확인 후 complete |

- Platform API 호출은 `Authorization: Key ${PI_API_KEY}`, 서버에서만 (`src/lib/server/pi.ts`, 데모의 `platformAPIClient`).
- P2P 특성상 데모보다 엄격하게: 서버가 주문을 먼저 만들고 approve 시 금액·구매자·`metadata.productId/orderId`를 검증한다.

## 3. 코드 구조
- `src/types/pi.d.ts`: 데모 `types/pi.ts`와 같은 이름(`AuthResult`→`PiAuthResult`, `PaymentDTO`→`PiPaymentDTO`)
- `src/hooks/`: Pi 연동 훅(`useAuth`, `usePayments`). 페이지·컴포넌트는 SDK(`window.Pi`)를 직접 호출하지 않는다.
- `src/lib/client/pi-sdk.ts`: SDK 초기화·authenticate 공통 처리
- UI 스타일은 Tailwind 기반 바로온다 디자인을 유지한다(데모 UI는 기능 예시용).

## 4. 개발·테스트 절차 (데모 `doc/development.md`)
1. Pi Browser에서 `develop.pinet.com` → 앱 등록(Pi Testnet) → API Key 발급
2. Development URL 설정 후 데스크톱 브라우저에서 Sandbox URL로 접속 (`NEXT_PUBLIC_PI_SANDBOX=true`)
3. Pi Browser 없이 화면 흐름만 볼 때는 `PI_MOCK=1 NEXT_PUBLIC_PI_MOCK=1`
