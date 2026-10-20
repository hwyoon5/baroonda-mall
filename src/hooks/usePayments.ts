"use client";

import { useCallback, useState } from "react";
import { api } from "@/lib/client/api";
import { ensurePiAuthenticated, onIncompletePaymentFound, PI_MOCK, waitForPi } from "@/lib/client/pi-sdk";
import type { Order } from "@/lib/types";
import { useAuth } from "./useAuth";

export class PaymentCancelled extends Error {
  constructor() {
    super("결제를 취소했어요.");
  }
}

/**
 * Pi 공식 데모 frontend/src/hooks/usePayments.ts 와 같은 구조.
 * P2P 상품은 가격·판매자 검증이 필요해서 서버에서 주문과 paymentData(metadata: { productId, orderId })를 먼저 만든다.
 */
export function usePayments() {
  const { isAuthenticated, requireAuth } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const orderProduct = useCallback(
    async (productId: string): Promise<string | null> => {
      if (!isAuthenticated) {
        requireAuth();
        return null;
      }
      setIsLoading(true);
      try {
        await ensurePiAuthenticated();
        const { order, paymentData } = await api<{ order: Order; paymentData: PiPaymentData }>("/api/orders", { listingId: productId });

        if (PI_MOCK) {
          const paymentId = `mock-${order.id}`;
          await api("/api/payments/approve", { paymentId, orderId: order.id });
          await api("/api/payments/complete", { paymentId, txid: `mocktx-${Date.now()}` });
          return order.id;
        }

        const Pi = await waitForPi();
        return await new Promise<string>((resolve, reject) => {
          Pi.createPayment(paymentData, {
            onReadyForServerApproval: (paymentId) => {
              api("/api/payments/approve", { paymentId, orderId: order.id }).catch(reject);
            },
            onReadyForServerCompletion: (paymentId, txid) => {
              api("/api/payments/complete", { paymentId, txid })
                .then(() => resolve(order.id))
                .catch(reject);
            },
            onCancel: (paymentId) => {
              api("/api/payments/cancelled_payment", { paymentId, orderId: order.id }).catch(() => undefined);
              reject(new PaymentCancelled());
            },
            onError: (error, payment) => {
              if (payment) onIncompletePaymentFound(payment);
              else api("/api/payments/cancelled_payment", { orderId: order.id }).catch(() => undefined);
              reject(error);
            },
          });
        });
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, requireAuth],
  );

  return { orderProduct, isLoading };
}
