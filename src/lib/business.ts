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
  updatedAt: string;
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
