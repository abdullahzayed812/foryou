import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { trustScoreService } from "./service.js";

/** Mounted at /users/me/trust — badge/level only, matches architecture doc §04. */
export const trustScoreRouter = Router();

trustScoreRouter.get("/", requireAuth, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const badge = await trustScoreService.getBadge(req.user.id);
  res.json(badge);
});

/** Mounted at /admin/users — numeric score is admin-only (BRD Rule 2). */
export const trustScoreAdminRouter = Router();

trustScoreAdminRouter.use(requireAuth, requireRole("admin"));

trustScoreAdminRouter.get("/:id/trust-score", async (req, res) => {
  const result = await trustScoreService.getNumericForAdmin(req.params.id as string);
  res.json(result);
});

trustScoreAdminRouter.get("/:id/trust-score/history", async (req, res) => {
  const history = await trustScoreService.getHistoryForAdmin(req.params.id as string);
  res.json(history);
});
