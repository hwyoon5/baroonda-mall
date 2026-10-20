export type TradeMethod = "direct" | "delivery";
export type ListingStatus = "selling" | "reserved" | "sold";
export type Condition = "new" | "used";

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
