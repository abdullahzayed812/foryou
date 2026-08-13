import { Router } from "express";
import { createImportRequestSchema } from "@foryou/shared";
import { requireAuth, requireRole, requireActiveAccount } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { importRequestsService } from "./service.js";

/**
 * Customer-facing — mounted at /import-requests. Auth/role checks are
 * per-route (not a router-wide `.use()`) on purpose: this router shares the
 * `/import-requests` prefix with offersByRequestRouter, mounted separately
 * at `/import-requests/:requestId/offers`. A blanket guard here would run
 * for *every* path under the shared prefix — including the nested offers
 * route meant for sellers — and reject it before Express ever got to try
 * the other router. Each handler below only matches its own exact path, so
 * `/import-requests/:id/offers` correctly falls through instead.
 */
export const importRequestsRouter = Router();

importRequestsRouter.post(
  "/",
  requireAuth,
  requireRole("customer"),
  requireActiveAccount,
  async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = createImportRequestSchema.parse(req.body);
    res.status(201).json(await importRequestsService.create(req.user.id, input));
  },
);

importRequestsRouter.get("/me", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await importRequestsService.listMine(req.user.id));
});

importRequestsRouter.get("/:id", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await importRequestsService.getMine(req.user.id, req.params.id as string));
});

importRequestsRouter.post("/:id/cancel", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await importRequestsService.cancel(req.user.id, req.params.id as string);
  res.status(204).send();
});

/** Seller-facing matching queue — mounted at /sellers/me/import-requests (no prefix collision, safe to guard at the root). */
export const sellerImportRequestsRouter = Router();
sellerImportRequestsRouter.use(requireAuth, requireRole("seller"));

sellerImportRequestsRouter.get("/", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await importRequestsService.listOpenForSeller(req.user.id));
});

sellerImportRequestsRouter.get("/:id", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await importRequestsService.getForSeller(req.user.id, req.params.id as string));
});

sellerImportRequestsRouter.post("/:id/ignore", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await importRequestsService.ignore(req.user.id, req.params.id as string);
  res.status(204).send();
});
