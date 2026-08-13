import { Router } from "express";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { wishlistService } from "./service.js";

export const wishlistRouter = Router();
wishlistRouter.use(requireAuth, requireRole("customer"));

wishlistRouter.get("/me", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await wishlistService.listMine(req.user.id));
});

wishlistRouter.post("/:productId", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await wishlistService.add(req.user.id, req.params.productId as string);
  res.status(204).send();
});

wishlistRouter.delete("/:productId", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await wishlistService.remove(req.user.id, req.params.productId as string);
  res.status(204).send();
});
