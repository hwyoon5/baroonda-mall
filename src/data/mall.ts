export type Category = {
  id: string;
  name: string;
  icon: string;
  bg: string;
  href?: string;
  badge?: string;
};

export type Deal = {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  pricePi: number;
  originalPi: number;
  soldPercent: number;
};

export type Product = {
  id: string;
  name: string;
  emoji: string;
  bg: string;
  pricePi: number;
  originalPi?: number;
  rating: number;
  reviews: number;
  fastDelivery: boolean;
  freeShipping?: boolean;
};

export const categories: Category[] = [
  { id: "used", name: "중고마켓", icon: "🤝", bg: "bg-violet-100", href: "#p2p", badge: "NEW" },
  { id: "fresh", name: "신선식품", icon: "🥬", bg: "bg-green-50" },
  { id: "fashion", name: "패션", icon: "👕", bg: "bg-pink-50" },
  { id: "beauty", name: "뷰티", icon: "💄", bg: "bg-rose-50" },
  { id: "digital", name: "디지털", icon: "📱", bg: "bg-sky-50" },
  { id: "living", name: "생활용품", icon: "🧻", bg: "bg-amber-50" },
  { id: "baby", name: "유아동", icon: "🧸", bg: "bg-yellow-50" },
  { id: "sports", name: "스포츠", icon: "⚽", bg: "bg-emerald-50" },
  { id: "pet", name: "반려동물", icon: "🐶", bg: "bg-lime-50" },
  { id: "more", name: "전체보기", icon: "➕", bg: "bg-violet-50" },
];

export const todayDeals: Deal[] = [
  { id: "d1", name: "제주 감귤 5kg 산지직송", emoji: "🍊", bg: "from-orange-100 to-amber-50", pricePi: 0.42, originalPi: 0.7, soldPercent: 82 },
  { id: "d2", name: "무선 블루투스 이어폰 Pro", emoji: "🎧", bg: "from-slate-200 to-slate-50", pricePi: 3.9, originalPi: 6.5, soldPercent: 64 },
  { id: "d3", name: "프리미엄 한우 등심 300g", emoji: "🥩", bg: "from-red-100 to-rose-50", pricePi: 1.85, originalPi: 2.6, soldPercent: 91 },
  { id: "d4", name: "고농축 세탁세제 3L x 2", emoji: "🧴", bg: "from-sky-100 to-cyan-50", pricePi: 0.55, originalPi: 0.99, soldPercent: 47 },
  { id: "d5", name: "스마트워치 S9 실리콘 밴드", emoji: "⌚", bg: "from-violet-100 to-purple-50", pricePi: 0.28, originalPi: 0.5, soldPercent: 35 },
];

export const products: Product[] = [
  { id: "p1", name: "유기농 바나나 1.2kg 한 송이", emoji: "🍌", bg: "bg-yellow-50", pricePi: 0.18, originalPi: 0.24, rating: 4.8, reviews: 1284, fastDelivery: true, freeShipping: true },
  { id: "p2", name: "데일리 오버핏 코튼 맨투맨", emoji: "👚", bg: "bg-pink-50", pricePi: 1.2, rating: 4.6, reviews: 532, fastDelivery: false, freeShipping: true },
  { id: "p3", name: "수분 진정 시카 크림 50ml", emoji: "🧴", bg: "bg-emerald-50", pricePi: 0.75, originalPi: 1.1, rating: 4.9, reviews: 2310, fastDelivery: true },
  { id: "p4", name: "65W 고속 충전기 GaN 3포트", emoji: "🔌", bg: "bg-slate-100", pricePi: 1.45, originalPi: 1.9, rating: 4.7, reviews: 876, fastDelivery: true, freeShipping: true },
  { id: "p5", name: "논스틱 프라이팬 28cm", emoji: "🍳", bg: "bg-orange-50", pricePi: 0.95, rating: 4.5, reviews: 410, fastDelivery: false },
  { id: "p6", name: "무농약 대추방울토마토 1kg", emoji: "🍅", bg: "bg-red-50", pricePi: 0.32, originalPi: 0.4, rating: 4.8, reviews: 958, fastDelivery: true },
  { id: "p7", name: "강아지 동결건조 간식 트릿", emoji: "🦴", bg: "bg-lime-50", pricePi: 0.48, rating: 4.9, reviews: 1620, fastDelivery: true, freeShipping: true },
  { id: "p8", name: "요가매트 TPE 8mm 논슬립", emoji: "🧘", bg: "bg-violet-50", pricePi: 1.05, originalPi: 1.5, rating: 4.4, reviews: 287, fastDelivery: false, freeShipping: true },
];

export function discountRate(price: number, original?: number) {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}
