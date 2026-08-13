import { Router } from "express";
import {
  submitIdentityVerificationSchema,
  submitBusinessVerificationSchema,
  rejectVerificationSchema,
  requestMoreDocsSchema,
  revokeVerificationSchema,
} from "@foryou/shared";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { verificationService } from "./service.js";

export const verificationRouter = Router();
verificationRouter.use(requireAuth);

verificationRouter.get("/me", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await verificationService.getMine(req.user.id));
});

verificationRouter.post("/identity", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = submitIdentityVerificationSchema.parse(req.body);
  res.status(201).json(await verificationService.submitIdentity(req.user.id, input));
});

verificationRouter.post("/business", requireRole("merchant", "seller"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = submitBusinessVerificationSchema.parse(req.body);
  res.status(201).json(await verificationService.submitBusiness(req.user.id, input));
});

const addMoreDocsSchema = z.object({
  documents: z
    .array(
      z.object({
        mediaAssetId: z.uuid(),
        documentType: z.enum(["national_id", "selfie", "commercial_registration"]),
      }),
    )
    .min(1),
});

verificationRouter.post("/:id/documents", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = addMoreDocsSchema.parse(req.body);
  const result = await verificationService.addMoreDocuments(
    req.user.id,
    req.params.id as string,
    input.documents,
  );
  res.json(result);
});

/** Mounted at /admin/verification. */
export const verificationAdminRouter = Router();
verificationAdminRouter.use(requireAuth, requireRole("admin"));

verificationAdminRouter.get("/queue", async (_req, res) => {
  res.json(await verificationService.getQueue());
});

verificationAdminRouter.post("/:id/approve", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await verificationService.approve(req.user.id, req.params.id as string));
});

verificationAdminRouter.post("/:id/reject", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = rejectVerificationSchema.parse(req.body);
  res.json(await verificationService.reject(req.user.id, req.params.id as string, input.reason));
});

verificationAdminRouter.post("/:id/request-more-docs", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = requestMoreDocsSchema.parse(req.body);
  res.json(
    await verificationService.requestMoreDocs(req.user.id, req.params.id as string, input.message),
  );
});

verificationAdminRouter.post("/users/:userId/revoke", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = revokeVerificationSchema.parse(req.body);
  res.json(
    await verificationService.revoke(
      req.user.id,
      req.params.userId as string,
      input.type,
      input.reason,
    ),
  );
});
