export interface DisputeOpenedPayload {
  disputeId: string;
  orderId: string;
  customerId: string;
  fulfillerId: string;
}

export interface DisputeResolvedPayload {
  disputeId: string;
  orderId: string;
  customerId: string;
  fulfillerId: string;
  fulfillerRole: "seller" | "merchant";
  resolution:
    "full_refund" | "partial_refund" | "replacement" | "missing_item_shipment" | "rejected";
  counterfeitConfirmed: boolean;
  falseDispute: boolean;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "dispute.opened": DisputeOpenedPayload;
    "dispute.resolved": DisputeResolvedPayload;
  }
}
