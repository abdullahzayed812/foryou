import { Router } from "express";
import { sql } from "drizzle-orm";
import { db } from "../db/index.js";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

export const healthRouter = Router();

/**
 * Liveness probe — process is up. Used by Docker's own HEALTHCHECK.
 */
healthRouter.get("/healthz", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

/**
 * Readiness probe — checks the two hard dependencies. This is what the
 * CI/CD deploy pipeline (architecture doc §11) polls after a rollout before
 * declaring it healthy and cutting traffic over.
 */
healthRouter.get("/readyz", async (_req, res) => {
  const checks = { database: false, redis: false };

  try {
    await db.execute(sql`select 1`);
    checks.database = true;
  } catch (err) {
    logger.warn({ err }, "readiness check: database unreachable");
    checks.database = false;
  }

  try {
    const pong = await redis.ping();
    checks.redis = pong === "PONG";
  } catch (err) {
    logger.warn({ err }, "readiness check: redis unreachable");
    checks.redis = false;
  }

  const ok = checks.database && checks.redis;
  res.status(ok ? 200 : 503).json({ status: ok ? "ready" : "not_ready", checks });
});
