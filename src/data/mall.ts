export type Category = {
  id: string;
  name: string;
  icon: string;
  bg: string;
  href: string;
  image: string;
  badge?: string;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  image: string;
  bg: string;
  pricePi: number;
  originalPi?: number;
  rating: number;
  reviews: number;
  fastDelivery: boolean;
  freeShipping?: boolean;
};

export type Deal = Product & {
  gradient: string;
  originalPi: number;
  soldPercent: number;
};

const shopCategories = [
  { id: "fresh", image: "/images/categories/fresh.jpg", name: "신선식품", icon: "🥬", bg: "bg-green-50" },
  { id: "fashion", image: "/images/categories/fashion.jpg", name: "패션", icon: "👕", bg: "bg-pink-50" },
  { id: "beauty", image: "/images/categories/beauty.jpg", name: "뷰티", icon: "💄", bg: "bg-rose-50" },
  { id: "digital", image: "/images/categories/digital.jpg", name: "디지털", icon: "📱", bg: "bg-sky-50" },
  { id: "living", image: "/images/categories/living.jpg", name: "생활용품", icon: "🧻", bg: "bg-amber-50" },
  { id: "baby", image: "/images/categories/baby.jpg", name: "유아동", icon: "🧸", bg: "bg-yellow-50" },
  { id: "sports", image: "/images/categories/sports.jpg", name: "스포츠", icon: "⚽", bg: "bg-emerald-50" },
  { id: "pet", image: "/images/categories/pet.jpg", name: "반려동물", icon: "🐶", bg: "bg-lime-50" },
].map((c) => ({ ...c, href: `/category/${c.id}` }));

export const productCategories: Category[] = shopCategories;

export const usedMarketCategory: Category = {
  id: "used",
  name: "중고마켓",
  icon: "🤝",
  image: "/images/categories/used.jpg",
  bg: "bg-violet-100",
  href: "/market",
  badge: "NEW",
};

export const categories: Category[] = [
  usedMarketCategory,
  ...shopCategories,
  { id: "more", image: "/images/categories/all.jpg", name: "전체보기", icon: "➕", bg: "bg-violet-50", href: "/categories" },
];

export const todayDeals: Deal[] = [
  { id: "d1", image: "/images/listings/demo1.jpg", name: "제주 감귤 5kg 산지직송", category: "fresh", emoji: "🍊", bg: "bg-orange-50", gradient: "from-orange-100 to-amber-50", pricePi: 0.42, originalPi: 0.7, soldPercent: 82, rating: 4.8, reviews: 3120, fastDelivery: true, freeShipping: true },
  { id: "d2", image: "/images/listings/demo2.jpg", name: "무선 블루투스 헤드폰 Pro", category: "digital", emoji: "🎧", bg: "bg-slate-100", gradient: "from-slate-200 to-slate-50", pricePi: 3.9, originalPi: 6.5, soldPercent: 64, rating: 4.6, reviews: 842, fastDelivery: true },
  { id: "d3", image: "/images/listings/demo3.jpg", name: "프리미엄 한우 등심 300g", category: "fresh", emoji: "🥩", bg: "bg-red-50", gradient: "from-red-100 to-rose-50", pricePi: 1.85, originalPi: 2.6, soldPercent: 91, rating: 4.9, reviews: 1504, fastDelivery: true, freeShipping: true },
  { id: "d4", image: "/images/listings/demo4.jpg", name: "고농축 세탁세제 3L x 2", category: "living", emoji: "🧴", bg: "bg-sky-50", gradient: "from-sky-100 to-cyan-50", pricePi: 0.55, originalPi: 0.99, soldPercent: 47, rating: 4.7, reviews: 2210, fastDelivery: true },
  { id: "d5", image: "/images/listings/demo5.jpg", name: "스마트워치 S9 실리콘 밴드", category: "digital", emoji: "⌚", bg: "bg-violet-50", gradient: "from-violet-100 to-purple-50", pricePi: 0.28, originalPi: 0.5, soldPercent: 35, rating: 4.4, reviews: 361, fastDelivery: false, freeShipping: true },
];

export const products: Product[] = [
  { id: "p1", image: "/images/listings/demo10.jpg", name: "유기농 바나나 1.2kg 한 송이", category: "fresh", emoji: "🍌", bg: "bg-yellow-50", pricePi: 0.18, originalPi: 0.24, rating: 4.8, reviews: 1284, fastDelivery: true, freeShipping: true },
  { id: "p2", image: "/images/listings/demo11.jpg", name: "데일리 오버핏 코튼 후드티", category: "fashion", emoji: "👚", bg: "bg-pink-50", pricePi: 1.2, rating: 4.6, reviews: 532, fastDelivery: false, freeShipping: true },
  { id: "p3", image: "/images/listings/demo12.jpg", name: "수분 진정 시카 앰플 30ml", category: "beauty", emoji: "🧴", bg: "bg-emerald-50", pricePi: 0.75, originalPi: 1.1, rating: 4.9, reviews: 2310, fastDelivery: true },
  { id: "p4", image: "/images/listings/demo13.jpg", name: "65W 고속 충전기 GaN 3포트", category: "digital", emoji: "🔌", bg: "bg-slate-100", pricePi: 1.45, originalPi: 1.9, rating: 4.7, reviews: 876, fastDelivery: true, freeShipping: true },
  { id: "p5", image: "/images/listings/demo14.jpg", name: "논스틱 프라이팬 28cm", category: "living", emoji: "🍳", bg: "bg-orange-50", pricePi: 0.95, rating: 4.5, reviews: 410, fastDelivery: false },
  { id: "p6", image: "/images/listings/demo21.jpg", name: "무농약 대추방울토마토 1kg", category: "fresh", emoji: "🍅", bg: "bg-red-50", pricePi: 0.32, originalPi: 0.4, rating: 4.8, reviews: 958, fastDelivery: true },
  { id: "p7", image: "/images/listings/demo15.jpg", name: "강아지 동결건조 간식 트릿", category: "pet", emoji: "🦴", bg: "bg-lime-50", pricePi: 0.48, rating: 4.9, reviews: 1620, fastDelivery: true, freeShipping: true },
  { id: "p8", image: "/images/listings/demo16.jpg", name: "요가매트 TPE 8mm 논슬립", category: "sports", emoji: "🧘", bg: "bg-violet-50", pricePi: 1.05, originalPi: 1.5, rating: 4.4, reviews: 287, fastDelivery: false, freeShipping: true },
  { id: "p9", image: "/images/listings/demo17.jpg", name: "아기 원목 블록 쌓기 장난감", category: "baby", emoji: "🧸", bg: "bg-yellow-50", pricePi: 0.65, rating: 4.8, reviews: 194, fastDelivery: true },
  { id: "p10", image: "/images/listings/demo18.jpg", name: "고양이 스크래쳐 하우스", category: "pet", emoji: "🐱", bg: "bg-amber-50", pricePi: 0.88, originalPi: 1.2, rating: 4.6, reviews: 333, fastDelivery: false, freeShipping: true },
  { id: "p11", image: "/images/listings/demo19.jpg", name: "경량 러닝화 에어 쿠션", category: "sports", emoji: "👟", bg: "bg-sky-50", pricePi: 2.4, originalPi: 3.2, rating: 4.7, reviews: 712, fastDelivery: true, freeShipping: true },
  { id: "p12", image: "/images/listings/demo22.jpg", name: "베이직 데님 와이드 팬츠", category: "fashion", emoji: "👖", bg: "bg-indigo-50", pricePi: 1.6, rating: 4.5, reviews: 268, fastDelivery: true },
];

export const allProducts: Product[] = [...todayDeals, ...products];

export function findProduct(id: string): Product | Deal | undefined {
  return allProducts.find((p) => p.id === id);
}

export function findCategory(id: string) {
  return categories.find((c) => c.id === id);
}

export function productsInCategory(categoryId: string) {
  return allProducts.filter((p) => p.category === categoryId);
}

export function isDeal(p: Product): p is Deal {
  return "soldPercent" in p;
}

export function discountRate(price: number, original?: number) {
  if (!original || original <= price) return 0;
  return Math.round(((original - price) / original) * 100);
}
