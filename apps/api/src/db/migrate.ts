import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, closeDb } from "./index.js";
import { logger } from "../lib/logger.js";

async function main() {
  logger.info("Running database migrations…");
  await migrate(db, { migrationsFolder: "./drizzle" });
  logger.info("Migrations complete.");
  await closeDb();
}

main().catch((err: unknown) => {
  logger.error({ err }, "Migration failed");
  process.exit(1);
});
