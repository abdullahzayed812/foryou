import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env.js";
import * as schema from "./schema/index.js";

const queryClient = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 20 : 10,
});

export const db = drizzle(queryClient, { schema, logger: env.NODE_ENV === "development" });

/** Used only by scripts (migrate, seed) that need to close the pool cleanly. */
export async function closeDb(): Promise<void> {
  await queryClient.end();
}
