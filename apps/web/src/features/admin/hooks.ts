import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Role } from "@foryou/shared";
import {
  adminUsersApi,
  adminVerificationApi,
  adminProductsApi,
  adminDisputesApi,
  adminReviewsApi,
  adminWithdrawalsApi,
  adminCategoriesApi,
  adminBrandsApi,
  adminCommissionRatesApi,
  adminSettingsApi,
  adminStatsApi,
  adminNewsApi,
} from "./api";
import type { PlatformSettings } from "./types";

// ------------------------------------------------------------- users

export function useAdminUsers(filters: { role?: Role; status?: string; search?: string }) {
  return useQuery({
    queryKey: ["admin", "users", filters],
    queryFn: () => adminUsersApi.list(filters),
  });
}

export function useAdminUser(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "users", id],
    queryFn: () => adminUsersApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useAdminUserStats() {
  return useQuery({ queryKey: ["admin", "users", "stats"], queryFn: adminUsersApi.stats });
}

export function useSuspendUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason?: string }) =>
      adminUsersApi.suspend(input.id, input.reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

export function useReactivateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminUsersApi.reactivate(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ------------------------------------------------------------- verification

export function useAdminVerificationQueue() {
  return useQuery({
    queryKey: ["admin", "verification-queue"],
    queryFn: adminVerificationApi.queue,
  });
}

export function useApproveVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminVerificationApi.approve(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["admin", "verification-queue"] }),
  });
}

export function useRejectVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      adminVerificationApi.reject(input.id, input.reason),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["admin", "verification-queue"] }),
  });
}

export function useRequestMoreDocs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; message: string }) =>
      adminVerificationApi.requestMoreDocs(input.id, input.message),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["admin", "verification-queue"] }),
  });
}

// ------------------------------------------------------------- products

export function useAdminProductsQueue() {
  return useQuery({ queryKey: ["admin", "products-queue"], queryFn: adminProductsApi.queue });
}

export function useApproveProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsApi.approve(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "products-queue"] }),
  });
}

export function useRejectProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; reason: string }) =>
      adminProductsApi.reject(input.id, input.reason),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "products-queue"] }),
  });
}

export function useHideProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminProductsApi.hide(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "products-queue"] }),
  });
}

// ------------------------------------------------------------- disputes

export function useAdminDisputesQueue() {
  return useQuery({ queryKey: ["admin", "disputes-queue"], queryFn: adminDisputesApi.queue });
}

export function useAdminDisputesAwaitingReview() {
  return useQuery({
    queryKey: ["admin", "disputes-awaiting-review"],
    queryFn: adminDisputesApi.awaitingReview,
  });
}

export function useAdminDispute(id: string | undefined) {
  return useQuery({
    queryKey: ["admin", "disputes", id],
    queryFn: () => adminDisputesApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useResolveDispute() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      id: string;
      resolution:
        "full_refund" | "partial_refund" | "replacement" | "missing_item_shipment" | "rejected";
      resolutionNote: string;
      refundAmount?: number;
      counterfeitConfirmed?: boolean;
      falseDispute?: boolean;
    }) => {
      const { id, ...rest } = input;
      return adminDisputesApi.resolve(id, rest);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "disputes-queue"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "disputes-awaiting-review"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "disputes"] });
    },
  });
}

// ------------------------------------------------------------- reviews

export function useAdminReviews() {
  return useQuery({ queryKey: ["admin", "reviews"], queryFn: adminReviewsApi.list });
}

export function useHideReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.hide(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useUnhideReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.unhide(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useDeleteReviewReply() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.deleteReply(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminReviewsApi.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] }),
  });
}

// ------------------------------------------------------------- withdrawals

export function useAdminWithdrawals() {
  return useQuery({ queryKey: ["admin", "withdrawals"], queryFn: adminWithdrawalsApi.list });
}

export function useProcessWithdrawal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; approve: boolean }) =>
      adminWithdrawalsApi.process(input.id, input.approve),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "withdrawals"] }),
  });
}

// ------------------------------------------------------------- categories & brands

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminCategoriesApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminCategoriesApi.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminBrandsApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["brands"] }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminBrandsApi.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["brands"] }),
  });
}

// ------------------------------------------------------------- commission rates

export function useCommissionRates() {
  return useQuery({
    queryKey: ["admin", "commission-rates"],
    queryFn: adminCommissionRatesApi.list,
  });
}

export function useSetCommissionRate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { role: "seller" | "merchant"; percentage: number }) =>
      adminCommissionRatesApi.set(input.role, input.percentage),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ["admin", "commission-rates"] }),
  });
}

// ------------------------------------------------------------- settings

export function useAdminSettings() {
  return useQuery({ queryKey: ["admin", "settings"], queryFn: adminSettingsApi.get });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: Partial<PlatformSettings>) => adminSettingsApi.update(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
}

// ------------------------------------------------------------- stats

export function useAdminPlatformStats() {
  return useQuery({ queryKey: ["admin", "stats"], queryFn: adminStatsApi.get });
}

// ------------------------------------------------------------- news

export function useAdminNews() {
  return useQuery({ queryKey: ["admin", "news"], queryFn: adminNewsApi.list });
}

export function useCreateNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminNewsApi.create,
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "news"] }),
  });
}

export function usePublishNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminNewsApi.publish(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "news"] }),
  });
}

export function useUnpublishNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminNewsApi.unpublish(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "news"] }),
  });
}

export function useDeleteNews() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => adminNewsApi.delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "news"] }),
  });
}
