"use client";

import { useState } from "react";
import { claimKind, claimKindLabel, claimStatusText, payoutStatusLabel, refundOpen, type A2UTransfer, type Order } from "@/lib/types";

export type OrderAction = (action: string, extra?: Record<string, string>) => Promise<void>;

function TransferInfo({ t }: { t?: A2UTransfer }) {
  if (!t) return null;
  return (
    <>
      {t.txid && <p className="break-all text-[11px] text-gray-500">송금 거래 ID {t.txid}</p>}
      {t.error && <p className="text-[11px] text-red-500">{t.error}</p>}
    </>
  );
}

/** P3: 판매대금 정산(A2U)·환불 상태와 구매자/판매자 액션 */
export default function OrderSettlement({ order, role, busy, act }: { order: Order; role: "buyer" | "seller"; busy: boolean; act: OrderAction }) {
  const [reason, setReason] = useState("");
  const [form, setForm] = useState(false);
  const [kind, setKind] = useState<"return" | "exchange">("return");
  const r = order.refund;
  const open = order.status === "paid" || order.status === "shipped";
  const btn = "tap rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60";
  if (order.status !== "completed" && !open && !r) return null;

  return (
    <section className="mt-2 space-y-2 bg-white px-4 py-4 text-sm">
      {order.status === "completed" && (
        <div className="space-y-1">
          <p className="flex justify-between">
            <span className="text-gray-500">판매대금 정산</span>
            <span className={`font-bold ${order.payout === "paid" ? "text-emerald-600" : order.payout === "failed" ? "text-red-500" : "text-gray-700"}`}>
              {payoutStatusLabel[order.payout]}
            </span>
          </p>
          {role === "seller" && order.payoutTransfer && (
            <p className="text-xs text-gray-500">
              정산 금액 π {order.payoutTransfer.amount}
              {order.platformFee ? ` (수수료 π ${order.platformFee} 차감)` : ""}
            </p>
          )}
          {role === "seller" && <TransferInfo t={order.payoutTransfer} />}
          {role === "seller" && order.payout !== "paid" && (
            <button type="button" disabled={busy} onClick={() => act("payout_retry")} className={`${btn} w-full bg-pi text-white`}>
              정산 다시 요청
            </button>
          )}
          {role === "buyer" && order.payout !== "paid" && <p className="text-[11px] text-gray-400">바로온다가 판매자 지갑으로 π를 보내드려요.</p>}
        </div>
      )}

      {r && r.status !== "withdrawn" && (
        <div className="space-y-1 rounded-lg bg-gray-50 p-3">
          <p className="flex justify-between">
            <span className="font-bold text-gray-900">{r.by === "seller" ? "판매자 판매 취소" : `${claimKindLabel[claimKind(r)]} 요청`}</span>
            <span className={`text-xs font-bold ${r.status === "refunded" || r.status === "exchanged" ? "text-emerald-600" : r.status === "failed" || r.status === "rejected" ? "text-red-500" : "text-amber-600"}`}>
              {claimStatusText(r)}
            </span>
          </p>
          <p className="text-xs text-gray-600">사유: {r.reason}</p>
          {r.rejectReason && <p className="text-xs text-gray-600">거절 사유: {r.rejectReason}</p>}
          {r.status === "exchanged" && <p className="text-xs text-gray-600">판매자가 교환을 승인했어요. 새 상품을 다시 보내면 송장이 바뀌어요.</p>}
          {r.status === "requested" && <p className="text-[11px] text-gray-400">요청을 처리하는 동안에는 자동 구매 확정이 멈춰요.</p>}
          {r.status === "refunded" && <p className="text-xs text-gray-600">π {r.transfer?.amount ?? order.amount}를 구매자 지갑으로 돌려드렸어요.</p>}
          {role === "seller" && <TransferInfo t={r.transfer} />}
          {role === "seller" && r.status === "requested" && (
            <div className="space-y-2 pt-1">
              <input
                aria-label="거절 사유"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                placeholder="거절 사유 (거절할 때만)"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <button type="button" disabled={busy} onClick={() => act("refund_reject", { reason })} className={`${btn} border border-gray-200 text-gray-700`}>
                  거절
                </button>
                <button type="button" disabled={busy} onClick={() => act("refund_approve")} className={`${btn} bg-pi text-white`}>
                  {claimKind(r) === "exchange" ? "교환 승인 (재발송)" : "승인하고 π 환불"}
                </button>
              </div>
            </div>
          )}
          {role === "seller" && (r.status === "failed" || r.status === "processing") && (
            <button type="button" disabled={busy} onClick={() => act("refund_retry")} className={`${btn} w-full bg-pi text-white`}>
              환불 송금 다시 시도
            </button>
          )}
          {role === "buyer" && r.status === "requested" && (
            <button type="button" disabled={busy} onClick={() => act("refund_withdraw")} className={`${btn} w-full border border-gray-200 text-gray-700`}>
              요청 철회
            </button>
          )}
        </div>
      )}

      {open && !refundOpen(order) && (
        <div>
          {!form ? (
            <button type="button" onClick={() => setForm(true)} className="tap w-full py-1 text-xs text-gray-500 underline">
              {role === "seller" ? "판매 취소하고 환불하기" : order.status === "paid" ? "주문 취소·환불 (발송 전 즉시 환불)" : "반품·교환 신청하기"}
            </button>
          ) : (
            <div className="space-y-2">
              {role === "buyer" && order.status === "shipped" && (
                <div role="radiogroup" aria-label="신청 종류" className="grid grid-cols-2 gap-2">
                  {(["return", "exchange"] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      role="radio"
                      aria-checked={kind === k}
                      onClick={() => setKind(k)}
                      className={`${btn} border ${kind === k ? "border-pi bg-pi/5 text-pi" : "border-gray-200 text-gray-600"}`}
                    >
                      {k === "return" ? "반품 (π 환불)" : "교환 (재발송)"}
                    </button>
                  ))}
                </div>
              )}
              <textarea
                aria-label="사유"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder={role === "seller" ? "취소 사유 (예: 재고 부족)" : order.status === "paid" ? "취소 사유 (예: 단순 변심)" : kind === "exchange" ? "교환 사유 (예: 사이즈가 맞지 않아요)" : "반품 사유 (예: 상품 하자)"}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none"
              />
              <button
                type="button"
                disabled={busy || (role === "buyer" && !reason.trim())}
                onClick={() => act(role === "seller" ? "seller_cancel" : "refund_request", order.status === "shipped" && role === "buyer" ? { reason, kind } : { reason })}
                className={`${btn} w-full bg-gray-800 text-white`}
              >
                {role === "seller" ? "판매 취소 · π 환불" : order.status === "paid" ? "취소하고 π 환불받기" : kind === "exchange" ? "교환 신청 보내기" : "반품 신청 보내기"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
