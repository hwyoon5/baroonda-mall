"use client";

import { useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import { carriers, deliveryStage, deliveryStageLabel, isTrackingNumber, type Order } from "@/lib/types";

const STAGES = ["preparing", "shipping", "delivered"] as const;
type Stage = (typeof STAGES)[number];

/** 판매자·관리자용 배송 관리: 상품 준비중 / 배송중 / 배송 완료 + 택배사·송장번호 */
export default function DeliveryControl({ order, onSaved }: { order: Order; onSaved: (o: Order) => void }) {
  const { showToast } = useStore();
  const current = deliveryStage(order);
  const [stage, setStage] = useState<Stage | null>(current === "ready" ? null : current);
  const [carrier, setCarrier] = useState(order.fulfillment?.carrier ?? "");
  const [tracking, setTracking] = useState(order.fulfillment?.trackingNumber ?? "");
  const [busy, setBusy] = useState(false);

  const direct = order.fulfillment ? order.fulfillment.method === "direct" : !!order.pickup;
  const needsTracking = !direct && (stage === "shipping" || stage === "delivered");
  const trackingChanged = carrier !== (order.fulfillment?.carrier ?? "") || tracking.replace(/\s/g, "") !== (order.fulfillment?.trackingNumber ?? "");
  const changed = stage !== null && (stage !== current || (needsTracking && trackingChanged));
  const valid = !needsTracking || (!!carrier && isTrackingNumber(tracking));

  const save = async () => {
    if (!stage) return;
    setBusy(true);
    try {
      const r = await api<{ order: Order }>(`/api/orders/${order.id}`, {
        action: "delivery",
        stage,
        ...(direct ? { method: "direct" } : needsTracking ? { method: "delivery", carrier, trackingNumber: tracking } : {}),
      });
      onSaved(r.order);
      showToast(`배송 상태를 '${deliveryStageLabel[stage]}'(으)로 저장했어요.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2 rounded-xl bg-white p-4">
      <p className="text-sm font-bold text-gray-900">배송 관리</p>
      <div role="radiogroup" aria-label="배송 상태" className="grid grid-cols-3 gap-1.5">
        {STAGES.map((s) => (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={stage === s}
            disabled={s === "preparing" && order.status !== "paid"}
            onClick={() => setStage(s)}
            className={`tap rounded-lg border py-2 text-xs font-bold disabled:opacity-40 ${stage === s ? "border-pi bg-pi/5 text-pi ring-1 ring-pi" : "border-gray-200 text-gray-600"}`}
          >
            {deliveryStageLabel[s]}
          </button>
        ))}
      </div>
      {needsTracking && (
        <>
          <div className="flex gap-2">
            <select
              aria-label="택배사"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              className="shrink-0 rounded-lg border border-gray-200 px-2 py-2.5 text-sm text-gray-900 focus:border-pi focus:outline-none"
            >
              <option value="">택배사 선택</option>
              {carriers.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <input
              aria-label="송장번호"
              inputMode="numeric"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              maxLength={24}
              placeholder="송장번호 (숫자)"
              className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none"
            />
          </div>
          {tracking.trim() !== "" && !isTrackingNumber(tracking) && <p className="text-xs text-red-500">송장번호는 숫자와 - 로 8~20자 입력해 주세요.</p>}
        </>
      )}
      {direct && stage !== "preparing" && stage && <p className="text-xs text-gray-500">직거래 주문이라 송장 없이 전달 상태만 저장해요.</p>}
      <button
        type="button"
        disabled={busy || !changed || !valid}
        onClick={() => void save()}
        className="tap w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-50"
      >
        {busy ? "저장 중…" : "배송 상태 저장"}
      </button>
    </div>
  );
}
