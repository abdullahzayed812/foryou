export type VerificationStatus =
  "pending" | "approved" | "rejected" | "more_docs_needed" | "revoked";

export interface VerificationRequest {
  id: string;
  userId: string;
  type: "identity" | "business";
  status: VerificationStatus;
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
