import { apiClient } from "@/lib/api-client";
import type { BrowseQuery, BrowseResult, Product, Category, Brand, WantedView } from "./types";

export const catalogApi = {
  browse: (query: BrowseQuery) =>
    apiClient.get<BrowseResult>("/products", { params: query }).then((r) => r.data),

  get: (id: string) => apiClient.get<Product>(`/products/${id}`).then((r) => r.data),

  notifyMe: (id: string) => apiClient.post(`/products/${id}/notify-me`).then((r) => r.data),

  // FOR YOU WANTED — customer interactions (❤️ Like / 🔔 Notify Me).
  getWanted: (id: string) =>
    apiClient.get<WantedView>(`/products/${id}/wanted`).then((r) => r.data),
  likeWanted: (id: string) => apiClient.post(`/products/${id}/wanted/like`).then((r) => r.data),
  unlikeWanted: (id: string) =>
    apiClient.delete(`/products/${id}/wanted/like`).then((r) => r.data),
  notifyWanted: (id: string) =>
    apiClient.post(`/products/${id}/wanted/notify`).then((r) => r.data),
  cancelNotifyWanted: (id: string) =>
    apiClient.delete(`/products/${id}/wanted/notify`).then((r) => r.data),

  categories: () => apiClient.get<Category[]>("/categories").then((r) => r.data),

  brands: () => apiClient.get<Brand[]>("/brands").then((r) => r.data),
};

export interface SearchResult {
  products: Product[];
  nextCursor: string | null;
  brands: Brand[];
  categories: Category[];
}

export const searchApi = {
  search: (query: BrowseQuery) =>
    apiClient.get<SearchResult>("/search", { params: query }).then((r) => r.data),
  suggest: (q: string) =>
    apiClient.get<string[]>("/search/suggest", { params: { q } }).then((r) => r.data),
};
