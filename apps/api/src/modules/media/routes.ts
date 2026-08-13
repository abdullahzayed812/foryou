import express, { Router } from "express";
import { signUploadSchema } from "@foryou/shared";
import { requireAuth } from "../auth/middleware.js";
import { UnauthenticatedError, ValidationError } from "../../lib/http-errors.js";
import { mediaService } from "./service.js";

export const mediaRouter = Router();

mediaRouter.use(requireAuth);

mediaRouter.post("/uploads/sign", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = signUploadSchema.parse(req.body);
  const result = await mediaService.createSignedUpload(req.user.id, input);
  res.status(201).json(result);
});

// Raw-body parsing scoped to just this route — the largest allowed upload is
// BRD's 100 MB video cap (packages/shared/src/validation/media.ts), and
// `type: () => true` accepts whatever content-type the browser sent (already
// validated against the allowed image/video MIME list at /sign time).
mediaRouter.put(
  "/uploads/:id/upload",
  express.raw({ type: () => true, limit: "100mb" }),
  async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new ValidationError("Missing upload body");
    }
    await mediaService.uploadOriginal(
      req.params.id as string,
      req.user.id,
      req.body,
      req.headers["content-type"] ?? "",
    );
    res.status(204).send();
  },
);

mediaRouter.post("/uploads/:id/complete", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const asset = await mediaService.completeUpload(req.params.id as string, req.user.id);
  res.json(asset);
});

mediaRouter.get("/uploads/:id", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const isAdmin = req.user.roles.includes("admin");
  const asset = await mediaService.getAsset(req.params.id as string, req.user.id, isAdmin);
  const url =
    asset.status === "ready"
      ? mediaService.publicUrlFor(asset.processedKey ?? asset.originalKey)
      : null;
  // Callers poll this endpoint while status is "pending"/"processing" — without
  // this, the browser's conditional-GET cache returns a stale 304 body forever
  // (same JSON => same ETag), so the poll loop never observes "ready".
  res.set("Cache-Control", "no-store");
  res.json({ ...asset, url });
});

mediaRouter.delete("/uploads/:id", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const isAdmin = req.user.roles.includes("admin");
  await mediaService.deleteAsset(req.params.id as string, req.user.id, isAdmin);
  res.status(204).send();
});
