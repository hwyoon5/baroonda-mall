import { addChatMessage, getChatRoom, listChatMessages, newId, saveChatRoom, withLock } from "@/lib/server/db";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";
import type { ChatMessage } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };
const MAX_TEXT = 1000;

async function load(req: Request, { params }: Ctx) {
  const user = requireUser(req);
  const room = await getChatRoom((await params).id);
  if (!room || (room.buyer.uid !== user.uid && room.seller.uid !== user.uid)) throw new HttpError(404, "채팅방을 찾을 수 없어요.");
  return { user, room };
}

/** 메시지 조회(?after=ISO 이후만). 조회하면 내 안 읽은 수를 0으로 만든다. */
export const GET = handle<Ctx>(async (req, ctx) => {
  const { user, room } = await load(req, ctx);
  const after = new URL(req.url).searchParams.get("after");
  const all = await listChatMessages(room.id);
  if (room.unread[user.uid]) {
    await withLock(`chat:${room.id}`, async () => {
      const cur = (await getChatRoom(room.id))!;
      cur.unread[user.uid] = 0;
      await saveChatRoom(cur);
    });
    room.unread[user.uid] = 0;
  }
  return json({ room, messages: after ? all.filter((m) => m.createdAt > after) : all });
});

/** 메시지 보내기: 상대방 안 읽은 수 +1, 목록 미리보기 갱신 */
export const POST = handle<Ctx>(async (req, ctx) => {
  const { user, room } = await load(req, ctx);
  const { text } = await readJson<{ text?: string }>(req);
  const body = typeof text === "string" ? text.trim() : "";
  if (!body) throw new HttpError(400, "메시지를 입력해 주세요.");
  if (body.length > MAX_TEXT) throw new HttpError(400, `메시지는 ${MAX_TEXT}자까지 보낼 수 있어요.`);
  const other = room.buyer.uid === user.uid ? room.seller.uid : room.buyer.uid;
  // 시각은 잠금 안에서 정해 저장 순서와 createdAt 순서를 맞춘다(?after= 커서가 메시지를 건너뛰지 않도록).
  const msg = await withLock(`chat:${room.id}`, async () => {
    const cur = (await getChatRoom(room.id))!;
    const at = new Date(Math.max(Date.now(), cur.lastMessage === undefined ? 0 : Date.parse(cur.lastAt) + 1)).toISOString();
    const m: ChatMessage = { id: newId("m_"), roomId: room.id, senderUid: user.uid, text: body, createdAt: at };
    await addChatMessage(m);
    cur.lastMessage = body.slice(0, 80);
    cur.lastAt = m.createdAt;
    cur.unread[other] = (cur.unread[other] ?? 0) + 1;
    await saveChatRoom(cur);
    return m;
  });
  return json({ message: msg }, 201);
});
