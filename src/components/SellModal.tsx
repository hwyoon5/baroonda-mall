"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { currentUser, p2pCategories, type P2PListing, type TradeMethod } from "@/data/p2p";

const MAX_PHOTOS = 5;

type Photo = { id: string; url: string };

export default function SellModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (listing: P2PListing) => void;
}) {
  const formId = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [methods, setMethods] = useState<TradeMethod[]>(["direct"]);
  const [meetingPlace, setMeetingPlace] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    titleRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const priceNum = Number(price);
  const valid = title.trim().length > 0 && category !== "" && price !== "" && priceNum >= 0 && methods.length > 0;

  const reset = () => {
    setPhotos([]);
    setTitle("");
    setCategory("");
    setPrice("");
    setNegotiable(false);
    setMethods(["direct"]);
    setMeetingPlace("");
    setDescription("");
  };

  const toggleMethod = (m: TradeMethod) =>
    setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const next = Array.from(files)
      .slice(0, MAX_PHOTOS - photos.length)
      .map((f) => ({ id: `${f.name}-${f.lastModified}-${Math.random()}`, url: URL.createObjectURL(f) }));
    setPhotos((cur) => [...cur, ...next]);
  };

  const removePhoto = (id: string) =>
    setPhotos((cur) => {
      const target = cur.find((p) => p.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return cur.filter((p) => p.id !== id);
    });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    onSubmit({
      id: `u-${Date.now()}`,
      title: title.trim(),
      category,
      pricePi: priceNum,
      negotiable,
      tradeMethods: methods,
      meetingPlace: methods.includes("direct") ? meetingPlace.trim() || undefined : undefined,
      description: description.trim(),
      imageUrl: photos[0]?.url,
      emoji: "📦",
      bg: "bg-violet-50",
      seller: currentUser,
      minutesAgo: 0,
      chats: 0,
      likes: 0,
      status: "selling",
    });
    reset();
    onClose();
  };

  const label = "mb-1.5 block text-sm font-bold text-gray-900";
  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none";

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 animate-fade-in bg-black/50" onClick={onClose} aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${formId}-title`}
        className="relative flex max-h-[92dvh] w-full max-w-md animate-sheet-up flex-col rounded-t-2xl bg-white"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <button type="button" onClick={onClose} aria-label="닫기" className="-ml-1 p-1 text-gray-700">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          <h2 id={`${formId}-title`} className="text-base font-extrabold text-gray-900">
            내 물건 판매하기
          </h2>
          <button type="button" onClick={reset} className="text-sm font-medium text-gray-400">
            초기화
          </button>
        </div>

        <form id={formId} onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-4 py-4">
          <div>
            <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
              {photos.length < MAX_PHOTOS && (
                <label className="relative flex h-20 w-20 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400">
                  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
                    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                    <circle cx="12" cy="13" r="3.5" />
                  </svg>
                  <span className="text-[11px] font-medium">
                    {photos.length}/{MAX_PHOTOS}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      addPhotos(e.target.files);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
              {photos.map((p, i) => (
                <div key={p.id} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url} alt={`상품 사진 ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && (
                    <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-bold text-white">
                      대표사진
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removePhoto(p.id)}
                    aria-label="사진 삭제"
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor={`${formId}-name`} className={label}>
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              id={`${formId}-name`}
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={40}
              placeholder="예) 아이폰 15 128GB 블루"
              className={input}
            />
          </div>

          <fieldset>
            <legend className={label}>
              카테고리 <span className="text-red-500">*</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {p2pCategories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    category === c ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${formId}-price`} className={label}>
              판매 가격 <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-pi">
              <span className="text-base font-black text-pi">π</span>
              <input
                id={`${formId}-price`}
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full bg-transparent px-2 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none"
              />
            </div>
            <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={negotiable}
                onChange={(e) => setNegotiable(e.target.checked)}
                className="h-4 w-4 accent-pi"
              />
              가격 제안 받기
            </label>
          </div>

          <fieldset>
            <legend className={label}>
              거래 방식 <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-gray-400">(중복 선택 가능)</span>
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { m: "direct", title: "직거래", desc: "만나서 거래해요" },
                  { m: "delivery", title: "택배", desc: "택배로 보내드려요" },
                ] as const
              ).map(({ m, title: t, desc }) => {
                const on = methods.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMethod(m)}
                    aria-pressed={on}
                    className={`rounded-xl border px-3 py-2.5 text-left ${
                      on ? "border-pi bg-pi/5 ring-1 ring-pi" : "border-gray-200"
                    }`}
                  >
                    <span className={`block text-sm font-bold ${on ? "text-pi" : "text-gray-800"}`}>{t}</span>
                    <span className="text-[11px] text-gray-500">{desc}</span>
                  </button>
                );
              })}
            </div>
            {methods.length === 0 && <p className="mt-1.5 text-xs text-red-500">거래 방식을 하나 이상 선택해 주세요.</p>}
          </fieldset>

          {methods.includes("direct") && (
            <div>
              <label htmlFor={`${formId}-place`} className={label}>
                직거래 희망 장소
              </label>
              <input
                id={`${formId}-place`}
                value={meetingPlace}
                onChange={(e) => setMeetingPlace(e.target.value)}
                placeholder="예) 강남역 11번 출구"
                className={input}
              />
            </div>
          )}

          <div>
            <label htmlFor={`${formId}-desc`} className={label}>
              자세한 설명
            </label>
            <textarea
              id={`${formId}-desc`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              placeholder="구매 시기, 사용감, 하자 여부 등을 적어주세요. 파이 결제는 바로온다 안전결제로 진행돼요."
              className={`${input} resize-none`}
            />
          </div>
        </form>

        <div className="border-t border-gray-100 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
          <button
            type="submit"
            form={formId}
            disabled={!valid}
            className="w-full rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
          >
            작성 완료
          </button>
        </div>
      </div>
    </div>
  );
}
