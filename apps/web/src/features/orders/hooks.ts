import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, createFulfillerOrdersApi } from "./api";
import type { OrderTimelineStep } from "./types";

type FulfillerBasePath = "/sellers/me/orders" | "/merchants/me/orders";

export const ordersQueryKey = ["orders"] as const;

export function useMyOrders() {
  return useQuery({ queryKey: ordersQueryKey, queryFn: ordersApi.listMine });
}

export function useOrder(id: string | undefined) {
  return useQuery({
    queryKey: [...ordersQueryKey, id],
    queryFn: () => ordersApi.get(id!),
    enabled: Boolean(id),
    refetchInterval: 5000, // deposit payment / dispute resolution happen async — poll while the page is open
  });
}

export function useCreateExpressCheckout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.createExpressCheckout,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ordersQueryKey }),
  });
}

function useInvalidatingOrderMutation<TInput>(mutationFn: (input: TInput) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ordersQueryKey }),
  });
}

export function useConfirmReceipt() {
  return useInvalidatingOrderMutation(ordersApi.confirmReceipt);
}

export function useCancelOrder() {
  return useInvalidatingOrderMutation(ordersApi.cancel);
}

export function usePayDeposit() {
  return useMutation({ mutationFn: ordersApi.payDeposit });
}

export function useSimulatePayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { transactionId: string; orderId: string; amount: number }) =>
      ordersApi.simulatePayment(input.transactionId, input.orderId, input.amount),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ordersQueryKey }),
  });
}

// ------------------------------------------------------------- fulfiller (seller/merchant)

export function useFulfillerOrders(basePath: FulfillerBasePath) {
  return useQuery({
    queryKey: [basePath],
    queryFn: () => createFulfillerOrdersApi(basePath).list(),
  });
}

export function useFulfillerOrder(basePath: FulfillerBasePath, id: string | undefined) {
  return useQuery({
    queryKey: [basePath, id],
    queryFn: () => createFulfillerOrdersApi(basePath).get(id!),
    enabled: Boolean(id),
    refetchInterval: 8000,
  });
}

export function useUpdateOrderTimeline(basePath: FulfillerBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; step: OrderTimelineStep; note?: string }) =>
      createFulfillerOrdersApi(basePath).updateTimeline(input.id, input.step, input.note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [basePath] });
      void queryClient.invalidateQueries({ queryKey: ordersQueryKey });
    },
  });
}

export function useFulfillerCancelOrder(basePath: FulfillerBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      createFulfillerOrdersApi(basePath).cancel(input.id, input.reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}
