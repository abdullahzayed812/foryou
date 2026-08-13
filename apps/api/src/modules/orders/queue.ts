import { createQueue, createWorker } from "../../lib/queue.js";
import { logger } from "../../lib/logger.js";
import { ordersService } from "./service.js";

export const ORDERS_MAINTENANCE_QUEUE = "orders-maintenance";

type MaintenanceJob =
  | { task: "enforce-deposit-deadlines" }
  | { task: "auto-close-stale-deliveries" }
  | { task: "release-eligible-balances" };

export const ordersMaintenanceQueue = createQueue<MaintenanceJob>(ORDERS_MAINTENANCE_QUEUE);

/**
 * Three scheduled sweeps (architecture doc §07), all idempotent by
 * construction — each re-derives "what's eligible right now" from the
 * database rather than trusting job payload state, so a re-run or overlap
 * is harmless.
 */
export async function scheduleOrdersMaintenanceJobs(): Promise<void> {
  await ordersMaintenanceQueue.upsertJobScheduler(
    "enforce-deposit-deadlines",
    { every: 5 * 60_000 }, // every 5 min — BRD's 24h window doesn't need finer granularity than this
    { name: "enforce-deposit-deadlines", data: { task: "enforce-deposit-deadlines" } },
  );
  await ordersMaintenanceQueue.upsertJobScheduler(
    "auto-close-stale-deliveries",
    { every: 15 * 60_000 },
    { name: "auto-close-stale-deliveries", data: { task: "auto-close-stale-deliveries" } },
  );
  await ordersMaintenanceQueue.upsertJobScheduler(
    "release-eligible-balances",
    { every: 60 * 60_000 },
    { name: "release-eligible-balances", data: { task: "release-eligible-balances" } },
  );
}

export function startOrdersMaintenanceWorker() {
  return createWorker<MaintenanceJob>(ORDERS_MAINTENANCE_QUEUE, async (job) => {
    switch (job.data.task) {
      case "enforce-deposit-deadlines": {
        const count = await ordersService.enforceDepositDeadlines();
        if (count > 0) logger.info({ count }, "enforced deposit deadlines");
        break;
      }
      case "auto-close-stale-deliveries": {
        const count = await ordersService.autoCloseStaleDeliveries();
        if (count > 0) logger.info({ count }, "auto-closed stale deliveries");
        break;
      }
      case "release-eligible-balances": {
        const count = await ordersService.releaseEligibleBalances();
        if (count > 0) logger.info({ count }, "released eligible wallet balances");
        break;
      }
    }
  });
}
