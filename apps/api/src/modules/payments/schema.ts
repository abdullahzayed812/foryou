import { pgTable, uuid, text, numeric, timestamp, pgEnum, jsonb, index } from "drizzle-orm/pg-core";
import { orders } from "../orders/schema.js";

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "succeeded",
  "failed",
  "refunded",
]);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    provider: text("provider").notNull().default("paymob"),
    providerTransactionId: text("provider_transaction_id"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("payments_order_id_idx").on(table.orderId),
    index("payments_provider_transaction_id_idx").on(table.providerTransactionId),
  ],
);

/** Raw webhook payloads, kept for replay/audit and to make webhook idempotency checkable (architecture doc §03). */
export const paymentWebhooksLog = pgTable("payment_webhooks_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  providerTransactionId: text("provider_transaction_id").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});
