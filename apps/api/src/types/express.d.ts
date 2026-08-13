import "express";
import type { Role } from "@foryou/shared";

declare global {
  namespace Express {
    interface Request {
      /** Per-request correlation id, set by pino-http (middleware/request-context.ts). */
      id: string;
      /** Set by requireAuth (modules/auth/middleware.ts) after verifying the access token. */
      user?: { id: string; roles: Role[] };
    }
  }
}
