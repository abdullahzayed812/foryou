export interface OrderCreatedPayload {
  orderId: string;
  customerId: string;
}

export interface OrderDepositPaidPayload {
  orderId: string;
  sellerId: string | null;
  merchantId: string | null;
}

export interface OrderTimelineUpdatedPayload {
  orderId: string;
  step: string;
}

export interface OrderDeliveredPayload {
  orderId: string;
  customerId: string;
}

export interface OrderCompletedPayload {
  orderId: string;
  customerId: string;
  sellerId: string | null;
  merchantId: string | null;
}

export interface OrderCancelledPayload {
  orderId: string;
  reason: string;
  cancelledBy: "customer" | "seller" | "system" | "admin";
  sellerId: string | null;
}

export interface DepositDeadlineMissedPayload {
  orderId: string;
  strikeCount: number;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "order.created": OrderCreatedPayload;
    "order.deposit_paid": OrderDepositPaidPayload;
    "order.timeline_updated": OrderTimelineUpdatedPayload;
    "order.delivered": OrderDeliveredPayload;
    "order.completed": OrderCompletedPayload;
    "order.auto_closed": OrderCompletedPayload;
    "order.cancelled": OrderCancelledPayload;
    "deposit.deadline_missed": DepositDeadlineMissedPayload;
  }
}
