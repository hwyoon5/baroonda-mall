"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import OrderRow from "@/components/OrderRow";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import type { Order } from "@/lib/types";

type Tab = "purchases" | "sales";

export default function OrdersPage() {
  return (
    <Suspense>
      <Orders />
    </Suspense>
  );
}

/** 탭은 URL(?tab=sales)로 관리해서 마이페이지의 '판매 내역' 링크로 바로 판매 탭을 연다. */
function Orders() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const tab: Tab = useSearchParams().get("tab") === "sales" ? "sales" : "purchases";
  const setTab = (t: Tab) => router.replace(t === "sales" ? "/orders?tab=sales" : "/orders", { scroll: false });
  const [data, setData] = useState<Record<Tab, Order[]> | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api<Record<Tab, Order[]>>("/api/orders")
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (user) load();
  }, [user, load]);
  useLiveRefresh(load, !!user);

  const list = data?.[tab] ?? [];
  return (
    <>
      <SubHeader title="구매·판매 내역" />
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
