export interface WalletCreditedPayload {
  userId: string;
  amount: string;
  orderId: string;
}

export interface WalletBalanceReleasedPayload {
  userId: string;
  amount: string;
  orderId: string;
}

export interface WithdrawalRequestedPayload {
  withdrawalId: string;
  userId: string;
  amount: string;
}

export interface WithdrawalProcessedPayload {
  withdrawalId: string;
  userId: string;
  status: "processed" | "rejected";
}

export interface CommissionChargedPayload {
  userId: string;
  orderId: string;
  amount: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "wallet.credited": WalletCreditedPayload;
    "wallet.balance_released": WalletBalanceReleasedPayload;
    "withdrawal.requested": WithdrawalRequestedPayload;
    "withdrawal.processed": WithdrawalProcessedPayload;
    "commission.charged": CommissionChargedPayload;
  }
}
