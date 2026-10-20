import { findChatRoom, getListing, listChatRooms, newId, saveChatRoom, withLock } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import type { ChatRoom } from "@/lib/types";

/** 내 채팅 목록(구매·판매 모두) */
export const GET = handle(async (req) => {
  const user = requireUser(req);
  const rooms = await listChatRooms(user.uid);
  return json({ rooms, unread: rooms.reduce((s, r) => s + (r.unread[user.uid] ?? 0), 0) });
});

/** 상품 상세의 '채팅하기': 상품 + 구매자 기준으로 방을 하나만 만든다(이미 있으면 그대로 반환). */
export const POST = handle(async (req) => {
  const buyer = requireUser(req);
  const { listingId } = await readJson<{ listingId?: string }>(req);
  const listing = listingId ? await getListing(listingId) : undefined;
  if (!listing || listing.status === "draft") throw new HttpError(404, "상품을 찾을 수 없어요.");
  if (listing.demo) throw new HttpError(400, "예시 상품의 판매자와는 채팅할 수 없어요.");
  if (listing.seller.uid === buyer.uid) throw new HttpError(400, "내 상품에는 채팅을 시작할 수 없어요.");
  const room = await withLock(`chat-open:${listing.id}:${buyer.uid}`, async () => {
    const existing = await findChatRoom(listing.id, buyer.uid);
    if (existing) return existing;
    const now = new Date().toISOString();
    const created: ChatRoom = {
      id: newId("c_"),
      listingId: listing.id,
      listingTitle: listing.title,
      listingImage: listing.images[0]?.startsWith("/") ? listing.images[0] : undefined,
      buyer,
      seller: listing.seller,
      lastAt: now,
      unread: {},
      createdAt: now,
    };
    await saveChatRoom(created);
    return created;
  });
  return json({ room }, 201);
});
