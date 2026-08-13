import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wishlistApi } from "./api";

export const wishlistQueryKey = ["wishlist"] as const;

export function useWishlist() {
  return useQuery({ queryKey: wishlistQueryKey, queryFn: wishlistApi.list, staleTime: 30_000 });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: wishlistQueryKey });
  const add = useMutation({ mutationFn: wishlistApi.add, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: wishlistApi.remove, onSuccess: invalidate });
  return { add, remove };
}
