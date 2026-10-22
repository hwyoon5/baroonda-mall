import { normalizeCategory } from "@/lib/categories";
import type { SellerBusiness } from "@/lib/business";
import { randomUUID } from "node:crypto";
import { demoListings } from "../seed";
import type { ChatMessage, ChatRoom, Listing, Order, PiUser, Review, Short } from "../types";
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
  hgetall(hash: string): Promise<Record<string, string>>;
  hincr(hash: string, field: string): Promise<number>;
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
    hgetall: async (hash) => Object.fromEntries(h(hash)),
    hincr: async (hash, field) => {
      const n = Number(h(hash).get(field) ?? 0) + 1;
      h(hash).set(field, String(n));
      return n;
    },
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
    hgetall: async (hash) => {
      const flat = (await cmd<string[] | null>("HGETALL", hash)) ?? [];
      const out: Record<string, string> = {};
      for (let i = 0; i + 1 < flat.length; i += 2) out[flat[i]] = flat[i + 1];
      return out;
    },
    hincr: (hash, field) => cmd<number>("HINCRBY", hash, field, "1"),
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
  return { ...base, hset: fail, hincr: fail, lock: fail };
}

const kv: Kv = storageMode === "redis" ? redisKv(redisUrl!, redisToken!) : storageMisconfigured ? guarded(memoryKv()) : memoryKv();

const K = { listings: "bo:listings", orders: "bo:orders", payments: "bo:payment-order", chats: "bo:chats", chatIndex: "bo:chat-index", reviews: "bo:reviews", business: "bo:business", shorts: "bo:shorts", views: "bo:views", config: "bo:config" };

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
  /** 개인 중고는 판매하지 않는다. 예전에 올라온 중고는 판매자 본인 관리 화면에서만 보인다. */
  includeUsed?: boolean;
};

/** 예시 상품을 맡아 관리하는 운영자 Pi 계정(DEMO_SELLER_USERNAME). 그 계정으로 로그인하면 기록된다. */
export const demoSellerUsername = process.env.DEMO_SELLER_USERNAME?.trim().replace(/^@/, "") || undefined;

export async function getDemoOwner(): Promise<PiUser | undefined> {
  const raw = await kv.hget(K.config, "demo-owner");
  return raw ? (JSON.parse(raw) as PiUser) : undefined;
}

/** 로그인한 사용자가 운영자 계정이면 예시 상품 소유자로 연결한다. */
export async function claimDemoOwner(user: PiUser) {
  if (!demoSellerUsername || user.username.toLowerCase() !== demoSellerUsername.toLowerCase()) return;
  const cur = await getDemoOwner();
  if (cur?.uid === user.uid && cur.username === user.username) return;
  await kv.hset(K.config, "demo-owner", JSON.stringify(user));
}

/** 예시 상품은 화면에 보이는 판매자 이름은 그대로 두고, 실제 소유(관리·정산)는 운영자 계정으로 돌린다. */
function ownDemo(l: Listing, owner: PiUser | undefined): Listing {
  if (normalizeCategory(l.category) !== l.category) l = { ...l, category: normalizeCategory(l.category) };
  return l.demo && owner && l.seller.uid !== owner.uid ? { ...l, seller: { uid: owner.uid, username: l.seller.username } } : l;
}

/** 예시 판매자 계정(demo-*)이 아직 운영자에게 연결되지 않은 상품인지 */
export const isUnclaimedDemo = (l: Listing) => !!l.demo && l.seller.uid.startsWith("demo-");

export async function listListings(f: ListingFilter = {}): Promise<Listing[]> {
  const [vals, owner] = await Promise.all([kv.hvals(K.listings), getDemoOwner()]);
  const byId = new Map(demoListings().map((l) => [l.id, l]));
  // 한 번이라도 저장된(구매·수정된) 예시 상품은 저장본이 우선이다.
  for (const v of vals) {
    const l = JSON.parse(v) as Listing;
    byId.set(l.id, l);
  }
  let all = [...byId.values()].map((l) => ownDemo(l, owner));
  if (f.ids) all = all.filter((l) => f.ids!.includes(l.id));
  if (f.sellerUid) all = all.filter((l) => l.seller.uid === f.sellerUid);
  if (!f.includeUsed) all = all.filter((l) => l.condition === "new");
  if (f.category) all = all.filter((l) => l.category === f.category);
  if (f.dealsOnly) all = all.filter((l) => l.todayDeal && l.originalPricePi && l.originalPricePi > l.pricePi && l.status === "selling");
  if (f.q) {
    const q = f.q.toLowerCase();
    all = all.filter((l) => `${l.title} ${l.brand ?? ""} ${l.description}`.toLowerCase().includes(q));
  }
  if (!f.includeDrafts) all = all.filter((l) => l.status !== "draft");
  if (!f.includeSold) all = all.filter((l) => l.status !== "sold" && l.status !== "paused");
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getListing(id: string): Promise<Listing | undefined> {
  const [raw, owner] = await Promise.all([kv.hget(K.listings, id), getDemoOwner()]);
  const l = raw ? (JSON.parse(raw) as Listing) : demoListings().find((d) => d.id === id);
  return l && ownDemo(l, owner);
}

export async function saveListing(listing: Listing) {
  await kv.hset(K.listings, listing.id, JSON.stringify({ ...listing, stats: undefined }));
}

export const addListingView = (id: string) => kv.hincr(K.views, id);

/** 카드용 조회수·후기 평점·배송 조건을 붙인다. 저장하지 않는 표시용 값. */
export async function withStats(listings: Listing[]): Promise<Listing[]> {
  if (!listings.length) return listings;
  const needsBiz = [...new Set(listings.filter((l) => l.condition === "new" && !l.policy).map((l) => l.seller.uid))];
  const [views, reviews, businesses] = await Promise.all([
    kv.hgetall(K.views),
    kv.hvals(K.reviews),
    Promise.all(needsBiz.map(async (uid) => [uid, await getBusiness(uid)] as const)),
  ]);
  const ratings = new Map<string, number[]>();
  for (const r of reviews.map((v) => JSON.parse(v) as Review)) ratings.set(r.listingId, [...(ratings.get(r.listingId) ?? []), r.rating]);
  const biz = new Map(businesses);
  return listings.map((l) => {
    const rs = ratings.get(l.id) ?? [];
    return {
      ...l,
      stats: {
        views: Number(views[l.id] ?? 0),
        reviews: rs.length,
        rating: rs.length ? Math.round((rs.reduce((a, b) => a + b, 0) / rs.length) * 10) / 10 : undefined,
        shipping: l.condition === "new" ? (l.policy ? l.policy.shipping : biz.get(l.seller.uid)?.shipping) : undefined,
      },
    };
  });
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

// ---------- 쇼츠 ----------
export async function getShort(id: string): Promise<Short | undefined> {
  const raw = await kv.hget(K.shorts, id);
  const short = raw ? (JSON.parse(raw) as Short) : undefined;
  return short?.status === "deleted" ? undefined : short;
}

export async function saveShort(short: Short) {
  await kv.hset(K.shorts, short.id, JSON.stringify(short));
}

/** 최신순. 기본은 공개 쇼츠만, includeHidden이면 숨김도 포함(삭제는 항상 제외). */
export async function listShorts(f: { authorUid?: string; includeHidden?: boolean } = {}) {
  return (await kv.hvals(K.shorts))
    .map((v) => JSON.parse(v) as Short)
    .filter((s) => s.status === "public" || (f.includeHidden && s.status === "hidden"))
    .filter((s) => !f.authorUid || s.author.uid === f.authorUid)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
