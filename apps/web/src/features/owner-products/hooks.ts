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

export function useOwnerWantedCycles(basePath: OwnerProductsBasePath, id: string | undefined) {
  return useQuery({
    queryKey: [basePath, id, "wanted-cycles"],
    queryFn: () => createOwnerProductsApi(basePath).wantedCycles(id!),
    enabled: Boolean(id),
  });
}

/** WANTED lifecycle transitions for an owned product — each refreshes the product + its cycle history. */
export function useOwnerWantedTransitions(basePath: OwnerProductsBasePath, id: string) {
  const queryClient = useQueryClient();
  const api = createOwnerProductsApi(basePath);
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: [basePath] });
    void queryClient.invalidateQueries({ queryKey: [basePath, id] });
    void queryClient.invalidateQueries({ queryKey: [basePath, id, "wanted-cycles"] });
  };
  return {
    startWanted: useMutation({ mutationFn: () => api.startWanted(id), onSuccess: invalidate }),
    startImporting: useMutation({
      mutationFn: () => api.startImporting(id),
      onSuccess: invalidate,
    }),
    completeImport: useMutation({
      mutationFn: (importedQuantity: number) => api.completeImport(id, importedQuantity),
      onSuccess: invalidate,
    }),
  };
}
