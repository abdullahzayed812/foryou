import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "../users/schema.js";

export const importRequestStatusEnum = pgEnum("import_request_status", [
  "open", // accepting offers
  "offer_selected", // customer picked one; waiting on deposit (owned by Orders from here)
  "closed", // deposit deadline exhausted twice, or customer cancelled before selecting
  "expired", // no offers received / no action taken (future cleanup job)
]);

export interface ImportRequestNotes {
  color?: string;
  size?: string;
  quantity?: string;
  preferences?: string;
}

export const importRequests = pgTable(
  "import_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    notes: jsonb("notes").$type<ImportRequestNotes>(),
    sourceCountry: text("source_country"),
    status: importRequestStatusEnum("status").notNull().default("open"),
    depositDeadlineStrikes: integer("deposit_deadline_strikes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("import_requests_customer_id_idx").on(table.customerId, table.status)],
);

export const importRequestLinks = pgTable(
  "import_request_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importRequestId: uuid("import_request_id")
      .notNull()
      .references(() => importRequests.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
  },
  (table) => [index("import_request_links_request_id_idx").on(table.importRequestId)],
);

/** A seller explicitly dismissing a request from their queue (BRD Rule 3 Stage 2 "Ignore the request"). */
export const importRequestIgnores = pgTable(
  "import_request_ignores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    importRequestId: uuid("import_request_id")
      .notNull()
      .references(() => importRequests.id, { onDelete: "cascade" }),
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("import_request_ignores_unique").on(table.importRequestId, table.sellerId),
  ],
);

export const importRequestsRelations = relations(importRequests, ({ many }) => ({
  links: many(importRequestLinks),
}));

export const importRequestLinksRelations = relations(importRequestLinks, ({ one }) => ({
  request: one(importRequests, {
    fields: [importRequestLinks.importRequestId],
    references: [importRequests.id],
  }),
}));
