import {
  pgTable,
  uuid,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { users } from "../users/schema.js";
import { products } from "../products/schema.js";

/**
 * A WANTED cycle is one round of demand-testing for a product (BRD "FOR YOU
 * WANTED"). A product may run several over its lifetime — cycle #1, then
 * later #2 after selling out — and every completed cycle is kept forever as
 * historical/analytics data (never reset in place). The product id is
 * unchanged across cycles; the cycle just points back at it.
 */
export const wantedCycleStatusEnum = pgEnum("wanted_cycle_status", [
  "active", // accepting ❤️ likes / 🔔 notify-me during WANTED
  "importing", // seller committed to importing; interactions frozen
  "completed", // stock added, product moved to EXPRESS, notify-me fan-out done
]);

export const wantedCycles = pgTable(
  "wanted_cycles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    // 1-based, per product. Cycle #1 stays #1 forever even after #2 opens.
    cycleNumber: integer("cycle_number").notNull(),
    status: wantedCycleStatusEnum("status").notNull().default("active"),
    // Set when the seller completes the import — the quantity that actually
    // arrived and was added to EXPRESS stock.
    importedQuantity: integer("imported_quantity"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    importingAt: timestamp("importing_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("wanted_cycles_product_number_unique").on(table.productId, table.cycleNumber),
    // At most one non-completed cycle per product at a time.
    uniqueIndex("wanted_cycles_one_open_per_product")
      .on(table.productId)
      .where(sql`${table.status} <> 'completed'`),
    index("wanted_cycles_product_id_idx").on(table.productId),
  ],
);

/**
 * ❤️ Like during WANTED — "this customer is interested". Scoped to the
 * cycle, so counts are naturally per-cycle and an EXPRESS product (no open
 * cycle) shows zero current likes while cycle #1's rows stay on record.
 * Deliberately separate from `wishlist_items` (a general, always-on
 * wishlist) and from 🔔 notify-me below.
 */
export const wantedLikes = pgTable(
  "wanted_likes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wantedCycleId: uuid("wanted_cycle_id")
      .notNull()
      .references(() => wantedCycles.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wanted_likes_cycle_customer_unique").on(table.wantedCycleId, table.customerId),
    index("wanted_likes_cycle_id_idx").on(table.wantedCycleId),
  ],
);

/**
 * 🔔 Notify-me during WANTED — "tell me when this becomes available for the
 * first time". Distinct from `stock_notifications`, which is EXPRESS
 * back-in-stock ("available again after selling out"). `notifiedAt` is the
 * per-cycle dedupe guard for the fan-out on completion.
 */
export const wantedNotifyRequests = pgTable(
  "wanted_notify_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    wantedCycleId: uuid("wanted_cycle_id")
      .notNull()
      .references(() => wantedCycles.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("wanted_notify_requests_cycle_customer_unique").on(
      table.wantedCycleId,
      table.customerId,
    ),
    index("wanted_notify_requests_cycle_id_idx").on(table.wantedCycleId),
  ],
);

export const wantedCyclesRelations = relations(wantedCycles, ({ one, many }) => ({
  product: one(products, { fields: [wantedCycles.productId], references: [products.id] }),
  likes: many(wantedLikes),
  notifyRequests: many(wantedNotifyRequests),
}));

export const wantedLikesRelations = relations(wantedLikes, ({ one }) => ({
  cycle: one(wantedCycles, {
    fields: [wantedLikes.wantedCycleId],
    references: [wantedCycles.id],
  }),
}));

export const wantedNotifyRequestsRelations = relations(wantedNotifyRequests, ({ one }) => ({
  cycle: one(wantedCycles, {
    fields: [wantedNotifyRequests.wantedCycleId],
    references: [wantedCycles.id],
  }),
}));
