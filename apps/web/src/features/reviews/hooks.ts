import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { reviewsApi, createFulfillerReviewsApi } from "./api";

type FulfillerReviewsBasePath = "/sellers/me/reviews" | "/merchants/me/reviews";

export function useReviewsOfUser(userId: string | undefined) {
  return useQuery({
    queryKey: ["reviews", "of", userId],
    queryFn: () => reviewsApi.ofUser(userId!),
    enabled: Boolean(userId),
  });
}

export function useMyReviews() {
  return useQuery({ queryKey: ["reviews", "mine"], queryFn: reviewsApi.listMine });
}

export function usePendingReviews() {
  return useQuery({ queryKey: ["reviews", "pending"], queryFn: reviewsApi.pending });
}

export function useCreateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: reviewsApi.create,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; rating: number; comment?: string }) =>
      reviewsApi.update(input.id, { rating: input.rating, comment: input.comment }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
    },
  });
}

// ------------------------------------------------------------- fulfiller (seller/merchant)

export function useFulfillerReviews(basePath: FulfillerReviewsBasePath) {
  return useQuery({
    queryKey: [basePath],
    queryFn: () => createFulfillerReviewsApi(basePath).mine(),
  });
}

export function useReplyToReview(basePath: FulfillerReviewsBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { reviewId: string; reply: string }) =>
      createFulfillerReviewsApi(basePath).reply(input.reviewId, input.reply),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}
