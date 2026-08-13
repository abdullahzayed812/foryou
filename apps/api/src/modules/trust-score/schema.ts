import { pgTable, uuid, integer, text, timestamp, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../users/schema.js";

/** Current score + cache — one row per account (BRD Rule 2: starts at 50/Neutral). */
export const trustScores = pgTable(
  "trust_scores",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(50),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check("trust_scores_score_range", sql`${table.score} BETWEEN 0 AND 100`)],
);

/** Append-only ledger — every point delta and the domain event that caused it (architecture doc §03). */
export const trustScoreEvents = pgTable(
  "trust_score_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    scoreAfter: integer("score_after").notNull(),
    reason: text("reason").notNull(),
    sourceEvent: text("source_event").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("trust_score_events_user_id_idx").on(table.userId, table.createdAt)],
);
