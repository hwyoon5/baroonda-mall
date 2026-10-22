"use client";

import { COURIERS, MIN_REQUEST_DAYS, SHIPPING_FEE_FIELDS, SHIPPING_METHODS, normalizeShipping, type ShippingDraft } from "@/lib/business";

const box = "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-pi focus:outline-none";

/** 배송 방법·택배사·배송비·반품/교환 배송비·신청 기한 입력 (사업자 정보와 상품 등록에서 함께 사용) */
const RETURN_KEYS: (keyof ShippingDraft)[] = ["returnFee", "exchangeFee", "requestDays"];

/** part를 주면 배송(방법·택배사·배송비) 또는 반품·교환(배송비·신청 기한) 칸만 보여 준다. */
export default function ShippingTermsFields({
  idPrefix,
  value,
  onChange,
  part,
}: {
  idPrefix: string;
  value: ShippingDraft;
  onChange: (v: ShippingDraft) => void;
  part?: "shipping" | "return";
}) {
  const set = (k: keyof ShippingDraft, v: string) => onChange({ ...value, [k]: v });
  const shows = (k: keyof ShippingDraft) => !part || (part === "return") === RETURN_KEYS.includes(k);
  const error = normalizeShipping(Object.fromEntries(Object.entries(value).filter(([k]) => shows(k as keyof ShippingDraft)))).error;

  const text = (k: "method" | "courier", label: string, list: string[], placeholder: string) => (
    <div>
      <label htmlFor={`${idPrefix}-${k}`} className="mb-1.5 block text-xs font-bold text-gray-700">
        {label}
      </label>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {list.map((c) => {
          const on = value[k] === c;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => set(k, on ? "" : c)}
              className={`tap rounded-full border px-2.5 py-1 text-[11px] font-medium ${on ? "border-pi bg-pi text-white" : "border-gray-200 text-gray-600"}`}
            >
              {c}
            </button>
          );
        })}
      </div>
      <input id={`${idPrefix}-${k}`} value={value[k]} onChange={(e) => set(k, e.target.value)} maxLength={30} placeholder={placeholder} className={box} />
    </div>
  );

  const num = (k: keyof ShippingDraft, label: string, unit: string, integer = false) => (
    <div key={k}>
      <label htmlFor={`${idPrefix}-${k}`} className="mb-1 block text-[11px] font-bold text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={`${idPrefix}-${k}`}
          inputMode={integer ? "numeric" : "decimal"}
          value={value[k]}
          onChange={(e) => set(k, e.target.value)}
          maxLength={8}
          placeholder="선택"
          className={`${box} pr-8`}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-gray-400">{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      {shows("method") && text("method", "배송 방법", SHIPPING_METHODS, "직접 입력 (예: 화물 배송)")}
      {shows("courier") && text("courier", "택배사", COURIERS, "직접 입력")}
      <div className="grid grid-cols-2 gap-2">
        {SHIPPING_FEE_FIELDS.filter(({ key }) => shows(key)).map(({ key, label }) => num(key, label, "π"))}
        {shows("requestDays") && num("requestDays", "반품·교환 신청 기한", "일", true)}
      </div>
      {part !== "shipping" && <p className="text-[11px] leading-relaxed text-gray-400">
        배송비를 0으로 쓰면 무료배송으로 표시돼요. 신청 기한은 전자상거래법상 최소 {MIN_REQUEST_DAYS}일이에요. 금액은 안내용이며 결제 금액에 더해지지 않아요.
      </p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
