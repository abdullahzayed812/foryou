import { pgTable, text, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "../users/schema.js";

/**
 * Generic admin-tunable key-value store. Deliberately narrow in scope for
 * this phase: only keys that are actually consumed elsewhere are wired up
 * (`minWithdrawalAmount` in wallet/service.ts, `maintenanceMode` in
 * app.ts) — `platformAnnouncement`/`supportEmail` are genuine content the
 * public `/settings` endpoint serves as-is, not a promise of wiring that
 * doesn't exist. See settings/service.ts DEFAULTS for the full known-key
 * list and their fallback values when a row hasn't been set yet.
 */
export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedById: uuid("updated_by_id").references(() => users.id),
});
