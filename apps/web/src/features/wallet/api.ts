import { apiClient } from "@/lib/api-client";
import type { Wallet, WalletTransaction, WithdrawalRequest } from "./types";

export const walletApi = {
  me: () => apiClient.get<Wallet>("/wallet/me").then((r) => r.data),
  transactions: () =>
    apiClient.get<WalletTransaction[]>("/wallet/me/transactions").then((r) => r.data),
  requestWithdrawal: (amount: number) =>
    apiClient.post<WithdrawalRequest>("/wallet/withdrawals", { amount }).then((r) => r.data),
  listWithdrawals: () =>
    apiClient.get<WithdrawalRequest[]>("/wallet/withdrawals").then((r) => r.data),
};
