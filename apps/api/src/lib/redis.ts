import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Single shared Redis connection for cache/rate-limit/lock use. BullMQ queues
 * and workers create their own dedicated connections (required by BullMQ)
 * rather than reusing this one — see modules/* queue.ts as they're added.
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on("error", (err) => logger.error({ err }, "Redis connection error"));
redis.on("connect", () => logger.info("Redis connected"));
