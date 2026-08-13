import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { settingsService, type SettingKey } from "./service.js";

/** Public — mounted at /settings. Only the keys marked `public` in service.ts DEFAULTS are returned. */
export const settingsRouter = Router();

settingsRouter.get("/", async (_req, res) => {
  res.json(await settingsService.getPublic());
});

/** Admin-facing — mounted at /admin/settings. */
export const settingsAdminRouter = Router();
settingsAdminRouter.use(requireAuth, requireRole("admin"));

settingsAdminRouter.get("/", async (_req, res) => {
  res.json(await settingsService.getAll());
});

const updateSettingsSchema = z
  .object({
    maintenanceMode: z.boolean().optional(),
    platformAnnouncement: z.string().max(2000).optional(),
    supportEmail: z.email().optional(),
    minWithdrawalAmount: z.number().nonnegative().optional(),
  })
  .strict();

settingsAdminRouter.put("/", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateSettingsSchema.parse(req.body);
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) await settingsService.set(key as SettingKey, value, req.user.id);
  }
  res.json(await settingsService.getAll());
});
