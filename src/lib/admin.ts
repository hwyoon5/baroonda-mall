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

const round7 = (n: number) => Math.round(n * 1e7) / 1e7;
/** 한국 시간 날짜(YYYY-MM-DD) */
export const kstDay = (iso: string | number) => new Date(new Date(iso).getTime() + 9 * 3600_000).toISOString().slice(0, 10);
const PAID = ["paid", "shipped", "completed", "refunded"];

/** 최근 n일 일별: 결제 주문 수·결제액(주문일 기준), 구매 확정 매출(확정일 기준) */
export function dailyStats(orders: Order[], days = 14, now = Date.now()) {
  const rows = Array.from({ length: days }, (_, i) => ({ day: kstDay(now - (days - 1 - i) * 86_400_000), orders: 0, paid: 0, confirmed: 0 }));
  const at = new Map(rows.map((r) => [r.day, r]));
  for (const o of orders) {
    const r = PAID.includes(o.status) ? at.get(kstDay(o.createdAt)) : undefined;
    if (r) {
      r.orders++;
      r.paid = round7(r.paid + o.amount);
    }
    const c = o.status === "completed" && o.confirmedAt ? at.get(kstDay(o.confirmedAt)) : undefined;
    if (c) c.confirmed = round7(c.confirmed + o.amount);
  }
  return rows;
}

/** 운영 지표: 평균 결제액, 구매 확정률, 반품·환불률 */
export function orderMetrics(orders: Order[]) {
  const paid = orders.filter((o) => PAID.includes(o.status));
  const done = paid.filter((o) => o.status === "completed").length;
  const refunded = paid.filter((o) => o.status === "refunded").length;
  const pct = (n: number) => (paid.length ? Math.round((n / paid.length) * 1000) / 10 : 0);
  return {
    paidCount: paid.length,
    avgAmount: paid.length ? round7(paid.reduce((a, o) => a + o.amount, 0) / paid.length) : 0,
    confirmRate: pct(done),
    refundRate: pct(refunded),
  };
}
