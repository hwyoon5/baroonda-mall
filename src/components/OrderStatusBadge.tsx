import { deliveryStage, orderStageLabel, type DeliveryStage, type Order, type OrderStatus } from "@/lib/types";

const styles: Record<OrderStatus, string> = {
  created: "bg-gray-100 text-gray-500",
  approved: "bg-amber-50 text-amber-700",
  paid: "bg-violet-50 text-pi",
  shipped: "bg-sky-50 text-sky-700",
  completed: "bg-emerald-50 text-emerald-700",
  cancelled: "bg-gray-100 text-gray-400",
  refunded: "bg-rose-50 text-rose-600",
};
const stageStyles: Partial<Record<DeliveryStage, string>> = {
  preparing: "bg-amber-50 text-amber-700",
  delivered: "bg-teal-50 text-teal-700",
};

export default function OrderStatusBadge({ order }: { order: Order }) {
  const stage = deliveryStage(order);
  const style = (stage && stageStyles[stage]) ?? styles[order.status];
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${style}`}>{orderStageLabel(order)}</span>;
}
