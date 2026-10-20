import { getListing, getOrder, saveListing, saveOrder, withLock } from "@/lib/server/db";
import { listingLock, orderLock } from "@/lib/server/orders";
import { payoutOrder, refundOrder } from "@/lib/server/settlement";
import { carriers, isTrackingNumber, refundOpen, type Order, type PiUser } from "@/lib/types";
import { HttpError, handle, json, readJson, requireUser } from "@/lib/server/http";

/** A2U(블록체인 전송)를 기다릴 수 있도록 */
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };
type Body = { action?: string; method?: string; carrier?: string; trackingNumber?: string; reason?: string };

async function load(req: Request, { params }: Ctx) {
  const user = requireUser(req);
  const order = await getOrder((await params).id);
  if (!order || (order.buyer.uid !== user.uid && order.seller.uid !== user.uid)) {
    throw new HttpError(404, "주문을 찾을 수 없어요.");
  }
  return { user, order };
}

export const GET = handle<Ctx>(async (req, ctx) => json({ order: (await load(req, ctx)).order }));

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** 상태 전이만 주문 락 안에서 처리하고, 이어서 필요한 A2U 송금 종류를 돌려준다. */
async function transition(order: Order, user: PiUser, b: Body): Promise<"payout" | "refund" | null> {
  const isSeller = order.seller.uid === user.uid;
  const isBuyer = order.buyer.uid === user.uid;
  const now = new Date().toISOString();
  const open = order.status === "paid" || order.status === "shipped";

  switch (b.action) {
    case "ship": {
      if (!isSeller) throw new HttpError(403, "판매자만 발송 처리할 수 있어요.");
      if (order.status !== "paid") throw new HttpError(409, "결제 완료된 주문만 발송 처리할 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "환불 요청을 먼저 처리해 주세요.");
      // Shopify fulfillment: 택배는 택배사 + 송장번호 필수, 직거래는 전달 완료만 기록
      const method = b.method === "direct" ? "direct" : "delivery";
      const carrier = typeof b.carrier === "string" ? b.carrier : "";
      const trackingNumber = typeof b.trackingNumber === "string" ? b.trackingNumber.replace(/\s/g, "") : "";
      if (method === "delivery") {
        if (!(carriers as readonly string[]).includes(carrier)) throw new HttpError(400, "택배사를 선택해 주세요.");
        if (!isTrackingNumber(trackingNumber)) throw new HttpError(400, "송장번호는 숫자와 - 로 8~20자 입력해 주세요.");
      }
      order.fulfillment = { method, ...(method === "delivery" ? { carrier, trackingNumber } : {}), shippedAt: now };
      order.status = "shipped";
      return null;
    }
    case "confirm": {
      if (!isBuyer) throw new HttpError(403, "구매자만 구매 확정할 수 있어요.");
      if (!open) throw new HttpError(409, "구매 확정할 수 없는 상태예요.");
      if (refundOpen(order)) throw new HttpError(409, "진행 중인 환불 요청을 먼저 철회해 주세요.");
      order.status = "completed";
      order.payout = "pending";
      await withLock(listingLock(order.listingId), async () => {
        const listing = await getListing(order.listingId);
        if (!listing) return;
        if (listing.condition === "new") listing.soldCount = (listing.soldCount ?? 0) + 1;
        else listing.status = "sold";
        await saveListing(listing);
      });
      return "payout";
    }
    case "refund_request": {
      if (!isBuyer) throw new HttpError(403, "구매자만 환불을 요청할 수 있어요.");
      if (!open) throw new HttpError(409, "구매 확정 전 주문만 환불을 요청할 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "이미 환불이 진행 중이에요.");
      const reason = text(b.reason, 300);
      if (!reason) throw new HttpError(400, "환불 사유를 입력해 주세요.");
      // 쿠팡식: 발송 전 취소는 바로 환불, 발송 후에는 판매자 승인 필요
      const auto = order.status === "paid";
      order.refund = { status: auto ? "processing" : "requested", by: "buyer", reason, requestedAt: now };
      return auto ? "refund" : null;
    }
    case "refund_withdraw": {
      if (!isBuyer) throw new HttpError(403, "구매자만 철회할 수 있어요.");
      if (order.refund?.status !== "requested") throw new HttpError(409, "철회할 환불 요청이 없어요.");
      order.refund.status = "withdrawn";
      return null;
    }
    case "refund_reject": {
      if (!isSeller) throw new HttpError(403, "판매자만 처리할 수 있어요.");
      if (order.refund?.status !== "requested") throw new HttpError(409, "처리할 환불 요청이 없어요.");
      order.refund.status = "rejected";
      order.refund.rejectReason = text(b.reason, 300) || undefined;
      return null;
    }
    case "refund_approve": {
      if (!isSeller) throw new HttpError(403, "판매자만 처리할 수 있어요.");
      if (order.refund?.status !== "requested") throw new HttpError(409, "처리할 환불 요청이 없어요.");
      order.refund.status = "processing";
      return "refund";
    }
    case "seller_cancel": {
      if (!isSeller) throw new HttpError(403, "판매자만 판매를 취소할 수 있어요.");
      if (!open) throw new HttpError(409, "구매 확정 전 주문만 취소할 수 있어요.");
      if (refundOpen(order)) throw new HttpError(409, "이미 환불이 진행 중이에요.");
      order.refund = { status: "processing", by: "seller", reason: text(b.reason, 300) || "판매자 판매 취소", requestedAt: now };
      return "refund";
    }
    case "refund_retry": {
      if (!isSeller) throw new HttpError(403, "판매자만 재시도할 수 있어요.");
      if (order.refund?.status !== "failed" && order.refund?.status !== "processing") throw new HttpError(409, "재시도할 환불이 없어요.");
      return "refund";
    }
    case "payout_retry": {
      if (!isSeller) throw new HttpError(403, "판매자만 정산을 요청할 수 있어요.");
      if (order.status !== "completed" || order.payout === "paid") throw new HttpError(409, "정산할 주문이 아니에요.");
      return "payout";
    }
    default:
      throw new HttpError(400, "알 수 없는 요청이에요.");
  }
}

export const POST = handle<Ctx>(async (req, ctx) => {
  const { user, order: loaded } = await load(req, ctx);
  const b = await readJson<Body>(req);
  const { order, next } = await withLock(orderLock(loaded.id), async () => {
    const cur = (await getOrder(loaded.id))!;
    const next = await transition(cur, user, b);
    await saveOrder(cur);
    return { order: cur, next };
  });
  // A2U는 주문 락을 다시 잡고 실행한다. 실패해도 주문 상태(구매 확정 등)는 유지되고 재시도할 수 있다.
  if (next === "payout") return json({ order: await payoutOrder(order.id) });
  if (next === "refund") return json({ order: await refundOrder(order.id) });
  return json({ order });
});
