import { Router } from "express";
import { createOfferSchema, updateOfferSchema } from "@foryou/shared";
import { requireAuth, requireRole, requireActiveAccount } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { offersService } from "./service.js";

/** Nested under an import request — mounted at /import-requests/:requestId/offers (mergeParams). */
export const offersByRequestRouter = Router({ mergeParams: true });

offersByRequestRouter.get("/", requireAuth, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  // Ownership/participation is checked inside the service — the owning
  // customer sees the full list, a bidding seller sees only their own offer.
  res.json(await offersService.listForRequest(req.user.id, req.params.requestId as string));
});

offersByRequestRouter.post(
  "/",
  requireAuth,
  requireRole("seller"),
  requireActiveAccount,
  async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = createOfferSchema.parse(req.body);
    res
      .status(201)
      .json(await offersService.submit(req.user.id, req.params.requestId as string, input));
  },
);

/** Actions on a specific offer — mounted at /offers. */
export const offersRouter = Router();
offersRouter.use(requireAuth);

offersRouter.get("/me", requireRole("seller"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await offersService.listForSeller(req.user.id));
});

offersRouter.patch("/:id", requireRole("seller"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateOfferSchema.parse(req.body);
  res.json(await offersService.edit(req.user.id, req.params.id as string, input));
});

offersRouter.delete("/:id", requireRole("seller"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await offersService.cancel(req.user.id, req.params.id as string);
  res.status(204).send();
});

offersRouter.post("/:id/select", requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const order = await offersService.select(req.user.id, req.params.id as string);
  res.status(201).json(order);
});
