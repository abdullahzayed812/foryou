import { apiClient } from "@/lib/api-client";
import type { Order, OrderTimelineStep } from "./types";

export interface DepositInitResponse {
  checkoutUrl: string;
  paymentId: string;
  providerTransactionId: string;
}

export const ordersApi = {
  createExpressCheckout: (input: { productId: string; quantity: number }) =>
    apiClient.post<Order>("/orders", input).then((r) => r.data),

  listMine: () => apiClient.get<Order[]>("/orders/me").then((r) => r.data),

  get: (id: string) => apiClient.get<Order>(`/orders/${id}`).then((r) => r.data),

  confirmReceipt: (id: string) =>
    apiClient.post<Order>(`/orders/${id}/confirm-receipt`).then((r) => r.data),

  cancel: (id: string) => apiClient.post<Order>(`/orders/${id}/cancel`).then((r) => r.data),

  payDeposit: (id: string) =>
    apiClient.post<DepositInitResponse>(`/orders/${id}/deposit/pay`).then((r) => r.data),

  /** Dev-only convenience — simulates the Paymob webhook when PAYMOB_MODE=mock, so local testing doesn't need a real gateway. */
  simulatePayment: (transactionId: string, orderId: string, amount: number) =>
    apiClient
      .post(
        `/dev/mock-checkout/${transactionId}`,
        { success: true },
        { params: { orderId, amount } },
      )
      .then((r) => r.data),
};

/** Fulfiller-scoped (Seller/Merchant) — same endpoints under /sellers/me/orders or /merchants/me/orders. */
export function createFulfillerOrdersApi(basePath: "/sellers/me/orders" | "/merchants/me/orders") {
  return {
    list: () => apiClient.get<Order[]>(basePath).then((r) => r.data),
    get: (id: string) => apiClient.get<Order>(`${basePath}/${id}`).then((r) => r.data),
    updateTimeline: (id: string, step: OrderTimelineStep, note?: string) =>
      apiClient.patch<Order>(`${basePath}/${id}/timeline`, { step, note }).then((r) => r.data),
    cancel: (id: string, reason: string) =>
      apiClient.post<Order>(`${basePath}/${id}/cancel`, { reason }).then((r) => r.data),
  };
}
