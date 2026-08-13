import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { verificationApi } from "./api";

export const verificationQueryKey = ["verification"] as const;

export function useMyVerification() {
  return useQuery({ queryKey: verificationQueryKey, queryFn: verificationApi.listMine });
}

export function useSubmitIdentityVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verificationApi.submitIdentity,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: verificationQueryKey }),
  });
}

export function useSubmitBusinessVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: verificationApi.submitBusiness,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: verificationQueryKey }),
  });
}
