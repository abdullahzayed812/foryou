export interface WantedCycleStartedPayload {
  productId: string;
  cycleId: string;
  cycleNumber: number;
}

export interface WantedCycleImportingPayload {
  productId: string;
  cycleId: string;
}

/**
 * The WANTED → EXPRESS transition. Notifications consumes this to fan out
 * "the product you wanted is now available" to that cycle's 🔔 notify-me
 * requesters (dedup guarded by wanted_notify_requests.notified_at).
 */
export interface WantedCycleCompletedPayload {
  productId: string;
  cycleId: string;
  importedQuantity: number;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "wanted.cycle.started": WantedCycleStartedPayload;
    "wanted.cycle.importing": WantedCycleImportingPayload;
    "wanted.cycle.completed": WantedCycleCompletedPayload;
  }
}
