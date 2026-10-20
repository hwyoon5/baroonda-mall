"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/components/store/StoreProvider";
import { api } from "@/lib/client/api";
import type { Review } from "@/lib/types";

/** 구매 확정 후 거래 후기 (당근식 별점 + 한 줄 후기, 주문당 1회) */
export default function ReviewBox({ orderId, canWrite }: { orderId: string; canWrite: boolean }) {
  const { showToast } = useStore();
  const [review, setReview] = useState<Review | null | undefined>(undefined);
  const [rating, setRating] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ review: Review | null }>(`/api/orders/${orderId}/review`)
      .then((r) => setReview(r.review))
      .catch(() => setReview(null));
  }, [orderId]);

  if (review === undefined || (!review && !canWrite)) return null;

  if (review)
    return (
      <section className="mx-4 rounded-xl bg-white p-4">
        <p className="text-sm font-bold text-gray-900">거래 후기</p>
        <p className="mt-1 text-amber-500">{"★".repeat(review.rating)}<span className="text-gray-300">{"★".repeat(5 - review.rating)}</span></p>
        {review.text && <p className="mt-1 whitespace-pre-line text-sm text-gray-700">{review.text}</p>}
      </section>
    );

  const submit = async () => {
    setBusy(true);
    try {
      const r = await api<{ review: Review }>(`/api/orders/${orderId}/review`, { rating, text });
      setReview(r.review);
      showToast("후기를 남겼어요. 고마워요!");
    } catch (e) {
      showToast(e instanceof Error ? e.message : "후기를 저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mx-4 rounded-xl bg-white p-4">
      <p className="text-sm font-bold text-gray-900">거래는 어떠셨나요?</p>
      <div className="mt-2 flex gap-1" role="radiogroup" aria-label="별점">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n}점`} onClick={() => setRating(n)} className={`tap text-2xl ${n <= rating ? "text-amber-500" : "text-gray-300"}`}>
            ★
          </button>
        ))}
      </div>
      <textarea
        aria-label="후기 내용"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={500}
        rows={3}
        placeholder="판매자에게 따뜻한 한마디를 남겨 주세요 (선택)"
        className="mt-2 w-full rounded-lg border border-gray-200 p-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
      />
      <button type="button" disabled={!rating || busy} onClick={() => void submit()} className="tap mt-2 w-full rounded-xl bg-pi py-3 text-sm font-bold text-white disabled:opacity-40">
        후기 남기기
      </button>
    </section>
  );
}
