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
  updatedAt: string;
};

export type SellerPolicy = { returnPolicy?: string; shippingInfo?: string; legalNotice?: string };
export const POLICY_FIELDS = [
  { key: "returnPolicy", label: "반품·환불 규정" },
  { key: "shippingInfo", label: "교환·배송 안내" },
  { key: "legalNotice", label: "법적 고지" },
] as const;
export const MAX_POLICY_CHARS = 2000;
export const pickPolicy = (p: SellerPolicy): SellerPolicy => ({ returnPolicy: p.returnPolicy, shippingInfo: p.shippingInfo, legalNotice: p.legalNotice });
export const hasPolicy = (p?: SellerPolicy) => !!p && POLICY_FIELDS.some((f) => p[f.key]?.trim());

/** 전자상거래법(청약철회 등) 기준 예시 문구. 판매자가 자기 사정에 맞게 고쳐 쓴다. */
export const DEFAULT_POLICY: Required<SellerPolicy> = {
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
