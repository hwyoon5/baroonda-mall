/** 판매글 사진·동영상 규칙. 클라이언트(SellForm)와 서버(listing-input, /api/upload)가 같이 쓴다. */
export const MAX_PHOTOS = 10;
/** 저장소에 올라가는 사진 1장 최대 용량(기기에서 1280px JPEG로 줄인 뒤 기준). */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** 기기에서 고를 수 있는 원본 사진 최대 용량. 원본은 서버로 보내지 않고 기기에서 줄여 올린다. */
export const MAX_PHOTO_SOURCE_BYTES = 20 * 1024 * 1024;
export const MAX_VIDEOS = 2;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_SECONDS = 60;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];

/** 사업자 서류(사업자등록증·통신판매업 신고증 사본) */
export const DOC_TYPES = [...PHOTO_TYPES, "application/pdf"];
export const MAX_DOC_BYTES = 10 * 1024 * 1024;

export type MediaDir = "photo" | "video" | "doc";
export const mediaPath = (dir: MediaDir) => (dir === "doc" ? "business/doc" : `listings/${dir}`);

/** Vercel Blob(public)에 /api/upload로 올린 파일 URL인지 확인한다. */
export function isBlobUrl(src: unknown, dir: MediaDir): src is string {
  if (typeof src !== "string" || src.length > 500) return false;
  try {
    const u = new URL(src);
    return u.protocol === "https:" && u.hostname.endsWith(".public.blob.vercel-storage.com") && u.pathname.startsWith(`/${mediaPath(dir)}/`);
  } catch {
    return false;
  }
}
