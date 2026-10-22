"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent } from "react";
import BusinessTestFill from "@/components/BusinessTestFill";
import FilePicker from "@/components/FilePicker";
import ShippingTermsFields from "@/components/ShippingTermsFields";
import SubHeader from "@/components/SubHeader";
import LoginCard from "@/components/pi/LoginCard";
import { useStore } from "@/components/store/StoreProvider";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_POLICY, MAX_POLICY_CHARS, POLICY_FIELDS, formatBizRegNo, isBizPhone, isBizRegNo, isEmail, isMailOrderNo, isPiWallet, normalizeShipping, toShippingDraft, type SellerBusiness, type ShippingDraft } from "@/lib/business";
import { api } from "@/lib/client/api";
import { canvasToJpeg, resizeImage, uploadMedia } from "@/lib/client/media";
import { DOC_TYPES, MAX_DOC_BYTES } from "@/lib/media";

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
  shipping: ShippingDraft;
  bizRegDoc: string;
  mailOrderDoc: string;
  piWallet: string;
};
type DocKey = "bizRegDoc" | "mailOrderDoc";
type PolicyKey = (typeof POLICY_FIELDS)[number]["key"];
const empty: Form = {
  bizRegDoc: "",
  mailOrderDoc: "",
  piWallet: "", bizName: "", ownerName: "", bizRegNo: "", mailOrderNo: "", mailOrderExempt: false, address: "", phone: "", email: "", returnPolicy: "", shippingInfo: "", legalNotice: "", shipping: toShippingDraft() };

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
  const [blobEnabled, setBlobEnabled] = useState<boolean | null>(null);
  const [uploading, setUploading] = useState<DocKey | "">("");

  useEffect(() => {
    api<{ enabled: boolean }>("/api/upload")
      .then((r) => setBlobEnabled(r.enabled))
      .catch(() => setBlobEnabled(false));
  }, []);

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
            shipping: toShippingDraft(b.shipping),
            bizRegDoc: b.bizRegDoc ?? "",
            mailOrderDoc: b.mailOrderDoc ?? "",
            piWallet: b.piWallet ?? "",
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
    piWallet: f.piWallet && !isPiWallet(f.piWallet.toUpperCase()) ? "G로 시작하는 56자리 지갑 주소를 확인해 주세요(한 글자라도 틀리면 저장되지 않아요)." : undefined,
  };
  const valid =
    f.bizName.trim() &&
    f.ownerName.trim() &&
    isBizRegNo(f.bizRegNo) &&
    (f.mailOrderExempt || isMailOrderNo(f.mailOrderNo)) &&
    f.address.trim().length >= 5 &&
    isBizPhone(f.phone) &&
    (!f.email || isEmail(f.email)) &&
    !normalizeShipping(f.shipping).error &&
    !!f.bizRegDoc &&
    (f.mailOrderExempt || !!f.mailOrderDoc) &&
    isPiWallet(f.piWallet.toUpperCase()) &&
    !uploading;

  /** 사진은 줄여서 JPEG로(저장소 미연결이면 data URL), PDF는 그대로 Blob에 올린다. */
  const attach = async (key: DocKey, file: File) => {
    setUploading(key);
    setError("");
    try {
      if (!DOC_TYPES.includes(file.type)) throw new Error("JPG·PNG·WEBP 사진이나 PDF만 올릴 수 있어요.");
      if (file.size > MAX_DOC_BYTES) throw new Error(`파일은 ${MAX_DOC_BYTES / 1024 / 1024}MB 이하로 올려 주세요.`);
      let url: string;
      if (file.type === "application/pdf") {
        if (!blobEnabled) throw new Error("PDF는 저장소 연결 후 올릴 수 있어요. 서류를 사진으로 찍어 올려 주세요.");
        url = await uploadMedia(file, "doc", "pdf");
      } else if (blobEnabled) {
        url = await uploadMedia(await canvasToJpeg(await resizeImage(file, 2000), 0.85), "doc", "jpg");
      } else {
        url = (await resizeImage(file, 1400)).toDataURL("image/jpeg", 0.75);
        if (url.length > 580_000) url = (await resizeImage(file, 1000)).toDataURL("image/jpeg", 0.6);
      }
      set({ [key]: url });
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일을 올리지 못했어요.");
    } finally {
      setUploading("");
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      await api("/api/me/business", { ...f, piWallet: f.piWallet.toUpperCase() }, "PUT");
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

  const policyArea = (key: PolicyKey, label: string) => (
    <div>
      <label htmlFor={`${id}-${key}`} className="mb-1.5 flex justify-between text-xs font-bold text-gray-700">
        {label}
        <span className="font-normal text-gray-400">
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
  );

  const docField = (key: DocKey, label: string) => {
    const url = f[key];
    const pdf = !!url && !url.startsWith("data:") && url.toLowerCase().endsWith(".pdf");
    return (
      <div>
        <p className="mb-1.5 text-xs font-bold text-gray-700">{label}</p>
        <div className="flex items-center gap-3">
          {!url ? (
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-dashed border-gray-300 text-[11px] text-gray-400">미첨부</div>
          ) : pdf ? (
            <a href={url} target="_blank" rel="noreferrer" className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-xs text-gray-600">
              PDF 보기
            </a>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={`${label} 미리보기`} className="h-20 w-20 shrink-0 rounded-lg border border-gray-200 object-cover" />
          )}
          <FilePicker
            label={`${label} 첨부`}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            blocked={blobEnabled === null || !!uploading}
            onBlocked={() => showToast(uploading ? "다른 파일을 올리고 있어요." : "업로드를 준비하고 있어요.")}
            onFiles={([file]) => attach(key, file)}
            className="flex-1 rounded-lg border border-pi/40 py-3 text-center text-sm font-bold text-pi"
          >
            {uploading === key ? "올리는 중…" : url ? "다시 첨부" : "사진·PDF 첨부"}
          </FilePicker>
        </div>
      </div>
    );
  };

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
          <BusinessTestFill disabled={blobEnabled === null || !!uploading || busy} onFill={set} attach={attach} />
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
          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h2 className="text-sm font-bold text-gray-900">
              자격 확인 서류 <span className="text-red-500">*</span>
            </h2>
            <p className="text-[11px] leading-relaxed text-gray-500">운영자가 판매자 자격을 확인하는 데만 쓰고, 상품 화면에는 공개하지 않아요. 사진(JPG·PNG) 또는 PDF로 올려 주세요.</p>
            {docField("bizRegDoc", "사업자등록증 사본")}
            {f.mailOrderExempt ? (
              <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500">통신판매업 신고 면제 대상으로 선택해서 신고증 사본은 필요 없어요.</p>
            ) : (
              docField("mailOrderDoc", "통신판매업 신고증 사본")
            )}
          </section>
          <section className="space-y-2 border-t border-gray-100 pt-4">
            <label htmlFor={`${id}-piWallet`} className="block text-sm font-bold text-gray-900">
              정산 받을 Pi 지갑 주소 <span className="text-red-500">*</span>
            </label>
            <input
              id={`${id}-piWallet`}
              value={f.piWallet}
              onChange={(e) => set({ piWallet: e.target.value.replace(/\s/g, "") })}
              maxLength={60}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              placeholder="G로 시작하는 56자리 주소"
              className={`${field} font-mono text-xs`}
            />
            {errors.piWallet && <p className="text-[11px] text-red-500">{errors.piWallet}</p>}
            <p className="text-[11px] leading-relaxed text-gray-500">Pi Wallet 앱의 받기(Receive) 화면에서 복사한 공개 주소를 붙여 넣어 주세요. 원화 계좌는 받지 않아요. 비밀 문구(passphrase)는 절대 입력하지 마세요.</p>
          </section>
          <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-4">
            <p className="text-[11px] leading-relaxed text-gray-500">아래 내용은 새 상품 상세 하단에 자동으로 표시돼요. 상품마다 다르면 상품 등록 화면에서 고칠 수 있어요.</p>
            <button
              type="button"
              onClick={() => set(Object.fromEntries(POLICY_FIELDS.map(({ key }) => [key, f[key].trim() ? f[key] : DEFAULT_POLICY[key]])))}
              className="tap shrink-0 rounded-lg border border-pi/30 px-2.5 py-1 text-xs font-bold text-pi"
            >
              빈 칸에 기본 문구 넣기
            </button>
          </div>
          <section className="space-y-3">
            <h2 className="text-sm font-bold text-gray-900">배송 안내</h2>
            <ShippingTermsFields part="shipping" idPrefix={`${id}-ship`} value={f.shipping} onChange={(shipping) => set({ shipping })} />
            {policyArea("shippingInfo", "배송·교환 추가 안내")}
          </section>
          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h2 className="text-sm font-bold text-gray-900">반품·교환·환불</h2>
            <ShippingTermsFields part="return" idPrefix={`${id}-ret`} value={f.shipping} onChange={(shipping) => set({ shipping })} />
            {policyArea("returnPolicy", "반품·환불 규정")}
          </section>
          <section className="space-y-3 border-t border-gray-100 pt-4">
            <h2 className="text-sm font-bold text-gray-900">법적 고지</h2>
            {policyArea("legalNotice", "법적 고지 문구")}
          </section>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" disabled={!valid || busy} className="tap w-full rounded-xl bg-pi py-3.5 text-base font-bold text-white disabled:bg-gray-200 disabled:text-gray-400">
            {busy ? "저장 중…" : saved ? "수정 내용 저장" : "사업자 정보 등록"}
          </button>
        </form>
      )}
    </>
  );
}
