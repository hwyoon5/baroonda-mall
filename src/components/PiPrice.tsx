import { formatPi } from "@/lib/format";

type Size = "sm" | "md" | "lg" | "xl";

const sizes: Record<Size, { amount: string; symbol: string }> = {
  sm: { amount: "text-sm", symbol: "text-xs" },
  md: { amount: "text-base", symbol: "text-sm" },
  lg: { amount: "text-lg", symbol: "text-base" },
  xl: { amount: "text-2xl", symbol: "text-lg" },
};

export default function PiPrice({ value, size = "md", className = "" }: { value: number; size?: Size; className?: string }) {
  const s = sizes[size];
  return (
    <span className={`relative inline-flex items-baseline gap-0.5 font-extrabold text-gray-900 ${className}`}>
      <span className={`${s.symbol} font-black text-pi`} aria-hidden>
        π
      </span>
      <span className={`${s.amount} tabular-nums`}>{formatPi(value)}</span>
      <span className="sr-only">파이</span>
    </span>
  );
}
