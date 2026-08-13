import type { DisputeReason, DisputeResolution } from "@foryou/shared";

export type DisputeStatus = "open" | "seller_responded" | "resolved";

export interface DisputeEvidence {
  id: string;
  disputeId: string;
  mediaAssetId: string;
  kind: "photo" | "video";
}

export interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  fulfillerId: string;
  fulfillerRole: "seller" | "merchant";
  reason: DisputeReason;
  description: string;
  status: DisputeStatus;
  sellerResponse: string | null;
  sellerRespondedAt: string | null;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  refundAmount: string | null;
  counterfeitConfirmed: boolean;
  falseDispute: boolean;
  resolvedByAdminId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  evidence: DisputeEvidence[];
}
