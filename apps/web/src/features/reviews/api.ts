import { apiClient } from "@/lib/api-client";
import type { Review, RatingStats, PendingReviewReminder } from "./types";

export const reviewsApi = {
  create: (input: { orderId: string; rating: number; comment?: string }) =>
    apiClient.post<Review>("/reviews", input).then((r) => r.data),

  update: (id: string, input: { rating: number; comment?: string }) =>
    apiClient.patch<Review>(`/reviews/${id}`, input).then((r) => r.data),

  listMine: () => apiClient.get<Review[]>("/reviews/me").then((r) => r.data),

  pending: () => apiClient.get<PendingReviewReminder[]>("/reviews/pending").then((r) => r.data),

  ofUser: (userId: string) =>
    apiClient
      .get<{ items: Review[]; stats: RatingStats }>(`/reviews/of/${userId}`)
      .then((r) => r.data),
};

/** Fulfiller-scoped — same endpoints under /sellers/me/reviews or /merchants/me/reviews. */
export function createFulfillerReviewsApi(
  basePath: "/sellers/me/reviews" | "/merchants/me/reviews",
) {
  return {
    mine: () =>
      apiClient.get<{ items: Review[]; stats: RatingStats }>(basePath).then((r) => r.data),
    reply: (reviewId: string, reply: string) =>
      apiClient.post<Review>(`${basePath}/${reviewId}/reply`, { reply }).then((r) => r.data),
  };
}
