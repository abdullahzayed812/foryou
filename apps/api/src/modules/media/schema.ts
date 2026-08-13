import { pgTable, uuid, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { MEDIA_PURPOSES } from "@foryou/shared";
import { users } from "../users/schema.js";

export const mediaKindEnum = pgEnum("media_kind", ["image", "video"]);
export const mediaStatusEnum = pgEnum("media_status", ["pending", "processing", "ready", "failed"]);
export const mediaPurposeEnum = pgEnum("media_purpose", MEDIA_PURPOSES);

/**
 * One row per uploaded file, owned by whichever module attaches it via its
 * *own* foreign key (verification_documents.media_asset_id, and later
 * product_images, review_evidence, dispute_evidence, …). Deliberately NOT a
 * polymorphic owner_type/owner_id pair — a real FK per consumer keeps
 * referential integrity instead of relying on app-level bookkeeping, a small
 * refinement over the architecture doc's original sketch.
 */
export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    uploaderId: uuid("uploader_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: mediaKindEnum("kind").notNull(),
    purpose: mediaPurposeEnum("purpose").notNull(),
    status: mediaStatusEnum("status").notNull().default("pending"),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    originalKey: text("original_key").notNull(),
    processedKey: text("processed_key"),
    width: integer("width"),
    height: integer("height"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("media_assets_uploader_id_idx").on(table.uploaderId)],
);
