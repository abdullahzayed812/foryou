import { pgTable, uuid, text, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "../users/schema.js";

/**
 * One tag per distinct in-app notification this system raises — nearly all
 * of these are the first real consumer of an event that's been publishing
 * since an earlier phase with nothing listening (architecture doc §06
 * anticipated Notifications as the eventual fan-out target for most of
 * them). Grouped by the module that triggers them.
 */
export const notificationTypeEnum = pgEnum("notification_type", [
  "order_deposit_paid",
  "order_delivered",
  "order_completed",
  "order_cancelled",
  "deposit_deadline_missed",
  "offer_received",
  "offer_selected",
  "offer_rejected",
  "import_request_matched",
  "dispute_opened",
  "dispute_resolved",
  "review_received",
  "verification_approved",
  "verification_rejected",
  "withdrawal_processed",
  "wallet_balance_released",
  "product_published",
  "product_pending_review",
  "product_restocked",
  "account_suspended",
  "account_reactivated",
]);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: notificationTypeEnum("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    // Freeform pointer back to the triggering entity (orderId, disputeId, …)
    // so the frontend can deep-link without a type-specific column per kind.
    data: jsonb("data").$type<Record<string, string>>(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notifications_user_id_idx").on(table.userId, table.createdAt)],
);
