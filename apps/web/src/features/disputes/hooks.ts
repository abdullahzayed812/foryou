import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { disputesApi, createFulfillerDisputesApi } from "./api";

type FulfillerDisputesBasePath = "/sellers/me/disputes" | "/merchants/me/disputes";

export const disputesQueryKey = ["disputes"] as const;

export function useMyDisputes() {
  return useQuery({ queryKey: disputesQueryKey, queryFn: disputesApi.listMine });
}

export function useDispute(id: string | undefined) {
  return useQuery({
    queryKey: [...disputesQueryKey, id],
    queryFn: () => disputesApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });
}

export function useOpenDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disputesApi.open,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: disputesQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ------------------------------------------------------------- fulfiller (seller/merchant)

export function useFulfillerDisputes(basePath: FulfillerDisputesBasePath) {
  return useQuery({
    queryKey: [basePath],
    queryFn: () => createFulfillerDisputesApi(basePath).list(),
  });
}

export function useFulfillerDispute(basePath: FulfillerDisputesBasePath, id: string | undefined) {
  return useQuery({
    queryKey: [basePath, id],
    queryFn: () => createFulfillerDisputesApi(basePath).get(id!),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });
}

export function useRespondToDispute(basePath: FulfillerDisputesBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { disputeId: string; response: string }) =>
      createFulfillerDisputesApi(basePath).respond(input.disputeId, input.response),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}
