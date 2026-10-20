"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import ListingThumb from "@/components/ListingThumb";
import PiPrice from "@/components/PiPrice";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useStore } from "@/components/store/StoreProvider";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import { timeAgo } from "@/lib/format";
import { listingKindLabel, listingStatusText, type Listing, type ListingStatus } from "@/lib/types";

const tabs: [ListingStatus, string][] = [
  ["selling", "판매중"],
  ["reserved", "거래중"],
  ["sold", "판매완료"],
  ["paused", "판매중지"],
  ["draft", "임시저장"],
];

export default function MyListingsPage() {
  return (
    <Suspense>
      <MyListings />
    </Suspense>
  );
}

function MyListings() {
  const initialTab = useSearchParams().get("tab");
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [mine, setMine] = useState<Listing[] | null>(null);
  const [tab, setTab] = useState<ListingStatus>(() => tabs.find(([k]) => k === initialTab)?.[0] ?? "selling");
  const [variantDraft, setVariantDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<string | null>(null);
  const [stockDraft, setStockDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    api<{ listings: Listing[] }>("/api/listings?seller=me")
      .then((r) => setMine(r.listings))
      .catch(() => setMine([]));
  }, [user]);

  const update = async (l: Listing, body: { status?: ListingStatus; stock?: number; variants?: { id: string; stock: number }[] }, done: string) => {
    setBusyId(l.id);
    try {
      const r = await api<{ listing: Listing }>(`/api/listings/${l.id}`, body, "PATCH");
      setMine((cur) => cur?.map((x) => (x.id === l.id ? r.listing : x)) ?? null);
      setEditing(null);
      showToast(done);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "처리하지 못했어요.");
    } finally {
      setBusyId(null);
    }
  };

  const list = mine?.filter((l) => l.status === tab) ?? [];
  const btn = "tap rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50";

  return (
    <>
      <SubHeader title="내 상품 관리" />
      {!ready ? null : !user ? (
        <LoginCard message="로그인하면 내가 등록한 상품을 관리할 수 있어요." />
      ) : (
        <>
          <div className="flex items-center justify-between bg-white px-4 pt-3">
            <Link href="/orders?tab=sales" className="tap text-xs font-medium text-gray-500">
              판매 내역 보기 ›
            </Link>
            <Link href="/sell" className="tap rounded-full bg-pi px-3 py-1.5 text-xs font-bold text-white">
              + 상품 등록
            </Link>
          </div>
          <div role="tablist" aria-label="상품 상태" className="grid grid-cols-5 border-b border-gray-100 bg-white">
            {tabs.map(([k, t]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`tap py-3 text-[11px] font-bold ${tab === k ? "border-b-2 border-pi text-pi" : "text-gray-400"}`}
              >
                {t} {mine ? mine.filter((l) => l.status === k).length : ""}
              </button>
            ))}
          </div>

          <ul className="bg-white px-4">
            {mine && list.length === 0 && <li className="py-16 text-center text-sm text-gray-500">해당하는 상품이 없어요.</li>}
            {list.map((l) => (
              <li key={l.id} className="flex gap-3 border-b border-gray-100 py-3">
                <Link href={l.status === "draft" ? `/sell?draft=${l.id}` : `/listings/${l.id}`} className="tap h-20 w-20 shrink-0 overflow-hidden rounded-xl">
                  <ListingThumb listing={l} className="h-full w-full" emojiClass="text-3xl" />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${l.condition === "new" ? "bg-pi text-white" : "bg-gray-100 text-gray-700"}`}>
                      {listingKindLabel[l.condition]}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {listingStatusText(l)} · {timeAgo(l.createdAt)}
                    </span>
                  </div>
                  <Link href={l.status === "draft" ? `/sell?draft=${l.id}` : `/listings/${l.id}`} className="mt-0.5 block truncate text-sm text-gray-900">
                    {l.title}
                  </Link>
                  <PiPrice value={l.pricePi} size="md" />
                  {l.condition === "new" && (
                    <p className="text-[11px] text-gray-500">
                      재고 {l.stock ?? 0}개{l.committed ? ` · 결제 확정 대기 ${l.committed}개` : ""} · 판매 {l.soldCount ?? 0}개{l.options?.length ? ` · 옵션 ${l.options.map((o) => o.name).join("/")}` : ""}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {l.status === "selling" && (
                      <button type="button" disabled={busyId === l.id} onClick={() => update(l, { status: "paused" }, "판매를 중지했어요.")} className={btn}>
                        판매 중지
                      </button>
                    )}
                    {l.status === "paused" && (
                      <button type="button" disabled={busyId === l.id} onClick={() => update(l, { status: "selling" }, "판매를 다시 시작했어요.")} className={btn}>
                        판매 재개
                      </button>
                    )}
                    {l.status === "draft" && (
                      <Link href={`/sell?draft=${l.id}`} className="tap rounded-lg bg-pi px-2.5 py-1.5 text-xs font-bold text-white">
                        이어서 작성
                      </Link>
                    )}
                    {l.condition === "new" && l.status !== "reserved" && l.status !== "draft" && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(l.id);
                          setStockDraft(String(l.stock ?? 0));
                          setVariantDraft(Object.fromEntries((l.variants ?? []).map((v) => [v.id, String(v.stock)])));
                        }}
                        className={btn}
                      >
                        재고 수정
                      </button>
                    )}
                    {l.status === "reserved" && (
                      <Link href="/orders?tab=sales" className={btn}>
                        거래 진행 보기
                      </Link>
                    )}
                  </div>
                  {editing === l.id && l.variants?.length ? (
                    <div className="mt-2 space-y-1.5 rounded-lg bg-gray-50 p-2">
                      {l.variants.map((v) => (
                        <label key={v.id} className="flex items-center gap-2 text-xs text-gray-700">
                          <span className="flex-1">{Object.values(v.options).join(" / ")}</span>
                          <input
                            aria-label={`${Object.values(v.options).join(" / ")} 재고`}
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={9999}
                            value={variantDraft[v.id] ?? ""}
                            onChange={(e) => setVariantDraft((cur) => ({ ...cur, [v.id]: e.target.value }))}
                            className="w-16 rounded-lg border border-gray-200 px-2 py-1 text-right text-sm focus:border-pi focus:outline-none"
                          />
                          개
                        </label>
                      ))}
                      <div className="flex justify-end gap-2 pt-1">
                        <button type="button" onClick={() => setEditing(null)} className="tap px-2 py-1.5 text-xs text-gray-500">
                          취소
                        </button>
                        <button
                          type="button"
                          disabled={busyId === l.id}
                          onClick={() =>
                            update(l, { variants: l.variants!.map((v) => ({ id: v.id, stock: Number(variantDraft[v.id]) })) }, "옵션별 재고를 수정했어요.")
                          }
                          className="tap rounded-lg bg-pi px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                        >
                          저장
                        </button>
                      </div>
                    </div>
                  ) : null}
                  {editing === l.id && !l.variants?.length && (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        aria-label="재고 수량"
                        type="number"
                        inputMode="numeric"
                        min={0}
                        max={9999}
                        value={stockDraft}
                        onChange={(e) => setStockDraft(e.target.value)}
                        className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-sm focus:border-pi focus:outline-none"
                      />
                      <button
                        type="button"
                        disabled={busyId === l.id}
                        onClick={() => update(l, { stock: Number(stockDraft) }, "재고를 수정했어요.")}
                        className="tap rounded-lg bg-pi px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        저장
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="tap px-2 py-1.5 text-xs text-gray-500">
                        취소
                      </button>
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
