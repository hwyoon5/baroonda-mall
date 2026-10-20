"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import FilePicker from "@/components/FilePicker";
import { api } from "@/lib/client/api";
import { uploadMedia, videoDuration, videoExt } from "@/lib/client/media";
import { formatBizRegNo, type SellerBusiness } from "@/lib/business";
import { listingCategories } from "@/lib/categories";
import { MAX_PHOTOS, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, MAX_VIDEOS, VIDEO_TYPES } from "@/lib/media";
import { MAX_OPTION_VALUES, MAX_OPTIONS, MAX_VARIANTS, optionPresetsFor, presetValuesFor, type OptionPreset } from "@/lib/options";
import { usageGradeLabel, type Condition, type Listing, type TradeMethod, type UsageGrade } from "@/lib/types";
import { useStore } from "./store/StoreProvider";


const comboKey = (c: Record<string, string>) => JSON.stringify(c);
/** Shopify처럼 옵션 값의 모든 조합(variant)을 만든다. 서버(listing-input.ts)와 같은 순서 */
const cartesian = (opts: { name: string; values: string[] }[]) =>
  opts.reduce<Record<string, string>[]>((acc, o) => acc.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v }))), [{}]);

type OptionDraft = { name: string; values: string };

const splitValues = (v: string) => [...new Set(v.split(",").map((x) => x.trim()).filter(Boolean))].slice(0, MAX_OPTION_VALUES);

const saleKinds = [
  { v: "new", t: "새 상품(정식 판매)", d: "재고·옵션이 있는 새 상품" },
  { v: "used", t: "개인 중고", d: "내가 쓰던 물건 1개" },
] as const;

/** 긴 변 maxSide px로 줄인 캔버스. */
async function resizeImage(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Blob 저장소가 있으면 1280px JPEG로 업로드해 URL을, 없으면 720px data URL을 만든다. */
async function preparePhoto(file: File, blob: boolean): Promise<string> {
  if (!blob) return (await resizeImage(file, 720)).toDataURL("image/jpeg", 0.72);
  const canvas = await resizeImage(file, 1280);
  const jpeg = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", 0.8));
  return uploadMedia(jpeg, "photo", "jpg");
}


export default function SellForm({ draftId }: { draftId?: string }) {
  const id = useId();
  const router = useRouter();
  const { showToast } = useStore();
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [blobEnabled, setBlobEnabled] = useState<boolean | null>(null);
  const [photoUploads, setPhotoUploads] = useState(0);
  const [videoProgress, setVideoProgress] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [kind, setKind] = useState<Condition>("used");
  const [usageGrade, setUsageGrade] = useState<UsageGrade>("A");
  const [usageNote, setUsageNote] = useState("");
  const [stock, setStock] = useState("10");
  const [options, setOptions] = useState<OptionDraft[]>([]);
  const [variantStock, setVariantStock] = useState<Record<string, string>>({});
  const [bulkTarget, setBulkTarget] = useState("");
  const [bulkQty, setBulkQty] = useState("");
  const [loading, setLoading] = useState(Boolean(draftId));
  const [business, setBusiness] = useState<SellerBusiness | null | undefined>(undefined);

  useEffect(() => {
    api<{ enabled: boolean }>("/api/upload")
      .then((r) => setBlobEnabled(r.enabled))
      .catch(() => setBlobEnabled(false));
    api<{ business: SellerBusiness | null }>("/api/me/business")
      .then((r) => setBusiness(r.business))
      .catch(() => setBusiness(null));
  }, []);

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
        setVideos(l.videos ?? []);
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
  const presets = optionPresetsFor(category);
  const suggestedGroups = presets.filter((p) => !options.some((o) => o.name.trim() === p.name));
  const categoryName = listingCategories.find((c) => c.id === category)?.name;
  const parsedOptions = options
    .map((o) => ({ name: o.name.trim(), values: splitValues(o.values) }))
    .filter((o) => o.name || o.values.length);
  const optionsValid = parsedOptions.every((o) => o.name && o.values.length > 0);
  const combos = isNew && optionsValid && parsedOptions.length ? cartesian(parsedOptions) : [];
  const stockOf = (c: Record<string, string>) => Number(variantStock[comboKey(c)]) || 0;
  const variantTotal = combos.reduce((sum, c) => sum + stockOf(c), 0);
  const soldOutCount = combos.filter((c) => stockOf(c) === 0).length;
  // 옵션이 2개 이상이면 첫 옵션 값으로 묶어서 보여준다(예: 블랙 › S/M/L)
  const groupBy = parsedOptions.length > 1 ? parsedOptions[0] : null;
  const variantGroups = groupBy ? groupBy.values.map((v) => ({ value: v, items: combos.filter((c) => c[groupBy.name] === v) })) : [{ value: "", items: combos }];
  const bulkQtyValid = /^\d{1,4}$/.test(bulkQty);
  const stockNum = Number(stock);
  const stockValid = Number.isInteger(stockNum) && stockNum >= 1 && stockNum <= 9999;
  const needsBusiness = isNew && business === null;
  const valid =
    (!isNew || !!business) &&
    title.trim() !== "" && category !== "" && price !== "" && priceNum > 0 && methods.length > 0 && (!isNew || (optionsValid && (combos.length ? variantTotal >= 1 && combos.length <= MAX_VARIANTS : stockValid)));
  const updateOption = (i: number, patch: Partial<OptionDraft>) => setOptions((cur) => cur.map((o, j) => (j === i ? { ...o, ...patch } : o)));

  const addOptionGroup = (p?: OptionPreset) =>
    setOptions((cur) => (cur.length >= MAX_OPTIONS ? cur : [...cur, p ? { name: p.name, values: p.values.join(", ") } : { name: "", values: "" }]));
  const appendValue = (i: number, v: string) =>
    setOptions((cur) => cur.map((o, j) => (j !== i ? o : { ...o, values: o.values.trim() ? `${o.values.replace(/[,\s]+$/, "")}, ${v}` : v })));
  const applyBulk = () => {
    if (!bulkQtyValid) return;
    const target = bulkTarget ? (JSON.parse(bulkTarget) as [string, string]) : null;
    setVariantStock((cur) => {
      const next = { ...cur };
      for (const c of combos) if (!target || c[target[0]] === target[1]) next[comboKey(c)] = String(Number(bulkQty));
      return next;
    });
  };

  const toggleMethod = (m: TradeMethod) => setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  const uploading = photoUploads > 0 || videoProgress !== null;

  const addPhotos = async (all: File[]) => {
    const picked = all.slice(0, Math.max(0, MAX_PHOTOS - photos.length - photoUploads));
    if (picked.length < all.length) showToast(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
    if (!picked.length) return;
    setPhotoUploads((n) => n + picked.length);
    const results = await Promise.allSettled(
      picked.map((f) =>
        preparePhoto(f, blobEnabled === true).finally(() => setPhotoUploads((n) => n - 1)),
      ),
    );
    const urls = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    setPhotos((cur) => [...cur, ...urls].slice(0, MAX_PHOTOS));
    if (urls.length < picked.length) showToast("일부 사진을 올리지 못했어요. 다시 시도해 주세요.");
  };

  const addVideo = async (file: File | undefined) => {
    if (!file) return;
    if (file.type && !VIDEO_TYPES.includes(file.type)) return showToast("MP4·MOV·WebM 동영상만 올릴 수 있어요.");
    if (file.size > MAX_VIDEO_BYTES) return showToast(`동영상은 ${MAX_VIDEO_BYTES / 1024 / 1024}MB 이하만 올릴 수 있어요.`);
    const sec = await videoDuration(file);
    if (sec !== null && sec > MAX_VIDEO_SECONDS + 0.5) return showToast(`동영상은 ${MAX_VIDEO_SECONDS}초 이하만 올릴 수 있어요.`);
    setVideoProgress(0);
    try {
      const url = await uploadMedia(file, "video", videoExt(file.type), setVideoProgress);
      setVideos((cur) => [...cur, url].slice(0, MAX_VIDEOS));
    } catch {
      showToast("동영상을 올리지 못했어요. 다시 시도해 주세요.");
    } finally {
      setVideoProgress(null);
    }
  };

  const save = async (draft: boolean) => {
    if (busy || uploading || (draft ? !title.trim() : !valid)) return;
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
        videos,
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
      <div>
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {photos.length + photoUploads < MAX_PHOTOS && (
            <FilePicker
              label="사진 추가"
              accept="image/*"
              multiple
              onFiles={(f) => void addPhotos(f)}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
                <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
                <circle cx="12" cy="13" r="3.5" />
              </svg>
              <span className="text-[11px] font-medium">
                {photos.length}/{MAX_PHOTOS}
              </span>
            </FilePicker>
          )}
          {videos.length < MAX_VIDEOS && videoProgress === null && (
            <FilePicker
              label="동영상 추가"
              accept="video/*"
              blocked={blobEnabled !== true}
              onBlocked={() =>
                showToast(
                  blobEnabled === null
                    ? "업로드를 준비하고 있어요. 잠시 후 다시 눌러 주세요."
                    : "동영상 저장소가 연결되지 않아 지금은 올릴 수 없어요.",
                )
              }
              onFiles={(f) => void addVideo(f[0])}
              className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round">
                <rect x="3" y="6" width="13" height="12" rx="2" />
                <path d="m16 10 5-3v10l-5-3z" />
              </svg>
              <span className="text-[11px] font-medium">
                동영상 {videos.length}/{MAX_VIDEOS}
              </span>
            </FilePicker>
          )}
          {videoProgress !== null && (
            <div className="flex h-20 w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-gray-100 text-[11px] font-bold text-gray-500">
              <span>동영상</span>
              <span className="text-pi">{videoProgress}%</span>
            </div>
          )}
          {videos.map((src, i) => (
            <div key={src} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-black">
              <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center text-xl text-white/90" aria-hidden>
                ▶
              </span>
              <button
                type="button"
                onClick={() => setVideos((cur) => cur.filter((_, j) => j !== i))}
                aria-label={`동영상 ${i + 1} 삭제`}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-xs text-white"
              >
                ×
              </button>
            </div>
          ))}
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
          {Array.from({ length: photoUploads }, (_, i) => (
            <div key={`up${i}`} className="flex h-20 w-20 shrink-0 animate-pulse items-center justify-center rounded-xl bg-gray-100 text-[11px] text-gray-400">
              올리는 중
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-gray-400">
          {blobEnabled
            ? `사진 최대 ${MAX_PHOTOS}장, 동영상 최대 ${MAX_VIDEOS}개(개당 ${MAX_VIDEO_SECONDS}초·${MAX_VIDEO_BYTES / 1024 / 1024}MB 이하)를 올릴 수 있어요.`
            : `사진 최대 ${MAX_PHOTOS}장을 올릴 수 있어요. 동영상은 저장소 연결 후 사용할 수 있어요.`}
        </p>
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
            {suggestedGroups.length > 0 && options.length < MAX_OPTIONS && (
              <div className="mb-2">
                <p className="mb-1 text-[11px] text-gray-500">{categoryName ? `${categoryName} 추천 옵션` : "추천 옵션"} · 탭하면 기본 값과 함께 추가돼요</p>
                <div className="flex flex-wrap gap-1.5">
                  {suggestedGroups.map((p) => (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => addOptionGroup(p)}
                      className="tap rounded-full border border-pi/30 bg-pi/5 px-3 py-1 text-xs font-bold text-pi"
                    >
                      + {p.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="space-y-2">
              {options.map((o, i) => {
                const vals = splitValues(o.values);
                const quick = presetValuesFor(category, o.name).filter((v) => !vals.includes(v));
                return (
                  <div key={i} className="rounded-lg border border-gray-200 p-2">
                    <div className="flex gap-2">
                      <input
                        aria-label={`옵션 ${i + 1} 이름`}
                        value={o.name}
                        onChange={(e) => updateOption(i, { name: e.target.value })}
                        maxLength={10}
                        placeholder="옵션명"
                        className={`${field} w-24 shrink-0`}
                      />
                      <input
                        aria-label={`옵션 ${i + 1} 값`}
                        value={o.values}
                        onChange={(e) => updateOption(i, { values: e.target.value })}
                        placeholder="값1, 값2"
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
                    {quick.length > 0 && vals.length < MAX_OPTION_VALUES && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {quick.map((v) => (
                          <button key={v} type="button" onClick={() => appendValue(i, v)} className="tap rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-gray-600">
                            + {v}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                onClick={() => addOptionGroup()}
                className="tap mt-2 w-full rounded-lg border border-dashed border-gray-300 py-2 text-xs font-bold text-gray-600"
              >
                + 직접 옵션 추가
              </button>
            )}
            <p className="mt-1.5 text-[11px] text-gray-500">옵션 값은 쉼표(,)로 구분해요(옵션당 최대 {MAX_OPTION_VALUES}개). 구매자는 결제 전에 옵션을 골라요.</p>
          </fieldset>
          {combos.length > 0 && (
            <div>
              <p className={label}>
                옵션별 재고 <span className="text-red-500">*</span>{" "}
                <span className="text-xs font-normal text-gray-500">
                  조합 {combos.length}개 · 총 {variantTotal}개{soldOutCount ? ` · 품절 ${soldOutCount}개` : ""}
                </span>
              </p>
              {combos.length > MAX_VARIANTS ? (
                <p className="text-xs text-red-500">
                  옵션 조합이 {combos.length}개예요. 최대 {MAX_VARIANTS}개까지 만들 수 있어요.
                </p>
              ) : (
                <>
                  <div className="mb-2 flex gap-2 rounded-lg bg-gray-50 p-2">
                    <select
                      aria-label="일괄 입력 대상"
                      value={bulkTarget}
                      onChange={(e) => setBulkTarget(e.target.value)}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs"
                    >
                      <option value="">전체 조합</option>
                      {parsedOptions.flatMap((o) =>
                        o.values.map((v) => (
                          <option key={`${o.name}:${v}`} value={JSON.stringify([o.name, v])}>
                            {o.name}: {v}
                          </option>
                        )),
                      )}
                    </select>
                    <input
                      aria-label="일괄 재고 수량"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={9999}
                      value={bulkQty}
                      onChange={(e) => setBulkQty(e.target.value)}
                      placeholder="수량"
                      className="w-16 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-right text-xs"
                    />
                    <button type="button" onClick={applyBulk} disabled={!bulkQtyValid} className="tap rounded-lg bg-gray-800 px-3 text-xs font-bold text-white disabled:opacity-40">
                      일괄 적용
                    </button>
                  </div>
                  <div className="space-y-2">
                    {variantGroups.map((g) => (
                      <div key={g.value || "all"} className="overflow-hidden rounded-lg border border-gray-200">
                        {groupBy && (
                          <p className="flex justify-between bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-700">
                            <span>
                              {groupBy.name}: {g.value}
                            </span>
                            <span className="font-normal text-gray-500">{g.items.reduce((n, c) => n + stockOf(c), 0)}개</span>
                          </p>
                        )}
                        <ul className="divide-y divide-gray-100">
                          {g.items.map((c) => {
                            const k = comboKey(c);
                            const name = Object.values(c).join(" / ");
                            const shown = groupBy ? Object.entries(c).filter(([n]) => n !== groupBy.name).map(([, v]) => v).join(" / ") : name;
                            return (
                              <li key={k} className="flex items-center gap-2 px-3 py-2">
                                <span className={`flex-1 text-sm ${stockOf(c) ? "text-gray-800" : "text-gray-400"}`}>{shown}</span>
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
                      </div>
                    ))}
                  </div>
                </>
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

      {isNew &&
        (needsBusiness ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-800">
            <p className="font-bold">새 상품(정식 판매)은 사업자 정보가 필요해요</p>
            <p className="mt-0.5">전자상거래법에 따라 사업자등록번호·통신판매업 신고번호 등을 등록한 판매자만 새 상품을 판매할 수 있어요. 작성 중인 내용은 [임시저장] 해 두세요.</p>
            <Link href="/my/business?next=/sell" className="tap mt-2 inline-block rounded-lg bg-amber-500 px-3 py-1.5 font-bold text-white">
              사업자 정보 등록하기
            </Link>
          </div>
        ) : business ? (
          <p className="flex items-center justify-between rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            <span>
              판매자 정보: <b className="text-gray-800">{business.bizName}</b> · {formatBizRegNo(business.bizRegNo)}
            </span>
            <Link href="/my/business?next=/sell" className="tap font-bold text-pi">
              수정
            </Link>
          </p>
        ) : null)}

      <p className="rounded-lg bg-violet-50 p-3 text-xs leading-relaxed text-pi">
        구매자는 π로만 결제해요. 결제 금액은 바로온다가 보관하다가 구매자가 구매 확정하면 판매자에게 정산돼요.
      </p>

      {error && <p className="text-sm text-red-500">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => void save(true)}
          disabled={!title.trim() || busy || loading || uploading}
          className="tap shrink-0 rounded-xl border border-gray-300 px-4 py-3.5 text-sm font-bold text-gray-700 disabled:opacity-50"
        >
          임시저장
        </button>
        <button
          type="submit"
          disabled={!valid || busy || loading || uploading}
          className="tap flex-1 rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400"
        >
          {uploading ? "업로드 중…" : busy ? "저장 중…" : isNew ? "새 상품 등록하기" : "중고 판매글 등록하기"}
        </button>
      </div>
    </form>
  );
}
