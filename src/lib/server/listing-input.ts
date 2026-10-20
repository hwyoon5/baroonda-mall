import { isListingCategory } from "@/lib/categories";
import { isUsageGrade, type Listing, type ListingOption, type TradeMethod, type Variant } from "@/lib/types";
import { isBlobUrl, MAX_PHOTOS, MAX_VIDEOS } from "@/lib/media";
import { MAX_OPTION_VALUES, MAX_OPTIONS, MAX_VARIANTS } from "@/lib/options";
import { HttpError } from "./http";

/** Blob 미연결 시 사진은 data URL로 저장된다. Vercel 함수 요청 한도(4.5MB) 아래로 묶는다. */
const MAX_IMAGE_CHARS = 400_000;
const MAX_INLINE_TOTAL_CHARS = 3_000_000;

export type ListingInput = Partial<{
  title: string;
  brand: string;
  description: string;
  category: string;
  condition: string;
  pricePi: number;
  originalPricePi: number | null;
  negotiable: boolean;
  tradeMethods: string[];
  meetingPlace: string;
  location: string;
  fastShipping: boolean;
  images: string[];
  videos: string[];
  stock: number;
  options: unknown;
  variants: unknown;
  usageGrade: string;
  usageNote: string;
  draft: boolean;
}>;

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const piAmount = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 1_000_000 ? Math.round(v * 1e7) / 1e7 : null;
const isQty = (v: unknown, min: number): v is number => typeof v === "number" && Number.isInteger(v) && v >= min && v <= 9999;

function parseOptions(v: unknown): ListingOption[] | undefined {
  if (v == null) return undefined;
  if (!Array.isArray(v) || v.length > MAX_OPTIONS) throw new HttpError(400, `옵션은 최대 ${MAX_OPTIONS}개까지 등록할 수 있어요.`);
  const out = v.map((raw) => {
    const o = (raw ?? {}) as { name?: unknown; values?: unknown };
    const name = str(o.name, 10);
    const values = Array.isArray(o.values) ? [...new Set(o.values.map((x) => str(x, 20)).filter(Boolean))].slice(0, MAX_OPTION_VALUES) : [];
    if (!name || values.length === 0) throw new HttpError(400, "옵션 이름과 값을 모두 입력해 주세요.");
    return { name, values };
  });
  if (new Set(out.map((o) => o.name)).size !== out.length) throw new HttpError(400, "옵션 이름이 겹쳐요.");
  return out.length ? out : undefined;
}

/** Shopify처럼 옵션 값의 모든 조합을 variant로 만들고, 요청에 담긴 조합별 재고를 매칭한다. */
function buildVariants(options: ListingOption[], raw: unknown, draft: boolean): Variant[] {
  const combos = options.reduce<Record<string, string>[]>((acc, o) => acc.flatMap((c) => o.values.map((v) => ({ ...c, [o.name]: v }))), [{}]);
  if (combos.length > MAX_VARIANTS) throw new HttpError(400, `옵션 조합은 최대 ${MAX_VARIANTS}개까지 만들 수 있어요.`);
  const list = (Array.isArray(raw) ? raw : []) as { options?: Record<string, unknown>; stock?: unknown }[];
  return combos.map((c, i) => {
    const m = list.find((r) => r?.options && Object.keys(c).every((k) => r.options![k] === c[k]));
    const s = m?.stock;
    if (s !== undefined && !isQty(s, 0) && !draft) throw new HttpError(400, "옵션별 재고는 0~9999개로 입력해 주세요.");
    return { id: `v${i + 1}`, options: c, stock: isQty(s, 0) ? s : 0, committed: 0 };
  });
}

type ParsedListing = Omit<Listing, "id" | "seller" | "status" | "createdAt" | "reservedOrderId" | "demo">;

/** 상품 등록/임시저장 입력 검증. 임시저장(draft)은 제목만 필수이고 나머지는 비워둘 수 있다. */
export function parseListingInput(b: ListingInput, draft: boolean): ParsedListing {
  const need = (ok: unknown, msg: string) => {
    if (!ok && !draft) throw new HttpError(400, msg);
  };
  const title = str(b.title, 40);
  if (!title) throw new HttpError(400, "제목을 입력해 주세요.");
  const category = str(b.category, 20);
  need(isListingCategory(category), "카테고리를 선택해 주세요.");
  const pricePi = piAmount(b.pricePi);
  need(pricePi !== null, "판매 가격을 π 단위로 올바르게 입력해 주세요.");
  const originalPricePi = b.originalPricePi == null ? undefined : piAmount(b.originalPricePi) ?? undefined;
  const tradeMethods = [...new Set((b.tradeMethods ?? []).filter((m): m is TradeMethod => m === "direct" || m === "delivery"))];
  need(tradeMethods.length > 0, "거래 방식을 하나 이상 선택해 주세요.");

  // 판매 유형별 입력: 개인 중고 = 1개 + 사용감, 새 상품(정식 판매) = 재고 + 옵션(조합별 재고)
  const isNew = b.condition === "new";
  const options = isNew ? parseOptions(b.options) : undefined;
  const variants = options ? buildVariants(options, b.variants, draft) : undefined;
  let stock: number | undefined;
  if (isNew) {
    if (variants) {
      stock = variants.reduce((s, v) => s + v.stock, 0);
      need(stock >= 1, "옵션별 재고를 1개 이상 입력해 주세요.");
    } else {
      need(isQty(b.stock, 1), "재고 수량은 1~9999개로 입력해 주세요.");
      stock = isQty(b.stock, 0) ? b.stock : 0;
    }
  }
  need(isNew || isUsageGrade(b.usageGrade), "사용감을 선택해 주세요.");

  const images = b.images ?? [];
  if (!Array.isArray(images) || images.length > MAX_PHOTOS) throw new HttpError(400, `사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
  const inline = (src: unknown): src is string => typeof src === "string" && src.startsWith("data:image/") && src.length <= MAX_IMAGE_CHARS;
  if (!images.every((src) => isBlobUrl(src, "photo") || inline(src))) throw new HttpError(400, "사진 형식이 올바르지 않거나 너무 커요.");
  if (images.filter(inline).reduce((n, src) => n + src.length, 0) > MAX_INLINE_TOTAL_CHARS) {
    throw new HttpError(400, "사진 용량이 너무 커요. 장수를 줄여 주세요.");
  }
  const videos = b.videos ?? [];
  if (!Array.isArray(videos) || videos.length > MAX_VIDEOS) throw new HttpError(400, `동영상은 최대 ${MAX_VIDEOS}개까지 올릴 수 있어요.`);
  if (!videos.every((src) => isBlobUrl(src, "video"))) throw new HttpError(400, "동영상 형식이 올바르지 않아요.");
  const price = pricePi ?? 0;
  return {
    title,
    brand: str(b.brand, 30) || undefined,
    description: str(b.description, 2000),
    category: isListingCategory(category) ? category : "",
    condition: isNew ? "new" : "used",
    pricePi: price,
    originalPricePi: originalPricePi && originalPricePi > price ? originalPricePi : undefined,
    negotiable: !isNew && Boolean(b.negotiable),
    tradeMethods,
    meetingPlace: tradeMethods.includes("direct") ? str(b.meetingPlace, 60) || undefined : undefined,
    location: str(b.location, 30) || undefined,
    fastShipping: tradeMethods.includes("delivery") && Boolean(b.fastShipping),
    images,
    videos: videos.length ? videos : undefined,
    ...(isNew
      ? { stock, committed: 0, soldCount: 0, options, variants }
      : { usageGrade: isUsageGrade(b.usageGrade) ? b.usageGrade : undefined, usageNote: str(b.usageNote, 300) || undefined }),
    emoji: "📦",
    bg: "bg-violet-50",
  };
}
