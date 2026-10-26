"use client";

import { useState } from "react";
import AdminShell, { useAdminApi } from "@/components/admin/AdminShell";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import { businessReviewLabel, formatBizRegNo, type BusinessReviewStatus, type SellerBusiness } from "@/lib/business";

type Seller = { uid: string; username: string; status: BusinessReviewStatus; sellingCount: number; business: SellerBusiness };
const TABS: [BusinessReviewStatus | "all", string][] = [
  ["pending", "승인 대기"],
  ["approved", "승인 완료"],
  ["rejected", "반려"],
  ["all", "전체"],
];
const BADGE: Record<BusinessReviewStatus, string> = { pending: "bg-amber-50 text-amber-700", approved: "bg-emerald-50 text-emerald-700", rejected: "bg-rose-50 text-rose-600" };
const when = (iso?: string) => (iso ? new Date(iso).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

/** 관리자: 판매자 사업자 정보·서류 확인 후 승인/반려. 승인된 판매자만 새 상품을 게시·판매할 수 있다. */
export default function AdminSellersPage() {
  const { data, setData, error } = useAdminApi<{ sellers: Seller[] }>("/api/admin/sellers");
  const [tab, setTab] = useState<BusinessReviewStatus | "all">("pending");
  const list = data?.sellers.filter((s) => tab === "all" || s.status === tab) ?? [];
  const update = (uid: string, business: SellerBusiness) =>
    setData((d) => d && { sellers: d.sellers.map((s) => (s.uid === uid ? { ...s, business, status: business.review?.status ?? "approved" } : s)) });

  return (
    <AdminShell title="판매자 승인" error={error} loading={!data}>
      {data && (
        <>
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto bg-white px-4 py-3">
            {TABS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs ${tab === id ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`}
              >
                {label} {id === "all" ? data.sellers.length : data.sellers.filter((s) => s.status === id).length}
              </button>
            ))}
          </div>
          <p className="px-4 pb-2 text-[11px] text-gray-400">승인 대기·반려 판매자는 새 상품을 게시할 수 없고, 이미 올린 새 상품도 승인 전까지 구매할 수 없어요. 판매자가 상호·대표자·사업자번호·서류·정산 지갑을 바꾸면 다시 승인 대기가 돼요.</p>
          {list.length === 0 ? (
            <p className="p-10 text-center text-sm text-gray-400">해당하는 판매자가 없어요.</p>
          ) : (
            <ul className="space-y-2">
              {list.map((s) => (
                <SellerCard key={s.uid + (s.business.review?.reviewedAt ?? "")} seller={s} onSaved={(b) => update(s.uid, b)} />
              ))}
            </ul>
          )}
        </>
      )}
    </AdminShell>
  );
}

function SellerCard({ seller: s, onSaved }: { seller: Seller; onSaved: (b: SellerBusiness) => void }) {
  const { showToast } = useStore();
  const b = s.business;
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const act = async (action: "approve" | "reject") => {
    setBusy(true);
    try {
      const r = await api<{ business: SellerBusiness }>(`/api/admin/sellers/${encodeURIComponent(s.uid)}`, { action, reason });
      onSaved(r.business);
      showToast(action === "approve" ? `${b.bizName} 승인했어요.` : `${b.bizName} 반려했어요.`);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };
  const rows: [string, string | undefined][] = [
    ["대표자", b.ownerName],
    ["사업자등록번호", formatBizRegNo(b.bizRegNo)],
    ["통신판매업", b.mailOrderExempt ? "신고 면제" : b.mailOrderNo],
    ["주소", b.address],
    ["전화", b.phone],
    ["이메일", b.email],
    ["정산 지갑", b.piWallet ? `${b.piWallet.slice(0, 6)}…${b.piWallet.slice(-6)}` : undefined],
  ];
  return (
    <li className="bg-white px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <b className="block truncate text-sm text-gray-900">{b.bizName}</b>
          <span className="block text-[11px] text-gray-500">
            Pi @{s.username} · 판매중 새 상품 {s.sellingCount}개
          </span>
          <span className="block text-[11px] text-gray-400">제출 {when(b.review?.submittedAt ?? b.updatedAt)}</span>
        </span>
        <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold ${BADGE[s.status]}`}>{businessReviewLabel[s.status]}</span>
      </div>
      <dl className="mt-2 grid grid-cols-[88px_1fr] gap-x-2 gap-y-0.5 text-[11px]">
        {rows
          .filter((r): r is [string, string] => !!r[1])
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-gray-400">{k}</dt>
              <dd className="break-all text-gray-700">{v}</dd>
            </div>
          ))}
      </dl>
      <div className="mt-2 flex gap-2">
        {(
          [
            ["사업자등록증", b.bizRegDoc],
            ["통신판매업 신고증", b.mailOrderDoc],
          ] as const
        ).map(([label, src]) =>
          src ? (
            <a key={label} href={src} target="_blank" rel="noopener noreferrer" className="tap block w-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={label} className="h-20 w-24 rounded-lg border border-gray-100 object-cover" />
              <span className="mt-0.5 block text-center text-[10px] text-gray-500">{label}</span>
            </a>
          ) : null,
        )}
      </div>
      {s.status === "rejected" && b.review?.reason && <p className="mt-2 rounded-lg bg-rose-50 p-2 text-[11px] text-rose-700">반려 사유: {b.review.reason}</p>}
      {b.review?.reviewedAt && (
        <p className="mt-1 text-[10px] text-gray-400">
          {when(b.review.reviewedAt)} {b.review.reviewedBy} 처리
        </p>
      )}
      {rejecting ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            rows={2}
            placeholder="반려 사유 (판매자에게 그대로 보여요)"
            className="w-full resize-none rounded-lg border border-gray-200 p-2 text-xs outline-none focus:border-pi"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setRejecting(false)} className="tap flex-1 rounded-lg border border-gray-200 py-2 text-xs font-bold text-gray-600">
              취소
            </button>
            <button type="button" disabled={busy || reason.trim().length < 2} onClick={() => void act("reject")} className="tap flex-1 rounded-lg bg-rose-500 py-2 text-xs font-bold text-white disabled:opacity-40">
              반려하기
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex gap-2">
          {s.status !== "rejected" && (
            <button type="button" disabled={busy} onClick={() => setRejecting(true)} className="tap flex-1 rounded-lg border border-rose-200 py-2 text-xs font-bold text-rose-600">
              {s.status === "approved" ? "승인 취소(반려)" : "반려"}
            </button>
          )}
          {s.status !== "approved" && (
            <button type="button" disabled={busy} onClick={() => void act("approve")} className="tap flex-1 rounded-lg bg-pi py-2 text-xs font-bold text-white disabled:opacity-40">
              승인
            </button>
          )}
        </div>
      )}
    </li>
  );
}
