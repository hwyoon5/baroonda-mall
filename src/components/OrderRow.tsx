import Link from "next/link";
import { timeAgo } from "@/lib/format";
import type { Order } from "@/lib/types";
import OrderStatusBadge from "./OrderStatusBadge";
import PiPrice from "./PiPrice";

export default function OrderRow({ order, role }: { order: Order; role: "buyer" | "seller" }) {
  return (
    <li>
      <Link href={`/orders/${order.id}`} className="tap flex items-center gap-3 border-b border-gray-100 py-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-2xl">{order.listingThumb ?? "📦"}</span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <span className="text-[11px] text-gray-400">{timeAgo(order.createdAt)}</span>
          </div>
          <p className="mt-1 truncate text-sm text-gray-800">{order.listingTitle}</p>
          <p className="text-[11px] text-gray-500">{role === "buyer" ? `판매자 ${order.seller.username}` : `구매자 ${order.buyer.username}`}</p>
        </div>
        <PiPrice value={order.amount} size="md" />
      </Link>
    </li>
  );
}
