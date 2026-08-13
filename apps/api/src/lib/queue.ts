import { Queue, Worker, type Processor, type WorkerOptions } from "bullmq";
import { Redis } from "ioredis";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { captureError } from "./monitoring.js";

/**
 * BullMQ requires `maxRetriesPerRequest: null` on its Redis connections
 * (blocking commands) — incompatible with the app's shared `redis` client in
 * lib/redis.ts, so every Queue/Worker gets its own connection, per BullMQ's
 * own recommendation (architecture doc §07).
 */
function createBullConnection(): Redis {
  return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
}

export function createQueue<T>(name: string): Queue<T> {
  return new Queue<T>(name, { connection: createBullConnection() });
}

export function createWorker<T>(
  name: string,
  processor: Processor<T>,
  opts: Partial<WorkerOptions> = {},
): Worker<T> {
  const worker = new Worker<T>(name, processor, {
    connection: createBullConnection(),
    concurrency: 5,
    ...opts,
  });
  worker.on("failed", (job, err) => {
    logger.error({ err, jobId: job?.id, queue: name }, "job failed");
    captureError(err, { jobId: job?.id, queue: name });
  });
  worker.on("completed", (job) => {
    logger.debug({ jobId: job.id, queue: name }, "job completed");
  });
  return worker;
}
