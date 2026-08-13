export type OrderStage =
  "awaiting_deposit" | "deposit_paid" | "processing" | "delivered" | "completed" | "cancelled";

export type OrderTimelineStep =
  | "waiting_to_place_order"
  | "order_placed"
  | "shipment_in_progress"
  | "shipment_arrived_in_egypt"
  | "out_for_delivery"
  | "delivered";

export interface OrderTimelineEvent {
  id: string;
  orderId: string;
  step: OrderTimelineStep;
  source: "automatic" | "manual";
  note: string | null;
  createdAt: string;
}

export interface Order {
  id: string;
  type: "import" | "express";
  customerId: string;
  importRequestId: string | null;
  offerId: string | null;
  productId: string | null;
  quantity: number | null;
  sellerId: string | null;
  merchantId: string | null;
  totalAmount: string;
  depositPercentage: number | null;
  depositAmount: string | null;
  stage: OrderStage;
  depositDeadlineAt: string | null;
  depositDeadlineStrikes: number;
  depositPaidAt: string | null;
  balanceReleasedAt: string | null;
  deliveredAt: string | null;
  completedAt: string | null;
  cancellationReason: string | null;
  openDisputeId: string | null;
  createdAt: string;
  updatedAt: string;
  timeline: OrderTimelineEvent[];
  /** Present on orders returned to the fulfiller (seller/merchant `/orders` endpoints). */
  customerName?: string | null;
  customerMemberSince?: string | null;
}
