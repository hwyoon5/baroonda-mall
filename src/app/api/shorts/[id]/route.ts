import { getShort, saveShort } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { ownListingId, parseCaption, parsePosterUrl, toViews } from "@/lib/server/shorts";

type Ctx = { params: Promise<{ id: string }> };

async function own(req: Request, { params }: Ctx) {
  const user = requireUser(req);
  const short = await getShort((await params).id);
  if (!short || short.author.uid !== user.uid) throw new HttpError(404, "쇼츠를 찾을 수 없어요.");
  return { user, short };
}

/** 공개/숨김 전환, 설명·연결 상품·대표 이미지 수정 (작성자만) */
export const PATCH = handle<Ctx>(async (req, ctx) => {
  const { user, short } = await own(req, ctx);
  const b = await readJson<{ status?: unknown; caption?: unknown; listingId?: unknown; posterUrl?: unknown }>(req);
  if (b.status !== undefined) {
    if (b.status !== "public" && b.status !== "hidden") throw new HttpError(400, "상태 값이 올바르지 않아요.");
    short.status = b.status;
  }
  if (b.caption !== undefined) short.caption = parseCaption(b.caption);
  if (b.listingId !== undefined) short.listingId = await ownListingId(user.uid, b.listingId);
  if (b.posterUrl !== undefined) short.posterUrl = parsePosterUrl(b.posterUrl);
  await saveShort(short);
  return json({ short: (await toViews([short]))[0] });
});

export const DELETE = handle<Ctx>(async (req, ctx) => {
  const { short } = await own(req, ctx);
  short.status = "deleted";
  await saveShort(short);
  return json({ ok: true });
});
