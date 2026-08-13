import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { adminStatsService } from "./stats-service.js";

/** Mounted at /admin/stats. */
export const adminStatsRouter = Router();
adminStatsRouter.use(requireAuth, requireRole("admin"));

adminStatsRouter.get("/", async (_req, res) => {
  res.json(await adminStatsService.getPlatformStats());
});
