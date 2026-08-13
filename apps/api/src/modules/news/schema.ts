import { pgTable, uuid, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { users } from "../users/schema.js";
import { mediaAssets } from "../media/schema.js";

export const newsPostStatusEnum = pgEnum("news_post_status", ["draft", "published"]);

/** Admin-authored platform content — "News & Trends" section of the BRD. */
export const newsPosts = pgTable(
  "news_posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    body: text("body").notNull(),
    coverMediaAssetId: uuid("cover_media_asset_id").references(() => mediaAssets.id),
    status: newsPostStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("news_posts_status_published_at_idx").on(table.status, table.publishedAt)],
);
