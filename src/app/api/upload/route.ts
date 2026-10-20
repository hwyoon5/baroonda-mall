import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { handle, HttpError, json, readJson, requireUser } from "@/lib/server/http";
import { MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, PHOTO_TYPES, VIDEO_TYPES } from "@/lib/media";

export const dynamic = "force-dynamic";

const blobEnabled = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

/** 업로드 저장소(Vercel Blob) 연결 여부. 미연결이면 사진은 data URL로, 동영상은 비활성. */
export const GET = handle(async () => json({ enabled: blobEnabled() }));

/** 브라우저 → Vercel Blob 직접 업로드용 토큰 발급(로그인 사용자만, 형식·용량 제한). */
export const POST = handle(async (req) => {
  if (!blobEnabled()) throw new HttpError(503, "사진·동영상 저장소(Vercel Blob)가 아직 연결되지 않았어요.");
  const body = await readJson<HandleUploadBody>(req);
  if (body.type === "blob.generate-client-token") requireUser(req);
  const result = await handleUpload({
    body,
    request: req,
    onBeforeGenerateToken: async (pathname) => {
      const user = requireUser(req);
      const dir = /^listings\/(photo|video)\/[\w.-]{1,80}$/.exec(pathname)?.[1];
      if (!dir) throw new HttpError(400, "업로드 경로가 올바르지 않아요.");
      const video = dir === "video";
      return {
        allowedContentTypes: video ? VIDEO_TYPES : PHOTO_TYPES,
        maximumSizeInBytes: video ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES,
        addRandomSuffix: true,
        tokenPayload: user.uid,
      };
    },
  });
  return json(result);
});
