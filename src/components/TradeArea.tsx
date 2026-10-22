/** 개인 중고 거래 지역(동·면) 표시. 지역 없이 올라온 예전 글은 "지역 정보 없음" */
export default function TradeArea({ location, className = "" }: { location?: string; className?: string }) {
  return (
    <span className={`inline-flex max-w-full items-center gap-0.5 truncate font-semibold ${location ? "text-gray-700" : "text-gray-400"} ${className}`}>
      <span aria-hidden>📍</span>
      <span className="sr-only">거래 지역 </span>
      <span className="truncate">{location || "지역 정보 없음"}</span>
    </span>
  );
}
