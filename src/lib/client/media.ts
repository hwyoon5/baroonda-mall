import { upload } from "@vercel/blob/client";
import { TOKEN_KEY } from "./api";
import { mediaPath, type MediaDir } from "@/lib/media";

/** 브라우저에서 Vercel Blob으로 직접 올리고 공개 URL을 돌려준다(서버 함수 용량 제한 우회). */
export async function uploadMedia(file: Blob, dir: MediaDir, ext: string, onProgress?: (pct: number) => void, signal?: AbortSignal) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await upload(`${mediaPath(dir)}/${Date.now().toString(36)}.${ext}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    multipart: file.size > 8 * 1024 * 1024,
    onUploadProgress: onProgress ? (e) => onProgress(Math.round(e.percentage)) : undefined,
    abortSignal: signal,
  });
  return res.url;
}

/** 검사용 video 요소를 메타데이터까지 읽는다. 못 읽으면 null. */
function openVideo(src: string, remote: boolean): Promise<HTMLVideoElement | null> {
  const v = document.createElement("video");
  v.muted = true;
  v.playsInline = true;
  v.preload = "auto";
  // 원격(Blob) 영상은 CORS로 받아야 canvas에 그린 프레임을 저장할 수 있다.
  if (remote) v.crossOrigin = "anonymous";
  return new Promise((resolve) => {
    const t = setTimeout(() => done(false), remote ? 15000 : 5000);
    const done = (ok: boolean) => {
      clearTimeout(t);
      v.onloadedmetadata = v.onerror = null;
      if (ok) return resolve(v);
      releaseVideo(v);
      resolve(null);
    };
    v.onloadedmetadata = () => done(true);
    v.onerror = () => done(false);
    v.src = src;
  });
}

/** src를 비워 디코더를 바로 돌려준다(모바일 WebView는 동시 디코더 수가 적다). */
function releaseVideo(v: HTMLVideoElement) {
  v.onloadedmetadata = v.onerror = v.onseeked = null;
  v.removeAttribute("src");
  v.load();
}

const finite = (n: number) => (Number.isFinite(n) && n > 0 ? n : null);

/** 동영상 길이(초)와, 원하면 대표 프레임(JPEG). 브라우저가 못 읽으면 null. */
export async function inspectVideo(file: File, withPoster = false): Promise<{ duration: number | null; poster: Blob | null }> {
  const url = URL.createObjectURL(file);
  const v = await openVideo(url, false);
  try {
    const duration = v ? finite(v.duration) : null;
    const poster = withPoster && v ? await grabPoster(v, duration) : null;
    return { duration, poster };
  } finally {
    if (v) releaseVideo(v);
    URL.revokeObjectURL(url);
  }
}

/** 이미 올린 동영상(Blob URL)에서 대표 프레임을 만든다. 대표 이미지 없이 등록된 쇼츠용. */
export async function posterFromUrl(src: string): Promise<Blob | null> {
  const v = await openVideo(src, true);
  if (!v) return null;
  try {
    return await grabPoster(v, finite(v.duration));
  } finally {
    releaseVideo(v);
  }
}

/** 앞부분 몇 군데를 찍어 보고, 거의 검은 화면(페이드 인 등)이 아닌 첫 프레임을 고른다. */
async function grabPoster(v: HTMLVideoElement, duration: number | null): Promise<Blob | null> {
  const d = duration ?? 1;
  const times = [Math.min(0.5, d / 2), Math.min(1.5, d * 0.25), d * 0.5];
  let fallback: HTMLCanvasElement | null = null;
  for (const at of times) {
    const c = await frameAt(v, at);
    if (!c) continue;
    if (!isDark(c)) return toJpeg(c);
    fallback ??= c;
  }
  return fallback ? toJpeg(fallback) : null;
}

async function frameAt(v: HTMLVideoElement, at: number): Promise<HTMLCanvasElement | null> {
  const seeked = await new Promise<boolean>((resolve) => {
    const t = setTimeout(() => resolve(false), 8000);
    v.onseeked = () => {
      clearTimeout(t);
      resolve(true);
    };
    v.currentTime = at;
  });
  v.onseeked = null;
  if (!seeked || !v.videoWidth) return null;
  // seek 직후 일부 WebView는 프레임을 아직 안 올려서 검은 화면이 그려진다. 한 프레임 기다린다.
  await new Promise<void>((resolve) => {
    const rvfc = (v as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number }).requestVideoFrameCallback;
    const t = setTimeout(resolve, 300);
    if (rvfc && v.readyState < 2) rvfc.call(v, () => (clearTimeout(t), resolve()));
    else requestAnimationFrame(() => requestAnimationFrame(() => (clearTimeout(t), resolve())));
  });
  const scale = Math.min(1, 540 / v.videoWidth);
  const c = document.createElement("canvas");
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  try {
    ctx.drawImage(v, 0, 0, c.width, c.height);
    ctx.getImageData(0, 0, 1, 1); // CORS로 오염된 canvas면 여기서 실패
  } catch {
    return null;
  }
  return c;
}

function isDark(c: HTMLCanvasElement) {
  const s = document.createElement("canvas");
  s.width = s.height = 16;
  const ctx = s.getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(c, 0, 0, 16, 16);
  const px = ctx.getImageData(0, 0, 16, 16).data;
  let sum = 0;
  for (let i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
  return sum / (px.length / 4) / 3 < 12;
}

const toJpeg = (c: HTMLCanvasElement) => new Promise<Blob | null>((resolve) => c.toBlob((b) => resolve(b), "image/jpeg", 0.8));

export const videoDuration = async (file: File) => (await inspectVideo(file)).duration;

export const videoExt = (type: string) => (type === "video/quicktime" ? "mov" : type === "video/webm" ? "webm" : "mp4");

/** 긴 변 maxSide px로 줄인 캔버스. */
export async function resizeImage(file: File, maxSide: number): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export const canvasToJpeg = (c: HTMLCanvasElement, quality = 0.8) =>
  new Promise<Blob>((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob"))), "image/jpeg", quality));
