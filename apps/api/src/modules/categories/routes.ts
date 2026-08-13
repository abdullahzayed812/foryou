import { Router } from "express";
import { createCategorySchema, updateCategorySchema } from "@foryou/shared";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { categoriesService } from "./service.js";

/** Public read access — mounted at /categories. */
export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req, res) => {
  res.json(await categoriesService.list());
});

categoriesRouter.get("/:id", async (req, res) => {
  res.json(await categoriesService.get(req.params.id as string));
});

/** Admin-only writes — mounted at /admin/categories. */
export const categoriesAdminRouter = Router();
categoriesAdminRouter.use(requireAuth, requireRole("admin"));

categoriesAdminRouter.post("/", async (req, res) => {
  const input = createCategorySchema.parse(req.body);
  res.status(201).json(await categoriesService.create(input));
});

categoriesAdminRouter.patch("/:id", async (req, res) => {
  const input = updateCategorySchema.parse(req.body);
  res.json(await categoriesService.update(req.params.id as string, input));
});

categoriesAdminRouter.delete("/:id", async (req, res) => {
  await categoriesService.delete(req.params.id as string);
  res.status(204).send();
});
