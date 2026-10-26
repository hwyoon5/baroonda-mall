import { requireAdmin } from "@/lib/server/admin";
import { listAllOrders } from "@/lib/server/db";
import { handle, json } from "@/lib/server/http";
import { feePercent, payoutBreakdown } from "@/lib/server/settlement";
import type { Order, OrderStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const round7 = (n: number) => Math.round(n * 1e7) / 1e7;
const sum = (os: Order[], f: (o: Order) => number) => round7(os.reduce((a, o) => a + f(o), 0));
/** 구매자 결제가 블록체인에서 완료된 주문 */
const SOLD: OrderStatus[] = ["paid", "shipped", "completed"];

function settle(os: Order[]) {
  const sold = os.filter((o) => SOLD.includes(o.status));
  const completed = sold.filter((o) => o.status === "completed");
  const net = (o: Order) => o.payoutTransfer?.amount ?? payoutBreakdown(o.amount).net;
  const fee = (o: Order) => o.platformFee ?? payoutBreakdown(o.amount).fee;
  return {
    orderCount: sold.length,
    grossSales: sum(sold, (o) => o.amount),
    escrow: sum(sold.filter((o) => o.status !== "completed"), (o) => o.amount),
    confirmedSales: sum(completed, (o) => o.amount),
    platformFee: sum(completed, fee),
    payoutPaid: sum(completed.filter((o) => o.payout === "paid"), net),
    payoutPending: sum(completed.filter((o) => o.payout !== "paid" && o.payout !== "failed"), net),
    payoutFailed: sum(completed.filter((o) => o.payout === "failed"), net),
    refunded: sum(os.filter((o) => o.status === "refunded"), (o) => o.amount),
  };
}

/** 관리자: 전체 Pi 주문·결제 상태와 정산 집계 */
export const GET = handle(async (req) => {
  requireAdmin(req);
  const orders = await listAllOrders();
  const bySeller = new Map<string, Order[]>();
  // 예시 상품은 실제 정산 계정(uid)이 같아도 화면의 판매자 이름이 달라서 이름까지 함께 묶는다.
  for (const o of orders) {
    const key = `${o.seller.uid}|${o.seller.username}`;
    bySeller.set(key, [...(bySeller.get(key) ?? []), o]);
  }
  const sellers = [...bySeller.values()]
    .map((os) => ({ key: `${os[0].seller.uid}|${os[0].seller.username}`, uid: os[0].seller.uid, username: os[0].seller.username, ...settle(os) }))
    .sort((a, b) => b.grossSales - a.grossSales);
  return json({ orders, summary: settle(orders), sellers, feePercent: feePercent() });
});
