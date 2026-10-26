import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { handle, HttpError, json, readJson, requireUser } from "@/lib/server/http";
import { assertDailyQuota } from "@/lib/server/limits";
import { DOC_TYPES, MAX_DOC_BYTES, MAX_PHOTO_BYTES, MAX_VIDEO_BYTES, PHOTO_TYPES, VIDEO_TYPES } from "@/lib/media";

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
      const m = /^(?:listings\/(photo|video)|business\/(doc))\/[\w.-]{1,80}$/.exec(pathname);
      const dir = m?.[1] ?? m?.[2];
      if (!dir) throw new HttpError(400, "업로드 경로가 올바르지 않아요.");
      await assertDailyQuota(user, "upload");
      const [types, max] = dir === "video" ? [VIDEO_TYPES, MAX_VIDEO_BYTES] : dir === "doc" ? [DOC_TYPES, MAX_DOC_BYTES] : [PHOTO_TYPES, MAX_PHOTO_BYTES];
      return {
        allowedContentTypes: types,
        maximumSizeInBytes: max,
        addRandomSuffix: true,
        tokenPayload: user.uid,
      };
    },
  });
  return json(result);
});
