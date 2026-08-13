import { pgTable, uuid, text, integer, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";
import { users } from "../users/schema.js";
import { orders } from "../orders/schema.js";

/**
 * One review per order (BRD Rule 3 Stage 6 / customer capabilities list):
 * the order is both the eligibility gate (must be `completed`) and the
 * natural uniqueness key — a customer doesn't review a seller in the
 * abstract, they review a specific transaction.
 */
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .unique()
      .references(() => orders.id, { onDelete: "cascade" }),
    customerId: uuid("customer_id")
      .notNull()
      .references(() => users.id),
    // Denormalized off the order at creation time — who's being reviewed,
    // seller or merchant — so listing "reviews for me" doesn't need a join
    // back through orders for every read.
    revieweeId: uuid("reviewee_id")
      .notNull()
      .references(() => users.id),
    rating: integer("rating").notNull(),
    comment: text("comment"),
    // Edit window (BRD: "edit review only within allowed period" — no exact
    // duration given; 7 days from submission is an architect recommendation).
    editableUntil: timestamp("editable_until", { withTimezone: true }).notNull(),
    // Admin moderation (BRD FR-04 "Reviews Management": Hide Reviews). Null
    // means visible; set means an admin pulled it from public/reviewee view
    // without hard-deleting it.
    hiddenAt: timestamp("hidden_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("reviews_rating_range", sql`${table.rating} >= 1 AND ${table.rating} <= 5`),
    index("reviews_reviewee_id_idx").on(table.revieweeId),
  ],
);

/** One reply per review — Seller/Merchant capability (BRD "Reply to reviews"). */
export const reviewReplies = pgTable("review_replies", {
  id: uuid("id").primaryKey().defaultRandom(),
  reviewId: uuid("review_id")
    .notNull()
    .unique()
    .references(() => reviews.id, { onDelete: "cascade" }),
  replierId: uuid("replier_id")
    .notNull()
    .references(() => users.id),
  reply: text("reply").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reviewsRelations = relations(reviews, ({ one }) => ({
  reply: one(reviewReplies, { fields: [reviews.id], references: [reviewReplies.reviewId] }),
}));

export const reviewRepliesRelations = relations(reviewReplies, ({ one }) => ({
  review: one(reviews, { fields: [reviewReplies.reviewId], references: [reviews.id] }),
}));
