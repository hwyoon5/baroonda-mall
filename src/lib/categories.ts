export type Category = { id: string; name: string; icon: string; bg: string; href: string; image: string; badge?: string };

const cat = (id: string, name: string, icon: string, bg: string): Category => ({
  id,
  name,
  icon,
  bg,
  href: `/category/${id}`,
  image: `/images/categories/${id}.jpg`,
});

/** 판매자가 고를 수 있는 상품 카테고리 */
export const listingCategories: Category[] = [
  cat("fresh", "신선식품", "🥬", "bg-green-50"),
  cat("fashion", "패션", "👕", "bg-pink-50"),
  cat("beauty", "뷰티", "💄", "bg-rose-50"),
  cat("digital", "디지털", "📱", "bg-sky-50"),
  cat("living", "생활용품", "🧻", "bg-amber-50"),
  cat("baby", "유아동", "🧸", "bg-yellow-50"),
  cat("sports", "스포츠/취미", "⚽", "bg-emerald-50"),
  cat("pet", "반려동물", "🐶", "bg-lime-50"),
];

export const homeCategories: Category[] = [
  ...listingCategories,
  { id: "all", name: "전체보기", icon: "➕", bg: "bg-violet-50", href: "/categories", image: "/images/categories/all.jpg" },
];

export function findCategory(id: string) {
  return listingCategories.find((c) => c.id === id);
}

export function isListingCategory(id: string) {
  return listingCategories.some((c) => c.id === id);
}
