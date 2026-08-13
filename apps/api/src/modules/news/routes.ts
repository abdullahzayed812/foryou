import { Router } from "express";
import { createNewsPostSchema, updateNewsPostSchema } from "@foryou/shared";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { newsService } from "./service.js";

/** Public — mounted at /news. */
export const newsRouter = Router();

newsRouter.get("/", async (_req, res) => {
  res.json(await newsService.listPublished());
});

newsRouter.get("/:id", async (req, res) => {
  res.json(await newsService.getPublished(req.params.id as string));
});

/** Admin-facing — mounted at /admin/news. */
export const newsAdminRouter = Router();
newsAdminRouter.use(requireAuth, requireRole("admin"));

newsAdminRouter.get("/", async (_req, res) => {
  res.json(await newsService.listAllForAdmin());
});

newsAdminRouter.post("/", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = createNewsPostSchema.parse(req.body);
  res
    .status(201)
    .json(await newsService.create(req.user.id, input.title, input.body, input.coverMediaAssetId));
});

newsAdminRouter.patch("/:id", async (req, res) => {
  const input = updateNewsPostSchema.parse(req.body);
  res.json(await newsService.update(req.params.id as string, input));
});

newsAdminRouter.post("/:id/publish", async (req, res) => {
  res.json(await newsService.publish(req.params.id as string));
});

newsAdminRouter.post("/:id/unpublish", async (req, res) => {
  res.json(await newsService.unpublish(req.params.id as string));
});

newsAdminRouter.delete("/:id", async (req, res) => {
  await newsService.delete(req.params.id as string);
  res.status(204).send();
});
