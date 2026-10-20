import { upload } from "@vercel/blob/client";
import { TOKEN_KEY } from "./api";
import type { MediaDir } from "@/lib/media";

/** 브라우저에서 Vercel Blob으로 직접 올리고 공개 URL을 돌려준다(서버 함수 용량 제한 우회). */
export async function uploadMedia(file: Blob, dir: MediaDir, ext: string, onProgress?: (pct: number) => void, signal?: AbortSignal) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await upload(`listings/${dir}/${Date.now().toString(36)}.${ext}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
    abortSignal: signal,
  });
  return res.url;
}

/**
 * 동영상 길이(초)와, 원하면 대표 프레임(JPEG). 브라우저가 못 읽으면 null.
 * 검사용 video 요소는 끝나면 src를 비워 디코더를 바로 돌려준다(모바일 WebView는 동시 디코더 수가 적어서, 남겨 두면 다음 선택·재생이 멈출 수 있다).
 */
export async function inspectVideo(file: File, withPoster = false): Promise<{ duration: number | null; poster: Blob | null }> {
  const url = URL.createObjectURL(file);
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "metadata";
  try {
    const duration = await new Promise<number | null>((resolve) => {
      const t = setTimeout(() => resolve(null), 5000);
      v.onloadedmetadata = () => {
        clearTimeout(t);
        resolve(Number.isFinite(v.duration) ? v.duration : null);
      };
      v.onerror = () => {
        clearTimeout(t);
        resolve(null);
      };
      v.src = url;
    });
    const poster = withPoster && duration !== null ? await grabFrame(v, Math.min(0.5, duration / 2)) : null;
    return { duration, poster };
  } finally {
    v.onloadedmetadata = v.onerror = v.onseeked = null;
    v.removeAttribute("src");
    v.load();
    URL.revokeObjectURL(url);
  }
}

async function grabFrame(v: HTMLVideoElement, at: number): Promise<Blob | null> {
  const seeked = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 4000);
    v.onseeked = () => {
      clearTimeout(t);
      resolve(true);
    };
    v.currentTime = at;
  });
  if (!seeked || !v.videoWidth) return null;
  const scale = Math.min(1, 540 / v.videoWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(v, 0, 0, c.width, c.height);
  } catch {
    return null;
  }
  return new Promise((resolve) => c.toBlob((b) => resolve(b), "image/jpeg", 0.8));
}

export const videoDuration = async (file: File) => (await inspectVideo(file)).duration;

export const videoExt = (type: string) => (type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4");
