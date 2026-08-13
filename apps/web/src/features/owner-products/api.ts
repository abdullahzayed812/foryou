import { apiClient } from "@/lib/api-client";
import type { Product } from "@/features/catalog/types";

export interface ProductImageInput {
  mediaAssetId: string;
  isCover: boolean;
  isCountryOfOrigin: boolean;
}

export interface CreateProductInput {
  name: string;
  categoryId: string;
  brandId: string;
  shortDescription: string;
  detailedDescription: string;
  countryOfOrigin: string;
  price: number;
  shippingCost: number;
  availableQuantity: number;
  warrantyAvailable: boolean;
  isComingSoon: boolean;
  tags: string[];
  images: ProductImageInput[];
}

export type UpdateProductInput = Partial<CreateProductInput>;

/** Owner-scoped product management — same endpoints for sellers (/sellers/me/products) and merchants (/merchants/me/products). */
export function createOwnerProductsApi(
  basePath: "/sellers/me/products" | "/merchants/me/products",
) {
  return {
    list: () => apiClient.get<Product[]>(basePath).then((r) => r.data),
    get: (id: string) => apiClient.get<Product>(`${basePath}/${id}`).then((r) => r.data),
    create: (input: CreateProductInput) =>
      apiClient.post<Product>(basePath, input).then((r) => r.data),
    update: (id: string, input: UpdateProductInput) =>
      apiClient.patch<Product>(`${basePath}/${id}`, input).then((r) => r.data),
    replaceImages: (id: string, images: ProductImageInput[]) =>
      apiClient.put<Product>(`${basePath}/${id}/images`, { images }).then((r) => r.data),
    delete: (id: string) => apiClient.delete(`${basePath}/${id}`).then((r) => r.data),
  };
}
