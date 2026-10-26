import { deliveryStage, refundOpen, type Order } from "./types";

export type Settlement = {
  confirmedCount: number;
  autoConfirmedCount: number;
  confirmedSales: number;
  settlementAmount: number;
  platformFee: number;
  escrowCount: number;
  escrow: number;
  claimOpen: number;
  paidTotal: number;
  payoutPaid: number;
  payoutPending: number;
  payoutFailed: number;
  refunded: number;
};
export type AdminOrdersData = {
  orders: Order[];
  summary: Settlement;
  sellers: (Settlement & { key: string; uid: string; username: string })[];
  feePercent: number;
  autoConfirmDays: number;
};

/** 주문 필터. id는 /admin/orders?filter=… 로 대시보드에서 바로 연결한다. */
export const ORDER_FILTERS: { id: string; label: string; match: ((o: Order) => boolean) | null }[] = [
  { id: "all", label: "전체", match: null },
  { id: "approved", label: "결제 진행중", match: (o) => o.status === "approved" },
  { id: "ready", label: "신규 주문", match: (o) => deliveryStage(o) === "ready" },
  { id: "preparing", label: "상품 준비중", match: (o) => deliveryStage(o) === "preparing" },
  { id: "shipping", label: "배송중", match: (o) => deliveryStage(o) === "shipping" },
  { id: "delivered", label: "배송 완료", match: (o) => deliveryStage(o) === "delivered" },
  { id: "claim", label: "반품·교환 요청", match: (o) => refundOpen(o) },
  { id: "completed", label: "구매 확정", match: (o) => o.status === "completed" },
  { id: "cancelled", label: "취소·환불", match: (o) => o.status === "cancelled" || o.status === "refunded" },
];
export const countBy = (orders: Order[], id: string) => {
  const m = ORDER_FILTERS.find((f) => f.id === id)?.match;
  return m ? orders.filter(m).length : orders.length;
};

/** 한국 시간 날짜(YYYY-MM-DD) */
export const kstDay = (iso: string | number) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
