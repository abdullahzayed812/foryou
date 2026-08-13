import { eventBus } from "../../lib/events.js";
import { trustScoreService } from "./service.js";
import "../users/events.js";
import "../orders/events.js";
import "../reviews/events.js";
import "../disputes/events.js";

// BRD Rule 2 names these triggers without exact point values — the deltas
// below are an architect recommendation, not a BRD requirement.
const POINTS = {
  ORDER_COMPLETED_CUSTOMER: 2,
  ORDER_COMPLETED_SELLER: 3,
  ORDER_CANCELLED_BY_SELLER: -10,
  REVIEW_RATING_HIGH: 1, // rating 4-5
  REVIEW_RATING_LOW: -2, // rating 1-2
  DISPUTE_COUNTERFEIT_CONFIRMED: -20,
  DISPUTE_FALSE_DISPUTE: -15,
};

/**
 * Trust Score is a pure event consumer (architecture doc §02) — it has no
 * outbound calls to other modules, only subscriptions. Each module adds its
 * subscription here alongside the events it publishes, as those modules land
 * (Orders in Phase 8; Reviews/Disputes still to come in Phase 9).
 */
export function registerTrustScoreSubscribers(): void {
  eventBus.subscribe("user.registered", ({ userId }) => {
    void trustScoreService.ensureInitialized(userId);
  });

  eventBus.subscribe("order.completed", ({ customerId, sellerId }) => {
    void trustScoreService.adjustScore(
      customerId,
      POINTS.ORDER_COMPLETED_CUSTOMER,
      "Order completed successfully",
      "order.completed",
    );
    if (sellerId) {
      void trustScoreService.adjustScore(
        sellerId,
        POINTS.ORDER_COMPLETED_SELLER,
        "Delivered a completed order",
        "order.completed",
      );
    }
  });

  eventBus.subscribe("order.cancelled", ({ cancelledBy, sellerId }) => {
    // Only a seller-initiated cancellation after deposit is a trust signal
    // (BRD Rule 4) — a customer cancelling *before* deposit is a normal,
    // penalty-free action, not something to dock anyone for.
    if (cancelledBy !== "seller" || !sellerId) return;
    void trustScoreService.adjustScore(
      sellerId,
      POINTS.ORDER_CANCELLED_BY_SELLER,
      "Cancelled an order after the deposit was paid",
      "order.cancelled",
    );
  });

  // BRD: "Trust Score updates after reviews completed" — no exact point
  // values given, so a coarse high/low/neutral split is the architect's
  // reading rather than a per-star formula.
  eventBus.subscribe("review.created", ({ revieweeId, rating }) => {
    if (rating >= 4) {
      void trustScoreService.adjustScore(
        revieweeId,
        POINTS.REVIEW_RATING_HIGH,
        `Received a ${rating}-star review`,
        "review.created",
      );
    } else if (rating <= 2) {
      void trustScoreService.adjustScore(
        revieweeId,
        POINTS.REVIEW_RATING_LOW,
        `Received a ${rating}-star review`,
        "review.created",
      );
    }
  });

  // BRD Rule 8: confirmed counterfeit -> "major trust score deduction,
  // warning"; false dispute -> "trust score reduction". Repeated-violation
  // suspension escalation is an admin/moderation-queue concern, not
  // something the score itself enforces.
  eventBus.subscribe(
    "dispute.resolved",
    ({ fulfillerId, customerId, counterfeitConfirmed, falseDispute }) => {
      if (counterfeitConfirmed) {
        void trustScoreService.adjustScore(
          fulfillerId,
          POINTS.DISPUTE_COUNTERFEIT_CONFIRMED,
          "Confirmed counterfeit product",
          "dispute.resolved",
        );
      }
      if (falseDispute) {
        void trustScoreService.adjustScore(
          customerId,
          POINTS.DISPUTE_FALSE_DISPUTE,
          "Filed a false dispute",
          "dispute.resolved",
        );
      }
    },
  );
}
