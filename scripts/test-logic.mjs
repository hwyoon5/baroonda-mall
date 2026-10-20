// 핵심 로직 테스트: 브라우저 없이 API만으로 재고·결제·임시저장·발송 규칙을 검증한다.
// 사용법: PI_MOCK=1 NEXT_PUBLIC_PI_MOCK=1 npm run build && npm run test:logic
//   (BASE_URL을 주면 이미 떠 있는 서버를 사용, 없으면 PI_MOCK=1 next start를 직접 띄운다)
import assert from "node:assert/strict";
import { spawn } from "node:child_process";

const PORT = 3100;
let BASE = process.env.BASE_URL;
let server;
if (!BASE) {
  BASE = `http://localhost:${PORT}`;
  const busy = await fetch(BASE).then(() => true, () => false);
  if (busy) throw new Error(`포트 ${PORT}이 이미 사용 중이에요(이전 서버가 남아 있을 수 있어요). 종료 후 다시 실행해 주세요.`);
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, PI_MOCK: "1", NEXT_PUBLIC_PI_MOCK: "1" }, stdio: "ignore", detached: true });
  for (let i = 0; ; i++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {}
    if (i > 60) throw new Error("서버가 뜨지 않았어요. 먼저 PI_MOCK=1 NEXT_PUBLIC_PI_MOCK=1 npm run build 를 실행하세요.");
    await new Promise((r) => setTimeout(r, 500));
  }
}

const call = async (path, body, token, method) => {
  const r = await fetch(BASE + path, {
    method: method ?? (body === undefined ? "GET" : "POST"),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: r.status, data: await r.json().catch(() => ({})) };
};
const ok = async (...a) => {
  const r = await call(...a);
  assert.ok(r.status < 300, `${a[0]} → ${r.status} ${JSON.stringify(r.data)}`);
  return r.data;
};
const run = Date.now().toString(36);
const signin = async (n) => (await ok("/api/user/signin", { authResult: { accessToken: `mock:${n}${run}`, user: { uid: `mock-${n}${run}`, username: `${n}${run}` } } })).token;
const listing = async (id) => (await ok(`/api/listings/${id}`)).listing;
const buy = async (token, listingId, option) => {
  const { order } = await ok("/api/orders", { listingId, option }, token);
  await ok("/api/payments/approve", { paymentId: `p-${order.id}`, orderId: order.id }, token);
  await ok("/api/payments/complete", { paymentId: `p-${order.id}`, txid: `tx-${order.id}` }, token);
  return order;
};
const newBase = { category: "fashion", pricePi: 1, tradeMethods: ["delivery"], images: [], condition: "new" };

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
let seller, b1, b2;

test("인증: authResult 검증, uid 불일치 401", async () => {
  [seller, b1, b2] = await Promise.all([signin("seller"), signin("buyer1"), signin("buyer2")]);
  assert.equal((await call("/api/user/signin", { authResult: { accessToken: "mock:a", user: { uid: "other", username: "x" } } })).status, 401);
});

test("등록 검증: 판매 유형별 필수값", async () => {
  assert.equal((await call("/api/listings", { ...newBase, title: "t", condition: "used" }, seller)).status, 400);
  assert.equal((await call("/api/listings", { ...newBase, title: "t" }, seller)).status, 400);
  assert.equal((await call("/api/listings", { ...newBase, title: "t", options: [{ name: "사이즈", values: ["S"] }], variants: [] }, seller)).status, 400);
});

test("재고: 동시 결제 승인 시 1개만 성공(원자성)", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "동시성", stock: 1 }, seller);
  const [o1, o2] = await Promise.all([b1, b2].map(async (t) => (await ok("/api/orders", { listingId: l.id }, t)).order));
  const res = await Promise.all([
    call("/api/payments/approve", { paymentId: `p-${o1.id}`, orderId: o1.id }, b1),
    call("/api/payments/approve", { paymentId: `p-${o2.id}`, orderId: o2.id }, b2),
  ]);
  assert.deepEqual(res.map((r) => r.status).sort(), [200, 409]);
  let cur = await listing(l.id);
  assert.equal(cur.stock, 0);
  assert.equal(cur.committed, 1);
  assert.equal(cur.status, "sold");
  const [winner, token] = res[0].status === 200 ? [o1, b1] : [o2, b2];
  await ok("/api/payments/complete", { paymentId: `p-${winner.id}`, txid: "tx" }, token);
  cur = await listing(l.id);
  assert.equal(cur.committed, 0);
});

test("재고: 승인 후 취소하면 available/committed 복구", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "취소 복구", stock: 2 }, seller);
  const { order } = await ok("/api/orders", { listingId: l.id }, b1);
  await ok("/api/payments/approve", { paymentId: `p-${order.id}`, orderId: order.id }, b1);
  assert.deepEqual([(await listing(l.id)).stock, (await listing(l.id)).committed], [1, 1]);
  await ok("/api/payments/cancelled_payment", { paymentId: `p-${order.id}`, orderId: order.id }, b1);
  const cur = await listing(l.id);
  assert.deepEqual([cur.stock, cur.committed], [2, 0]);
});

test("옵션 조합별 재고: 품절 조합만 막히고 재입고 시 복구", async () => {
  const options = [
    { name: "사이즈", values: ["M", "L"] },
    { name: "색상", values: ["블랙", "화이트"] },
  ];
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "조합 재고", options, variants: [{ options: { 사이즈: "M", 색상: "블랙" }, stock: 1 }, { options: { 사이즈: "L", 색상: "화이트" }, stock: 2 }] }, seller);
  assert.equal(l.variants.length, 4);
  assert.equal(l.stock, 3);
  assert.equal((await call("/api/orders", { listingId: l.id, option: { 사이즈: "M" } }, b1)).status, 400);
  assert.equal((await call("/api/orders", { listingId: l.id, option: { 사이즈: "M", 색상: "화이트" } }, b1)).status, 409);
  const order = await buy(b1, l.id, { 사이즈: "M", 색상: "블랙" });
  assert.deepEqual(order.option, { 사이즈: "M", 색상: "블랙" });
  let cur = await listing(l.id);
  assert.equal(cur.variants.find((v) => v.options.사이즈 === "M" && v.options.색상 === "블랙").stock, 0);
  assert.equal(cur.stock, 2);
  assert.equal(cur.status, "selling");
  assert.equal((await call("/api/orders", { listingId: l.id, option: { 사이즈: "M", 색상: "블랙" } }, b2)).status, 409);
  const mb = cur.variants.find((v) => v.options.사이즈 === "M" && v.options.색상 === "블랙");
  await ok(`/api/listings/${l.id}`, { variants: [{ id: mb.id, stock: 3 }] }, seller, "PATCH");
  cur = await listing(l.id);
  assert.equal(cur.stock, 5);
  await buy(b2, l.id, { 사이즈: "M", 색상: "블랙" });
});

test("임시저장: 비공개, 이어서 작성 후 게시", async () => {
  const title = `임시저장 ${run}`;
  const { listing: d } = await ok("/api/listings", { title, draft: true, condition: "used" }, seller);
  assert.equal(d.status, "draft");
  assert.equal((await ok(`/api/listings?q=${encodeURIComponent(title)}`)).listings.length, 0);
  assert.equal((await call(`/api/listings/${d.id}`)).status, 401);
  assert.equal((await call(`/api/listings/${d.id}`, undefined, b1)).status, 404);
  assert.equal((await fetch(`${BASE}/listings/${d.id}`)).status, 404);
  assert.equal((await call(`/api/listings/${d.id}`, { title, condition: "used" }, seller, "PUT")).status, 400);
  const { listing: pub } = await ok(`/api/listings/${d.id}`, { ...newBase, title, condition: "used", usageGrade: "A", category: "digital" }, seller, "PUT");
  assert.equal(pub.status, "selling");
  assert.equal((await ok(`/api/listings?q=${encodeURIComponent(title)}`)).listings.length, 1);
});

test("개인 중고: 예약 → 발송(송장 검증) → 구매 확정 → 거래완료", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "중고 카메라", condition: "used", usageGrade: "B", category: "digital" }, seller);
  const order = await buy(b1, l.id);
  assert.equal((await listing(l.id)).status, "reserved");
  assert.equal((await call(`/api/orders/${order.id}`, { action: "ship", method: "delivery", carrier: "CJ대한통운", trackingNumber: "1".repeat(21) }, seller)).status, 400);
  assert.equal((await call(`/api/orders/${order.id}`, { action: "ship", method: "delivery", carrier: "없는택배", trackingNumber: "123456789" }, seller)).status, 400);
  assert.equal((await call(`/api/orders/${order.id}`, { action: "ship", method: "delivery", carrier: "CJ대한통운", trackingNumber: "123456789" }, b1)).status, 403);
  const shipped = (await ok(`/api/orders/${order.id}`, { action: "ship", method: "delivery", carrier: "CJ대한통운", trackingNumber: "6012-3456-7890" }, seller)).order;
  assert.equal(shipped.fulfillment.trackingNumber, "6012-3456-7890");
  await ok(`/api/orders/${order.id}`, { action: "confirm" }, b1);
  assert.equal((await listing(l.id)).status, "sold");
});

test("판매 중지: 공개 목록에서 숨김, 구매 불가, 재개 시 복구", async () => {
  const title = `중지 테스트 ${run}`;
  const { listing: l } = await ok("/api/listings", { ...newBase, title, stock: 2 }, seller);
  await ok(`/api/listings/${l.id}`, { status: "paused" }, seller, "PATCH");
  assert.equal((await ok(`/api/listings?q=${encodeURIComponent(title)}`)).listings.length, 0);
  assert.equal((await call("/api/orders", { listingId: l.id }, b1)).status, 409);
  assert.equal((await call(`/api/listings/${l.id}`, { status: "paused" }, b1, "PATCH")).status, 404);
  await ok(`/api/listings/${l.id}`, { status: "selling" }, seller, "PATCH");
  assert.equal((await ok(`/api/listings?q=${encodeURIComponent(title)}`)).listings.length, 1);
});

test("예시 상품·본인 상품은 구매 불가", async () => {
  assert.equal((await call("/api/orders", { listingId: "demo1" }, b1)).status, 400);
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "내 상품", stock: 1 }, seller);
  assert.equal((await call("/api/orders", { listingId: l.id }, seller)).status, 400);
});

test("1:1 채팅: 방 생성(중복 없음)·메시지·안 읽음·권한", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "채팅 상품", stock: 1 }, seller);
  assert.equal((await call("/api/chats", { listingId: l.id }, seller)).status, 400, "self chat");
  assert.equal((await call("/api/chats", { listingId: "demo1" }, b1)).status, 400, "demo chat");
  const { room } = await ok("/api/chats", { listingId: l.id }, b1);
  assert.equal((await ok("/api/chats", { listingId: l.id }, b1)).room.id, room.id);
  assert.equal((await call("/api/chats", { listingId: l.id }, b2)).data.room.id === room.id, false);
  assert.equal((await call(`/api/chats/${room.id}`, { text: "  " }, b1)).status, 400, "blank");
  assert.equal((await call(`/api/chats/${room.id}`, { text: "x".repeat(1001) }, b1)).status, 400, "too long");
  const { message: m1 } = await ok(`/api/chats/${room.id}`, { text: "안녕하세요, 구매 가능할까요?" }, b1);
  await ok(`/api/chats/${room.id}`, { text: "사이즈 문의드려요" }, b1);
  let mine = await ok("/api/chats", undefined, seller);
  assert.equal(mine.rooms.find((r) => r.id === room.id).unread[mine.rooms[0].seller.uid], 2);
  assert.ok(mine.unread >= 2);
  assert.equal((await call(`/api/chats/${room.id}`, undefined, b2)).status, 404);
  const read = await ok(`/api/chats/${room.id}`, undefined, seller);
  assert.equal(read.messages.length, 2);
  assert.equal(read.messages[0].text, "안녕하세요, 구매 가능할까요?");
  mine = await ok("/api/chats", undefined, seller);
  assert.equal(mine.rooms.find((r) => r.id === room.id).unread[mine.rooms[0].seller.uid], 0);
  await ok(`/api/chats/${room.id}`, { text: "네 가능해요" }, seller);
  const after = await ok(`/api/chats/${room.id}?after=${encodeURIComponent(m1.createdAt)}`, undefined, b1);
  assert.deepEqual(after.messages.map((m) => m.text), ["사이즈 문의드려요", "네 가능해요"]);
  const bl = await ok("/api/chats", undefined, b1);
  assert.equal(bl.rooms.find((r) => r.id === room.id).lastMessage, "네 가능해요");
});

let failed = 0;
for (const [name, fn] of tests) {
  try {
    await fn();
    console.log(`✓ ${name}`);
  } catch (e) {
    failed++;
    console.log(`✗ ${name}\n  ${e.message}\n  ${(e.stack ?? "").split("\n").find((l) => l.includes("test-logic.mjs:")) ?? ""}`);
  }
}
console.log(`\n${tests.length - failed}/${tests.length} passed`);
// npx 아래의 next-server까지 함께 종료(프로세스 그룹)
if (server) process.kill(-server.pid, "SIGTERM");
process.exit(failed ? 1 : 0);
