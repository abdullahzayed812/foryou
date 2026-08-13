import type { Role } from "@foryou/shared";
import type { MeResponse } from "@/features/auth/api";

export interface AdminUserListItem {
  id: string;
  email: string;
  status: "active" | "suspended" | "banned";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Admin's single-user detail view reuses the same shape as `/users/me` — nothing about a user is hidden from admins. */
export type AdminUserDetail = MeResponse;

export interface UserStats {
  byRole: { role: Role; count: number }[];
  byStatus: { status: "active" | "suspended" | "banned"; count: number }[];
}

export interface PlatformStats {
  users: UserStats;
  orders: {
    byStage: { stage: string; count: number }[];
    completedGMV: number;
  };
  disputes: {
    byStatus: { status: string; count: number }[];
    byResolution: { resolution: string | null; count: number }[];
    counterfeitConfirmedCount: number;
    falseDisputeCount: number;
  };
  wallet: {
    platformBalances: { pending: number; available: number };
    pendingWithdrawals: { count: number; total: number };
  };
  reviews: { average: number; count: number };
}

export interface CommissionRate {
  id: string;
  role: "seller" | "merchant";
  percentage: string;
  effectiveFrom: string;
  createdAt: string;
}

export interface CurrentCommissionRate {
  role: "seller" | "merchant";
  percentage: number;
}

export interface PlatformSettings {
  maintenanceMode: boolean;
  platformAnnouncement: string;
  supportEmail: string;
  minWithdrawalAmount: number;
}

export interface AdminWithdrawalRequest {
  id: string;
  walletId: string;
  amount: string;
  status: "pending" | "processed" | "rejected";
  processedAt: string | null;
  createdAt: string;
}

export interface VerificationDocument {
  id: string;
  verificationRequestId: string;
  mediaAssetId: string;
  documentType: "national_id" | "selfie" | "commercial_registration";
  createdAt: string;
  url: string | null;
}

export interface AdminVerificationRequest {
  id: string;
  userId: string;
  type: "identity" | "business";
  status: "pending" | "approved" | "rejected" | "more_docs_needed" | "revoked";
  rejectionReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  documents: VerificationDocument[];
}
