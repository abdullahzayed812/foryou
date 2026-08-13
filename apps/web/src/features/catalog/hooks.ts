import { useMutation, useQuery } from "@tanstack/react-query";
import { catalogApi, searchApi } from "./api";
import type { BrowseQuery } from "./types";

export function useBrowseProducts(query: BrowseQuery) {
  const hasQuery = Boolean(query.q && query.q.trim().length > 0);
  return useQuery({
    queryKey: ["products", "browse", query],
    queryFn: () =>
      hasQuery
        ? searchApi.search(query).then((r) => ({ items: r.products, nextCursor: r.nextCursor }))
        : catalogApi.browse(query),
    staleTime: 15_000,
  });
}

export function useProduct(id: string | undefined) {
  return useQuery({
    queryKey: ["products", id],
    queryFn: () => catalogApi.get(id!),
    enabled: Boolean(id),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: catalogApi.categories,
    staleTime: 5 * 60_000,
  });
}

export function useBrands() {
  return useQuery({ queryKey: ["brands"], queryFn: catalogApi.brands, staleTime: 5 * 60_000 });
}

export function useNotifyMe() {
  return useMutation({ mutationFn: catalogApi.notifyMe });
}
