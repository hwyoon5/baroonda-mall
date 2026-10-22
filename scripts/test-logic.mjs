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
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { env: { ...process.env, PI_MOCK: "1", NEXT_PUBLIC_PI_MOCK: "1", DEMO_SELLER_USERNAME: "demoowner" }, stdio: "ignore", detached: true });
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
const DOC = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
const WALLET = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7";
const biz = { bizName: "바로상점", ownerName: "홍길동", bizRegNo: "123-45-67891", mailOrderNo: "제 2024-서울강남-01234 호", address: "서울시 강남구 테헤란로 1", phone: "02-123-4567", bizRegDoc: DOC, mailOrderDoc: DOC, piWallet: WALLET };
const newBase = { category: "fashion", pricePi: 1, tradeMethods: ["delivery"], images: [], condition: "new" };

const tests = [];
const test = (name, fn) => tests.push([name, fn]);
let seller, b1, b2;

test("인증: authResult 검증, uid 불일치 401", async () => {
  [seller, b1, b2] = await Promise.all([signin("seller"), signin("buyer1"), signin("buyer2")]);
  await ok("/api/me/business", biz, seller, "PUT");
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

test("옵션 확장: 최대 5개 그룹·100개 조합, 초과 시 400", async () => {
  const opt = (name, n) => ({ name, values: Array.from({ length: n }, (_, i) => `${name}${i}`) });
  const five = ["색상", "사이즈", "핏", "소재", "구성"].map((n) => opt(n, 2));
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "5옵션", options: five, variants: [{ options: Object.fromEntries(five.map((o) => [o.name, o.values[1]])), stock: 4 }] }, seller);
  assert.equal(l.options.length, 5);
  assert.equal(l.variants.length, 32);
  assert.equal(l.stock, 4);
  assert.equal((await call("/api/listings", { ...newBase, title: "6옵션", options: [...five, opt("맛", 1)], variants: [] }, seller)).status, 400);
  const { listing: big } = await ok("/api/listings", { ...newBase, title: "100조합", options: [opt("저장용량", 10), opt("색상", 10)], variants: [{ options: { 저장용량: "저장용량0", 색상: "색상9" }, stock: 1 }] }, seller);
  assert.equal(big.variants.length, 100);
  assert.equal((await call("/api/listings", { ...newBase, title: "125조합", options: [opt("a", 5), opt("b", 5), opt("c", 5)], variants: [] }, seller)).status, 400);
  const o = opt("호수", 25);
  const { listing: many } = await ok("/api/listings", { ...newBase, title: "20값", options: [o], variants: [{ options: { 호수: "호수0" }, stock: 1 }] }, seller);
  assert.equal(many.options[0].values.length, 20);
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

test("본인 상품은 구매 불가", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "내 상품", stock: 1 }, seller);
  assert.equal((await call("/api/orders", { listingId: l.id }, seller)).status, 400);
});

test("1:1 채팅: 방 생성(중복 없음)·메시지·안 읽음·권한", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "채팅 상품", stock: 1 }, seller);
  assert.equal((await call("/api/chats", { listingId: l.id }, seller)).status, 400, "self chat");
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
  // 양쪽이 동시에 보내도 createdAt이 저장 순서대로 겹치지 않아 ?after= 커서가 메시지를 건너뛰지 않는다
  await Promise.all(Array.from({ length: 6 }, (_, i) => ok(`/api/chats/${room.id}`, { text: `동시 ${i}` }, i % 2 ? seller : b1)));
  const all = (await ok(`/api/chats/${room.id}`, undefined, b1)).messages;
  assert.equal(all.length, 9);
  assert.equal(new Set(all.map((m) => m.createdAt)).size, all.length, "createdAt 중복 없음");
  for (let i = 0; i < all.length; i++) {
    const rest = await ok(`/api/chats/${room.id}?after=${encodeURIComponent(all[i].createdAt)}`, undefined, seller);
    assert.equal(rest.messages.length, all.length - 1 - i, "커서 이후 누락 없음");
  }
});

test("거래 후기: 구매 확정한 구매자만 1회, 판매자 프로필 평균 반영", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "후기 상품", stock: 2 }, seller);
  const order = await buy(b1, l.id);
  assert.equal((await call(`/api/orders/${order.id}/review`, { rating: 5 }, b1)).status, 409, "확정 전");
  await ok(`/api/orders/${order.id}`, { action: "ship", method: "direct" }, seller);
  await ok(`/api/orders/${order.id}`, { action: "confirm" }, b1);
  assert.equal((await call(`/api/orders/${order.id}/review`, { rating: 5 }, seller)).status, 404, "판매자는 작성 불가");
  assert.equal((await call(`/api/orders/${order.id}/review`, { rating: 5 }, b2)).status, 404, "타인 작성 불가");
  assert.equal((await call(`/api/orders/${order.id}/review`, { rating: 6 }, b1)).status, 400, "별점 범위");
  assert.equal((await call(`/api/orders/${order.id}/review`, { rating: 2.5 }, b1)).status, 400, "정수 별점");
  const [r1, r2] = await Promise.all([1, 2].map(() => call(`/api/orders/${order.id}/review`, { rating: 4, text: "친절해요" }, b1)));
  assert.deepEqual([r1.status, r2.status].sort(), [201, 409], "주문당 1회(동시 요청)");
  assert.equal((await ok(`/api/orders/${order.id}/review`, undefined, seller)).review.rating, 4);
  const order2 = await buy(b2, l.id);
  await ok(`/api/orders/${order2.id}`, { action: "ship", method: "direct" }, seller);
  await ok(`/api/orders/${order2.id}`, { action: "confirm" }, b2);
  await ok(`/api/orders/${order2.id}/review`, { rating: 5 }, b2);
  const uid = order.seller.uid;
  const p = await ok(`/api/sellers/${encodeURIComponent(uid)}`);
  assert.equal(p.stats.reviews, 2);
  assert.equal(p.stats.rating, 4.5);
  assert.ok(p.listings.some((x) => x.id === l.id));
  assert.equal(p.reviews[0].buyer.uid !== uid, true);
  assert.equal((await call("/api/sellers/nobody-xyz")).status, 404);
  assert.equal((await fetch(`${BASE}/sellers/${encodeURIComponent(uid)}`)).status, 200, "프로필 페이지");
  const used = await (await fetch(`${BASE}/category/used`)).text();
  assert.ok(used.includes("h-24 w-24"), "중고 카테고리는 리스트형");
});

let failed = 0;
test("Pi 로그인: 실제 Pi API(/v2/me)로 토큰 검증, 미완료 결제는 세션 필요", async () => {
  const bad = await call("/api/user/signin", { authResult: { accessToken: "invalid-token", user: { uid: "x" } } });
  assert.equal(bad.status, 401, JSON.stringify(bad.data));
  assert.equal((await call("/api/user/signin", {})).status, 400);
  assert.equal((await call("/api/payments/incomplete", { payment: { identifier: "p1" } })).status, 401);
});

const act = (orderId, action, token, extra = {}) => call(`/api/orders/${orderId}`, { action, ...extra }, token);

test("정산(A2U): 구매 확정 시 판매자에게 1회 송금, 동시 확정에도 중복 없음", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "정산 테스트", pricePi: 2.5, stock: 3 }, seller);
  const order = await buy(b1, l.id);
  assert.equal((await act(order.id, "payout_retry", seller)).status, 409);
  const res = await Promise.all([act(order.id, "confirm", b1), act(order.id, "confirm", b1)]);
  assert.deepEqual(res.map((r) => r.status).sort(), [200, 409]);
  const o = res.find((r) => r.status === 200).data.order;
  assert.equal(o.status, "completed");
  assert.equal(o.payout, "paid");
  assert.equal(o.payoutTransfer.amount, 2.5);
  assert.equal(o.payoutTransfer.attempts, 1);
  assert.ok(o.payoutTransfer.txid);
  assert.equal((await act(order.id, "payout_retry", seller)).status, 409);
  assert.equal((await act(order.id, "payout_retry", b1)).status, 403);
  assert.equal((await act(order.id, "refund_request", b1, { reason: "변심" })).status, 409);
});

test("정산 실패 → 주문은 구매 확정 유지, 판매자 재시도로 완료", async () => {
  const flaky = await signin("flaky");
  await ok("/api/me/business", biz, flaky, "PUT");
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "정산 재시도", stock: 1 }, flaky);
  const order = await buy(b1, l.id);
  let o = (await ok(`/api/orders/${order.id}`, { action: "confirm" }, b1)).order;
  assert.equal(o.status, "completed");
  assert.equal(o.payout, "failed");
  assert.ok(o.payoutTransfer.error);
  o = (await ok(`/api/orders/${order.id}`, { action: "payout_retry" }, flaky)).order;
  assert.equal(o.payout, "paid");
  assert.equal(o.payoutTransfer.attempts, 2);
  assert.equal(o.payoutTransfer.error, undefined);
});

test("환불: 발송 전 취소는 즉시 환불, 중고 예약 해제", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "중고 환불", condition: "used", usageGrade: "A", category: "digital" }, seller);
  const order = await buy(b1, l.id);
  assert.equal((await listing(l.id)).status, "reserved");
  assert.equal((await act(order.id, "refund_request", b1)).status, 400);
  assert.equal((await act(order.id, "refund_request", seller, { reason: "x" })).status, 403);
  const o = (await ok(`/api/orders/${order.id}`, { action: "refund_request", reason: "단순 변심" }, b1)).order;
  assert.equal(o.status, "refunded");
  assert.equal(o.refund.status, "refunded");
  assert.equal(o.refund.transfer.amount, o.amount);
  assert.equal((await listing(l.id)).status, "selling");
  assert.equal((await act(order.id, "confirm", b1)).status, 409);
  assert.equal((await act(order.id, "ship", seller, { method: "direct" })).status, 409);
});

test("환불: 발송 후 요청 → 확정 차단 → 거절 → 재요청 → 승인, 재고 복구", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "발송 후 환불", stock: 1 }, seller);
  const order = await buy(b1, l.id);
  assert.equal((await listing(l.id)).status, "sold");
  await ok(`/api/orders/${order.id}`, { action: "ship", method: "direct" }, seller);
  assert.equal((await ok(`/api/orders/${order.id}`, { action: "refund_request", reason: "하자" }, b1)).order.refund.status, "requested");
  assert.equal((await act(order.id, "confirm", b1)).status, 409);
  assert.equal((await act(order.id, "refund_request", b1, { reason: "또" })).status, 409);
  assert.equal((await act(order.id, "refund_approve", b1)).status, 403);
  assert.equal((await act(order.id, "refund_approve", b2)).status, 404);
  const rej = (await ok(`/api/orders/${order.id}`, { action: "refund_reject", reason: "정상 제품" }, seller)).order;
  assert.deepEqual([rej.status, rej.refund.status, rej.refund.rejectReason], ["shipped", "rejected", "정상 제품"]);
  await ok(`/api/orders/${order.id}`, { action: "refund_request", reason: "사진 첨부해요" }, b1);
  const o = (await ok(`/api/orders/${order.id}`, { action: "refund_approve" }, seller)).order;
  assert.equal(o.status, "refunded");
  const cur = await listing(l.id);
  assert.deepEqual([cur.stock, cur.committed, cur.status], [1, 0, "selling"]);
  assert.equal((await act(order.id, "refund_retry", seller)).status, 409);
});

test("환불: 판매자 판매 취소, 구매자 철회 후 구매 확정·정산", async () => {
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "취소·철회", stock: 2 }, seller);
  const o1 = await buy(b1, l.id);
  assert.equal((await ok(`/api/orders/${o1.id}`, { action: "seller_cancel", reason: "재고 부족" }, seller)).order.status, "refunded");
  const o2 = await buy(b2, l.id);
  await ok(`/api/orders/${o2.id}`, { action: "ship", method: "direct" }, seller);
  await ok(`/api/orders/${o2.id}`, { action: "refund_request", reason: "잘못 주문" }, b2);
  assert.equal((await ok(`/api/orders/${o2.id}`, { action: "refund_withdraw" }, b2)).order.refund.status, "withdrawn");
  const done = (await ok(`/api/orders/${o2.id}`, { action: "confirm" }, b2)).order;
  assert.deepEqual([done.status, done.payout], ["completed", "paid"]);
  assert.equal((await listing(l.id)).stock, 1);
});

test("사진 최대 10장·동영상 최대 2개: 개수·형식 검증, 상세 노출, 저장소 미연결 시 업로드 503", async () => {
  const img = "data:image/jpeg;base64,/9j/4AAQ";
  const blob = (dir) => `https://abc123.public.blob.vercel-storage.com/listings/${dir}/m-x1Y2.${dir === "video" ? "mp4" : "jpg"}`;
  const base = { ...newBase, title: `미디어${run}`, stock: 1 };
  assert.equal((await call("/api/listings", { ...base, images: Array(11).fill(img) }, seller)).status, 400);
  assert.equal((await call("/api/listings", { ...base, images: [img], videos: Array(3).fill(blob("video")) }, seller)).status, 400);
  assert.equal((await call("/api/listings", { ...base, images: [img], videos: ["https://evil.example.com/listings/video/a.mp4"] }, seller)).status, 400);
  assert.equal((await call("/api/listings", { ...base, images: [img], videos: [blob("photo")] }, seller)).status, 400);
  assert.equal((await call("/api/listings", { ...base, images: ["https://evil.example.com/a.jpg"] }, seller)).status, 400);
  const v2 = blob("video").replace("m-x1Y2", "m-z9");
  const { listing: l } = await ok("/api/listings", { ...base, images: [...Array(9).fill(img), blob("photo")], videos: [blob("video"), v2] }, seller);
  assert.equal(l.images.length, 10);
  assert.deepEqual(l.videos, [blob("video"), v2]);
  const html = await (await fetch(`${BASE}/listings/${l.id}`)).text();
  assert.equal(html.split("<video").length - 1, 2);
  assert.ok(html.includes(blob("video")) && html.includes(v2));
  assert.deepEqual((await ok("/api/upload")).enabled, false);
  assert.equal((await call("/api/upload", { type: "blob.generate-client-token", payload: { pathname: "listings/photo/a.jpg" } }, seller)).status, 503);
});

test("사업자 정보: 검증, 새 상품만 필수(개인 중고·임시저장은 제외), 상세에 판매자 정보 표시", async () => {
  const s = await signin("biz");
  assert.deepEqual(await ok("/api/me/business", undefined, s), { business: null });
  const usedBody = { ...newBase, condition: "used", usageGrade: "A", title: "중고" };
  await ok("/api/listings", usedBody, s);
  assert.equal((await call("/api/listings", { ...newBase, title: "새 상품", stock: 3 }, s)).status, 403);
  const { listing: d } = await ok("/api/listings", { ...newBase, title: "새 상품 임시", stock: 3, draft: true }, s);
  assert.equal((await call(`/api/listings/${d.id}`, { ...newBase, title: "새 상품 임시", stock: 3 }, s, "PUT")).status, 403);
  for (const bad of [{ bizRegNo: "123-45-67890" }, { mailOrderNo: "강남-1234" }, { phone: "123" }, { bizName: " " }, { email: "x@" }]) {
    assert.equal((await call("/api/me/business", { ...biz, ...bad }, s, "PUT")).status, 400, JSON.stringify(bad));
  }
  const { business } = await ok("/api/me/business", { ...biz, mailOrderNo: "", mailOrderExempt: true }, s, "PUT");
  assert.equal(business.bizRegNo, "1234567891");
  assert.equal(business.mailOrderNo, undefined);
  const saved = (await ok("/api/me/business", { ...biz }, s, "PUT")).business;
  assert.equal(saved.mailOrderNo, "2024-서울강남-01234");
  const { listing: pub } = await ok(`/api/listings/${d.id}`, { ...newBase, title: "새 상품 임시", stock: 3 }, s, "PUT");
  assert.equal(pub.status, "selling");
  const html = await (await fetch(`${BASE}/listings/${pub.id}`)).text();
  assert.ok(html.includes("판매자 정보") && html.includes("123-45-67891") && html.includes("2024-서울강남-01234"));
  assert.equal((await call("/api/me/business")).status, 401);
});

test("반품·환불·법적 고지: 사업자 정보에 저장 → 새 상품 상세 자동 표시, 상품별 직접 작성, 개인 중고 제외", async () => {
  const s = await signin("policy");
  const pol = { returnPolicy: "수령 후 7일 이내 반품 가능", shippingInfo: "결제 후 2일 내 발송", legalNotice: "분쟁은 소비자분쟁해결기준에 따름" };
  const { business } = await ok("/api/me/business", { ...biz, ...pol, legalNotice: "  " + pol.legalNotice + "  " }, s, "PUT");
  assert.equal(business.legalNotice, pol.legalNotice);
  assert.equal((await ok("/api/me/business", undefined, s)).business.returnPolicy, pol.returnPolicy);
  assert.equal((await ok("/api/me/business", { ...biz, returnPolicy: "x".repeat(2500) }, s, "PUT")).business.returnPolicy.length, 2000);
  await ok("/api/me/business", { ...biz, ...pol }, s, "PUT");
  const html = async (id) => (await (await fetch(`${BASE}/listings/${id}`)).text());

  const { listing: auto } = await ok("/api/listings", { ...newBase, title: "자동 고지", stock: 1 }, s);
  assert.equal(auto.policy, undefined, "기본 규정은 상품에 복사하지 않고 연동");
  let h = await html(auto.id);
  assert.ok(h.includes("반품·환불 규정") && h.includes(pol.returnPolicy) && h.includes(pol.shippingInfo) && h.includes(pol.legalNotice));
  await ok("/api/me/business", { ...biz, ...pol, returnPolicy: "수정된 반품 규정" }, s, "PUT");
  assert.ok((await html(auto.id)).includes("수정된 반품 규정"), "사업자 정보 수정이 기존 상품에 반영");

  const { listing: custom } = await ok("/api/listings", { ...newBase, title: "직접 고지", stock: 1, policy: { returnPolicy: "이 상품은 14일 반품", shippingInfo: "", legalNotice: "" } }, s);
  assert.deepEqual(custom.policy, { returnPolicy: "이 상품은 14일 반품" });
  h = await html(custom.id);
  assert.ok(h.includes("이 상품은 14일 반품") && !h.includes("수정된 반품 규정"), "상품별 문구 우선");

  const { listing: blank } = await ok("/api/listings", { ...newBase, title: "빈 고지", stock: 1, policy: { returnPolicy: " " } }, s);
  assert.equal(blank.policy, undefined, "모두 비우면 기본 규정 사용");
  const { listing: used } = await ok("/api/listings", { ...newBase, condition: "used", usageGrade: "A", title: "중고 고지", policy: pol }, s);
  assert.equal(used.policy, undefined);
  assert.ok(!(await html(used.id)).includes("반품·환불 규정"), "개인 중고는 표시 안 함");
});

test("배송·반품 조건: 사업자 정보 저장·검증 → 새 상품 자동 연동, 상품별 수정", async () => {
  const s = await signin("shipping");
  const ship = { method: " 택배 ", courier: "CJ대한통운", fee: "3", freeOver: "50", remoteFee: "", returnFee: 3, exchangeFee: "6", requestDays: "7" };
  const { business } = await ok("/api/me/business", { ...biz, shipping: ship }, s, "PUT");
  assert.deepEqual(business.shipping, { method: "택배", courier: "CJ대한통운", fee: 3, freeOver: 50, returnFee: 3, exchangeFee: 6, requestDays: 7 });
  assert.deepEqual((await ok("/api/me/business", undefined, s)).business.shipping, business.shipping);
  for (const bad of [{ requestDays: "3" }, { requestDays: "7.5" }, { requestDays: "400" }, { fee: "-1" }, { returnFee: "abc" }, { exchangeFee: 20000 }]) {
    const r = await call("/api/me/business", { ...biz, shipping: { ...ship, ...bad } }, s, "PUT");
    assert.equal(r.status, 400, JSON.stringify(bad));
  }
  assert.equal((await ok("/api/me/business", { ...biz, shipping: { method: " ", fee: "" } }, s, "PUT")).business.shipping, undefined, "모두 비우면 저장 안 함");
  await ok("/api/me/business", { ...biz, shipping: ship }, s, "PUT");
  const html = async (id) => (await (await fetch(`${BASE}/listings/${id}`)).text());

  const { listing: auto } = await ok("/api/listings", { ...newBase, title: "배송 자동", stock: 1 }, s);
  assert.equal(auto.policy, undefined, "기본 배송 조건은 복사하지 않고 연동");
  let h = await html(auto.id);
  assert.ok(h.includes("배송·반품 조건") && h.includes("CJ대한통운") && h.includes("50π 이상 구매 시 무료") && h.includes("왕복 6π") && h.includes("상품 수령 후 7일 이내"));
  await ok("/api/me/business", { ...biz, shipping: { ...ship, courier: "한진택배" } }, s, "PUT");
  assert.ok((await html(auto.id)).includes("한진택배"), "사업자 배송 조건 수정이 기존 상품에 반영");

  const { listing: custom } = await ok("/api/listings", { ...newBase, title: "배송 수동", stock: 1, policy: { shipping: { ...ship, courier: "우체국택배", fee: "0", requestDays: "14" } } }, s);
  assert.equal(custom.policy.shipping.courier, "우체국택배");
  assert.equal(custom.policy.shipping.fee, 0);
  h = await html(custom.id);
  assert.ok(h.includes("우체국택배") && h.includes("무료") && h.includes("14일 이내") && !h.includes("한진택배"), "상품별 배송 조건 우선");
  assert.equal((await call("/api/listings", { ...newBase, title: "배송 오류", stock: 1, policy: { shipping: { requestDays: "5" } } }, s)).status, 400);
  const { listing: used } = await ok("/api/listings", { ...newBase, condition: "used", usageGrade: "A", title: "중고 배송", policy: { shipping: ship } }, s);
  assert.equal(used.policy, undefined);
  assert.ok(!(await html(used.id)).includes("배송·반품 조건"), "개인 중고는 표시 안 함");
});

test("쇼츠: 등록·내 상품 연결·숨김·삭제·권한, 피드/관리 화면", async () => {
  const vid = "https://abc123.public.blob.vercel-storage.com/listings/video/s-x1Y2.mp4";
  assert.equal((await call("/api/shorts", { videoUrl: vid })).status, 401, "로그인 필요");
  assert.equal((await call("/api/shorts", { videoUrl: "https://evil.example.com/listings/video/a.mp4" }, b1)).status, 400, "외부 URL");
  assert.equal((await call("/api/shorts", { videoUrl: vid, caption: "x".repeat(101) }, b1)).status, 400, "설명 100자");
  const { listing: l } = await ok("/api/listings", { ...newBase, title: "쇼츠 상품", pricePi: 3, stock: 2 }, seller);
  assert.equal((await call("/api/shorts", { videoUrl: vid, listingId: l.id }, b1)).status, 400, "남의 상품 연결 불가");
  assert.equal((await call("/api/shorts", { videoUrl: vid, posterUrl: "https://evil.example.com/listings/photo/p.jpg" }, seller)).status, 400, "외부 포스터");
  assert.equal((await call("/api/shorts", { videoUrl: vid, posterUrl: vid }, seller)).status, 400, "포스터는 사진 경로만");
  const poster = "https://abc123.public.blob.vercel-storage.com/listings/photo/p-x1Y2.jpg";
  const { short } = await ok("/api/shorts", { videoUrl: vid, posterUrl: poster, caption: " 오늘 입고! ", listingId: l.id }, seller);
  assert.equal(short.caption, "오늘 입고!");
  assert.equal(short.posterUrl, poster);
  const more = [];
  for (let i = 0; i < 3; i++) more.push((await ok("/api/shorts", { videoUrl: vid, posterUrl: "" }, seller)).short);
  assert.equal(more[2].posterUrl, undefined, "포스터 없이도 계속 등록(4번째 이후 포함)");
  for (const m of more) await ok(`/api/shorts/${m.id}`, undefined, seller, "DELETE");
  assert.equal(short.status, "public");
  const inFeed = async () => (await ok("/api/shorts")).shorts.find((s) => s.id === short.id);
  const f = await inFeed();
  assert.equal(f.listing.title, "쇼츠 상품");
  assert.equal(f.listing.pricePi, 3);
  assert.equal((await call(`/api/shorts/${short.id}`, { status: "hidden" }, b1, "PATCH")).status, 404, "남의 쇼츠 수정 불가");
  const noPoster = (await ok("/api/shorts", { videoUrl: vid }, seller)).short;
  assert.equal((await call(`/api/shorts/${noPoster.id}`, { posterUrl: "https://evil.example.com/listings/photo/p.jpg" }, seller, "PATCH")).status, 400, "외부 포스터 보충 불가");
  assert.equal((await call(`/api/shorts/${noPoster.id}`, { posterUrl: poster }, b1, "PATCH")).status, 404, "남의 쇼츠 포스터 불가");
  assert.equal((await ok(`/api/shorts/${noPoster.id}`, { posterUrl: poster }, seller, "PATCH")).short.posterUrl, poster, "나중에 포스터 보충");
  assert.equal((await ok("/api/shorts")).shorts.find((s) => s.id === noPoster.id).posterUrl, poster, "피드에도 포스터");
  await ok(`/api/shorts/${noPoster.id}`, undefined, seller, "DELETE");
  await ok(`/api/shorts/${short.id}`, { status: "hidden" }, seller, "PATCH");
  assert.equal(await inFeed(), undefined, "숨김은 피드 제외");
  assert.equal((await ok("/api/shorts?author=me", undefined, seller)).shorts.find((s) => s.id === short.id).status, "hidden");
  assert.equal((await call("/api/shorts?author=me")).status, 401);
  assert.equal((await call(`/api/shorts/${short.id}`, { status: "deleted" }, seller, "PATCH")).status, 400);
  await ok(`/api/shorts/${short.id}`, { status: "public", listingId: null }, seller, "PATCH");
  assert.equal((await inFeed()).listing, undefined, "연결 해제");
  assert.equal((await call(`/api/shorts/${short.id}`, undefined, b1, "DELETE")).status, 404, "남의 쇼츠 삭제 불가");
  await ok(`/api/shorts/${short.id}`, undefined, seller, "DELETE");
  assert.equal(await inFeed(), undefined);
  assert.ok(!(await ok("/api/shorts?author=me", undefined, seller)).shorts.some((s) => s.id === short.id));
  assert.equal((await call(`/api/shorts/${short.id}`, { status: "public" }, seller, "PATCH")).status, 404, "삭제 후 복구 불가");
  for (const p of ["/shorts", "/my/shorts"]) assert.equal((await fetch(BASE + p)).status, 200, p);
  assert.ok((await (await fetch(BASE + "/")).text()).includes('href="/shorts"'), "하단 쇼츠 탭");
});

test("배송비 결제: 기본·무료배송 기준·제주·도서산간·상품별 규정·직거래, 결제·환불 금액 포함", async () => {
  const s = await signin("shipfee");
  await ok("/api/me/business", { ...biz, shipping: { fee: 3, freeOver: 50, remoteFee: 5 } }, s, "PUT");
  const mk = async (title, extra) => (await ok("/api/listings", { ...newBase, title, stock: 5, ...extra }, s)).listing;
  const order = (id, extra = {}) => ok("/api/orders", { listingId: id, ...extra }, b2);
  const l = await mk("배송비 상품", { pricePi: 10 });
  let r = await order(l.id);
  assert.deepEqual([r.order.itemAmount, r.order.shippingFee, r.order.amount, r.paymentData.amount], [10, 3, 13, 13]);
  r = await order(l.id, { remoteArea: true });
  assert.deepEqual([r.order.shippingFee, r.paymentData.amount, r.order.remoteArea], [8, 18, true]);
  const free = await mk("무료배송 상품", { pricePi: 60 });
  assert.equal((await order(free.id)).paymentData.amount, 60);
  assert.equal((await order(free.id, { remoteArea: true })).paymentData.amount, 65, "무료배송이어도 도서산간 추가비");
  const own = await mk("상품별 무료", { pricePi: 10, policy: { shipping: { fee: "0" } } });
  assert.equal((await order(own.id)).paymentData.amount, 10, "상품별 규정 우선");
  const both = await mk("직거래 가능", { pricePi: 10, tradeMethods: ["delivery", "direct"], meetingPlace: "역삼역" });
  assert.equal((await order(both.id)).paymentData.amount, 13);
  r = await order(both.id, { pickup: true });
  assert.deepEqual([r.paymentData.amount, r.order.pickup], [10, true]);
  assert.equal((await call("/api/orders", { listingId: l.id, pickup: true }, b2)).status, 400, "택배 전용 상품은 직거래 불가");
  const used = await mk("중고 배송비 없음", { pricePi: 10, condition: "used", usageGrade: "A", category: "digital" });
  assert.equal((await order(used.id)).paymentData.amount, 10);

  const paid = await buy(b2, l.id);
  assert.equal(paid.amount, 13);
  assert.equal((await ok(`/api/orders/${paid.id}`, undefined, b2)).order.status, "paid");
  const o = (await ok(`/api/orders/${paid.id}`, { action: "refund_request", reason: "단순 변심" }, b2)).order;
  assert.equal(o.refund.transfer.amount, 13, "발송 전 환불은 배송비 포함 전액");
});

test("검색 필터·정렬: 가격대·판매 유형·브랜드·빠른배송·구매 가능, 가격/인기/할인율/브랜드순", async () => {
  const tag = `zq${run}`;
  const mk = async (name, extra) => (await ok("/api/listings", { ...newBase, title: `${tag} ${name}`, stock: 3, ...extra }, seller)).listing;
  const a = await mk("A", { pricePi: 5, brand: " Nike ", fastShipping: true });
  await mk("B", { pricePi: 1, brand: "nike", originalPricePi: 4 });
  const c = await mk("C", { pricePi: 12, brand: "Adidas", originalPricePi: 15 });
  const d = await mk("D", { pricePi: 3, condition: "used", usageGrade: "A", category: "digital" });
  assert.equal(a.brand, "Nike");
  const names = async (qs) => (await ok(`/api/listings?q=${tag}&${qs}`)).listings.map((l) => l.title.split(" ")[1]).join("");
  assert.equal(await names("sort=priceAsc"), "BDAC");
  assert.equal(await names("sort=priceDesc"), "CADB");
  assert.equal((await names("sort=discount")).slice(0, 2), "BC", "할인율 75% → 20%");
  assert.equal(await names("sort=brand"), "CABD", "브랜드 가나다, 브랜드 없는 상품은 뒤로");
  assert.equal(await names("min=2&max=6&sort=priceAsc"), "DA");
  assert.equal(await names("min=6&max=2&sort=priceAsc"), "DA", "최소·최대가 뒤바뀌어도 처리");
  assert.equal(await names("kind=used"), "D");
  assert.equal(await names("brand=NIKE&sort=priceAsc"), "BA", "브랜드는 대소문자 무시");
  assert.equal(await names("brand=Nike,Adidas&sort=priceAsc"), "BAC");
  assert.equal(await names("fast=1"), "A");
  assert.equal(await names("trade=direct"), "");
  assert.equal(await names("sort=bogus&min=abc"), await names(""), "잘못된 값은 무시");
  assert.ok((await ok("/api/listings?q=adidas")).listings.some((l) => l.id === c.id), "브랜드명으로 검색");

  const pop = (await ok("/api/listings?sort=popular&kind=new")).listings.map((l) => l.soldCount ?? 0);
  assert.ok(pop.length > 3 && pop.every((v, i) => i === 0 || pop[i - 1] >= v), "인기순 = 판매량 내림차순");

  await buy(b1, d.id);
  assert.equal(await names("avail=1&sort=priceAsc"), "BAC", "예약된 상품은 구매 가능만에서 제외");
  assert.ok((await ok("/api/listings?avail=1")).listings.every((l) => l.status === "selling"));

  const h = await (await fetch(`${BASE}/search?q=${tag}&sort=priceAsc&brand=Nike`)).text();
  assert.ok(h.includes("검색 결과 2개") && h.includes("낮은 가격순") && h.indexOf(`${tag} B`) < h.indexOf(`${tag} A`) && !h.includes(`${tag} C`));
  const hb = await (await fetch(`${BASE}/search?brand=Apple`)).text();
  assert.ok(hb.includes("필터 결과 1개") && hb.includes("아이패드"), "검색어 없이 브랜드만으로 결과");
});

test("사업자 서류 사본·Pi 지갑 주소: 필수·형식·체크섬 검증, 면제 시 신고증 생략, 공개 화면 비노출", async () => {
  const s = await signin("bizdoc");
  const blobDoc = "https://abc123.public.blob.vercel-storage.com/business/doc/x-AbC123.pdf";
  const typo = WALLET.slice(0, -1) + (WALLET.endsWith("A") ? "B" : "A");
  for (const bad of [{ bizRegDoc: "" }, { bizRegDoc: "https://evil.example.com/business/doc/a.jpg" }, { bizRegDoc: "https://abc123.public.blob.vercel-storage.com/listings/photo/a.jpg" }, { bizRegDoc: "data:text/html;base64,AAAA" }, { mailOrderDoc: undefined }, { piWallet: "" }, { piWallet: typo }, { piWallet: "0x52908400098527886E0F7030069857D2E4169EE7" }, { piWallet: "S" + WALLET.slice(1) }]) {
    assert.equal((await call("/api/me/business", { ...biz, ...bad }, s, "PUT")).status, 400, JSON.stringify(bad));
  }
  const { business: b } = await ok("/api/me/business", { ...biz, bizRegDoc: blobDoc, piWallet: WALLET.toLowerCase() }, s, "PUT");
  assert.deepEqual([b.bizRegDoc, b.mailOrderDoc, b.piWallet], [blobDoc, DOC, WALLET]);
  const exempt = (await ok("/api/me/business", { ...biz, mailOrderExempt: true, mailOrderNo: "", mailOrderDoc: undefined }, s, "PUT")).business;
  assert.equal(exempt.mailOrderDoc, undefined, "면제 대상은 신고증 사본 불필요");
  assert.equal((await ok("/api/me/business", undefined, s)).business.piWallet, WALLET);
  const { listing } = await ok("/api/listings", { ...newBase, title: "서류 비공개", stock: 1 }, s);
  const html = await (await fetch(`${BASE}/listings/${listing.id}`)).text();
  assert.ok(html.includes("판매자 정보") && !html.includes(WALLET) && !html.includes(DOC), "지갑 주소·서류는 공개 화면에 없음");
});

test("상품 카드: 배송 조건·구경한 사람 수·별점·구매 건수 표시", async () => {
  const s = await signin("cardmeta");
  await ok("/api/me/business", { ...biz, shipping: { fee: 0 } }, s, "PUT");
  const tag = `카드${run}`;
  const { listing: free } = await ok("/api/listings", { ...newBase, title: `${tag} 무료`, stock: 3 }, s);
  const { listing: paid } = await ok("/api/listings", { ...newBase, title: `${tag} 유료`, pricePi: 2, stock: 1, policy: { shipping: { fee: 3, freeOver: 50 } } }, s);
  const { listing: draft } = await ok("/api/listings", { title: `${tag} 임시`, draft: true }, s);
  assert.equal((await call(`/api/listings/${draft.id}/view`, {})).status, 404, "임시저장은 조회수 없음");
  assert.equal((await call("/api/listings/nope-xyz/view", {})).status, 404);
  for (let i = 1; i <= 3; i++) assert.equal((await ok(`/api/listings/${free.id}/view`, {})).views, i);
  const order = await buy(b1, free.id);
  await ok(`/api/orders/${order.id}`, { action: "ship", method: "direct" }, s);
  await ok(`/api/orders/${order.id}`, { action: "confirm" }, b1);
  await ok(`/api/orders/${order.id}/review`, { rating: 4 }, b1);
  const byId = Object.fromEntries((await ok(`/api/listings?ids=${free.id},${paid.id}`)).listings.map((l) => [l.id, l]));
  assert.deepEqual(byId[free.id].stats, { views: 3, reviews: 1, rating: 4, shipping: { fee: 0 } }, "사업자 기본 배송 조건 연동");
  assert.deepEqual(byId[paid.id].stats.shipping, { fee: 3, freeOver: 50 }, "상품별 배송 조건 우선");
  assert.equal((await listing(free.id)).stats, undefined, "집계는 저장하지 않음");
  const html = await (await fetch(`${BASE}/search?q=${encodeURIComponent(tag)}`)).text();
  for (const t of ["무료배송", "배송비 3π · 50π 이상 무료", "3명 구경함", "4.0", "구매 1건"]) assert.ok(html.includes(t), t);
  const home = await (await fetch(`${BASE}/`)).text();
  assert.ok(home.includes("무료배송") && home.includes("구매 "), "메인 카드에도 표시");
});

test("메인 최근 상품은 개인 중고 제외, 중고마켓 세부 카테고리(?sub=)", async () => {
  const tag = `분류${Date.now().toString(36)}`;
  await ok("/api/listings", { ...newBase, title: `${tag} 중고폰`, condition: "used", usageGrade: "A", category: "digital" }, seller);
  await ok("/api/listings", { ...newBase, title: `${tag} 새옷`, stock: 1 }, seller);
  const home = await (await fetch(`${BASE}/`)).text();
  assert.ok(home.includes(`${tag} 새옷`), "새 상품은 메인 노출");
  assert.ok(!home.includes(`${tag} 중고폰`), "중고는 메인 '방금 올라온 상품'에서 제외");
  const all = await (await fetch(`${BASE}/category/used`)).text();
  assert.ok(all.includes("중고 세부 카테고리") && all.includes(`${tag} 중고폰`) && !all.includes(`${tag} 새옷`));
  const digital = await (await fetch(`${BASE}/category/used?sub=digital`)).text();
  assert.ok(digital.includes(`${tag} 중고폰`) && digital.includes('aria-current="page"'));
  const fashion = await (await fetch(`${BASE}/category/used?sub=fashion`)).text();
  assert.ok(!fashion.includes(`${tag} 중고폰`), "다른 세부 분류에는 안 나옴");
  const bogus = await (await fetch(`${BASE}/category/used?sub=nope`)).text();
  assert.ok(bogus.includes(`${tag} 중고폰`), "모르는 분류는 전체로");
});

test("예시 상품: 운영자 계정 연결 후 실제와 같은 결제·상품등록 내역·판매 내역", async () => {
  const before = await listing("demo2");
  if (server) {
    assert.equal((await call("/api/orders", { listingId: "demo2" }, b1)).status, 503, "운영자 미연결이면 결제 시작 전 안내");
    assert.equal((await call("/api/chats", { listingId: "demo2" }, b1)).status, 503, "운영자 미연결이면 채팅 안내");
    assert.equal((await ok("/api/health")).demoSeller.connected, false);
  }
  const owner = (await ok("/api/user/signin", { authResult: { accessToken: "mock:demoowner", user: { uid: "mock-demoowner", username: "demoowner" } } })).token;
  assert.equal((await ok("/api/health")).demoSeller.connected, true);
  const mine = (await ok("/api/listings?seller=me", undefined, owner)).listings;
  assert.ok(mine.filter((l) => l.demo).length >= 20, "상품등록 내역에 예시 상품 전부");
  const cur = await listing("demo2");
  assert.equal(cur.seller.uid, "mock-demoowner");
  assert.equal(cur.seller.username, before.seller.username, "화면의 판매자 이름은 그대로");

  assert.ok((await ok("/api/chats", { listingId: "demo2" }, b1)).room, "연결 후 채팅 가능");
  const order = await buy(b1, "demo2");
  assert.equal(order.seller.uid, "mock-demoowner");
  const after = await listing("demo2");
  assert.equal(after.stock, cur.stock - 1, "재고 차감이 저장됨");
  const { sales } = await ok("/api/orders", undefined, owner);
  assert.ok(sales.some((o) => o.id === order.id && o.status === "paid"), "판매 내역에 표시");
  await ok(`/api/orders/${order.id}`, { action: "ship", method: "delivery", carrier: "CJ대한통운", trackingNumber: "6012-3456-7890" }, owner);
  await ok(`/api/orders/${order.id}`, { action: "confirm" }, b1);
  const settled = (await ok(`/api/orders/${order.id}`, undefined, owner)).order;
  assert.equal(settled.payout, "paid", "정산은 운영자 계정으로");

  await ok("/api/listings/demo2", { status: "paused" }, owner, "PATCH");
  assert.equal((await listing("demo2")).status, "paused");
  assert.equal((await call("/api/listings/demo2", { status: "paused" }, b1, "PATCH")).status, 404, "다른 사람은 관리 불가");
  await ok("/api/listings/demo2", { status: "selling" }, owner, "PATCH");
  const home = await (await fetch(`${BASE}/listings/demo1`)).text();
  assert.ok(!home.includes("실제 구매는 할 수 없어요"));
});

test("상품 카드: 새 상품은 판매자 동네 표기 없음, 개인 중고는 표시", async () => {
  const tag = `동네${run}`;
  await ok("/api/listings", { ...newBase, title: `${tag} 새`, stock: 1, location: "새상품동" }, seller);
  await ok("/api/listings", { ...newBase, title: `${tag} 중고`, condition: "used", usageGrade: "A", location: "중고동" }, seller);
  const html = await (await fetch(`${BASE}/search?q=${encodeURIComponent(tag)}`)).text();
  assert.ok(html.includes(`${tag} 새`) && !html.includes("새상품동"), "새 상품 카드에는 동네 없음");
  assert.ok(html.includes("중고동"), "중고 카드에는 동네 표시");
});

test("배포 점검: /api/health는 설정 여부만 노출", async () => {
  const h = await ok("/api/health");
  assert.equal(h.storage, "memory");
  assert.equal(h.checks.mockOff, false);
  assert.equal(h.ok, false);
  assert.ok(!JSON.stringify(h).includes("Key "));
  assert.equal((await fetch(`${BASE}/my/payouts`)).status, 200);
});

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
