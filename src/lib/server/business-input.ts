import { MAX_POLICY_CHARS, businessStatus, digitsOnly, normalizeShipping, isBizPhone, isPiWallet, isBizRegNo, isEmail, isMailOrderNo, normalizeMailOrderNo, type SellerBusiness } from "@/lib/business";
import { isBlobUrl } from "@/lib/media";
import { getBusiness } from "./db";
import { HttpError } from "./http";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 저장소(Blob) 미연결 환경에서는 화면에서 줄인 JPEG data URL로 받는다. */
const MAX_DOC_DATA_CHARS = 600_000;
const isDoc = (v: unknown): v is string =>
  isBlobUrl(v, "doc") || (typeof v === "string" && /^data:image\/(jpeg|png|webp);base64,[\w+/=]+$/.test(v) && v.length <= MAX_DOC_DATA_CHARS);

export function parseShipping(v: unknown) {
  const { terms, error } = normalizeShipping(v);
  if (error) throw new HttpError(400, error);
  return terms;
}

export function parseBusinessInput(b: Partial<Record<keyof SellerBusiness, unknown>>): SellerBusiness {
  const need = (ok: boolean, msg: string) => {
    if (!ok) throw new HttpError(400, msg);
  };
  const bizName = str(b.bizName, 40);
  const ownerName = str(b.ownerName, 20);
  const bizRegNo = digitsOnly(str(b.bizRegNo, 20));
  const mailOrderExempt = b.mailOrderExempt === true;
  const mailOrderNo = mailOrderExempt ? "" : normalizeMailOrderNo(str(b.mailOrderNo, 40));
  const address = str(b.address, 120);
  const phone = str(b.phone, 20);
  const email = str(b.email, 80);
  need(bizName !== "", "상호명을 입력해 주세요.");
  need(ownerName !== "", "대표자 성명을 입력해 주세요.");
  need(isBizRegNo(bizRegNo), "사업자등록번호가 올바르지 않아요. 10자리 번호를 다시 확인해 주세요.");
  need(mailOrderExempt || isMailOrderNo(mailOrderNo), "통신판매업 신고번호 형식이 올바르지 않아요. 예: 2024-서울강남-01234");
  need(address.length >= 5, "사업장 주소를 입력해 주세요.");
  need(isBizPhone(phone), "고객센터 전화번호를 올바르게 입력해 주세요.");
  need(email === "" || isEmail(email), "이메일 형식이 올바르지 않아요.");
  const shipping = parseShipping(b.shipping);
  need(isDoc(b.bizRegDoc), "사업자등록증 사본을 첨부해 주세요.");
  need(mailOrderExempt || isDoc(b.mailOrderDoc), "통신판매업 신고증 사본을 첨부해 주세요.");
  const piWallet = str(b.piWallet, 60).toUpperCase();
  need(isPiWallet(piWallet), "Pi 지갑 주소가 올바르지 않아요. G로 시작하는 56자리 주소를 다시 확인해 주세요.");
  return {
    bizName,
    ownerName,
    bizRegNo,
    mailOrderNo: mailOrderNo || undefined,
    mailOrderExempt,
    address,
    phone,
    email: email || undefined,
    returnPolicy: str(b.returnPolicy, MAX_POLICY_CHARS) || undefined,
    shippingInfo: str(b.shippingInfo, MAX_POLICY_CHARS) || undefined,
    legalNotice: str(b.legalNotice, MAX_POLICY_CHARS) || undefined,
    shipping,
    bizRegDoc: b.bizRegDoc as string,
    mailOrderDoc: mailOrderExempt ? undefined : (b.mailOrderDoc as string),
    piWallet,
    updatedAt: new Date().toISOString(),
  };
}

/** 새 상품(정식 판매) 게시 전 확인: 관리자 승인을 받은 사업자만 가능. 개인 중고·임시저장은 제외. */
export async function assertCanPublish(uid: string, condition: string, draft: boolean) {
  if (draft || condition !== "new") return;
  const b = await getBusiness(uid);
  if (!b) throw new HttpError(403, "새 상품(정식 판매)은 사업자 정보를 등록한 뒤 판매할 수 있어요. 마이 > 사업자 정보에서 등록해 주세요.");
  const status = businessStatus(b);
  if (status === "pending") throw new HttpError(403, "사업자 정보를 확인하고 있어요. 관리자 승인 후 새 상품을 판매할 수 있어요. 작성 중인 상품은 임시저장해 두세요.");
  if (status === "rejected")
    throw new HttpError(403, `사업자 정보가 반려됐어요${b.review?.reason ? ` (사유: ${b.review.reason})` : ""}. 마이 > 사업자 정보에서 고쳐 다시 제출해 주세요.`);
}
