import {
  pgTable,
  uuid,
  text,
  numeric,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "../users/schema.js";
import { importRequests } from "../import-requests/schema.js";
import { offers } from "../offers/schema.js";
import { products } from "../products/schema.js";

/**
 * Schema-first slice (architecture doc §01 note): this table is created in
 * Phase 7 because Offer selection creates the order row (BRD Stage 3→4
 * transition); Phase 8 builds the full lifecycle on top of it — deposit
 * payment via Paymob, the processing/delivery timeline, wallet/commission
 * settlement, and EXPRESS checkout (which skips straight from Stage 1 to
 * payment, no import request/offer involved).
 */
export const orderTypeEnum = pgEnum("order_type", ["import", "express"]);

export const orderStageEnum = pgEnum("order_stage", [
  "awaiting_deposit", // import: Stage 4 not yet done. express: awaiting full payment.
  "deposit_paid", // Stage 4 done (import) / paid in full (express)
  "processing", // Stage 5
  "delivered", // Stage 6, awaiting customer confirmation
  "completed", // Stage 6 done — confirmed or auto-closed after 48h
  "cancelled",
]);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: orderTypeEnum("type").notNull(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    // Import-order lineage — null for "express" orders.
    importRequestId: uuid("import_request_id").references(() => importRequests.id),
    offerId: uuid("offer_id").references(() => offers.id),
    // Express-order lineage — null for "import" orders. Single product per
    // order in this MVP (BRD Stage 1 Option 1 describes one product, not a
    // multi-item cart) — a real order_items table is the natural extension
    // if/when EXPRESS grows a cart.
    productId: uuid("product_id").references(() => products.id),
    quantity: integer("quantity"),
    sellerId: uuid("seller_id").references(() => users.id),
    merchantId: uuid("merchant_id").references(() => users.id),
    totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
    // Null for express orders — they pay `totalAmount` in full, no deposit split.
    depositPercentage: integer("deposit_percentage"),
    depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }),
    stage: orderStageEnum("stage").notNull().default("awaiting_deposit"),
    depositDeadlineAt: timestamp("deposit_deadline_at", { withTimezone: true }),
    depositDeadlineStrikes: integer("deposit_deadline_strikes").notNull().default(0),
    // Drives the 24h-after-verified balance-release job (orders/queue.ts).
    depositPaidAt: timestamp("deposit_paid_at", { withTimezone: true }),
    // Set the moment the 24h job (or the on-completion path) actually moves
    // pending → available for this order. Required as an explicit guard —
    // an order can sit in "processing" for days while shipping is in
    // transit, so a repeating scheduled job would otherwise re-release the
    // same balance every time it runs.
    balanceReleasedAt: timestamp("balance_released_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancellationReason: text("cancellation_reason"),
    // Set by Disputes on open, cleared on resolution — NOT a FK (Disputes
    // depends on Orders, not the reverse; see architecture doc §02 module
    // dependency direction). Gates wallet balance release and review
    // creation/editing while non-null (BRD Rule 8: "pending balance during
    // dispute" / "reviews during dispute").
    openDisputeId: uuid("open_dispute_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("orders_offer_id_unique").on(table.offerId),
    index("orders_customer_id_idx").on(table.customerId, table.stage),
    index("orders_seller_id_idx").on(table.sellerId, table.stage),
    index("orders_merchant_id_idx").on(table.merchantId, table.stage),
    index("orders_stage_deposit_deadline_idx").on(table.stage, table.depositDeadlineAt),
    index("orders_stage_delivered_at_idx").on(table.stage, table.deliveredAt),
  ],
);

/** BRD Stage 5's named steps, logged as they happen — automatic or seller-entered manually. */
export const orderTimelineStepEnum = pgEnum("order_timeline_step", [
  "waiting_to_place_order",
  "order_placed",
  "shipment_in_progress",
  "shipment_arrived_in_egypt",
  "out_for_delivery",
  "delivered",
]);

export const orderTimelineSourceEnum = pgEnum("order_timeline_source", ["automatic", "manual"]);

export const orderTimelineEvents = pgTable(
  "order_timeline_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    step: orderTimelineStepEnum("step").notNull(),
    source: orderTimelineSourceEnum("source").notNull().default("automatic"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("order_timeline_events_order_id_idx").on(table.orderId, table.createdAt)],
);

export const ordersRelations = relations(orders, ({ many }) => ({
  timeline: many(orderTimelineEvents),
}));

export const orderTimelineEventsRelations = relations(orderTimelineEvents, ({ one }) => ({
  order: one(orders, { fields: [orderTimelineEvents.orderId], references: [orders.id] }),
}));
