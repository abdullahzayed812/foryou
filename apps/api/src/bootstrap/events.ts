import { registerTrustScoreSubscribers } from "../modules/trust-score/event-subscribers.js";
import { registerNotificationSubscribers } from "../modules/notifications/event-subscribers.js";

/**
 * Every module's event subscriptions register here exactly once, at process
 * boot — called from app.ts so it fires both for `npm run dev` and for
 * `createApp()` in tests. Keep this a flat list of `register*Subscribers()`
 * calls, one per module, never business logic itself.
 */
let registered = false;

export function registerEventSubscribers(): void {
  if (registered) return; // createApp() can be called more than once per process (e.g. tests)
  registered = true;
  registerTrustScoreSubscribers();
  registerNotificationSubscribers();
}
