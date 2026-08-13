import { Router } from "express";
import { z } from "zod";
import { env } from "../../config/env.js";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { paymentsService } from "./service.js";
import { paymobClient } from "./paymob-client.js";

/** Mounted at /orders/:id/deposit — nested so the route reads as "pay for this order." */
export const depositPaymentRouter = Router({ mergeParams: true });

depositPaymentRouter.post("/pay", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const result = await paymentsService.initiate(req.user.id, req.params.id as string);
  res.status(201).json(result);
});

/** Public — Paymob calls this directly, no session. Signature verification is the auth. */
export const paymobWebhookRouter = Router();

const webhookSchema = z
  .object({
    transactionId: z.string().min(1),
    orderId: z.uuid(),
    amountCents: z.number().int(),
    success: z.boolean(),
    hmac: z.string().min(1),
  })
  .strict();

paymobWebhookRouter.post("/paymob", async (req, res) => {
  const payload = webhookSchema.parse(req.body);
  await paymentsService.handleWebhook(payload);
  res.status(200).json({ received: true });
});

/**
 * Dev-only simulated Paymob checkout — only mounted when PAYMOB_MODE=mock
 * (see routes/index.ts). Lets a test script "complete" the payment
 * `createIntention` returned a URL for, driving the exact same
 * verify-signature → idempotency-check → mark-paid pipeline production
 * webhooks go through.
 */
export const mockCheckoutRouter = Router();

const mockCompleteSchema = z.object({ success: z.boolean().default(true) }).strict();

mockCheckoutRouter.post("/mock-checkout/:transactionId", async (req, res) => {
  const { success } = mockCompleteSchema.parse(req.body);
  const orderId = req.query.orderId as string;
  const amount = Number(req.query.amount);
  const amountCents = Math.round(amount * 100);
  const transactionId = req.params.transactionId as string;

  const hmac = paymobClient.signWebhookPayload(transactionId, orderId, amountCents, success);
  await paymentsService.handleWebhook({ transactionId, orderId, amountCents, success, hmac });
  res.json({ simulated: true, success });
});

export function isMockPaymentsEnabled(): boolean {
  return env.PAYMOB_MODE === "mock";
}
