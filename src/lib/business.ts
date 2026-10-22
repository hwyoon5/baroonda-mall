/** 새 상품(정식 판매) 판매자의 사업자·통신판매업 정보. 전자상거래법상 상품 페이지에 판매자 정보로 표시한다. */
export type SellerBusiness = {
  bizName: string;
  ownerName: string;
  /** 숫자 10자리 */
  bizRegNo: string;
  /** 통신판매업 신고번호(예: 2024-서울강남-01234). 면제 대상이면 비워 둔다. */
  mailOrderNo?: string;
  mailOrderExempt: boolean;
  address: string;
  phone: string;
  email?: string;
  /** 표준 반품·환불 규정, 교환·배송 안내, 법적 고지. 새 상품 상세 하단에 기본으로 표시된다. */
  returnPolicy?: string;
  shippingInfo?: string;
  legalNotice?: string;
  /** 배송·반품 조건(배송 방법, 택배사, 배송비, 반품/교환 배송비, 신청 기한). 새 상품 등록 시 기본으로 연동된다. */
  shipping?: ShippingTerms;
  /** 운영자 자격 검증용 서류 사본(Blob URL 또는 저장소 미연결 시 data URL). 공개 화면에는 표시하지 않는다. */
  bizRegDoc?: string;
  mailOrderDoc?: string;
  /** 정산 받을 Pi 지갑 공개 주소(G…56자). 공개 화면에는 표시하지 않는다. */
  piWallet?: string;
  updatedAt: string;
};

/** 배송·반품 조건(π 단위). 기본 배송비와 제주·도서산간 추가비는 주문 시 결제 금액에 더한다(shippingFeeFor). */
export type ShippingTerms = {
  method?: string;
  courier?: string;
  fee?: number;
  freeOver?: number;
  remoteFee?: number;
  returnFee?: number;
  exchangeFee?: number;
  requestDays?: number;
};
export type ShippingDraft = Record<keyof ShippingTerms, string>;

export const SHIPPING_METHODS = ["택배", "직접 배송", "퀵·당일 배송", "방문 수령"];
export const COURIERS = ["CJ대한통운", "우체국택배", "한진택배", "롯데택배", "로젠택배", "편의점택배"];
export const SHIPPING_FEE_FIELDS = [
  { key: "fee", label: "기본 배송비" },
  { key: "freeOver", label: "무료배송 기준 금액" },
  { key: "remoteFee", label: "제주·도서산간 추가 배송비" },
  { key: "returnFee", label: "반품 배송비(편도)" },
  { key: "exchangeFee", label: "교환 배송비(왕복)" },
] as const;
export const MAX_SHIPPING_FEE = 10000;
/** 전자상거래법상 청약철회 기간은 최소 7일 */
export const MIN_REQUEST_DAYS = 7;
const SHIPPING_KEYS = ["method", "courier", "fee", "freeOver", "remoteFee", "returnFee", "exchangeFee", "requestDays"] as const;

export const toShippingDraft = (t?: ShippingTerms): ShippingDraft =>
  Object.fromEntries(SHIPPING_KEYS.map((k) => [k, t?.[k] === undefined ? "" : String(t[k])])) as ShippingDraft;

/** 입력값을 검증·정리한다. 빈 칸은 빼고, 모두 비면 terms 없이 돌려준다. (서버·화면 공용) */
export function normalizeShipping(v: unknown): { terms?: ShippingTerms; error?: string } {
  if (!v || typeof v !== "object") return {};
  const o = v as Record<string, unknown>;
  const blank = (x: unknown) => x === undefined || x === null || String(x).trim() === "";
  const terms: ShippingTerms = {};
  for (const k of ["method", "courier"] as const) {
    const s = typeof o[k] === "string" ? (o[k] as string).trim().slice(0, 30) : "";
    if (s) terms[k] = s;
  }
  for (const { key, label } of SHIPPING_FEE_FIELDS) {
    if (blank(o[key])) continue;
    const n = Number(String(o[key]).trim());
    if (!Number.isFinite(n) || n < 0 || n > MAX_SHIPPING_FEE) return { error: `${label}: 0~${MAX_SHIPPING_FEE}π 사이 숫자로 입력해 주세요.` };
    terms[key] = Math.round(n * 100) / 100;
  }
  if (!blank(o.requestDays)) {
    const n = Number(String(o.requestDays).trim());
    if (!Number.isInteger(n) || n < MIN_REQUEST_DAYS || n > 365)
      return { error: `반품·교환 신청 기한은 ${MIN_REQUEST_DAYS}~365일로 입력해 주세요(전자상거래법상 최소 ${MIN_REQUEST_DAYS}일).` };
    terms.requestDays = n;
  }
  return Object.keys(terms).length ? { terms } : {};
}

/** 결제에 더할 배송비. 무료배송 기준은 상품 금액으로 판단하고, 제주·도서산간 추가비는 무료배송이어도 더한다. */
export function shippingFeeFor(t: ShippingTerms | undefined, itemPrice: number, remoteArea = false) {
  if (!t) return 0;
  const base = t.fee && !(t.freeOver && itemPrice >= t.freeOver) ? t.fee : 0;
  return addPi(base, remoteArea ? (t.remoteFee ?? 0) : 0);
}
export const addPi = (a: number, b: number) => Math.round((a + b) * 1e7) / 1e7;

/** 새 상품에 실제 적용되는 배송 조건: 상품별 규정이 있으면 그것, 없으면 판매자 사업자 정보 (상세 표시와 동일) */
export const effectiveShipping = (l: { condition: string; policy?: SellerPolicy }, business?: { shipping?: ShippingTerms }) =>
  l.condition !== "new" ? undefined : l.policy ? l.policy.shipping : business?.shipping;

export const hasShipping = (t?: ShippingTerms) => !!t && Object.keys(t).length > 0;

/** 상품 상세·미리보기용 표 행 */
export function shippingRows(t: ShippingTerms): [string, string][] {
  const pi = (n: number) => `${n}π`;
  const rows: [string, string | undefined][] = [
    ["배송 방법", t.method],
    ["택배사", t.courier],
    ["배송비", t.fee === undefined ? undefined : (t.fee === 0 ? "무료" : pi(t.fee)) + (t.fee && t.freeOver ? ` (${pi(t.freeOver)} 이상 구매 시 무료)` : "")],
    ["제주·도서산간", t.remoteFee === undefined ? undefined : `추가 ${pi(t.remoteFee)}`],
    ["반품 배송비", t.returnFee === undefined ? undefined : `편도 ${pi(t.returnFee)}`],
    ["교환 배송비", t.exchangeFee === undefined ? undefined : `왕복 ${pi(t.exchangeFee)}`],
    ["반품·교환 신청 기한", t.requestDays === undefined ? undefined : `상품 수령 후 ${t.requestDays}일 이내`],
  ];
  return rows.filter((r): r is [string, string] => r[1] !== undefined);
}

export type SellerPolicy = { returnPolicy?: string; shippingInfo?: string; legalNotice?: string; shipping?: ShippingTerms };
export const POLICY_FIELDS = [
  { key: "returnPolicy", label: "반품·환불 규정" },
  { key: "shippingInfo", label: "교환·배송 안내" },
  { key: "legalNotice", label: "법적 고지" },
] as const;
export const MAX_POLICY_CHARS = 2000;
export const pickPolicy = (p: SellerPolicy): SellerPolicy => ({ returnPolicy: p.returnPolicy, shippingInfo: p.shippingInfo, legalNotice: p.legalNotice, shipping: p.shipping });
export const hasPolicy = (p?: SellerPolicy) => !!p && (POLICY_FIELDS.some((f) => p[f.key]?.trim()) || hasShipping(p.shipping));

/** 전자상거래법(청약철회 등) 기준 예시 문구. 판매자가 자기 사정에 맞게 고쳐 쓴다. */
export const DEFAULT_POLICY: Required<Omit<SellerPolicy, "shipping">> = {
  returnPolicy: [
    "상품을 받은 날부터 7일 이내에 반품·환불을 요청할 수 있어요.",
    "단순 변심 반품 시 왕복 배송비는 구매자 부담이에요.",
    "상품 하자·오배송은 받은 날부터 3개월 이내(또는 사실을 안 날부터 30일 이내) 판매자 부담으로 교환·환불해 드려요.",
    "포장 훼손으로 상품 가치가 떨어졌거나, 사용·소비한 경우, 복제 가능한 상품의 포장을 뜯은 경우에는 반품이 어려워요.",
    "환불은 반품 상품 확인 후 3영업일 이내에 결제한 π로 돌려드려요.",
  ].join("\n"),
  shippingInfo: [
    "결제 완료 후 1~3영업일 이내 발송해요(주말·공휴일 제외).",
    "교환은 같은 상품의 다른 옵션으로만 가능하며, 재고가 없으면 환불로 처리해요.",
    "교환·반품 접수는 채팅 또는 고객센터로 문의해 주세요.",
  ].join("\n"),
  legalNotice: [
    "미성년자가 법정대리인의 동의 없이 구매한 경우 본인 또는 법정대리인이 구매를 취소할 수 있어요.",
    "소비자 피해 보상, 상품 불만 및 분쟁 처리는 「전자상거래 등에서의 소비자보호에 관한 법률」 및 공정거래위원회 소비자분쟁해결기준에 따라요.",
  ].join("\n"),
};

export const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** 국세청 사업자등록번호 검증 규칙(가중치 1,3,7,1,3,7,1,3,5 + 체크 디지트) */
export function isBizRegNo(v: string) {
  const d = digitsOnly(v);
  if (!/^\d{10}$/.test(d)) return false;
  const n = [...d].map(Number);
  const w = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  const sum = w.reduce((s, x, i) => s + x * n[i], 0) + Math.floor((n[8] * 5) / 10);
  return (10 - (sum % 10)) % 10 === n[9];
}

export const formatBizRegNo = (v: string) => {
  const d = digitsOnly(v);
  return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 5)}-${d.slice(5)}` : v;
};

/** "제 2024-서울강남-01234 호" 처럼 써도 2024-서울강남-01234 로 맞춘다. */
export const normalizeMailOrderNo = (v: string) => v.replace(/\s+/g, "").replace(/^제/, "").replace(/호$/, "");
export const isMailOrderNo = (v: string) => /^\d{4}-[가-힣A-Za-z]{2,12}-\d{3,6}$/.test(normalizeMailOrderNo(v));
export const isBizPhone = (v: string) => /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(v.trim()) || /^1\d{3}-?\d{4}$/.test(v.trim());
export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** Pi(Stellar) 지갑 공개 주소: G로 시작하는 56자 + 버전 바이트·CRC16 체크섬 확인으로 오타를 걸러낸다. */
export function isPiWallet(v: string) {
  if (!/^G[A-Z2-7]{55}$/.test(v)) return false;
  const bytes: number[] = [];
  let acc = 0;
  let bits = 0;
  for (const ch of v) {
    acc = (acc << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acc >> bits) & 0xff);
      acc &= (1 << bits) - 1;
    }
  }
  if (bytes.length !== 35 || bytes[0] !== 6 << 3) return false;
  let crc = 0;
  for (const b of bytes.slice(0, 33)) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc === (bytes[33] | (bytes[34] << 8));
}
