import { logger } from "./lib/logger.js";
import { redis } from "./lib/redis.js";
import { initMonitoring } from "./lib/monitoring.js";
import { startMediaWorker } from "./modules/media/worker.js";
import { startOrdersMaintenanceWorker } from "./modules/orders/queue.js";

initMonitoring();

/**
 * Separate process from the API (architecture doc §01/§12 — `worker`
 * container). Every module's BullMQ processor registers itself here as it's
 * built; this file stays a flat list of `start*Worker()` calls, never
 * business logic itself.
 */
const workers = [startMediaWorker(), startOrdersMaintenanceWorker()];

logger.info(`FOR YOU worker started (${workers.length} queue processor(s))`);

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down worker gracefully…`);
  await Promise.all(workers.map((w) => w.close()));
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
