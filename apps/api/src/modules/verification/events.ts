export interface VerificationSubmittedPayload {
  requestId: string;
  userId: string;
  type: "identity" | "business";
}

export interface VerificationApprovedPayload {
  requestId: string;
  userId: string;
  type: "identity" | "business";
}

export interface VerificationRejectedPayload {
  requestId: string;
  userId: string;
  type: "identity" | "business";
  reason: string;
}

export interface VerificationRevokedPayload {
  userId: string;
  type: "identity" | "business";
  reason: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "verification.submitted": VerificationSubmittedPayload;
    "verification.approved": VerificationApprovedPayload;
    "verification.rejected": VerificationRejectedPayload;
    "verification.revoked": VerificationRevokedPayload;
  }
}
