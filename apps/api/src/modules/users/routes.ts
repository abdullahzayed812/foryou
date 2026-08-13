import { Router } from "express";
import { z } from "zod";
import type { Role } from "@foryou/shared";
import { requireAuth, requireRole } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { usersService } from "./service.js";
import {
  updateCustomerProfileSchema,
  updateSellerProfileSchema,
  updateMerchantProfileSchema,
  addSellerRoleSchema,
  addMerchantRoleSchema,
  createAddressSchema,
  updateAddressSchema,
} from "./dto.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/me", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const me = await usersService.getMe(req.user.id);
  res.json(me);
});

usersRouter.patch("/me/customer-profile", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateCustomerProfileSchema.parse(req.body);
  const profile = await usersService.updateCustomerProfile(req.user.id, input);
  res.json(profile);
});

usersRouter.patch("/me/seller-profile", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateSellerProfileSchema.parse(req.body);
  const profile = await usersService.updateSellerProfile(req.user.id, input);
  res.json(profile);
});

usersRouter.patch("/me/merchant-profile", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateMerchantProfileSchema.parse(req.body);
  const profile = await usersService.updateMerchantProfile(req.user.id, input);
  res.json(profile);
});

usersRouter.post("/me/roles/seller", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = addSellerRoleSchema.parse(req.body);
  const profile = await usersService.addSellerRole(req.user.id, input);
  res.status(201).json(profile);
});

usersRouter.post("/me/roles/merchant", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = addMerchantRoleSchema.parse(req.body);
  const profile = await usersService.addMerchantRole(req.user.id, input);
  res.status(201).json(profile);
});

usersRouter.get("/me/addresses", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const addresses = await usersService.listAddresses(req.user.id);
  res.json(addresses);
});

usersRouter.post("/me/addresses", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = createAddressSchema.parse(req.body);
  const address = await usersService.createAddress(req.user.id, input);
  res.status(201).json(address);
});

usersRouter.patch("/me/addresses/:id", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = updateAddressSchema.parse(req.body);
  const address = await usersService.updateAddress(req.user.id, req.params.id as string, input);
  res.json(address);
});

usersRouter.delete("/me/addresses/:id", async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await usersService.deleteAddress(req.user.id, req.params.id as string);
  res.status(204).send();
});

const suspendSchema = z.object({ reason: z.string().max(1000).optional() }).strict();

/**
 * Admin-facing — mounted at /admin/users, alongside trustScoreAdminRouter
 * (routes/index.ts stacks both routers on the same prefix; Express falls
 * through to the next one when a path doesn't match).
 */
export const usersAdminRouter = Router();
usersAdminRouter.use(requireAuth, requireRole("admin"));

usersAdminRouter.get("/", async (req, res) => {
  const { role, status, search } = req.query;
  res.json(
    await usersService.listForAdmin({
      role: typeof role === "string" ? (role as Role) : undefined,
      status:
        typeof status === "string" ? (status as "active" | "suspended" | "banned") : undefined,
      search: typeof search === "string" ? search : undefined,
    }),
  );
});

usersAdminRouter.get("/stats", async (_req, res) => {
  res.json({
    byRole: await usersService.countByRole(),
    byStatus: await usersService.countByStatus(),
  });
});

usersAdminRouter.get("/:id", async (req, res) => {
  res.json(await usersService.getForAdmin(req.params.id as string));
});

usersAdminRouter.post("/:id/suspend", async (req, res) => {
  const input = suspendSchema.parse(req.body);
  await usersService.suspend(req.params.id as string, input.reason);
  res.status(204).send();
});

usersAdminRouter.post("/:id/reactivate", async (req, res) => {
  await usersService.reactivate(req.params.id as string);
  res.status(204).send();
});
