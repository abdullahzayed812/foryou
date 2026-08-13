import { Router } from "express";
import type { Role } from "@foryou/shared";
import { openDisputeSchema, respondToDisputeSchema, resolveDisputeSchema } from "@foryou/shared";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { disputesService } from "./service.js";

/** Customer-facing — mounted at /disputes. */
export const disputesRouter = Router();
disputesRouter.use(requireAuth, requireRole("customer"));

disputesRouter.post("/", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = openDisputeSchema.parse(req.body);
  const evidence = [
    ...input.photoMediaAssetIds.map((mediaAssetId) => ({ mediaAssetId, kind: "photo" as const })),
    ...(input.videoMediaAssetIds ?? []).map((mediaAssetId) => ({
      mediaAssetId,
      kind: "video" as const,
    })),
  ];
  res
    .status(201)
    .json(
      await disputesService.open(
        req.user.id,
        input.orderId,
        input.reason,
        input.description,
        evidence,
      ),
    );
});

disputesRouter.get("/me", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await disputesService.listMine(req.user.id));
});

disputesRouter.get("/:id", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await disputesService.getMine(req.user.id, req.params.id as string));
});

/** Seller/Merchant-facing — mounted at /sellers/me/disputes and /merchants/me/disputes. */
export function createFulfillerDisputesRouter(role: Extract<Role, "seller" | "merchant">): Router {
  const router = Router();
  router.use(requireAuth, requireRole(role));

  router.get("/", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await disputesService.listForFulfiller(req.user.id));
  });

  router.get("/:id", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await disputesService.getForFulfiller(req.user.id, req.params.id as string));
  });

  router.post("/:id/respond", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = respondToDisputeSchema.parse(req.body);
    res.json(await disputesService.respond(req.user.id, req.params.id as string, input.response));
  });

  return router;
}

/** Admin-facing — mounted at /admin/disputes. */
export const disputesAdminRouter = Router();
disputesAdminRouter.use(requireAuth, requireRole("admin"));

disputesAdminRouter.get("/queue", async (_req, res) => {
  res.json(await disputesService.listQueue());
});

disputesAdminRouter.get("/awaiting-review", async (_req, res) => {
  res.json(await disputesService.listAwaitingReview());
});

// Registered after the literal `/queue` and `/awaiting-review` paths above —
// Express matches routes in registration order, so a param route here first
// would swallow those two literal paths as `id="queue"` etc.
disputesAdminRouter.get("/:id", async (req, res) => {
  res.json(await disputesService.getForAdmin(req.params.id as string));
});

disputesAdminRouter.post("/:id/resolve", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = resolveDisputeSchema.parse(req.body);
  res.json(await disputesService.resolve(req.user.id, req.params.id as string, input));
});
