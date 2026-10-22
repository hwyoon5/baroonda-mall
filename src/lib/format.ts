export function formatPi(value: number) {
  return value.toLocaleString("ko-KR", { maximumFractionDigits: 7 });
}

export function discountRate(price: number, original?: number) {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}

/** 12,345 → 1.2만 */
export function formatCount(n: number) {
  return n >= 10000 ? `${Math.floor(n / 1000) / 10}만` : n.toLocaleString("ko-KR");
}

export function timeAgo(iso: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "방금 전";
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)}시간 전`;
  return `${Math.floor(minutes / (60 * 24))}일 전`;
}

export function formatOption(option?: Record<string, string>) {
  return option ? Object.entries(option).map(([k, v]) => `${k}: ${v}`).join(" / ") : "";
}
