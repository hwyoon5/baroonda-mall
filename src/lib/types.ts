import type { SellerPolicy, ShippingTerms } from "./business";

export type TradeMethod = "direct" | "delivery";
export type ListingStatus = "draft" | "selling" | "reserved" | "sold" | "paused";
export type Condition = "new" | "used";

export type UsageGrade = "S" | "A" | "B" | "C";
export type ListingOption = { name: string; values: string[] };
/** Shopify Variant: 옵션 조합별 재고. stock = 판매 가능(available), committed = 결제 승인 후 확정 대기 */
export type Variant = { id: string; options: Record<string, string>; stock: number; committed?: number };

export const carriers = ["CJ대한통운", "우체국택배", "한진택배", "롯데택배", "로젠택배", "기타"] as const;
/** 송장번호: 숫자와 하이픈 8~20자 (클라이언트·서버 공통 규칙) */
export const isTrackingNumber = (v: string) => /^[0-9-]{8,20}$/.test(v.replace(/\s/g, ""));

/** condition = 판매 유형: used → 개인 중고(1개), new → 새 상품(정식 판매, 재고·옵션) */
export const listingKindLabel: Record<Condition, string> = { used: "개인 중고", new: "정식 판매" };
export const usageGradeLabel: Record<UsageGrade, string> = { S: "거의 새것", A: "사용감 적음", B: "사용감 있음", C: "사용감 많음" };
export const isUsageGrade = (v: unknown): v is UsageGrade => typeof v === "string" && v in usageGradeLabel;

export type PiUser = { uid: string; username: string };

export type Listing = {
  id: string;
  title: string;
  /** 선택 입력. 검색 필터·브랜드순 정렬에 쓴다. */
  brand?: string;
  description: string;
  category: string;
  condition: Condition;
  pricePi: number;
  originalPricePi?: number;
  /** 새 상품 전용: 판매자가 메인 '오늘의 특가'에 노출하기로 선택(정가 > 판매가일 때만 저장) */
  todayDeal?: boolean;
  negotiable: boolean;
  tradeMethods: TradeMethod[];
  meetingPlace?: string;
  location?: string;
  fastShipping: boolean;
  images: string[];
  /** 짧은 상품 동영상(Vercel Blob URL, 최대 MAX_VIDEOS개) */
  videos?: string[];
  /** 새 상품(정식 판매)의 남은 재고. 개인 중고는 항상 1개라 비워둔다. */
  stock?: number;
  soldCount?: number;
  options?: ListingOption[];
  variants?: Variant[];
  committed?: number;
  /** 개인 중고 전용 */
  usageGrade?: UsageGrade;
  usageNote?: string;
  /** 새 상품 전용: 이 상품에만 쓰는 반품·환불·고지 문구. 없으면 판매자 사업자 정보의 기본 규정을 표시한다. */
  policy?: SellerPolicy;
  emoji?: string;
  bg?: string;
  seller: PiUser;
  status: ListingStatus;
  reservedOrderId?: string;
  createdAt: string;
  demo?: boolean;
  /** 상품 카드 표시용 집계. 조회할 때 붙이고 저장하지 않는다(withStats). */
  stats?: ListingStats;
};

export type ListingStats = {
  /** 상세 화면을 연 기기 수(같은 기기는 24시간에 1회) */
  views: number;
  reviews: number;
  /** 이 상품 후기 평균 별점(소수 1자리), 후기가 없으면 비움 */
  rating?: number;
  /** 새 상품에 적용되는 배송 조건(상품별 입력 > 사업자 기본 규정) */
  shipping?: ShippingTerms;
};

/**
 * created  → 주문 생성, Pi 결제창 열림
 * approved → 서버 승인(/approve) 완료, 구매자 서명 대기
 * paid     → 서버 완료(/complete) 완료, 대금은 앱 지갑에 보관(에스크로)
 * shipped  → 판매자 발송/전달
 * completed→ 구매 확정(구매자 직접 또는 배송 완료 후 자동), 판매자 정산(A2U) 대상
 * refunded → 구매 확정 전 환불(A2U로 구매자에게 반환)
 */
export type OrderStatus = "created" | "approved" | "paid" | "shipped" | "completed" | "cancelled" | "refunded";

/** 앱 지갑 → 사용자 송금(Pi A2U). paymentId를 먼저 저장해 두고 재시도 시 이어서 처리한다. */
export type A2UTransfer = {
  amount: number;
  paymentId?: string;
  txid?: string;
  /** 블록체인 전송 시작 시각: 응답 전에 실패하면 Horizon에서 memo로 찾아 이중 송금을 막는다 */
  submittedAt?: string;
  error?: string;
  attempts: number;
  updatedAt: string;
  completedAt?: string;
};

export type PayoutStatus = "none" | "pending" | "processing" | "paid" | "failed";
export type RefundStatus = "requested" | "rejected" | "withdrawn" | "processing" | "refunded" | "failed" | "exchanged";
/** cancel: 발송 전 취소(즉시 환불), return: 발송 후 반품·환불, exchange: 발송 후 교환(재발송) */
export type ClaimKind = "cancel" | "return" | "exchange";

export type Refund = {
  status: RefundStatus;
  /** buyer: 구매자 요청, seller: 판매자 직접 판매 취소 */
  by: "buyer" | "seller";
  reason: string;
  /** 없으면 예전 데이터: 발송 전이면 cancel, 발송 후면 return으로 본다 */
  kind?: ClaimKind;
  requestedAt: string;
  /** 거절·철회·교환 승인 시각 */
  resolvedAt?: string;
  rejectReason?: string;
  transfer?: A2UTransfer;
};

export type Order = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingThumb?: string;
  option?: Record<string, string>;
  variantId?: string;
  fulfillment?: { method: TradeMethod; carrier?: string; trackingNumber?: string; shippedAt: string; deliveredAt?: string };
  /** 판매자(또는 관리자)가 '상품 준비중'으로 바꾼 시각 */
  preparingAt?: string;
  amount: number;
  /** amount = itemAmount + shippingFee. 배송비 결제 도입 전 주문에는 없다. */
  itemAmount?: number;
  shippingFee?: number;
  remoteArea?: boolean;
  /** 택배·직거래 모두 가능한 상품에서 구매자가 직거래를 고른 경우 */
  pickup?: boolean;
  buyer: PiUser;
  seller: PiUser;
  status: OrderStatus;
  paymentId?: string;
  txid?: string;
  payout: PayoutStatus;
  /** 판매자 정산 송금 (수수료 차감 후 금액) */
  payoutTransfer?: A2UTransfer;
  platformFee?: number;
  refund?: Refund;
  /** 배송 완료 후 이 시각까지 구매 확정·반품/교환 요청이 없으면 자동 구매 확정 */
  autoConfirmAt?: string;
  confirmedAt?: string;
  confirmedBy?: "buyer" | "auto";
  createdAt: string;
  updatedAt: string;
};

export const tradeMethodLabel: Record<TradeMethod, string> = {
  direct: "직거래",
  delivery: "택배",
};

export const orderStatusLabel: Record<OrderStatus, string> = {
  created: "결제 대기",
  approved: "결제 진행중",
  paid: "결제 완료",
  shipped: "발송 완료",
  completed: "구매 확정",
  cancelled: "취소됨",
  refunded: "환불 완료",
};

/** 결제 완료 후 배송 단계: 신규 주문 → 상품 준비중 → 배송중(발송) → 배송 완료 */
export type DeliveryStage = "ready" | "preparing" | "shipping" | "delivered";
export const deliveryStageLabel: Record<DeliveryStage, string> = {
  ready: "신규 주문",
  preparing: "상품 준비중",
  shipping: "배송중",
  delivered: "배송 완료",
};
export function deliveryStage(o: Pick<Order, "status" | "preparingAt" | "fulfillment">): DeliveryStage | null {
  if (o.status === "paid") return o.preparingAt ? "preparing" : "ready";
  if (o.status === "shipped") return o.fulfillment?.deliveredAt ? "delivered" : "shipping";
  return null;
}
/** 주문 상태 + 배송 단계를 합친 화면 표시용 이름 */
export function orderStageLabel(o: Order) {
  const st = deliveryStage(o);
  return st && st !== "ready" ? deliveryStageLabel[st] : orderStatusLabel[o.status];
}
/** 배송 완료 또는 구매 확정된 주문만 후기를 남길 수 있다. */
export const canReview = (o: Order) => o.status === "completed" || deliveryStage(o) === "delivered";

export const payoutStatusLabel: Record<PayoutStatus, string> = {
  none: "-",
  pending: "정산 대기",
  processing: "정산 중",
  paid: "정산 완료",
  failed: "정산 실패",
};

export const refundStatusLabel: Record<RefundStatus, string> = {
  requested: "환불 요청됨",
  rejected: "환불 거절됨",
  withdrawn: "환불 요청 철회",
  processing: "환불 송금 중",
  refunded: "환불 완료",
  failed: "환불 송금 실패",
  exchanged: "교환 승인",
};

export const claimKindLabel: Record<ClaimKind, string> = { cancel: "주문 취소", return: "반품·환불", exchange: "교환" };
export const claimKind = (r: Pick<Refund, "kind" | "by">): ClaimKind => r.kind ?? (r.by === "seller" ? "cancel" : "return");
export function claimStatusText(r: Refund) {
  if (claimKind(r) !== "exchange") return refundStatusLabel[r.status];
  return { requested: "교환 요청됨", rejected: "교환 거절됨", withdrawn: "교환 요청 철회", exchanged: "교환 승인 · 재발송" }[r.status as string] ?? refundStatusLabel[r.status];
}

/** 환불 송금이 진행 중이거나 판매자 응답을 기다리는 상태 (이때는 발송·구매 확정을 막는다) */
export const refundOpen = (o: Pick<Order, "refund">) => ["requested", "processing", "failed"].includes(o.refund?.status ?? "");

export function listingStatusText(l: Pick<Listing, "status" | "condition">) {
  if (l.status === "selling") return "판매중";
  if (l.status === "reserved") return "예약중";
  if (l.status === "paused") return "판매중지";
  if (l.status === "draft") return "임시저장";
  return l.condition === "new" ? "품절" : "거래완료";
}

/** 구매자-판매자 1:1 채팅방 (상품 + 구매자 기준으로 하나) */
export type ChatRoom = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingImage?: string;
  buyer: PiUser;
  seller: PiUser;
  lastMessage?: string;
  lastAt: string;
  /** uid → 읽지 않은 메시지 수 */
  unread: Record<string, number>;
  createdAt: string;
};

export type ChatMessage = { id: string; roomId: string; senderUid: string; text: string; createdAt: string };

/** 구매 확정 후 구매자가 남기는 거래 후기 (주문당 1개) */
export type Review = {
  id: string;
  orderId: string;
  listingId: string;
  listingTitle: string;
  sellerUid: string;
  buyer: PiUser;
  rating: number;
  text: string;
  option?: Record<string, string>;
  createdAt: string;
};

/** 쇼츠: 사용자가 올린 세로 짧은 동영상. 내 상품을 연결하면 피드에서 바로 상품으로 이동할 수 있다. */
export type ShortStatus = "public" | "hidden" | "deleted";
export type Short = {
  id: string;
  /** Vercel Blob 동영상 URL */
  videoUrl: string;
  /** 대표 프레임 이미지(Blob 사진 URL). 목록 썸네일·피드 포스터로 쓴다. */
  posterUrl?: string;
  caption: string;
  listingId?: string;
  author: PiUser;
  status: ShortStatus;
  createdAt: string;
};
/** 피드 응답: 연결 상품은 조회 시점의 정보로 붙인다 */
export type ShortView = Short & { listing?: { id: string; title: string; pricePi: number; image?: string; status: ListingStatus } };
