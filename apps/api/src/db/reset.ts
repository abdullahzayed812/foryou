import { sql } from "drizzle-orm";
import { db, closeDb } from "./index.js";
import { logger } from "../lib/logger.js";
import { env, isProd } from "../config/env.js";

/** Dev convenience only — drops every table (including Drizzle's own
 * migration-tracking schema) so `db:migrate` re-applies from scratch. Refuses
 * to run against production so a mistyped script name can't wipe real data. */
async function main() {
  if (isProd) {
    throw new Error("db:reset refuses to run with NODE_ENV=production — this drops every table.");
  }
  logger.warn(`Resetting database at ${env.DATABASE_URL.replace(/:[^:@/]+@/, ":***@")}…`);
  await db.execute(sql`DROP SCHEMA IF EXISTS public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`DROP SCHEMA IF EXISTS drizzle CASCADE`);
  logger.info("Database reset. Run `npm run db:migrate` (and `npm run db:seed`) next.");
}

main()
  .catch((err: unknown) => {
    logger.error({ err }, "Reset failed");
    process.exitCode = 1;
  })
  .finally(() => closeDb());
