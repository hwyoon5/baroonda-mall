import { isBlobUrl } from "@/lib/media";
import { MAX_SHORTS_PER_USER } from "@/lib/shorts";
import { listShorts, newId, saveShort, withLock } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import { ownListingId, parseCaption, parsePosterUrl, toViews } from "@/lib/server/shorts";
import type { Short } from "@/lib/types";

/** 공개 피드(최신순). author=me 면 내 쇼츠(숨김 포함), author=<uid> 면 해당 사용자의 공개 쇼츠. */
export const GET = handle(async (req) => {
  const author = new URL(req.url).searchParams.get("author");
  const mine = author === "me";
  const shorts = await listShorts({ authorUid: mine ? requireUser(req).uid : (author ?? undefined), includeHidden: mine });
  return json({ shorts: await toViews(shorts.slice(0, 100)) });
});

export const POST = handle(async (req) => {
  const user = requireUser(req);
  const b = await readJson<{ videoUrl?: unknown; posterUrl?: unknown; caption?: unknown; listingId?: unknown }>(req);
  const videoUrl = b.videoUrl;
  if (!isBlobUrl(videoUrl, "video")) throw new HttpError(400, "동영상을 먼저 올려 주세요.");
  const posterUrl = parsePosterUrl(b.posterUrl);
  const caption = parseCaption(b.caption);
  const listingId = await ownListingId(user.uid, b.listingId);
  const short = await withLock(`shorts:${user.uid}`, async () => {
    if ((await listShorts({ authorUid: user.uid, includeHidden: true })).length >= MAX_SHORTS_PER_USER) {
      throw new HttpError(400, `쇼츠는 최대 ${MAX_SHORTS_PER_USER}개까지 등록할 수 있어요. 안 쓰는 쇼츠를 삭제해 주세요.`);
    }
    const s: Short = { id: newId("s_"), videoUrl, posterUrl, caption, listingId, author: user, status: "public", createdAt: new Date().toISOString() };
    await saveShort(s);
    return s;
  });
  return json({ short: (await toViews([short]))[0] }, 201);
});
