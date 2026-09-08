import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  pgEnum,
  index,
  boolean,
} from "drizzle-orm/pg-core";
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
  "product_wanted_available",
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

/**
 * One row per account. Each column is a user-facing notification category
 * (see `NOTIFICATION_PREFERENCE_CATEGORIES` in `@foryou/shared`); `false`
 * mutes every in-app notification in that category for the user. The row is
 * created lazily on first change — a missing row means "all categories on"
 * (`DEFAULT_NOTIFICATION_PREFERENCES`). Account-security notices have no
 * column and are always delivered.
 */
export const notificationPreferences = pgTable("notification_preferences", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  orders: boolean("orders").notNull().default(true),
  offers: boolean("offers").notNull().default(true),
  disputes: boolean("disputes").notNull().default(true),
  reviews: boolean("reviews").notNull().default(true),
  verification: boolean("verification").notNull().default(true),
  wallet: boolean("wallet").notNull().default(true),
  products: boolean("products").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
