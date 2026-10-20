import { upload } from "@vercel/blob/client";
import { TOKEN_KEY } from "./api";
import type { MediaDir } from "@/lib/media";

/** 브라우저에서 Vercel Blob으로 직접 올리고 공개 URL을 돌려준다(서버 함수 용량 제한 우회). */
export async function uploadMedia(file: Blob, dir: MediaDir, ext: string, onProgress?: (pct: number) => void) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await upload(`listings/${dir}/${Date.now().toString(36)}.${ext}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
  });
  return res.url;
}

/** 동영상 길이(초). 브라우저가 코덱을 못 읽으면 null. */
export async function videoDuration(file: File): Promise<number | null> {
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<number | null>((resolve) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => resolve(Number.isFinite(v.duration) ? v.duration : null);
      v.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 8000);
      v.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const videoExt = (type: string) => (type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4");
