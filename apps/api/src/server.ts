import { createServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createApp } from "./app.js";
import { env, allowedOrigins } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { redis } from "./lib/redis.js";
import { attachSocketServer } from "./lib/socket.js";
import { initMonitoring } from "./lib/monitoring.js";
import { scheduleOrdersMaintenanceJobs } from "./modules/orders/queue.js";

initMonitoring();

const app = createApp();
const httpServer = createServer(app);

// Registers the *definitions* of the repeating jobs (idempotent upsert) —
// the worker process (src/worker.ts) is what actually executes them.
void scheduleOrdersMaintenanceJobs();

/**
 * Socket.IO gateway shares the same HTTP server/port as the REST API
 * (architecture doc §01) — Nginx routes `/socket.io/*` to this same
 * container. The Redis adapter fans events out across every API instance
 * once there's more than one (architecture doc §14 scale-out) — a
 * notification published by the instance handling the write reaches a
 * socket connected to any other instance, not just this one.
 */
export const io = new SocketIOServer(httpServer, {
  cors: { origin: allowedOrigins, credentials: true },
});
io.adapter(createAdapter(redis.duplicate(), redis.duplicate()));
attachSocketServer(io);

httpServer.listen(env.PORT, () => {
  logger.info(`FOR YOU API listening on port ${env.PORT} (${env.NODE_ENV})`);
});

async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully…`);
  httpServer.close(() => logger.info("HTTP server closed"));
  await redis.quit();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
