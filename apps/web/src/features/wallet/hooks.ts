import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { walletApi } from "./api";

export function useMyWallet() {
  return useQuery({ queryKey: ["wallet"], queryFn: walletApi.me });
}

export function useWalletTransactions() {
  return useQuery({ queryKey: ["wallet", "transactions"], queryFn: walletApi.transactions });
}

export function useMyWithdrawals() {
  return useQuery({ queryKey: ["wallet", "withdrawals"], queryFn: walletApi.listWithdrawals });
}

export function useRequestWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: walletApi.requestWithdrawal,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}
