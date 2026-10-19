export default function FastDeliveryTag({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-0.5 rounded-sm bg-pi-gold/15 px-1.5 py-0.5 text-[10px] font-bold leading-none text-amber-700">
      <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current" aria-hidden>
        <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8z" />
      </svg>
      {compact ? "빠른배송" : "바로온다 빠른배송"}
    </span>
  );
}
