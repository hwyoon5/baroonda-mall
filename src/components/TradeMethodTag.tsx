import { tradeMethodLabel, type TradeMethod } from "@/lib/types";

const styles: Record<TradeMethod, string> = {
  direct: "bg-emerald-50 text-emerald-700",
  delivery: "bg-sky-50 text-sky-700",
};

const icons: Record<TradeMethod, string> = {
  direct: "M12 21s-7-5.5-7-11a7 7 0 0 1 14 0c0 5.5-7 11-7 11zM12 12a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  delivery: "M3 7h11v9H3zM14 10h4l3 3v3h-7zM7 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
};

export default function TradeMethodTag({ method }: { method: TradeMethod }) {
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-sm px-1.5 py-0.5 text-[10px] font-bold leading-none ${styles[method]}`}>
      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinejoin="round" aria-hidden>
        <path d={icons[method]} />
      </svg>
      {tradeMethodLabel[method]}
    </span>
  );
}
