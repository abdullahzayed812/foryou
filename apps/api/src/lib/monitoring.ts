import * as Sentry from "@sentry/node";
import { env, isProd } from "../config/env.js";

/**
 * No-op unless SENTRY_DSN is set — every environment (dev/test/CI) runs
 * without an account. Called once at process start, before anything else,
 * from both entrypoints (server.ts and worker.ts) so API errors and job
 * failures land in the same project (architecture doc §13).
 */
export function initMonitoring(): void {
  if (!env.SENTRY_DSN) return;
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: isProd ? 0.1 : 0,
  });
}

export function captureError(err: unknown, context?: Record<string, unknown>): void {
  if (!env.SENTRY_DSN) return;
  Sentry.captureException(err, context ? { extra: context } : undefined);
}
