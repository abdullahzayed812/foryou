import type { Request, Response, NextFunction } from "express";
import { ERROR_CODES } from "@foryou/shared";
import { AppError } from "../lib/http-errors.js";
import { settingsService } from "../modules/settings/service.js";

/**
 * Admin platform setting (Phase 11): when enabled, blocks new mutations
 * platform-wide while leaving reads working so the site doesn't go fully
 * dark. Always lets through: GETs, `/auth/*` (an admin still needs to log
 * in), `/admin/*` (an admin still needs to turn it back off), and
 * `/webhooks/*` (Paymob doesn't know or care about our maintenance banner —
 * blocking it would desync payment state).
 */
export async function maintenanceMode(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (req.method === "GET") return next();
  if (
    req.path.startsWith("/auth") ||
    req.path.startsWith("/admin") ||
    req.path.startsWith("/webhooks")
  ) {
    return next();
  }

  const enabled = await settingsService.get("maintenanceMode");
  if (!enabled) return next();

  next(
    new AppError(
      503,
      ERROR_CODES.MAINTENANCE_MODE,
      "The platform is temporarily down for maintenance",
    ),
  );
}
