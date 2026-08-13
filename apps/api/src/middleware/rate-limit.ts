import rateLimit from "express-rate-limit";
import { RedisStore, type RedisReply } from "rate-limit-redis";
import { redis } from "../lib/redis.js";
import { isTest } from "../config/env.js";

/**
 * Redis-backed limiter factory for the specific routes worth abusing — login,
 * OTP, offer submission, withdrawals (architecture doc §08/§09). The global
 * in-memory limiter in app.ts is just a coarse baseline; these are the real
 * defense and must share state across API instances, hence Redis.
 *
 * Disabled under NODE_ENV=test: the counters live in the real dev Redis
 * (integration tests run against real infra, no mocks — see README
 * "Testing"), so without this, state from one test run would throttle the
 * next one run within the same window.
 */
export function redisRateLimit(opts: { windowMs: number; limit: number; keyPrefix: string }) {
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    store: new RedisStore({
      prefix: `rl:${opts.keyPrefix}:`,
      // ioredis's `call` is a heavily-overloaded generated method whose
      // overloads don't accept a generic string[] spread — cast to the plain
      // rest signature the underlying implementation actually has.
      sendCommand: (...args: string[]) =>
        (redis.call as (...a: string[]) => Promise<RedisReply>)(...args),
    }),
  });
}
