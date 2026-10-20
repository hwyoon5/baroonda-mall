"use client";

import { useEffect, useState } from "react";
import OrderRow from "@/components/OrderRow";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import type { Order } from "@/lib/types";

type Tab = "purchases" | "sales";

export default function OrdersPage() {
  const { user, ready } = useAuth();
  // 마이페이지의 '판매 내역'은 /orders?tab=sales 로 들어온다(로그인 확인 후 클라이언트에서만 렌더링).
  const [tab, setTab] = useState<Tab>(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tab") === "sales" ? "sales" : "purchases",
  );
  const [data, setData] = useState<Record<Tab, Order[]> | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api<Record<Tab, Order[]>>("/api/orders")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [user]);

  const list = data?.[tab] ?? [];
  return (
    <>
      <SubHeader title="거래내역" back={false} />
      {!ready ? null : !user ? (
        <LoginCard message="로그인하면 구매·판매 내역을 볼 수 있어요." />
      ) : (
        <section className="bg-white px-4">
          <div role="tablist" className="grid grid-cols-2 border-b border-gray-100">
            {(
              [
                ["purchases", "구매내역"],
                ["sales", "판매내역"],
              ] as const
            ).map(([k, t]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`tap py-3 text-sm font-bold ${tab === k ? "border-b-2 border-pi text-pi" : "text-gray-400"}`}
              >
                {t} {data ? data[k].length : ""}
              </button>
            ))}
          </div>
          {error && <p className="py-6 text-center text-sm text-red-500">{error}</p>}
          {data && list.length === 0 && <p className="py-16 text-center text-sm text-gray-500">아직 {tab === "purchases" ? "구매" : "판매"} 내역이 없어요.</p>}
          <ul>
            {list.map((o) => (
              <OrderRow key={o.id} order={o} role={tab === "purchases" ? "buyer" : "seller"} />
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
