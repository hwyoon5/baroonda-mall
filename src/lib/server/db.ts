import type { SellerBusiness } from "@/lib/business";
import { randomUUID } from "node:crypto";
import { demoListings } from "../seed";
import type { ChatMessage, ChatRoom, Listing, Order, Review } from "../types";
import { HttpError } from "./http";
import { PiConfigError } from "./pi";

/**
 * 저장소: Upstash Redis(REST) 환경변수가 있으면 Redis, 없으면 프로세스 메모리.
 * 메모리 저장소는 서버리스 인스턴스마다 따로이고 재시작 시 사라지므로 로컬 개발용이다.
 */
type Kv = {
  hget(hash: string, field: string): Promise<string | null>;
  hset(hash: string, field: string, value: string): Promise<void>;
  hvals(hash: string): Promise<string[]>;
  /** 성공하면 해제 함수, 이미 잠겨 있으면 null */
  lock(key: string, ttlMs: number): Promise<(() => Promise<void>) | null>;
};

function memoryKv(): Kv {
  const g = globalThis as { __baroondaKv?: Map<string, Map<string, string>>; __baroondaLocks?: Set<string> };
  const root = (g.__baroondaKv ??= new Map());
  const locks = (g.__baroondaLocks ??= new Set());
  const h = (name: string) => {
    let m = root.get(name);
    if (!m) root.set(name, (m = new Map()));
    return m;
  };
  return {
    hget: async (hash, field) => h(hash).get(field) ?? null,
    hset: async (hash, field, value) => void h(hash).set(field, value),
    hvals: async (hash) => [...h(hash).values()],
    lock: async (key) => {
      if (locks.has(key)) return null;
      locks.add(key);
      return async () => void locks.delete(key);
    },
  };
}

function redisKv(url: string, token: string): Kv {
  const cmd = async <T>(...args: string[]): Promise<T> => {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Redis ${res.status}: ${await res.text()}`);
    return ((await res.json()) as { result: T }).result;
  };
  return {
    hget: (hash, field) => cmd<string | null>("HGET", hash, field),
    hset: async (hash, field, value) => void (await cmd("HSET", hash, field, value)),
    hvals: (hash) => cmd<string[]>("HVALS", hash),
    lock: async (key, ttlMs) => {
      const k = `bo:lock:${key}`;
      const token = randomUUID();
      if ((await cmd<string | null>("SET", k, token, "NX", "PX", String(ttlMs))) !== "OK") return null;
      const unlock = "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
      return async () => void (await cmd("EVAL", unlock, "1", k, token));
    },
  };
}

const redisUrl = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
export const storageMode: "redis" | "memory" = redisUrl && redisToken ? "redis" : "memory";
/** Vercel 운영 배포에서 메모리 저장소는 인스턴스마다 데이터가 달라 주문·정산이 유실된다 → 쓰기를 막는다. */
export const storageMisconfigured = storageMode === "memory" && process.env.VERCEL_ENV === "production" && process.env.PI_MOCK !== "1";

function guarded(base: Kv): Kv {
  const fail = async (): Promise<never> => {
    throw new PiConfigError("저장소(Upstash Redis)가 연결되지 않아 저장할 수 없어요. 관리자에게 문의해 주세요.");
  };
  return { ...base, hset: fail, lock: fail };
}

const kv: Kv = storageMode === "redis" ? redisKv(redisUrl!, redisToken!) : storageMisconfigured ? guarded(memoryKv()) : memoryKv();

const K = { listings: "bo:listings", orders: "bo:orders", payments: "bo:payment-order", chats: "bo:chats", chatIndex: "bo:chat-index", reviews: "bo:reviews", business: "bo:business" };

/** 재고·주문 상태를 바꾸는 구간을 직렬화한다(Redis SET NX 락, 개발용 메모리 락). */
export async function withLock<T>(key: string, fn: () => Promise<T>, ttlMs = 20_000): Promise<T> {
  for (let i = 0; i < 150; i++) {
    const unlock = await kv.lock(key, ttlMs);
    if (unlock) {
      try {
        return await fn();
      } finally {
        await unlock().catch(() => undefined);
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new HttpError(503, "주문이 몰리고 있어요. 잠시 후 다시 시도해 주세요.");
}

export const newId = (prefix: string) => `${prefix}${randomUUID().replace(/-/g, "").slice(0, 12)}`;

export type ListingFilter = {
  category?: string;
  q?: string;
  sellerUid?: string;
  ids?: string[];
  dealsOnly?: boolean;
  includeSold?: boolean;
  includeDrafts?: boolean;
};

export async function listListings(f: ListingFilter = {}): Promise<Listing[]> {
  const stored = (await kv.hvals(K.listings)).map((v) => JSON.parse(v) as Listing);
  let all = [...stored, ...demoListings()];
  if (f.ids) all = all.filter((l) => f.ids!.includes(l.id));
  if (f.sellerUid) all = all.filter((l) => l.seller.uid === f.sellerUid);
  if (f.category === "used") all = all.filter((l) => l.condition === "used");
  else if (f.category) all = all.filter((l) => l.category === f.category);
  if (f.dealsOnly) all = all.filter((l) => l.originalPricePi && l.originalPricePi > l.pricePi && l.status === "selling");
  if (f.q) {
    const q = f.q.toLowerCase();
    all = all.filter((l) => `${l.title} ${l.description}`.toLowerCase().includes(q));
  }
  if (!f.includeDrafts) all = all.filter((l) => l.status !== "draft");
  if (!f.includeSold) all = all.filter((l) => l.status !== "sold" && l.status !== "paused");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getListing(id: string): Promise<Listing | undefined> {
  const raw = await kv.hget(K.listings, id);
  if (raw) return JSON.parse(raw) as Listing;
  return demoListings().find((l) => l.id === id);
}

export async function saveListing(listing: Listing) {
  if (listing.demo) return;
  await kv.hset(K.listings, listing.id, JSON.stringify(listing));
}

export async function getOrder(id: string): Promise<Order | undefined> {
  const raw = await kv.hget(K.orders, id);
  return raw ? (JSON.parse(raw) as Order) : undefined;
}

export async function saveOrder(order: Order) {
  order.updatedAt = new Date().toISOString();
  await kv.hset(K.orders, order.id, JSON.stringify(order));
  if (order.paymentId) await kv.hset(K.payments, order.paymentId, order.id);
}

export async function getOrderByPayment(paymentId: string) {
  const id = await kv.hget(K.payments, paymentId);
  return id ? getOrder(id) : undefined;
}

export async function listOrdersFor(uid: string) {
  const all = (await kv.hvals(K.orders)).map((v) => JSON.parse(v) as Order).filter((o) => o.status !== "created");
  const byDate = (a: Order, b: Order) => b.createdAt.localeCompare(a.createdAt);
  return {
    purchases: all.filter((o) => o.buyer.uid === uid).sort(byDate),
    sales: all.filter((o) => o.seller.uid === uid).sort(byDate),
  };
}

// ---------- 1:1 채팅 ----------
const chatMsgs = (roomId: string) => `bo:chat-msgs:${roomId}`;

export async function getChatRoom(id: string): Promise<ChatRoom | undefined> {
  const raw = await kv.hget(K.chats, id);
  return raw ? (JSON.parse(raw) as ChatRoom) : undefined;
}

export async function findChatRoom(listingId: string, buyerUid: string) {
  const id = await kv.hget(K.chatIndex, `${listingId}|${buyerUid}`);
  return id ? getChatRoom(id) : undefined;
}

export async function saveChatRoom(room: ChatRoom) {
  await kv.hset(K.chats, room.id, JSON.stringify(room));
  await kv.hset(K.chatIndex, `${room.listingId}|${room.buyer.uid}`, room.id);
}

export async function listChatRooms(uid: string) {
  return (await kv.hvals(K.chats))
    .map((v) => JSON.parse(v) as ChatRoom)
    .filter((r) => r.buyer.uid === uid || r.seller.uid === uid)
    .sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export async function addChatMessage(msg: ChatMessage) {
  await kv.hset(chatMsgs(msg.roomId), msg.id, JSON.stringify(msg));
}

export async function listChatMessages(roomId: string) {
  return (await kv.hvals(chatMsgs(roomId))).map((v) => JSON.parse(v) as ChatMessage).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

// ---------- 거래 후기 (key = orderId, 주문당 1개) ----------
export async function getBusiness(uid: string): Promise<SellerBusiness | undefined> {
  const raw = await kv.hget(K.business, uid);
  return raw ? (JSON.parse(raw) as SellerBusiness) : undefined;
}

export async function saveBusiness(uid: string, business: SellerBusiness) {
  await kv.hset(K.business, uid, JSON.stringify(business));
}

export async function getReviewByOrder(orderId: string): Promise<Review | undefined> {
  const raw = await kv.hget(K.reviews, orderId);
  return raw ? (JSON.parse(raw) as Review) : undefined;
}

export async function saveReview(review: Review) {
  await kv.hset(K.reviews, review.orderId, JSON.stringify(review));
}

export async function listReviewsForSeller(sellerUid: string) {
  return (await kv.hvals(K.reviews))
    .map((v) => JSON.parse(v) as Review)
    .filter((r) => r.sellerUid === sellerUid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
