import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { walletService } from "./service.js";

/** Mounted at /wallet — sellers and merchants both hold a wallet. */
export const walletRouter = Router();
walletRouter.use(requireAuth, requireRole("seller", "merchant"));

walletRouter.get("/me", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await walletService.getMe(req.user.id));
});

walletRouter.get("/me/transactions", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await walletService.getTransactions(req.user.id));
});

const withdrawalSchema = z.object({ amount: z.number().positive() }).strict();

walletRouter.post("/withdrawals", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const { amount } = withdrawalSchema.parse(req.body);
  res.status(201).json(await walletService.requestWithdrawal(req.user.id, amount));
});

walletRouter.get("/withdrawals", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await walletService.listWithdrawals(req.user.id));
});

/** Mounted at /admin/withdrawals. */
export const withdrawalsAdminRouter = Router();
withdrawalsAdminRouter.use(requireAuth, requireRole("admin"));

withdrawalsAdminRouter.get("/", async (_req, res) => {
  res.json(await walletService.listPendingWithdrawals());
});

const processSchema = z.object({ approve: z.boolean() }).strict();

withdrawalsAdminRouter.post("/:id/process", async (req, res) => {
  const { approve } = processSchema.parse(req.body);
  res.json(await walletService.processWithdrawal(req.params.id as string, approve));
});

/** Mounted at /admin/commission-rates. */
export const commissionRatesAdminRouter = Router();
commissionRatesAdminRouter.use(requireAuth, requireRole("admin"));

commissionRatesAdminRouter.get("/", async (_req, res) => {
  res.json(await walletService.currentCommissionRates());
});

const setCommissionRateSchema = z
  .object({ role: z.enum(["seller", "merchant"]), percentage: z.number().min(0).max(100) })
  .strict();

commissionRatesAdminRouter.post("/", async (req, res) => {
  const input = setCommissionRateSchema.parse(req.body);
  res.status(201).json(await walletService.setCommissionRate(input.role, input.percentage));
});
