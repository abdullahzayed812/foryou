import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createOwnerProductsApi,
  type CreateProductInput,
  type UpdateProductInput,
  type ProductImageInput,
} from "./api";

export type OwnerProductsBasePath = "/sellers/me/products" | "/merchants/me/products";

export function useOwnerProductsList(basePath: OwnerProductsBasePath) {
  return useQuery({ queryKey: [basePath], queryFn: () => createOwnerProductsApi(basePath).list() });
}

export function useOwnerProduct(basePath: OwnerProductsBasePath, id: string | undefined) {
  return useQuery({
    queryKey: [basePath, id],
    queryFn: () => createOwnerProductsApi(basePath).get(id!),
    enabled: Boolean(id),
  });
}

export function useCreateOwnerProduct(basePath: OwnerProductsBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => createOwnerProductsApi(basePath).create(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}

export function useUpdateOwnerProduct(basePath: OwnerProductsBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; data: UpdateProductInput }) =>
      createOwnerProductsApi(basePath).update(input.id, input.data),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}

export function useReplaceOwnerProductImages(basePath: OwnerProductsBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { id: string; images: ProductImageInput[] }) =>
      createOwnerProductsApi(basePath).replaceImages(input.id, input.images),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}

export function useDeleteOwnerProduct(basePath: OwnerProductsBasePath) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => createOwnerProductsApi(basePath).delete(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: [basePath] }),
  });
}
