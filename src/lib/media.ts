/** 판매글 사진·동영상 규칙. 클라이언트(SellForm)와 서버(listing-input, /api/upload)가 같이 쓴다. */
export const MAX_PHOTOS = 10;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

export type MediaDir = "photo" | "video";

/** Vercel Blob(public)에 /api/upload로 올린 파일 URL인지 확인한다. */
export function isBlobUrl(src: unknown, dir: MediaDir): src is string {
  if (typeof src !== "string" || src.length > 500) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith(`/listings/${dir}/`);
  } catch {
    return false;
  }
}
