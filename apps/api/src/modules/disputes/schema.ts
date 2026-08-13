import {
  pgTable,
  uuid,
  text,
  numeric,
  boolean,
  timestamp,
  pgEnum,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "../users/schema.js";
import { orders } from "../orders/schema.js";
import { mediaAssets } from "../media/schema.js";

// BRD Rule 8 — the exact set of valid dispute reasons.
export const disputeReasonEnum = pgEnum("dispute_reason", [
  "wrong_product",
  "wrong_color",
  "wrong_size",
  "damaged_product",
  "missing_items",
  "item_not_delivered",
  "non_original_product",
  "delivery_delay",
]);

export const disputeStatusEnum = pgEnum("dispute_status", [
  "open", // just opened, waiting on the seller's 48h response window
  "seller_responded", // seller replied — awaiting admin review
  "resolved", // admin decided (includes an outright rejection)
]);

export const disputeResolutionEnum = pgEnum("dispute_resolution", [
  "full_refund",
  "partial_refund",
  "replacement",
  "missing_item_shipment",
  "rejected",
]);

export const disputeEvidenceKindEnum = pgEnum("dispute_evidence_kind", ["photo", "video"]);

export const disputes = pgTable(
  "disputes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // One dispute per order at a time — a rejected dispute doesn't get
    // reopened in this MVP (no BRD language describing a resubmission
    // flow), so a plain unique index (not partial) is the correct read.
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    // Denormalized off the order at open time — who has to respond.
    fulfillerId: uuid("fulfiller_id")
      .notNull()
      .references(() => users.id),
    fulfillerRole: text("fulfiller_role", { enum: ["seller", "merchant"] }).notNull(),
    reason: disputeReasonEnum("reason").notNull(),
    description: text("description").notNull(),
    status: disputeStatusEnum("status").notNull().default("open"),
    sellerResponse: text("seller_response"),
    sellerRespondedAt: timestamp("seller_responded_at", { withTimezone: true }),
    resolution: disputeResolutionEnum("resolution"),
    resolutionNote: text("resolution_note"),
    refundAmount: numeric("refund_amount", { precision: 10, scale: 2 }),
    // BRD Rule 8 escalation paths — independent booleans since either can
    // accompany a resolution without being the resolution type itself.
    counterfeitConfirmed: boolean("counterfeit_confirmed").notNull().default(false),
    falseDispute: boolean("false_dispute").notNull().default(false),
    resolvedByAdminId: uuid("resolved_by_admin_id").references(() => users.id),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("disputes_customer_id_idx").on(table.customerId),
    index("disputes_fulfiller_id_idx").on(table.fulfillerId, table.status),
    index("disputes_status_idx").on(table.status),
  ],
);

export const disputeEvidence = pgTable(
  "dispute_evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    disputeId: uuid("dispute_id")
      .notNull()
      .references(() => disputes.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id),
    kind: disputeEvidenceKindEnum("kind").notNull(),
  },
  (table) => [index("dispute_evidence_dispute_id_idx").on(table.disputeId)],
);

export const disputesRelations = relations(disputes, ({ many }) => ({
  evidence: many(disputeEvidence),
}));

export const disputeEvidenceRelations = relations(disputeEvidence, ({ one }) => ({
  dispute: one(disputes, { fields: [disputeEvidence.disputeId], references: [disputes.id] }),
}));
