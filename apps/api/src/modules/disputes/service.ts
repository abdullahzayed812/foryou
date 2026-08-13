import type { DisputeReason, DisputeResolution } from "@foryou/shared";
import { ConflictError, NotFoundError, ValidationError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { ordersRepository } from "../orders/repository.js";
import { walletService } from "../wallet/service.js";
import { productsRepository } from "../products/repository.js";
import { disputesRepository, type DisputesRepository, type DisputeRow } from "./repository.js";
import "./events.js";

const DISPUTE_WINDOW_HOURS = 48; // BRD Rule 8: "within 48 hours after delivery"

export class DisputesService {
  constructor(private readonly repo: DisputesRepository) {}

  /** Payable amount for the order this dispute concerns — deposit for import orders, full price for express. */
  private payableFor(order: { type: string; depositAmount: string | null; totalAmount: string }) {
    return Number(order.type === "import" ? order.depositAmount : order.totalAmount);
  }

  async open(
    customerId: string,
    orderId: string,
    reason: DisputeReason,
    description: string,
    evidence: { mediaAssetId: string; kind: "photo" | "video" }[],
  ): Promise<DisputeRow> {
    const order = await ordersRepository.findById(orderId);
    if (!order || order.customerId !== customerId) throw new NotFoundError("Order not found");
    if (order.stage !== "delivered" && order.stage !== "completed") {
      throw new ConflictError("Disputes can only be opened after delivery");
    }
    if (!order.deliveredAt) throw new ConflictError("This order has no recorded delivery time");
    const hoursSinceDelivery = (Date.now() - order.deliveredAt.getTime()) / 3_600_000;
    if (hoursSinceDelivery > DISPUTE_WINDOW_HOURS) {
      throw new ConflictError("The 48-hour dispute window for this order has passed");
    }
    const existing = await this.repo.findByOrderId(orderId);
    if (existing) throw new ConflictError("A dispute has already been opened for this order");

    const fulfillerId = order.sellerId ?? order.merchantId;
    if (!fulfillerId) throw new ConflictError("This order has no seller or merchant to dispute");
    const fulfillerRole: "seller" | "merchant" = order.sellerId ? "seller" : "merchant";

    const dispute = await this.repo.create(
      { orderId, customerId, fulfillerId, fulfillerRole, reason, description },
      evidence,
    );
    await ordersRepository.setOpenDispute(orderId, dispute.id);

    eventBus.publish("dispute.opened", { disputeId: dispute.id, orderId, customerId, fulfillerId });
    return dispute;
  }

  async getMine(customerId: string, id: string) {
    const dispute = await this.repo.findById(id);
    if (!dispute || dispute.customerId !== customerId) throw new NotFoundError("Dispute not found");
    return dispute;
  }

  listMine(customerId: string) {
    return this.repo.listMine(customerId);
  }

  listForFulfiller(fulfillerId: string) {
    return this.repo.listForFulfiller(fulfillerId);
  }

  async getForFulfiller(fulfillerId: string, id: string) {
    const dispute = await this.repo.findById(id);
    if (!dispute || dispute.fulfillerId !== fulfillerId)
      throw new NotFoundError("Dispute not found");
    return dispute;
  }

  /** Seller/Merchant's 48h response window (BRD Rule 8) — doesn't itself resolve anything, just records their side. */
  async respond(fulfillerId: string, disputeId: string, response: string) {
    const dispute = await this.repo.findById(disputeId);
    if (!dispute || dispute.fulfillerId !== fulfillerId)
      throw new NotFoundError("Dispute not found");
    if (dispute.status !== "open")
      throw new ConflictError("This dispute has already been responded to");

    const updated = await this.repo.recordSellerResponse(disputeId, response);
    if (!updated) throw new NotFoundError("Dispute not found");
    return updated;
  }

  // ------------------------------------------------------------- admin

  async getForAdmin(id: string) {
    const dispute = await this.repo.findById(id);
    if (!dispute) throw new NotFoundError("Dispute not found");
    return dispute;
  }

  listQueue() {
    return this.repo.listQueueForAdmin();
  }

  listAwaitingReview() {
    return this.repo.listAwaitingAdminReview();
  }

  async resolve(
    adminId: string,
    disputeId: string,
    input: {
      resolution: DisputeResolution;
      resolutionNote: string;
      refundAmount?: number;
      counterfeitConfirmed?: boolean;
      falseDispute?: boolean;
    },
  ): Promise<DisputeRow> {
    const dispute = await this.repo.findById(disputeId);
    if (!dispute) throw new NotFoundError("Dispute not found");
    if (dispute.status === "resolved")
      throw new ConflictError("This dispute has already been resolved");

    const order = await ordersRepository.findById(dispute.orderId);
    if (!order) throw new NotFoundError("Order not found");
    const payable = this.payableFor(order);
    // Which bucket the deposit currently sits in — see the reverseCredit
    // doc comment in wallet/service.ts for why this matters.
    const fromBalance: "pending" | "available" = order.balanceReleasedAt ? "available" : "pending";

    if (input.resolution === "full_refund") {
      const net = await walletService.netOfCommission(
        dispute.fulfillerId,
        dispute.fulfillerRole,
        payable,
      );
      await walletService.reverseCredit(
        dispute.fulfillerId,
        order.id,
        net,
        `Dispute ${disputeId} resolved — full refund to customer`,
        fromBalance,
      );
    } else if (input.resolution === "partial_refund") {
      if (input.refundAmount === undefined || input.refundAmount > payable) {
        throw new ValidationError(
          "refundAmount must be positive and no greater than the deposit paid",
        );
      }
      const net = await walletService.netOfCommission(
        dispute.fulfillerId,
        dispute.fulfillerRole,
        input.refundAmount,
      );
      await walletService.reverseCredit(
        dispute.fulfillerId,
        order.id,
        net,
        `Dispute ${disputeId} resolved — partial refund to customer`,
        fromBalance,
      );
    }

    const counterfeitConfirmed = input.counterfeitConfirmed ?? false;
    const falseDispute = input.falseDispute ?? false;

    // BRD Rule 8 "Counterfeit Products": confirmed -> the listing comes down.
    if (counterfeitConfirmed && order.productId) {
      await productsRepository.update(order.productId, { moderationStatus: "hidden" });
    }

    const updated = await this.repo.resolve(disputeId, adminId, {
      resolution: input.resolution,
      resolutionNote: input.resolutionNote,
      refundAmount: input.refundAmount?.toFixed(2),
      counterfeitConfirmed,
      falseDispute,
    });
    if (!updated) throw new NotFoundError("Dispute not found");
    await ordersRepository.setOpenDispute(order.id, null);

    eventBus.publish("dispute.resolved", {
      disputeId,
      orderId: order.id,
      customerId: dispute.customerId,
      fulfillerId: dispute.fulfillerId,
      fulfillerRole: dispute.fulfillerRole as "seller" | "merchant",
      resolution: input.resolution,
      counterfeitConfirmed,
      falseDispute,
    });
    return updated;
  }
}

export const disputesService = new DisputesService(disputesRepository);
