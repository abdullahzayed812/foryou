import { deriveProductStatus } from "@foryou/shared";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { productsRepository } from "../products/repository.js";
import { importRequestsRepository } from "../import-requests/repository.js";
import { walletService } from "../wallet/service.js";
import { verificationService } from "../verification/service.js";
import { usersService } from "../users/service.js";
import { ordersRepository, type OrdersRepository, type OrderRow } from "./repository.js";
import "./events.js";

const AUTO_CLOSE_HOURS = 48;
const BALANCE_RELEASE_HOURS = 24;

export class OrdersService {
  constructor(private readonly repo: OrdersRepository) {}

  // ------------------------------------------------------------ express

  async createExpressCheckout(customerId: string, productId: string, quantity: number) {
    if (quantity <= 0) throw new ValidationError("Quantity must be at least 1");
    const product = await productsRepository.findById(productId);
    if (!product || product.moderationStatus !== "published")
      throw new NotFoundError("Product not found");
    if (product.status === "coming_soon")
      throw new ConflictError("This product isn't available for purchase yet");
    if (product.availableQuantity < quantity) throw new ConflictError("Not enough stock available");

    const totalAmount = (Number(product.price) + Number(product.shippingCost)) * quantity;

    const order = await this.repo.create({
      type: "express",
      customerId,
      productId,
      quantity,
      sellerId: product.ownerRole === "seller" ? product.ownerId : null,
      merchantId: product.ownerRole === "merchant" ? product.ownerId : null,
      totalAmount: totalAmount.toFixed(2),
      stage: "awaiting_deposit", // "awaiting full payment" for express — see schema comment
    });
    eventBus.publish("order.created", { orderId: order.id, customerId });
    return order;
  }

  // -------------------------------------------------------- shared reads

  async getMine(customerId: string, id: string) {
    const order = await this.repo.findById(id);
    if (!order || order.customerId !== customerId) throw new NotFoundError("Order not found");
    return order;
  }

  listMine(customerId: string) {
    return this.repo.listForCustomer(customerId);
  }

  /** A fulfiller only ever sees orders they're actually fulfilling — a real
   * transaction, not blind bidding — so attaching the customer's name here
   * is safe (unlike a seller merely browsing open import requests). */
  async listForSeller(sellerId: string) {
    return this.withCustomerNames(await this.repo.listForSeller(sellerId));
  }

  async listForMerchant(merchantId: string) {
    return this.withCustomerNames(await this.repo.listForMerchant(merchantId));
  }

  async getOwnedByFulfiller(id: string, fulfillerId: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundError("Order not found");
    if (order.sellerId !== fulfillerId && order.merchantId !== fulfillerId) {
      throw new ForbiddenError("This isn't your order");
    }
    const customer = (await usersService.getCustomerDisplayNames([order.customerId])).get(
      order.customerId,
    );
    return {
      ...order,
      customerName: customer?.name ?? null,
      customerMemberSince: customer?.memberSince ?? null,
    };
  }

  private async withCustomerNames<T extends OrderRow>(orders: T[]) {
    const customerNames = await usersService.getCustomerDisplayNames([
      ...new Set(orders.map((o) => o.customerId)),
    ]);
    return orders.map((order) => {
      const customer = customerNames.get(order.customerId);
      return {
        ...order,
        customerName: customer?.name ?? null,
        customerMemberSince: customer?.memberSince ?? null,
      };
    });
  }

  /** Import orders pay a deposit; express orders pay the full amount — Payments doesn't need to know which. */
  getPayableAmount(order: OrderRow): number {
    return order.type === "import" ? Number(order.depositAmount) : Number(order.totalAmount);
  }

  // --------------------------------------------------- payment callback

  /** Called by Payments on webhook success — never by a client directly (BRD: "no manual confirmation required"). */
  async markPaid(orderId: string): Promise<OrderRow> {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundError("Order not found");
    if (order.stage !== "awaiting_deposit")
      throw new ConflictError("This order isn't awaiting payment");

    const updated = await this.repo.setStage(orderId, "deposit_paid", {
      depositPaidAt: new Date(),
    });
    if (!updated) throw new NotFoundError("Order not found");
    await this.repo.addTimelineEvent(orderId, "order_placed", "automatic");

    const fulfillerId = order.sellerId ?? order.merchantId;
    const role = order.sellerId ? "seller" : "merchant";
    if (fulfillerId) {
      const payable = this.getPayableAmount(order);
      await walletService.creditDepositAndChargeCommission(fulfillerId, role, orderId, payable);
    }

    if (order.type === "express" && order.productId && order.quantity) {
      await this.decrementStock(order.productId, order.quantity);
    }

    eventBus.publish("order.deposit_paid", {
      orderId,
      sellerId: order.sellerId,
      merchantId: order.merchantId,
    });
    eventBus.publish("order.timeline_updated", { orderId, step: "order_placed" });
    return updated;
  }

  private async decrementStock(productId: string, quantity: number): Promise<void> {
    const product = await productsRepository.findById(productId);
    if (!product) return;
    const nextQuantity = Math.max(0, product.availableQuantity - quantity);
    await productsRepository.update(productId, {
      availableQuantity: nextQuantity,
      status: deriveProductStatus(nextQuantity, false),
    });
  }

  // -------------------------------------------------------------- timeline

  /** Seller/Merchant manual timeline updates (BRD Stage 5 — "Timeline contains both automatic updates and manual updates by Seller"). */
  async updateTimeline(
    fulfillerId: string,
    orderId: string,
    step: OrderTimelineStep,
    note?: string,
  ) {
    const order = await this.getOwnedByFulfiller(orderId, fulfillerId);
    if (order.stage !== "deposit_paid" && order.stage !== "processing") {
      throw new ConflictError("This order isn't in a stage that accepts timeline updates");
    }

    await this.repo.addTimelineEvent(orderId, step, "manual", note);
    eventBus.publish("order.timeline_updated", { orderId, step });

    if (step === "delivered") {
      const updated = await this.repo.setStage(orderId, "delivered", { deliveredAt: new Date() });
      eventBus.publish("order.delivered", { orderId, customerId: order.customerId });
      return updated;
    }
    if (order.stage !== "processing") {
      return this.repo.setStage(orderId, "processing");
    }
    return this.repo.findById(orderId);
  }

  // -------------------------------------------------------------- delivery

  /** BRD Stage 6: customer confirms receipt. */
  async confirmReceipt(customerId: string, orderId: string) {
    const order = await this.getMine(customerId, orderId);
    if (order.stage !== "delivered")
      throw new ConflictError("This order hasn't been marked delivered yet");
    return this.complete(order, "completed");
  }

  /** Auto-close job: 48h with no customer response (BRD Stage 6). */
  async autoCloseStaleDeliveries(): Promise<number> {
    const cutoff = new Date(Date.now() - AUTO_CLOSE_HOURS * 60 * 60 * 1000);
    const stale = await this.repo.listStaleDelivered(cutoff);
    for (const order of stale) {
      await this.complete(order, "auto_closed");
    }
    return stale.length;
  }

  private async complete(order: OrderRow, via: "completed" | "auto_closed") {
    const updated = await this.repo.setStage(order.id, "completed", { completedAt: new Date() });
    if (!updated) throw new NotFoundError("Order not found");

    const fulfillerId = order.sellerId ?? order.merchantId;
    const role: "seller" | "merchant" = order.sellerId ? "seller" : "merchant";
    if (fulfillerId && !order.balanceReleasedAt) {
      // BRD Rule 4 names the "new seller — first 3 orders" pending rule for
      // Sellers specifically; it's silent on Merchants, so a Merchant here
      // just uses the verified/unverified check with no order-count gate —
      // the most defensible reading of a genuine BRD gap, not a guess
      // dressed up as a requirement.
      const timing =
        role === "seller"
          ? await walletService.releaseTiming(
              fulfillerId,
              await this.repo.countCompletedForSeller(fulfillerId),
            )
          : (await verificationService.isAccountVerified(fulfillerId))
            ? "after_24h"
            : "on_completion";

      if (timing === "on_completion") {
        const payable = this.getPayableAmount(order);
        const net = await walletService.netOfCommission(fulfillerId, role, payable);
        await walletService.releasePendingToAvailable(fulfillerId, net, order.id);
        await this.repo.markBalanceReleased(order.id);
      }
    }

    const payload = {
      orderId: order.id,
      customerId: order.customerId,
      sellerId: order.sellerId,
      merchantId: order.merchantId,
    };
    eventBus.publish(via === "completed" ? "order.completed" : "order.auto_closed", payload);
    return updated;
  }

  // ------------------------------------------------------------- cancel

  /** BRD Rule 4: "Before Deposit: Customer may cancel freely." */
  async cancelByCustomer(customerId: string, orderId: string) {
    const order = await this.getMine(customerId, orderId);
    if (order.stage !== "awaiting_deposit") {
      throw new ConflictError("This order can no longer be cancelled — the deposit has been paid");
    }
    const updated = await this.repo.setStage(orderId, "cancelled", {
      cancellationReason: "Cancelled by customer",
    });
    if (order.importRequestId)
      await importRequestsRepository.setStatus(order.importRequestId, "closed");
    eventBus.publish("order.cancelled", {
      orderId,
      reason: "Cancelled by customer",
      cancelledBy: "customer",
      sellerId: order.sellerId,
    });
    return updated;
  }

  /**
   * BRD Rule 4 "Seller Cancellation": full deposit refund to the customer,
   * warning + trust score deduction for the seller (Trust Score subscribes
   * to `order.cancelled` for the deduction — see trust-score/event-subscribers.ts).
   */
  async cancelBySeller(sellerId: string, orderId: string, reason: string) {
    const order = await this.getOwnedByFulfiller(orderId, sellerId);
    if (order.stage !== "deposit_paid" && order.stage !== "processing") {
      throw new ConflictError("This order can't be cancelled from its current stage");
    }
    const updated = await this.repo.setStage(orderId, "cancelled", { cancellationReason: reason });

    const payable = this.getPayableAmount(order);
    const net = await walletService.netOfCommission(sellerId, "seller", payable);
    await walletService.reverseCredit(
      sellerId,
      orderId,
      net,
      `Order ${orderId} cancelled by seller — deposit refunded to customer`,
    );

    eventBus.publish("order.cancelled", { orderId, reason, cancelledBy: "seller", sellerId });
    return updated;
  }

  // -------------------------------------------------------------- jobs

  /** Deposit deadline enforcement (BRD Rule 4 §Deposit Payment Deadline, 1st/2nd-strike rule). */
  async enforceDepositDeadlines(): Promise<number> {
    const expired = await this.repo.listExpiredAwaitingDeposit();
    for (const order of expired) {
      await this.repo.setStage(order.id, "cancelled", {
        cancellationReason: "Deposit deadline missed",
      });

      if (order.importRequestId) {
        const request = await importRequestsRepository.incrementDepositStrike(
          order.importRequestId,
        );
        const strikes = request?.depositDeadlineStrikes ?? 1;
        await importRequestsRepository.setStatus(
          order.importRequestId,
          strikes >= 2 ? "closed" : "open",
        );
        eventBus.publish("deposit.deadline_missed", { orderId: order.id, strikeCount: strikes });
      }
    }
    return expired.length;
  }

  /**
   * 24h-after-verified balance release (BRD Rule 4). Candidates come
   * pre-filtered by stage/time/not-yet-released from the repository; the
   * verified check (and, for sellers, the "new seller" order-count gate)
   * still needs a per-order async lookup, so it happens here rather than in
   * SQL.
   */
  async releaseEligibleBalances(): Promise<number> {
    const cutoff = new Date(Date.now() - BALANCE_RELEASE_HOURS * 60 * 60 * 1000);
    const candidates = await this.repo.listEligibleFor24hRelease(cutoff);
    let released = 0;

    for (const order of candidates) {
      const fulfillerId = order.sellerId ?? order.merchantId;
      if (!fulfillerId) continue;
      const role: "seller" | "merchant" = order.sellerId ? "seller" : "merchant";

      const eligible =
        role === "seller"
          ? (await walletService.releaseTiming(
              fulfillerId,
              await this.repo.countCompletedForSeller(fulfillerId),
            )) === "after_24h"
          : await verificationService.isAccountVerified(fulfillerId);
      if (!eligible) continue;

      const payable = this.getPayableAmount(order);
      const net = await walletService.netOfCommission(fulfillerId, role, payable);
      await walletService.releasePendingToAvailable(fulfillerId, net, order.id);
      await this.repo.markBalanceReleased(order.id);
      released++;
    }
    return released;
  }
}

type OrderTimelineStep =
  | "waiting_to_place_order"
  | "order_placed"
  | "shipment_in_progress"
  | "shipment_arrived_in_egypt"
  | "out_for_delivery"
  | "delivered";

export const ordersService = new OrdersService(ordersRepository);
