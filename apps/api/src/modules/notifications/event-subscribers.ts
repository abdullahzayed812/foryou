import { eventBus } from "../../lib/events.js";
import { ordersRepository } from "../orders/repository.js";
import { notificationsService } from "./service.js";
import "../orders/events.js";
import "../offers/events.js";
import "../import-requests/events.js";
import "../disputes/events.js";
import "../reviews/events.js";
import "../verification/events.js";
import "../wallet/events.js";
import "../products/events.js";
import "../users/events.js";

/**
 * Notifications is a pure event consumer, same shape as Trust Score's
 * subscriber file — but where Trust Score only cares about a handful of
 * lifecycle events, this is deliberately the catch-all fan-out target for
 * almost every domain event in the system (architecture doc §06), most of
 * which have had no listener at all until this phase.
 */
export function registerNotificationSubscribers(): void {
  eventBus.subscribe("order.deposit_paid", ({ orderId, sellerId, merchantId }) => {
    const fulfillerId = sellerId ?? merchantId;
    if (!fulfillerId) return;
    void notificationsService.notify(
      fulfillerId,
      "order_deposit_paid",
      "New order paid",
      "A customer's deposit has been confirmed — the order is ready to process.",
      { orderId },
    );
  });

  eventBus.subscribe("order.delivered", ({ orderId, customerId }) => {
    void notificationsService.notify(
      customerId,
      "order_delivered",
      "Your order has been delivered",
      "Please confirm receipt, or open a dispute within 48 hours if something's wrong.",
      { orderId },
    );
  });

  eventBus.subscribe("order.completed", ({ orderId, customerId, sellerId, merchantId }) => {
    void notificationsService.notify(
      customerId,
      "order_completed",
      "Order completed",
      "Thanks for shopping with FOR YOU — don't forget to leave a review.",
      {
        orderId,
      },
    );
    const fulfillerId = sellerId ?? merchantId;
    if (fulfillerId) {
      void notificationsService.notify(
        fulfillerId,
        "order_completed",
        "Order completed",
        "The order was completed successfully.",
        { orderId },
      );
    }
  });

  eventBus.subscribe("order.cancelled", async ({ orderId, reason, cancelledBy, sellerId }) => {
    if (cancelledBy === "customer") return; // the customer already knows — they did it
    if (sellerId) {
      void notificationsService.notify(sellerId, "order_cancelled", "Order cancelled", reason, {
        orderId,
      });
    }
    const order = await ordersRepository.findById(orderId);
    if (order) {
      void notificationsService.notify(
        order.customerId,
        "order_cancelled",
        "Your order was cancelled",
        reason,
        { orderId },
      );
    }
  });

  eventBus.subscribe("deposit.deadline_missed", async ({ orderId }) => {
    const order = await ordersRepository.findById(orderId);
    if (!order) return;
    void notificationsService.notify(
      order.customerId,
      "deposit_deadline_missed",
      "Deposit deadline missed",
      "You missed the 24-hour window to pay your deposit and the order was cancelled.",
      { orderId },
    );
  });

  eventBus.subscribe("offer.submitted", ({ importRequestId, customerId }) => {
    void notificationsService.notify(
      customerId,
      "offer_received",
      "New offer received",
      "A seller has submitted an offer for your import request.",
      { importRequestId },
    );
  });

  eventBus.subscribe("offer.selected", ({ sellerId, orderId }) => {
    void notificationsService.notify(
      sellerId,
      "offer_selected",
      "Your offer was selected!",
      "The customer picked your offer — an order has been created.",
      { orderId },
    );
  });

  eventBus.subscribe("offer.rejected", ({ sellerId, offerId }) => {
    void notificationsService.notify(
      sellerId,
      "offer_rejected",
      "Offer not selected",
      "The customer went with a different offer for this request.",
      { offerId },
    );
  });

  eventBus.subscribe("import_request.distributed", ({ importRequestId, matchedSellerIds }) => {
    for (const sellerId of matchedSellerIds) {
      void notificationsService.notify(
        sellerId,
        "import_request_matched",
        "New import request",
        "A new import request matches your listed countries.",
        { importRequestId },
      );
    }
  });

  eventBus.subscribe("dispute.opened", ({ disputeId, orderId, fulfillerId }) => {
    void notificationsService.notify(
      fulfillerId,
      "dispute_opened",
      "A dispute was opened",
      "A customer opened a dispute on one of your orders — you have 48 hours to respond.",
      { disputeId, orderId },
    );
  });

  eventBus.subscribe(
    "dispute.resolved",
    ({ disputeId, orderId, customerId, fulfillerId, resolution }) => {
      void notificationsService.notify(
        customerId,
        "dispute_resolved",
        "Your dispute was resolved",
        `Resolution: ${resolution.replace(/_/g, " ")}.`,
        { disputeId, orderId },
      );
      void notificationsService.notify(
        fulfillerId,
        "dispute_resolved",
        "A dispute on your order was resolved",
        `Resolution: ${resolution.replace(/_/g, " ")}.`,
        { disputeId, orderId },
      );
    },
  );

  eventBus.subscribe("review.created", ({ reviewId, revieweeId, rating }) => {
    void notificationsService.notify(
      revieweeId,
      "review_received",
      "You received a new review",
      `A customer left you a ${rating}-star review.`,
      { reviewId },
    );
  });

  eventBus.subscribe("verification.approved", ({ requestId, userId, type }) => {
    void notificationsService.notify(
      userId,
      "verification_approved",
      "Verification approved",
      `Your ${type} verification has been approved.`,
      { requestId },
    );
  });

  eventBus.subscribe("verification.rejected", ({ requestId, userId, type, reason }) => {
    void notificationsService.notify(
      userId,
      "verification_rejected",
      "Verification rejected",
      `Your ${type} verification was rejected: ${reason}`,
      { requestId },
    );
  });

  eventBus.subscribe("withdrawal.processed", ({ withdrawalId, userId, status }) => {
    void notificationsService.notify(
      userId,
      "withdrawal_processed",
      status === "processed" ? "Withdrawal processed" : "Withdrawal rejected",
      status === "processed"
        ? "Your withdrawal request has been processed."
        : "Your withdrawal request was rejected — the funds have been returned to your available balance.",
      { withdrawalId },
    );
  });

  eventBus.subscribe("wallet.balance_released", ({ userId, amount, orderId }) => {
    void notificationsService.notify(
      userId,
      "wallet_balance_released",
      "Funds released",
      `${amount} EGP has been moved to your available balance.`,
      { orderId },
    );
  });

  eventBus.subscribe("product.published", ({ productId, ownerId }) => {
    void notificationsService.notify(
      ownerId,
      "product_published",
      "Product published",
      "Your product listing is now live.",
      { productId },
    );
  });

  eventBus.subscribe("product.pending_review", ({ productId, ownerId }) => {
    void notificationsService.notify(
      ownerId,
      "product_pending_review",
      "Product pending review",
      "Your product listing was submitted and is awaiting admin review.",
      { productId },
    );
  });

  eventBus.subscribe("product.stock.restocked", ({ productId, subscriberIds }) => {
    for (const subscriberId of subscriberIds) {
      void notificationsService.notify(
        subscriberId,
        "product_restocked",
        "Back in stock",
        "A product you subscribed to is available again.",
        { productId },
      );
    }
  });

  eventBus.subscribe("user.suspended", ({ userId, reason }) => {
    void notificationsService.notify(
      userId,
      "account_suspended",
      "Your account has been suspended",
      reason ?? "Contact support for details.",
    );
  });

  eventBus.subscribe("user.reactivated", ({ userId }) => {
    void notificationsService.notify(
      userId,
      "account_reactivated",
      "Your account has been reactivated",
      "You can now use your account as normal.",
    );
  });
}
