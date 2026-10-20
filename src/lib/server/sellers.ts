import { listListings, listReviewsForSeller } from "./db";

/** 판매자 프로필: 판매 상품·통계·거래 후기 (Shopify/당근 프로필 공통 정보) */
export async function getSellerProfile(uid: string) {
  const [listings, reviews] = await Promise.all([listListings({ sellerUid: uid, includeSold: true }), listReviewsForSeller(uid)]);
  const visible = listings.filter((l) => l.status !== "paused");
  if (visible.length === 0 && reviews.length === 0) return null;
  const seller = listings[0]?.seller ?? { uid, username: uid };
  const rating = reviews.length ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10 : null;
  return {
    seller,
    stats: {
      selling: visible.filter((l) => l.status === "selling").length,
      sold: visible.filter((l) => l.status === "sold").length,
      reviews: reviews.length,
      rating,
    },
    listings: visible,
    reviews,
  };
}
