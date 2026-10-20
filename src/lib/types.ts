export type TradeMethod = "direct" | "delivery";
export type ListingStatus = "selling" | "reserved" | "sold" | "paused";
export type Condition = "new" | "used";

export type UsageGrade = "S" | "A" | "B" | "C";
export type ListingOption = { name: string; values: string[] };

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
  return l.condition === "new" ? "품절" : "거래완료";
}
