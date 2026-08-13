import { Router } from "express";
import { z } from "zod";
import type { Role } from "@foryou/shared";
import { requireAuth, requireRole, requireActiveAccount } from "../auth/middleware.js";
import { UnauthenticatedError } from "../../lib/http-errors.js";
import { ordersService } from "./service.js";

const checkoutSchema = z
  .object({ productId: z.uuid(), quantity: z.number().int().positive() })
  .strict();
const timelineSchema = z
  .object({
    step: z.enum([
      "waiting_to_place_order",
      "order_placed",
      "shipment_in_progress",
      "shipment_arrived_in_egypt",
      "out_for_delivery",
      "delivered",
    ]),
    note: z.string().max(500).optional(),
  })
  .strict();
const cancelSchema = z.object({ reason: z.string().min(1).max(500) }).strict();

/** Customer-facing — mounted at /orders. */
export const ordersRouter = Router();

ordersRouter.post(
  "/",
  requireAuth,
  requireRole("customer"),
  requireActiveAccount,
  async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = checkoutSchema.parse(req.body);
    res
      .status(201)
      .json(
        await ordersService.createExpressCheckout(req.user.id, input.productId, input.quantity),
      );
  },
);

ordersRouter.get("/me", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await ordersService.listMine(req.user.id));
});

ordersRouter.get("/:id", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await ordersService.getMine(req.user.id, req.params.id as string));
});

ordersRouter.post(
  "/:id/confirm-receipt",
  requireAuth,
  requireRole("customer"),
  async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await ordersService.confirmReceipt(req.user.id, req.params.id as string));
  },
);

ordersRouter.post("/:id/cancel", requireAuth, requireRole("customer"), async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  res.json(await ordersService.cancelByCustomer(req.user.id, req.params.id as string));
});

/** Fulfiller-facing (Seller or Merchant) — mounted at /sellers/me/orders and /merchants/me/orders. */
export function createFulfillerOrdersRouter(role: Extract<Role, "seller" | "merchant">): Router {
  const router = Router();
  router.use(requireAuth, requireRole(role));

  router.get("/", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(
      role === "seller"
        ? await ordersService.listForSeller(req.user.id)
        : await ordersService.listForMerchant(req.user.id),
    );
  });

  router.get("/:id", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    res.json(await ordersService.getOwnedByFulfiller(req.params.id as string, req.user.id));
  });

  router.patch("/:id/timeline", async (req, res) => {
    if (!req.user) throw new UnauthenticatedError();
    const input = timelineSchema.parse(req.body);
    res.json(
      await ordersService.updateTimeline(
        req.user.id,
        req.params.id as string,
        input.step,
        input.note,
      ),
    );
  });

  if (role === "seller") {
    router.post("/:id/cancel", async (req, res) => {
      if (!req.user) throw new UnauthenticatedError();
      const input = cancelSchema.parse(req.body);
      res.json(
        await ordersService.cancelBySeller(req.user.id, req.params.id as string, input.reason),
      );
    });
  }

  return router;
}
