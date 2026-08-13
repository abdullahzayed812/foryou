import { apiClient } from "@/lib/api-client";
import type { Product } from "@/features/catalog/types";

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
  product: Product;
}

export const wishlistApi = {
  list: () => apiClient.get<WishlistItem[]>("/wishlist/me").then((r) => r.data),
  add: (productId: string) => apiClient.post(`/wishlist/${productId}`).then((r) => r.data),
  remove: (productId: string) => apiClient.delete(`/wishlist/${productId}`).then((r) => r.data),
};
