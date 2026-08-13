import { Router } from "express";
import { requireAuth } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { notificationsService } from "./service.js";

export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await notificationsService.listMine(req.user.id));
});

notificationsRouter.get("/unread-count", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json({ count: await notificationsService.unreadCount(req.user.id) });
});

notificationsRouter.post("/:id/read", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await notificationsService.markRead(req.user.id, req.params.id as string));
});

notificationsRouter.post("/read-all", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await notificationsService.markAllRead(req.user.id);
  res.status(204).send();
});
