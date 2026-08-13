import { pgTable, uuid, text, timestamp, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "../users/schema.js";
import { mediaAssets } from "../media/schema.js";

export const verificationTypeEnum = pgEnum("verification_type", ["identity", "business"]);
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
  "more_docs_needed",
  "revoked",
]);
export const verificationDocumentTypeEnum = pgEnum("verification_document_type", [
  "national_id",
  "selfie",
  "commercial_registration",
]);

export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: verificationTypeEnum("type").notNull(),
    status: verificationStatusEnum("status").notNull().default("pending"),
    rejectionReason: text("rejection_reason"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verification_requests_user_id_idx").on(table.userId, table.type),
    // At most one row per user+type that's still "live" (pending / needs more
    // docs) — approved/rejected/revoked are terminal-ish history, enforced in
    // the service layer rather than a DB constraint since Postgres partial
    // unique indexes on enum-in-list conditions get unwieldy in Drizzle.
  ],
);

export const verificationDocuments = pgTable(
  "verification_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    verificationRequestId: uuid("verification_request_id")
      .notNull()
      .references(() => verificationRequests.id, { onDelete: "cascade" }),
    mediaAssetId: uuid("media_asset_id")
      .notNull()
      .references(() => mediaAssets.id),
    documentType: verificationDocumentTypeEnum("document_type").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("verification_documents_request_id_idx").on(table.verificationRequestId),
    uniqueIndex("verification_documents_media_asset_unique").on(table.mediaAssetId),
  ],
);

export const verificationRequestsRelations = relations(verificationRequests, ({ many }) => ({
  documents: many(verificationDocuments),
}));

export const verificationDocumentsRelations = relations(verificationDocuments, ({ one }) => ({
  request: one(verificationRequests, {
    fields: [verificationDocuments.verificationRequestId],
    references: [verificationRequests.id],
  }),
}));
