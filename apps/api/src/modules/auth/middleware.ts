import type { Request, Response, NextFunction } from "express";
import type { Role } from "@foryou/shared";
import {
  UnauthenticatedError,
  ForbiddenError,
  AccountSuspendedError,
} from "../../lib/http-errors.js";
import { verifyAccessToken } from "./jwt.js";
import { usersRepository } from "../users/repository.js";

function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/**
 * Verifies the JWT and attaches `req.user`. Does NOT hit the database on
 * every request — the token's `roles` claim is the source of truth for
 * authorization checks within its ~15 min lifetime, matching architecture
 * doc §05 (a role change takes effect on the next token refresh).
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (!token) throw new UnauthenticatedError();
  const payload = verifyAccessToken(token);
  req.user = { id: payload.sub, roles: payload.roles };
  next();
}

/** Optional auth: attaches `req.user` if a valid token is present, otherwise continues anonymously. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = verifyAccessToken(token);
      req.user = { id: payload.sub, roles: payload.roles };
    } catch {
      // anonymous — an invalid/expired token on an optional route just means "not logged in"
    }
  }
  next();
}

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthenticatedError();
    if (!req.user.roles.some((r) => allowed.includes(r))) {
      throw new ForbiddenError(`Requires one of roles: ${allowed.join(", ")}`);
    }
    next();
  };
}

/**
 * Re-checks account status against the database — used on mutating routes
 * where a suspension that happened mid-session should take effect
 * immediately rather than waiting for token expiry (e.g. before letting a
 * suspended seller submit a new offer).
 */
export async function requireActiveAccount(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) throw new UnauthenticatedError();
  const user = await usersRepository.findById(req.user.id);
  if (!user || user.status !== "active") throw new AccountSuspendedError();
  next();
}
