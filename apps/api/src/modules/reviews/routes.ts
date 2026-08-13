import { Router } from "express";
import type { Role } from "@foryou/shared";
import { createReviewSchema, updateReviewSchema, replyToReviewSchema } from "@foryou/shared";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { reviewsService } from "./service.js";

/** Customer-facing — mounted at /reviews. */
export const reviewsRouter = Router();

reviewsRouter.post("/", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = createReviewSchema.parse(req.body);
  res
    .status(201)
    .json(await reviewsService.create(req.user.id, input.orderId, input.rating, input.comment));
});

reviewsRouter.patch("/:id", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateReviewSchema.parse(req.body);
  res.json(
    await reviewsService.update(req.user.id, req.params.id as string, input.rating, input.comment),
  );
});

reviewsRouter.get("/me", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await reviewsService.listMine(req.user.id));
});

reviewsRouter.get("/pending", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await reviewsService.listPendingReminders(req.user.id));
});

/** Public — storefront display for a seller/merchant's reviews and rating. Mounted at /reviews/of/:userId. */
reviewsRouter.get("/of/:userId", async (req, res) => {
  const userId = req.params.userId as string;
  const [items, stats] = await Promise.all([
    reviewsService.listForReviewee(userId),
    reviewsService.ratingStats(userId),
  ]);
  res.json({ items, stats });
});

/** Seller/Merchant-facing — mounted at /sellers/me/reviews and /merchants/me/reviews. */
export function createFulfillerReviewsRouter(role: Extract<Role, "seller" | "merchant">): Router {
  const router = Router();
  router.use(requireAuth, requireRole(role));

  router.get("/", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json({
      items: await reviewsService.listForReviewee(req.user.id),
      stats: await reviewsService.ratingStats(req.user.id),
    });
  });

  router.post("/:id/reply", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = replyToReviewSchema.parse(req.body);
    res
      .status(201)
      .json(await reviewsService.reply(req.user.id, req.params.id as string, input.reply));
  });

  return router;
}

/** Admin-facing — mounted at /admin/reviews. BRD FR-04 "Reviews Management". */
export const reviewsAdminRouter = Router();
reviewsAdminRouter.use(requireAuth, requireRole("admin"));

reviewsAdminRouter.get("/", async (_req, res) => {
  res.json(await reviewsService.listAllForAdmin());
});

reviewsAdminRouter.post("/:id/hide", async (req, res) => {
  res.json(await reviewsService.setHidden(req.params.id as string, true));
});

reviewsAdminRouter.post("/:id/unhide", async (req, res) => {
  res.json(await reviewsService.setHidden(req.params.id as string, false));
});

reviewsAdminRouter.delete("/:id/reply", async (req, res) => {
  await reviewsService.deleteReply(req.params.id as string);
  res.status(204).send();
});

reviewsAdminRouter.delete("/:id", async (req, res) => {
  await reviewsService.remove(req.params.id as string);
  res.status(204).send();
});
