"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { listingCategories } from "@/lib/categories";
import { usageGradeLabel, type Condition, type Listing, type TradeMethod, type UsageGrade } from "@/lib/types";
import { useStore } from "./store/StoreProvider";

const MAX_PHOTOS = 3;
const MAX_OPTIONS = 3;
const MAX_VARIANTS = 50;

const comboKey = (c: Record<string, string>) => JSON.stringify(c);
/** Shopify처럼 옵션 값의 모든 조합(variant)을 만든다. 서버(listing-input.ts)와 같은 순서 */
const cartesian = (opts: { name: string; values: string[] }[]) =>
  opts.reduce<Record<string, string>[]>((acc, o) => acc.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v }))), [{}]);

type OptionDraft = { name: string; values: string };

/** 카테고리별 기본 옵션(새 상품): 첫 옵션 추가 시 채워 넣는다. */
const optionPreset: Record<string, OptionDraft> = {
  fashion: { name: "사이즈", values: "S, M, L, XL" },
  fresh: { name: "중량", values: "1kg, 2kg, 5kg" },
  beauty: { name: "용량", values: "30ml, 50ml" },
  digital: { name: "색상", values: "블랙, 화이트" },
  baby: { name: "연령", values: "0~12개월, 1~3세" },
  sports: { name: "사이즈", values: "S, M, L" },
  pet: { name: "중량", values: "500g, 1kg" },
};
const defaultPreset: OptionDraft = { name: "색상", values: "블랙, 화이트" };

const saleKinds = [
  { v: "used", t: "개인 중고", d: "내가 쓰던 물건 1개" },
  { v: "new", t: "새 상품(정식 판매)", d: "재고·옵션이 있는 새 상품" },
] as const;

/** 서버 저장 용량을 줄이려고 긴 변 720px JPEG로 줄여 data URL로 만든다. */
async function compressImage(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, 720 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function SellForm({ draftId }: { draftId?: string }) {
  const id = useId();
  const router = useRouter();
  const { showToast } = useStore();
  const [photos, setPhotos] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<Condition>("used");
  const [usageGrade, setUsageGrade] = useState<UsageGrade>("A");
  const [usageNote, setUsageNote] = useState("");
  const [stock, setStock] = useState("10");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variantStock, setVariantStock] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(draftId));

  // 임시저장한 상품 이어서 작성
  useEffect(() => {
    if (!draftId) return;
    api<{ listing: Listing }>(`/api/listings/${draftId}`)
      .then(({ listing: l }) => {
        setKind(l.condition);
        setTitle(l.title);
        setCategory(l.category);
        setPrice(l.pricePi ? String(l.pricePi) : "");
        setOriginalPrice(l.originalPricePi ? String(l.originalPricePi) : "");
        setNegotiable(l.negotiable);
        setMethods(l.tradeMethods);
        setFastShipping(l.fastShipping);
        setMeetingPlace(l.meetingPlace ?? "");
        setLocation(l.location ?? "");
        setDescription(l.description);
        setPhotos(l.images);
        if (l.usageGrade) setUsageGrade(l.usageGrade);
        setUsageNote(l.usageNote ?? "");
        if (l.stock) setStock(String(l.stock));
        setOptions((l.options ?? []).map((o) => ({ name: o.name, values: o.values.join(", ") })));
        setVariantStock(Object.fromEntries((l.variants ?? []).map((v) => [comboKey(v.options), String(v.stock)])));
      })
      .catch((e) => setError(e instanceof Error ? e.message : "임시저장 상품을 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [draftId]);
  const [price, setPrice] = useState("");
  const [originalPrice, setOriginalPrice] = useState("");
  const [negotiable, setNegotiable] = useState(false);
  const [methods, setMethods] = useState<TradeMethod[]>(["delivery"]);
  const [fastShipping, setFastShipping] = useState(false);
  const [meetingPlace, setMeetingPlace] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const priceNum = Number(price);
  const isNew = kind === "new";
  const preset = optionPreset[category] ?? defaultPreset;
  const parsedOptions = options
    .map((o) => ({ name: o.name.trim(), values: [...new Set(o.values.split(",").map((v) => v.trim()).filter(Boolean))] }))
    .filter((o) => o.name || o.values.length);
  const optionsValid = parsedOptions.every((o) => o.name && o.values.length > 0);
  const combos = isNew && optionsValid && parsedOptions.length ? cartesian(parsedOptions) : [];
  const variantTotal = combos.reduce((sum, c) => sum + (Number(variantStock[comboKey(c)]) || 0), 0);
  const stockNum = Number(stock);
  const stockValid = Number.isInteger(stockNum) && stockNum >= 1 && stockNum <= 9999;
  const valid =
    title.trim() !== "" && category !== "" && price !== "" && priceNum > 0 && methods.length > 0 && (!isNew || (optionsValid && (combos.length ? variantTotal >= 1 && combos.length <= MAX_VARIANTS : stockValid)));
  const updateOption = (i: number, patch: Partial<OptionDraft>) => setOptions((cur) => cur.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const toggleMethod = (m: TradeMethod) => setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const addPhotos = async (files: FileList | null) => {
    if (!files) return;
    const picked = Array.from(files).slice(0, MAX_PHOTOS - photos.length);
    try {
      const urls = await Promise.all(picked.map(compressImage));
      setPhotos((cur) => [...cur, ...urls].slice(0, MAX_PHOTOS));
    } catch {
      showToast("사진을 불러오지 못했어요.");
    }
  };

  const save = async (draft: boolean) => {
    if (busy || (draft ? !title.trim() : !valid)) return;
    setBusy(true);
    setError("");
    try {
      const body = {
        draft,
        title,
        category,
        condition: kind,
        pricePi: priceNum,
        ...(isNew
          ? {
              stock: stockNum,
              options: parsedOptions,
              variants: combos.map((c) => ({ options: c, stock: Number(variantStock[comboKey(c)]) || 0 })),
              originalPricePi: originalPrice ? Number(originalPrice) : null,
            }
          : { usageGrade, usageNote, negotiable }),
        tradeMethods: methods,
        fastShipping,
        meetingPlace,
        location,
        description,
        images: photos,
      };
      const { listing } = draftId
        ? await api<{ listing: Listing }>(`/api/listings/${draftId}`, body, "PUT")
        : await api<{ listing: Listing }>("/api/listings", body);
      if (draft) {
        showToast("임시저장했어요. 내 상품 관리에서 이어서 쓸 수 있어요.");
        router.replace("/my/listings?tab=draft");
      } else {
        showToast("판매글이 등록됐어요!");
        router.replace(`/listings/${listing.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했어요.");
      setBusy(false);
    }
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    void save(false);
  };
  const label = "mb-1.5 block text-sm font-bold text-gray-900";
  const field = "rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none";
  const input =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none";
  const chip = (on: boolean) =>
    `tap rounded-full border px-3 py-1.5 text-xs font-medium ${on ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`;

  return (
    <form onSubmit={submit} className="space-y-5 bg-white px-4 py-4">
      <div role="tablist" aria-label="판매 유형" className="grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        {saleKinds.map((k) => {
          const on = kind === k.v;
          return (
            <button
              key={k.v}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setKind(k.v)}
              className={`tap rounded-lg px-2 py-2 text-center ${on ? "bg-white shadow-sm ring-1 ring-pi/30" : ""}`}
            >
              <span className={`block text-sm font-bold ${on ? "text-pi" : "text-gray-500"}`}>{k.t}</span>
              <span className="text-[10px] text-gray-400">{k.d}</span>
            </button>
          );
        })}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        {photos.length < MAX_PHOTOS && (
          <label className="tap relative flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400">
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
                void addPhotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
        {photos.map((src, i) => (
          <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`상품 사진 ${i + 1}`} className="h-full w-full object-cover" />
            {i === 0 && <span className="absolute inset-x-0 bottom-0 bg-black/60 py-0.5 text-center text-[10px] font-bold text-white">대표사진</span>}
            <button
              type="button"
              onClick={() => setPhotos((cur) => cur.filter((_, j) => j !== i))}
              aria-label="사진 삭제"
              className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <div>
        <label htmlFor={`${id}-title`} className={label}>
          제목 <span className="text-red-500">*</span>
        </label>
        <input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40} placeholder="예) 아이폰 15 128GB 블루" className={input} />
      </div>

      <fieldset>
        <legend className={label}>
          카테고리 <span className="text-red-500">*</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {listingCategories.map((c) => (
            <button key={c.id} type="button" onClick={() => setCategory(c.id)} aria-pressed={category === c.id} className={chip(category === c.id)}>
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </fieldset>

      {!isNew ? (
        <fieldset>
          <legend className={label}>
            사용감 <span className="text-red-500">*</span>
          </legend>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(usageGradeLabel) as UsageGrade[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setUsageGrade(g)}
                aria-pressed={usageGrade === g}
                className={`tap rounded-lg border px-1 py-2 text-center text-xs font-medium ${usageGrade === g ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`}
              >
                {usageGradeLabel[g]}
              </button>
            ))}
          </div>
          <label htmlFor={`${id}-usage`} className="mb-1.5 mt-3 block text-xs font-bold text-gray-700">
            사용감·하자 설명
          </label>
          <textarea
            id={`${id}-usage`}
            value={usageNote}
            onChange={(e) => setUsageNote(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="사용 기간, 흠집·하자, 구성품 여부 등을 적어주세요."
            className={`${input} resize-none`}
          />
          <p className="mt-1.5 text-[11px] text-gray-500">개인 중고는 수량 1개로 등록되고, 구매 확정되면 거래완료로 바뀌어요.</p>
        </fieldset>
      ) : (
        <>
          {combos.length === 0 && (
          <div>
            <label htmlFor={`${id}-stock`} className={label}>
              재고 수량 <span className="text-red-500">*</span>
            </label>
            <div className="flex w-40 items-center rounded-lg border border-gray-200 px-3 focus-within:border-pi">
              <input
                id={`${id}-stock`}
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                step={1}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="w-full bg-transparent py-2.5 text-sm text-gray-900 focus:outline-none"
              />
              <span className="text-sm text-gray-500">개</span>
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">결제가 승인될 때마다 1개씩 줄고, 0개가 되면 품절로 표시돼요.</p>
          </div>
          )}
          <fieldset>
            <legend className={label}>
              옵션 <span className="text-xs font-normal text-gray-400">(선택 · 최대 {MAX_OPTIONS}개)</span>
            </legend>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    aria-label={`옵션 ${i + 1} 이름`}
                    value={o.name}
                    onChange={(e) => updateOption(i, { name: e.target.value })}
                    maxLength={10}
                    placeholder={preset.name}
                    className={`${field} w-24 shrink-0`}
                  />
                  <input
                    aria-label={`옵션 ${i + 1} 값`}
                    value={o.values}
                    onChange={(e) => updateOption(i, { values: e.target.value })}
                    placeholder={preset.values}
                    className={`${field} min-w-0 flex-1`}
                  />
                  <button
                    type="button"
                    onClick={() => setOptions((cur) => cur.filter((_, j) => j !== i))}
                    aria-label={`옵션 ${i + 1} 삭제`}
                    className="tap shrink-0 px-1 text-lg text-gray-400"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => setOptions((cur) => [...cur, cur.length === 0 ? { ...preset } : { name: "", values: "" }])}
                className="tap mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-bold text-gray-600"
              >
                + 옵션 추가{options.length === 0 && category ? ` (예: ${preset.name})` : ""}
              </button>
            )}
            <p className="mt-1.5 text-[11px] text-gray-500">옵션 값은 쉼표(,)로 구분해요. 구매자는 결제 전에 옵션을 골라요.</p>
          </fieldset>
          {combos.length > 0 && (
            <div>
              <p className={label}>
                옵션별 재고 <span className="text-red-500">*</span>{" "}
                <span className="text-xs font-normal text-gray-500">총 {variantTotal}개</span>
              </p>
              {combos.length > MAX_VARIANTS ? (
                <p className="text-xs text-red-500">
                  옵션 조합이 {combos.length}개예요. 최대 {MAX_VARIANTS}개까지 만들 수 있어요.
                </p>
              ) : (
                <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {combos.map((c) => {
                    const k = comboKey(c);
                    const name = Object.values(c).join(" / ");
                    return (
                      <li key={k} className="flex items-center gap-2 px-3 py-2">
                        <span className="flex-1 text-sm text-gray-800">{name}</span>
                        <input
                          aria-label={`${name} 재고`}
                          type="number"
                          inputMode="numeric"
                          min={0}
                          max={9999}
                          value={variantStock[k] ?? ""}
                          onChange={(e) => setVariantStock((cur) => ({ ...cur, [k]: e.target.value }))}
                          placeholder="0"
                          className="w-20 rounded-lg border border-gray-200 px-2 py-1.5 text-right text-sm focus:border-pi focus:outline-none"
                        />
                        <span className="text-xs text-gray-500">개</span>
                      </li>
                    );
                  })}
                </ul>
              )}
              <p className="mt-1.5 text-[11px] text-gray-500">조합별로 재고를 따로 관리해요. 0개인 조합은 구매자에게 품절로 보여요.</p>
            </div>
          )}
        </>
      )}

      <div className={isNew ? "grid grid-cols-2 gap-3" : ""}>
        <div>
          <label htmlFor={`${id}-price`} className={label}>
            판매 가격 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-pi">
            <span className="text-base font-black text-pi">π</span>
            <input
              id={`${id}-price`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full bg-transparent px-2 py-2.5 text-sm text-gray-900 focus:outline-none"
            />
          </div>
        </div>
        {isNew && (
        <div>
          <label htmlFor={`${id}-orig`} className={label}>
            정가 <span className="text-xs font-normal text-gray-400">(선택)</span>
          </label>
          <div className="flex items-center rounded-lg border border-gray-200 px-3 focus-within:border-pi">
            <span className="text-base font-black text-gray-300">π</span>
            <input
              id={`${id}-orig`}
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              value={originalPrice}
              onChange={(e) => setOriginalPrice(e.target.value)}
              placeholder="할인 표시용"
              className="w-full bg-transparent px-2 py-2.5 text-sm text-gray-900 focus:outline-none"
            />
          </div>
        </div>
        )}
      </div>
      {!isNew && (
      <label className="-mt-2 flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={negotiable} onChange={(e) => setNegotiable(e.target.checked)} className="h-4 w-4 accent-pi" />
        가격 제안 받기
      </label>
      )}

      <fieldset>
        <legend className={label}>
          거래 방식 <span className="text-red-500">*</span>
          <span className="ml-1 text-xs font-normal text-gray-400">(중복 선택 가능)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { m: "delivery", t: "택배", d: "택배로 보내드려요" },
              { m: "direct", t: "직거래", d: "만나서 전달해요" },
            ] as const
          ).map(({ m, t, d }) => {
            const on = methods.includes(m);
            return (
              <button
                key={m}
                type="button"
                onClick={() => toggleMethod(m)}
                aria-pressed={on}
                className={`tap rounded-xl border px-3 py-2.5 text-left ${on ? "border-pi bg-pi/5 ring-1 ring-pi" : "border-gray-200"}`}
              >
                <span className={`block text-sm font-bold ${on ? "text-pi" : "text-gray-800"}`}>{t}</span>
                <span className="text-[11px] text-gray-500">{d}</span>
              </button>
            );
          })}
        </div>
        {methods.includes("delivery") && (
          <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" checked={fastShipping} onChange={(e) => setFastShipping(e.target.checked)} className="h-4 w-4 accent-pi" />
            24시간 안에 발송할게요 <span className="text-xs font-bold text-amber-700">⚡빠른배송</span>
          </label>
        )}
      </fieldset>

      {methods.includes("direct") && (
        <div>
          <label htmlFor={`${id}-place`} className={label}>
            직거래 희망 장소
          </label>
          <input id={`${id}-place`} value={meetingPlace} onChange={(e) => setMeetingPlace(e.target.value)} placeholder="예) 강남역 11번 출구" className={input} />
        </div>
      )}

      <div>
        <label htmlFor={`${id}-loc`} className={label}>
          내 동네
        </label>
        <input id={`${id}-loc`} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="예) 역삼동" className={input} />
      </div>

      <div>
        <label htmlFor={`${id}-desc`} className={label}>
          자세한 설명
        </label>
        <textarea
          id={`${id}-desc`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          placeholder={isNew ? "제품 구성·소재, 배송 안내, 교환/환불 정책 등을 적어주세요." : "구매 시기, 거래 시 참고할 점 등을 적어주세요."}
          className={`${input} resize-none`}
        />
      </div>

      <p className="rounded-lg bg-violet-50 p-3 text-xs leading-relaxed text-pi">
        구매자는 π로만 결제해요. 결제 금액은 바로온다가 보관하다가 구매자가 구매 확정하면 판매자에게 정산돼요.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={!title.trim() || busy || loading}
          className="tap shrink-0 rounded-xl border border-gray-300 px-4 py-3.5 text-sm font-bold text-gray-700 disabled:opacity-50"
        >
          임시저장
        </button>
        <button
          type="submit"
          disabled={!valid || busy || loading}
          className="tap flex-1 rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
        >
          {busy ? "저장 중…" : isNew ? "새 상품 등록하기" : "중고 판매글 등록하기"}
        </button>
      </div>
    </form>
  );
}
