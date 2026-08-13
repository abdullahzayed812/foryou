import type { Role } from "@foryou/shared";
import { apiClient } from "@/lib/api-client";
import type { Product } from "@/features/catalog/types";
import type { Dispute } from "@/features/disputes/types";
import type { Review } from "@/features/reviews/types";
import type { Category, Brand } from "@/features/catalog/types";
import type {
  AdminUserListItem,
  AdminUserDetail,
  UserStats,
  PlatformStats,
  CommissionRate,
  CurrentCommissionRate,
  PlatformSettings,
  AdminWithdrawalRequest,
  AdminVerificationRequest,
} from "./types";

export const adminUsersApi = {
  list: (filters: { role?: Role; status?: string; search?: string }) =>
    apiClient.get<AdminUserListItem[]>("/admin/users", { params: filters }).then((r) => r.data),
  get: (id: string) => apiClient.get<AdminUserDetail>(`/admin/users/${id}`).then((r) => r.data),
  stats: () => apiClient.get<UserStats>("/admin/users/stats").then((r) => r.data),
  suspend: (id: string, reason?: string) =>
    apiClient.post(`/admin/users/${id}/suspend`, { reason }).then((r) => r.data),
  reactivate: (id: string) => apiClient.post(`/admin/users/${id}/reactivate`).then((r) => r.data),
};

export const adminVerificationApi = {
  queue: () =>
    apiClient.get<AdminVerificationRequest[]>("/admin/verification/queue").then((r) => r.data),
  approve: (id: string) =>
    apiClient
      .post<AdminVerificationRequest>(`/admin/verification/${id}/approve`)
      .then((r) => r.data),
  reject: (id: string, reason: string) =>
    apiClient
      .post<AdminVerificationRequest>(`/admin/verification/${id}/reject`, { reason })
      .then((r) => r.data),
  requestMoreDocs: (id: string, message: string) =>
    apiClient
      .post<AdminVerificationRequest>(`/admin/verification/${id}/request-more-docs`, { message })
      .then((r) => r.data),
};

export const adminProductsApi = {
  queue: () => apiClient.get<Product[]>("/admin/products/queue").then((r) => r.data),
  approve: (id: string) =>
    apiClient.post<Product>(`/admin/products/${id}/approve`).then((r) => r.data),
  reject: (id: string, reason: string) =>
    apiClient.post<Product>(`/admin/products/${id}/reject`, { reason }).then((r) => r.data),
  hide: (id: string) => apiClient.post<Product>(`/admin/products/${id}/hide`).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/admin/products/${id}`).then((r) => r.data),
};

export const adminDisputesApi = {
  queue: () => apiClient.get<Dispute[]>("/admin/disputes/queue").then((r) => r.data),
  awaitingReview: () =>
    apiClient.get<Dispute[]>("/admin/disputes/awaiting-review").then((r) => r.data),
  get: (id: string) => apiClient.get<Dispute>(`/admin/disputes/${id}`).then((r) => r.data),
  resolve: (
    id: string,
    input: {
      resolution:
        "full_refund" | "partial_refund" | "replacement" | "missing_item_shipment" | "rejected";
      resolutionNote: string;
      refundAmount?: number;
      counterfeitConfirmed?: boolean;
      falseDispute?: boolean;
    },
  ) => apiClient.post<Dispute>(`/admin/disputes/${id}/resolve`, input).then((r) => r.data),
};

export const adminReviewsApi = {
  list: () => apiClient.get<Review[]>("/admin/reviews").then((r) => r.data),
  hide: (id: string) => apiClient.post<Review>(`/admin/reviews/${id}/hide`).then((r) => r.data),
  unhide: (id: string) => apiClient.post<Review>(`/admin/reviews/${id}/unhide`).then((r) => r.data),
  deleteReply: (id: string) => apiClient.delete(`/admin/reviews/${id}/reply`).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/admin/reviews/${id}`).then((r) => r.data),
};

export const adminWithdrawalsApi = {
  list: () => apiClient.get<AdminWithdrawalRequest[]>("/admin/withdrawals").then((r) => r.data),
  process: (id: string, approve: boolean) =>
    apiClient
      .post<AdminWithdrawalRequest>(`/admin/withdrawals/${id}/process`, { approve })
      .then((r) => r.data),
};

export const adminCategoriesApi = {
  create: (input: { nameEn: string; nameAr: string; slug: string; parentId?: string }) =>
    apiClient.post<Category>("/admin/categories", input).then((r) => r.data),
  update: (id: string, input: Partial<{ nameEn: string; nameAr: string; slug: string }>) =>
    apiClient.patch<Category>(`/admin/categories/${id}`, input).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/admin/categories/${id}`).then((r) => r.data),
};

export const adminBrandsApi = {
  create: (input: { name: string; slug: string }) =>
    apiClient.post<Brand>("/admin/brands", input).then((r) => r.data),
  update: (id: string, input: Partial<{ name: string; slug: string }>) =>
    apiClient.patch<Brand>(`/admin/brands/${id}`, input).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/admin/brands/${id}`).then((r) => r.data),
};

export const adminCommissionRatesApi = {
  list: () => apiClient.get<CurrentCommissionRate[]>("/admin/commission-rates").then((r) => r.data),
  set: (role: "seller" | "merchant", percentage: number) =>
    apiClient
      .post<CommissionRate>("/admin/commission-rates", { role, percentage })
      .then((r) => r.data),
};

export const adminSettingsApi = {
  get: () => apiClient.get<PlatformSettings>("/admin/settings").then((r) => r.data),
  update: (input: Partial<PlatformSettings>) =>
    apiClient.put<PlatformSettings>("/admin/settings", input).then((r) => r.data),
};

export const adminStatsApi = {
  get: () => apiClient.get<PlatformStats>("/admin/stats").then((r) => r.data),
};

export interface AdminNewsPost {
  id: string;
  authorId: string;
  title: string;
  body: string;
  coverMediaAssetId: string | null;
  status: "draft" | "published";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const adminNewsApi = {
  list: () => apiClient.get<AdminNewsPost[]>("/admin/news").then((r) => r.data),
  create: (input: { title: string; body: string }) =>
    apiClient.post<AdminNewsPost>("/admin/news", input).then((r) => r.data),
  update: (id: string, input: Partial<{ title: string; body: string }>) =>
    apiClient.patch<AdminNewsPost>(`/admin/news/${id}`, input).then((r) => r.data),
  publish: (id: string) =>
    apiClient.post<AdminNewsPost>(`/admin/news/${id}/publish`).then((r) => r.data),
  unpublish: (id: string) =>
    apiClient.post<AdminNewsPost>(`/admin/news/${id}/unpublish`).then((r) => r.data),
  delete: (id: string) => apiClient.delete(`/admin/news/${id}`).then((r) => r.data),
};
