import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { importRequestsApi, offersApi, sellerImportRequestsApi } from "./api";

export const importRequestsQueryKey = ["import-requests"] as const;

export function useMyImportRequests() {
  return useQuery({ queryKey: importRequestsQueryKey, queryFn: importRequestsApi.listMine });
}

export function useImportRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...importRequestsQueryKey, id],
    queryFn: () => importRequestsApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: 6000, // offers arrive asynchronously from sellers
  });
}

export function useOffersForRequest(requestId: string | undefined) {
  return useQuery({
    queryKey: [...importRequestsQueryKey, requestId, "offers"],
    queryFn: () => importRequestsApi.listOffers(requestId!),
    enabled: Boolean(requestId),
    refetchInterval: 6000,
  });
}

export function useCreateImportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importRequestsApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: importRequestsQueryKey }),
  });
}

export function useCancelImportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: importRequestsApi.cancel,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: importRequestsQueryKey }),
  });
}

export function useSelectOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: offersApi.select,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: importRequestsQueryKey });
      void queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ------------------------------------------------------------- seller

export const sellerQueueQueryKey = ["seller-import-requests"] as const;

export function useSellerOpenRequests() {
  return useQuery({
    queryKey: sellerQueueQueryKey,
    queryFn: sellerImportRequestsApi.listOpen,
    refetchInterval: 15000,
  });
}

export function useSellerImportRequest(id: string | undefined) {
  return useQuery({
    queryKey: [...sellerQueueQueryKey, id],
    queryFn: () => sellerImportRequestsApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useIgnoreImportRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sellerImportRequestsApi.ignore,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: sellerQueueQueryKey }),
  });
}

export const myOffersQueryKey = ["offers", "mine"] as const;

export function useMyOffers() {
  return useQuery({ queryKey: myOffersQueryKey, queryFn: offersApi.listMine });
}

export function useSubmitOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      requestId: string;
      totalPrice: number;
      estimatedDeliveryDays: number;
      depositPercentage: 20 | 30 | 40 | 50;
    }) => {
      const { requestId, ...offer } = input;
      return offersApi.submit(requestId, offer);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: myOffersQueryKey });
      void queryClient.invalidateQueries({ queryKey: sellerQueueQueryKey });
    },
  });
}

export function useEditOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      totalPrice?: number;
      estimatedDeliveryDays?: number;
      depositPercentage?: 20 | 30 | 40 | 50;
    }) => {
      const { id, ...changes } = input;
      return offersApi.edit(id, changes);
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: myOffersQueryKey }),
  });
}

export function useCancelOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: offersApi.cancel,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: myOffersQueryKey }),
  });
}
