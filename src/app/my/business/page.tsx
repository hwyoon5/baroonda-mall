"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useStore } from "@/components/store/StoreProvider";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_POLICY, MAX_POLICY_CHARS, POLICY_FIELDS, formatBizRegNo, isBizPhone, isBizRegNo, isEmail, isMailOrderNo, type SellerBusiness } from "@/lib/business";
import { api } from "@/lib/client/api";

type Form = {
  bizName: string;
  ownerName: string;
  bizRegNo: string;
  mailOrderNo: string;
  mailOrderExempt: boolean;
  address: string;
  phone: string;
  email: string;
  returnPolicy: string;
  shippingInfo: string;
  legalNotice: string;
};
const empty: Form = { bizName: "", ownerName: "", bizRegNo: "", mailOrderNo: "", mailOrderExempt: false, address: "", phone: "", email: "", returnPolicy: "", shippingInfo: "", legalNotice: "" };

const field = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-pi focus:outline-none";

/** 새 상품(정식 판매) 판매자 정보 설정: 사업자등록번호·통신판매업 신고번호 등 (전자상거래법 판매자 정보 표시) */
export default function BusinessPage() {
  const id = useId();
  const router = useRouter();
  const { showToast } = useStore();
  const { user, ready } = useAuth();
  const [f, setF] = useState<Form>(empty);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    api<{ business: SellerBusiness | null }>("/api/me/business")
      .then(({ business: b }) => {
        if (b) {
          setF({
            ...b,
            bizRegNo: formatBizRegNo(b.bizRegNo),
            mailOrderNo: b.mailOrderNo ?? "",
            email: b.email ?? "",
            returnPolicy: b.returnPolicy ?? "",
            shippingInfo: b.shippingInfo ?? "",
            legalNotice: b.legalNotice ?? "",
          });
          setSaved(true);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoaded(true));
  }, [user]);

  const set = (patch: Partial<Form>) => setF((cur) => ({ ...cur, ...patch }));
  const errors: Partial<Record<keyof Form, string>> = {
    bizRegNo: f.bizRegNo && !isBizRegNo(f.bizRegNo) ? "올바른 사업자등록번호가 아니에요(10자리 확인)." : undefined,
    mailOrderNo: !f.mailOrderExempt && f.mailOrderNo && !isMailOrderNo(f.mailOrderNo) ? "예: 2024-서울강남-01234" : undefined,
    phone: f.phone && !isBizPhone(f.phone) ? "예: 02-123-4567, 010-1234-5678" : undefined,
    email: f.email && !isEmail(f.email) ? "이메일 형식을 확인해 주세요." : undefined,
  };
  const valid =
    f.bizName.trim() &&
    f.ownerName.trim() &&
    isBizRegNo(f.bizRegNo) &&
    (f.mailOrderExempt || isMailOrderNo(f.mailOrderNo)) &&
    f.address.trim().length >= 5 &&
    isBizPhone(f.phone) &&
    (!f.email || isEmail(f.email));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/me/business", f, "PUT");
      setSaved(true);
      showToast("사업자 정보를 저장했어요.");
      const next = new URLSearchParams(window.location.search).get("next");
      if (next?.startsWith("/")) router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const row = (key: keyof Form, label: string, props: React.InputHTMLAttributes<HTMLInputElement>, required = true) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="mb-1.5 block text-sm font-bold text-gray-900">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input id={`${id}-${key}`} value={String(f[key])} onChange={(e) => set({ [key]: e.target.value })} className={`${field} disabled:bg-gray-50 disabled:text-gray-400`} {...props} />
      {errors[key] && <p className="mt-1 text-[11px] text-red-500">{errors[key]}</p>}
    </div>
  );

  return (
    <>
      <SubHeader title="사업자 정보" />
      {!ready ? null : !user ? (
        <LoginCard message="로그인하고 사업자 정보를 등록해 주세요." />
      ) : !loaded ? null : (
        <form onSubmit={submit} className="space-y-4 bg-white px-4 py-4">
          <p className={`rounded-lg p-3 text-xs leading-relaxed ${saved ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-pi"}`}>
            {saved ? "✓ 등록 완료 · 새 상품(정식 판매)을 판매할 수 있어요. " : ""}
            새 상품(정식 판매)을 판매하려면 사업자 정보가 필요해요. 입력한 정보는 전자상거래법에 따라 상품 상세의 ‘판매자 정보’에 표시돼요. 개인 중고 거래에는 필요 없어요.
          </p>
          {row("bizName", "상호명", { maxLength: 40, placeholder: "예: 바로상점" })}
          {row("ownerName", "대표자 성명", { maxLength: 20, placeholder: "예: 홍길동" })}
          {row("bizRegNo", "사업자등록번호", { inputMode: "numeric", maxLength: 12, placeholder: "000-00-00000", onBlur: () => set({ bizRegNo: formatBizRegNo(f.bizRegNo) }) })}
          <div className="space-y-1.5">
            {row("mailOrderNo", "통신판매업 신고번호", { maxLength: 40, placeholder: "예: 2024-서울강남-01234", disabled: f.mailOrderExempt }, !f.mailOrderExempt)}
            <label className="flex items-center gap-2 text-xs text-gray-600">
              <input type="checkbox" checked={f.mailOrderExempt} onChange={(e) => set({ mailOrderExempt: e.target.checked })} className="accent-pi" />
              통신판매업 신고 면제 대상이에요(간이과세자 등)
            </label>
          </div>
          {row("address", "사업장 주소", { maxLength: 120, placeholder: "사업자등록증의 사업장 주소" })}
          {row("phone", "고객센터 전화번호", { inputMode: "tel", maxLength: 20, placeholder: "예: 02-123-4567" })}
          {row("email", "이메일", { inputMode: "email", maxLength: 80, placeholder: "선택" }, false)}
          <div className="space-y-3 border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">반품·교환·법적 고지</h2>
              <button
                type="button"
                onClick={() => set(Object.fromEntries(POLICY_FIELDS.map(({ key }) => [key, f[key].trim() ? f[key] : DEFAULT_POLICY[key]])))}
                className="tap rounded-lg border border-pi/30 px-2.5 py-1 text-xs font-bold text-pi"
              >
                빈 칸에 기본 문구 넣기
              </button>
            </div>
            <p className="text-[11px] leading-relaxed text-gray-500">
              여기 저장한 내용은 새 상품 상세 하단에 자동으로 표시돼요. 상품마다 다르게 쓰고 싶으면 상품 등록 화면에서 불러와 고칠 수 있어요.
            </p>
            {POLICY_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={`${id}-${key}`} className="mb-1.5 flex justify-between text-sm font-bold text-gray-900">
                  {label}
                  <span className="text-[11px] font-normal text-gray-400">
                    {f[key].length}/{MAX_POLICY_CHARS}
                  </span>
                </label>
                <textarea
                  id={`${id}-${key}`}
                  value={f[key]}
                  onChange={(e) => set({ [key]: e.target.value })}
                  maxLength={MAX_POLICY_CHARS}
                  rows={4}
                  placeholder="선택 · [빈 칸에 기본 문구 넣기]로 예시 문구를 채울 수 있어요."
                  className={`${field} resize-y`}
                />
              </div>
            ))}
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={!valid || busy} className="tap w-full rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400">
            {busy ? "저장 중…" : saved ? "수정 내용 저장" : "사업자 정보 등록"}
          </button>
        </form>
      )}
    </>
  );
}
