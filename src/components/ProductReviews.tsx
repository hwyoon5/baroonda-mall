"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/client/api";
import { formatOption } from "@/lib/format";

type ReviewItem = { id: string; rating: number; text: string; option?: Record<string, string>; createdAt: string; buyer: string; mine: boolean };
type ReviewData = {
  count: number;
  average: number;
  distribution: number[];
  reviews: ReviewItem[];
  writable: { orderId: string; option?: Record<string, string> } | null;
  purchase: "none" | "waiting" | "reviewed" | null;
};

const PAGE = 5;

function Stars({ value, className = "" }: { value: number; className?: string }) {
  const full = Math.round(value);
  return (
    <span className={`text-amber-500 ${className}`} aria-label={`별점 ${value}점`}>
      {"★".repeat(full)}
      <span className="text-gray-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}

/** 상품 상세: 평균 별점·별점 분포·후기 목록, 배송 완료/구매 확정한 구매자의 후기 작성 */
export default function ProductReviews({ listingId }: { listingId: string }) {
  const { user, ready } = useAuth();
  const { showToast } = useStore();
  const [data, setData] = useState<ReviewData | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api<ReviewData>(`/api/listings/${listingId}/reviews`)
      .then(setData)
      .catch(() => setData(null));
  }, [listingId]);

  useEffect(() => {
    if (ready) load();
  }, [ready, user, load]);

  const submit = async () => {
    if (!data?.writable) return;
    setBusy(true);
    try {
      await api(`/api/orders/${data.writable.orderId}/review`, { rating, text });
      setRating(0);
      setText("");
      showToast("후기를 등록했어요. 고마워요!");
      load();
    } catch (e) {
      showToast(e instanceof Error ? e.message : "후기를 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="reviews" aria-label="구매 후기" className="mt-2 scroll-mt-14 bg-white px-4 py-4">
      <h2 className="text-sm font-bold text-gray-900">
        구매 후기 <span className="text-pi">{data?.count ?? 0}</span>
      </h2>

      {data && data.count > 0 && (
        <div className="mt-3 flex items-center gap-4 rounded-xl bg-gray-50 p-3">
          <div className="w-20 shrink-0 text-center">
            <p className="text-3xl font-black text-gray-900">{data.average.toFixed(1)}</p>
            <Stars value={data.average} className="text-sm" />
          </div>
          <ul className="min-w-0 flex-1 space-y-0.5">
            {data.distribution.map((n, i) => (
              <li key={i} className="flex items-center gap-2 text-[11px] text-gray-500">
                <span className="w-6 shrink-0">{5 - i}점</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-200">
                  <span className="block h-full rounded-full bg-amber-400" style={{ width: `${(n / data.count) * 100}%` }} />
                </span>
                <span className="w-5 shrink-0 text-right tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data?.writable ? (
        <div className="mt-3 rounded-xl border border-pi/30 bg-pi/5 p-3">
          <p className="text-sm font-bold text-gray-900">구매하신 상품은 어떠셨나요?</p>
          {data.writable.option && <p className="text-[11px] text-gray-500">{formatOption(data.writable.option)}</p>}
          <div className="mt-2 flex gap-1" role="radiogroup" aria-label="별점 선택">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n}점`}
                onClick={() => setRating(n)}
                className={`tap text-3xl leading-none ${n <= rating ? "text-amber-500" : "text-gray-300"}`}
              >
                ★
              </button>
            ))}
            {rating > 0 && <span className="ml-1 self-center text-xs font-bold text-amber-600">{rating}점</span>}
          </div>
          <textarea
            aria-label="후기 내용"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="상품 품질, 배송, 포장 등 솔직한 후기를 남겨 주세요 (선택, 500자)"
            className="mt-2 w-full rounded-lg border border-gray-200 bg-white p-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none"
          />
          <button type="button" disabled={!rating || busy} onClick={() => void submit()} className="tap mt-1 w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-40">
            {busy ? "등록 중…" : "후기 등록"}
          </button>
        </div>
      ) : (
        ready && (
          <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-[11px] text-gray-500">
            {!user ? (
              <>
                구매하신 분은 <Link href="/my" className="font-bold text-pi">로그인</Link> 후 후기를 남길 수 있어요.
              </>
            ) : data?.purchase === "waiting" ? (
              "배송 완료 또는 구매 확정 후에 후기를 남길 수 있어요."
            ) : data?.purchase === "reviewed" ? (
              "이 상품에 후기를 남겨 주셔서 고마워요."
            ) : (
              "이 상품을 구매하신 분만 후기를 남길 수 있어요."
            )}
          </p>
        )
      )}

      {data && data.count === 0 && <p className="py-6 text-center text-xs text-gray-400">아직 후기가 없어요. 첫 후기를 남겨 주세요.</p>}

      {data && data.count > 0 && (
        <ul className="mt-2 divide-y divide-gray-100">
          {data.reviews.slice(0, shown).map((r) => (
            <li key={r.id} className="py-3">
              <div className="flex items-center gap-2 text-[11px] text-gray-500">
                <Stars value={r.rating} className="text-xs" />
                <span className="font-bold text-gray-700">{r.buyer}</span>
                {r.mine && <span className="rounded bg-pi/10 px-1 text-[10px] font-bold text-pi">내 후기</span>}
                <span className="ml-auto text-gray-400">{new Date(r.createdAt).toLocaleDateString("ko-KR")}</span>
              </div>
              {r.option && <p className="mt-0.5 text-[11px] text-gray-400">{formatOption(r.option)}</p>}
              {r.text && <p className="mt-1 whitespace-pre-line break-words text-sm text-gray-800">{r.text}</p>}
            </li>
          ))}
        </ul>
      )}
      {data && data.count > shown && (
        <button type="button" onClick={() => setShown((n) => n + PAGE)} className="tap mt-1 w-full rounded-lg border border-gray-200 py-2 text-xs text-gray-600">
          후기 더보기 ({data.count - shown})
        </button>
      )}
    </section>
  );
}
