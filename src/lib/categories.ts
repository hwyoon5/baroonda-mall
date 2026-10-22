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
  cat("digital", "디지털/가전", "💻", "bg-sky-50"),
  cat("living", "생활용품", "🧻", "bg-amber-50"),
  cat("sports", "스포츠/취미", "⚽", "bg-emerald-50"),
  cat("pet", "반려동물", "🐶", "bg-lime-50"),
  cat("interior", "인테리어/가구", "🛋️", "bg-orange-50"),
  cat("health", "건강/영양제", "💊", "bg-teal-50"),
  cat("books", "도서/티켓/서비스", "📚", "bg-indigo-50"),
];

/** 메인 퀵 메뉴(5열 × 2줄) */
export const homeCategories: Category[] = listingCategories;

/** 통합된 예전 카테고리 → 현재 카테고리 */
const mergedCategories: Record<string, string> = { baby: "fashion" };

export const normalizeCategory = (id: string) => mergedCategories[id] ?? id;

export function findCategory(id: string) {
  return listingCategories.find((c) => c.id === id);
}

export function isListingCategory(id: string) {
  return listingCategories.some((c) => c.id === id);
}
