# 바로온다 (Baroonda Mall)

파이브라우저(Pi Browser)용 π 결제 쇼핑몰 메인 화면 UI입니다. Next.js 15 (App Router) + Tailwind CSS v4.

## 주요 화면
- 상단 고정 검색바 + 인기 검색어
- 카테고리 아이콘 그리드 (중고마켓 포함)
- 오늘의 특가 가로 스크롤 (자정 카운트다운, 판매율)
- 추천상품 2열 그리드 (π 가격, 빠른배송/무료배송 태그)
- P2P 중고장터: 판매자 정보, 직거래/택배 태그, π 가격, 판매하기(글쓰기) 모달

## 실행
```bash
npm install
npm run dev   # http://localhost:3000
```

## 구조
- `src/app/page.tsx` — 메인 화면
- `src/components/` — UI 컴포넌트
- `src/data/` — 목업 데이터 (`mall.ts`, `p2p.ts`)

> 현재 데이터는 목업이며, Pi SDK(로그인/결제)와 백엔드 저장은 연동되어 있지 않습니다.
