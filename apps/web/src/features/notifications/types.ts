export type NotificationType =
  | "order_deposit_paid"
  | "order_delivered"
  | "order_completed"
  | "order_cancelled"
  | "deposit_deadline_missed"
  | "offer_received"
  | "offer_selected"
  | "offer_rejected"
  | "import_request_matched"
  | "dispute_opened"
  | "dispute_resolved"
  | "review_received"
  | "verification_approved"
  | "verification_rejected"
  | "withdrawal_processed"
  | "wallet_balance_released"
  | "product_published"
  | "product_pending_review"
  | "product_restocked"
  | "account_suspended"
  | "account_reactivated";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, string> | null;
  readAt: string | null;
  createdAt: string;
}
