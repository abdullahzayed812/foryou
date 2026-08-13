export interface Wallet {
  userId: string;
  pendingBalance: string;
  availableBalance: string;
  createdAt: string;
  updatedAt: string;
}

export type WalletTransactionType =
  "deposit_credit" | "balance_release" | "commission_charge" | "withdrawal" | "refund_reversal";

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: string;
  orderId: string | null;
  description: string;
  createdAt: string;
}

export type WithdrawalStatus = "pending" | "processed" | "rejected";

export interface WithdrawalRequest {
  id: string;
  walletId: string;
  amount: string;
  status: WithdrawalStatus;
  processedAt: string | null;
  createdAt: string;
}
