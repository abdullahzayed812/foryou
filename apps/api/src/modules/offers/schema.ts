import {
  pgTable,
  uuid,
  numeric,
  integer,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../users/schema.js";
import { importRequests } from "../import-requests/schema.js";

export const offerStatusEnum = pgEnum("offer_status", [
  "active",
  "selected",
  "rejected",
  "cancelled",
]);

export const offers = pgTable(
  "offers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importRequestId: uuid("import_request_id")
      .notNull()
      .references(() => importRequests.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }).notNull(),
    estimatedDeliveryDays: integer("estimated_delivery_days").notNull(),
    // BRD Rule 4: seller picks one of exactly four predefined percentages — manual entry not allowed.
    depositPercentage: integer("deposit_percentage").notNull(),
    status: offerStatusEnum("status").notNull().default("active"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Partial, not a plain unique index: "one offer per seller per request"
    // only holds while that offer is still `active`. A request can go back
    // to sellers after a missed deposit deadline (BRD Rule 4 — "first
    // occurrence: request returns to sellers for new offers"), and the same
    // seller who won the first round must be able to submit again once
    // their earlier offer has moved to `selected`/`rejected`/`cancelled`.
    uniqueIndex("offers_request_seller_active_unique")
      .on(table.importRequestId, table.sellerId)
      .where(sql`${table.status} = 'active'`),
    index("offers_import_request_id_idx").on(table.importRequestId, table.status),
    check("offers_deposit_percentage_check", sql`${table.depositPercentage} IN (20, 30, 40, 50)`),
  ],
);
