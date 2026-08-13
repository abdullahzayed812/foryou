import { EventEmitter } from "node:events";
import { logger } from "./logger.js";

/**
 * The typed domain-event contract (architecture doc §06). Each module
 * augments this interface via declaration merging in its own `events.ts`,
 * e.g.:
 *
 *   declare module "../../lib/events.js" {
 *     interface EventMap {
 *       "user.registered": { userId: string; role: MarketplaceRole };
 *     }
 *   }
 *
 * That keeps the payload contract co-located with the module that owns it,
 * while `publish`/`subscribe` stay fully typed everywhere else.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- augmented by modules
export interface EventMap {}

type EventName = keyof EventMap;

class TypedEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many modules subscribe to the same lifecycle events (e.g. order.completed
    // fans out to Trust Score, Wallet, Reviews, Notifications) — raise the
    // default limit rather than let Node warn about a false leak.
    this.emitter.setMaxListeners(100);
  }

  publish<K extends EventName>(event: K, payload: EventMap[K]): void {
    logger.debug({ event, payload }, "event.published");
    this.emitter.emit(event as string, payload);
  }

  subscribe<K extends EventName>(
    event: K,
    handler: (payload: EventMap[K]) => void | Promise<void>,
  ): void {
    this.emitter.on(event as string, (payload: EventMap[K]) => {
      Promise.resolve(handler(payload)).catch((err: unknown) => {
        logger.error({ err, event }, "event handler failed");
      });
    });
  }
}

/**
 * In-process pub/sub for read-model side effects (cache invalidation,
 * ranking, badge refresh). Events with financial or notification
 * consequences instead go through a BullMQ queue in the same transaction as
 * the state change (transactional outbox) — see modules/* queue.ts,
 * introduced starting Phase 5. This split is documented in the architecture
 * doc §06.
 */
export const eventBus = new TypedEventBus();
