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
  description: string;
  category: string;
  condition: Condition;
  pricePi: number;
  originalPricePi?: number;
  negotiable: boolean;
  tradeMethods: TradeMethod[];
  meetingPlace?: string;
  location?: string;
  fastShipping: boolean;
  images: string[];
  /** 새 상품(정식 판매)의 남은 재고. 개인 중고는 항상 1개라 비워둔다. */
  stock?: number;
  soldCount?: number;
  options?: ListingOption[];
  variants?: Variant[];
  committed?: number;
  /** 개인 중고 전용 */
  usageGrade?: UsageGrade;
  usageNote?: string;
  emoji?: string;
  bg?: string;
  seller: PiUser;
  status: ListingStatus;
  reservedOrderId?: string;
  createdAt: string;
  demo?: boolean;
};

/**
 * created  → 주문 생성, Pi 결제창 열림
 * approved → 서버 승인(/approve) 완료, 구매자 서명 대기
 * paid     → 서버 완료(/complete) 완료, 대금은 앱 지갑에 보관(에스크로)
 * shipped  → 판매자 발송/전달
 * completed→ 구매 확정, 판매자 정산 대상
 */
export type OrderStatus = "created" | "approved" | "paid" | "shipped" | "completed" | "cancelled";

export type Order = {
  id: string;
  listingId: string;
  listingTitle: string;
  listingThumb?: string;
  option?: Record<string, string>;
  variantId?: string;
  fulfillment?: { method: TradeMethod; carrier?: string; trackingNumber?: string; shippedAt: string };
  amount: number;
  buyer: PiUser;
  seller: PiUser;
  status: OrderStatus;
  paymentId?: string;
  txid?: string;
  payout: "none" | "pending" | "paid";
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
};

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
