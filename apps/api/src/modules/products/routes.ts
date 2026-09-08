import { Router } from "express";
import {
  createProductSchema,
  updateProductSchema,
  replaceProductImagesSchema,
  listProductsQuerySchema,
  rejectProductSchema,
  completeImportSchema,
} from "@foryou/shared";
import type { Role } from "@foryou/shared";
import { requireAuth, requireRole, requireActiveAccount, optionalAuth } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { productsService } from "./service.js";
import { wantedService } from "../wanted/service.js";

/** Public — mounted at /products. */
export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  const query = listProductsQuerySchema.parse(req.query);
  res.json(await productsService.browse(query));
});

productsRouter.get("/:id", async (req, res) => {
  res.json(await productsService.getPublic(req.params.id as string));
});

productsRouter.post("/:id/notify-me", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await productsService.notifyMeWhenAvailable(req.params.id as string, req.user.id);
  res.status(204).send();
});

// ---- FOR YOU WANTED — customer-facing (❤️ Like / 🔔 Notify Me) ----

/** Current WANTED engagement for a product (null cycle once it's EXPRESS — WANTED counters are historical then). */
productsRouter.get("/:id/wanted", optionalAuth, async (req, res) => {
  res.json(await wantedService.getView(req.params.id as string, req.user?.id));
});

const asCustomer = [requireAuth, requireRole("customer")] as const;

productsRouter.post("/:id/wanted/like", ...asCustomer, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await wantedService.like(req.params.id as string, req.user.id);
  res.status(204).send();
});

productsRouter.delete("/:id/wanted/like", ...asCustomer, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await wantedService.unlike(req.params.id as string, req.user.id);
  res.status(204).send();
});

productsRouter.post("/:id/wanted/notify", ...asCustomer, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await wantedService.requestNotify(req.params.id as string, req.user.id);
  res.status(204).send();
});

productsRouter.delete("/:id/wanted/notify", ...asCustomer, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await wantedService.cancelNotify(req.params.id as string, req.user.id);
  res.status(204).send();
});

/**
 * Both Sellers and Merchants publish ready-to-ship products under their own
 * role-scoped path (BRD Rule 6 — "both account types are allowed to publish
 * ready-to-ship products"), which is also how a dual-role account
 * disambiguates which "hat" a given product was listed under.
 */
export function createOwnerProductsRouter(role: Extract<Role, "seller" | "merchant">): Router {
  const router = Router();
  router.use(requireAuth, requireRole(role));

  router.get("/", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await productsService.listOwnedBy(req.user.id, role));
  });

  router.get("/:id", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await productsService.getForOwner(req.user.id, req.params.id as string));
  });

  router.post("/", requireActiveAccount, async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = createProductSchema.parse(req.body);
    res.status(201).json(await productsService.create(req.user.id, role, input));
  });

  router.patch("/:id", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = updateProductSchema.parse(req.body);
    res.json(await productsService.update(req.user.id, req.params.id as string, input));
  });

  router.put("/:id/images", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = replaceProductImagesSchema.parse(req.body);
    res.json(
      await productsService.replaceImages(req.user.id, req.params.id as string, input.images),
    );
  });

  router.delete("/:id", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    await productsService.delete(req.user.id, req.params.id as string);
    res.status(204).send();
  });

  // ---- FOR YOU WANTED — owner lifecycle controls + analytics ----

  /** Every product this account is currently demand-testing (open WANTED cycles). */
  router.get("/wanted/dashboard", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await wantedService.listOwnerWantedProducts(req.user.id, role));
  });

  /** Full WANTED cycle history for one product (likes, notify requests, imported, sold, remaining, conversion). */
  router.get("/:id/wanted/cycles", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    await productsService.getForOwner(req.user.id, req.params.id as string); // ownership guard
    res.json(await wantedService.getCycleAnalytics(req.params.id as string));
  });

  router.post("/:id/wanted/start", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.status(201).json(await wantedService.startWanted(req.user.id, req.params.id as string));
  });

  router.post("/:id/wanted/importing", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await wantedService.startImporting(req.user.id, req.params.id as string));
  });

  router.post("/:id/wanted/complete-import", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = completeImportSchema.parse(req.body);
    res.json(
      await wantedService.completeImport(
        req.user.id,
        req.params.id as string,
        input.importedQuantity,
      ),
    );
  });

  return router;
}

/** Mounted at /admin/products. */
export const productsAdminRouter = Router();
productsAdminRouter.use(requireAuth, requireRole("admin"));

productsAdminRouter.get("/queue", async (_req, res) => {
  res.json(await productsService.getModerationQueue());
});

/** Product lifecycle + WANTED cycle history for admin oversight (reuses the same analytics as the owner view). */
productsAdminRouter.get("/:id/wanted/cycles", async (req, res) => {
  res.json(await wantedService.getCycleAnalytics(req.params.id as string));
});

productsAdminRouter.post("/:id/approve", async (req, res) => {
  res.json(await productsService.approve(req.params.id as string));
});

productsAdminRouter.post("/:id/reject", async (req, res) => {
  const input = rejectProductSchema.parse(req.body);
  res.json(await productsService.reject(req.params.id as string, input.reason));
});

productsAdminRouter.post("/:id/hide", async (req, res) => {
  res.json(await productsService.hide(req.params.id as string));
});

productsAdminRouter.delete("/:id", async (req, res) => {
  await productsService.adminDelete(req.params.id as string);
  res.status(204).send();
});
