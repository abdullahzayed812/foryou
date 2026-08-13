import { Router } from "express";
import { createBrandSchema, updateBrandSchema } from "@foryou/shared";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { brandsService } from "./service.js";

/**
 * Public read access — mounted at /brands. A brand's product listing is
 * `GET /products?brandSlug=...` (products/routes.ts) rather than a nested
 * route here, so Brands doesn't need to depend on Products at all.
 */
export const brandsRouter = Router();

brandsRouter.get("/", async (_req, res) => {
  res.json(await brandsService.list());
});

brandsRouter.get("/:slug", async (req, res) => {
  res.json(await brandsService.getBySlug(req.params.slug as string));
});

/** Admin-only writes — mounted at /admin/brands. */
export const brandsAdminRouter = Router();
brandsAdminRouter.use(requireAuth, requireRole("admin"));

brandsAdminRouter.post("/", async (req, res) => {
  const input = createBrandSchema.parse(req.body);
  res.status(201).json(await brandsService.create(input));
});

brandsAdminRouter.patch("/:id", async (req, res) => {
  const input = updateBrandSchema.parse(req.body);
  res.json(await brandsService.update(req.params.id as string, input));
});

brandsAdminRouter.delete("/:id", async (req, res) => {
  await brandsService.delete(req.params.id as string);
  res.status(204).send();
});
