import { z } from "zod";

const productImageSchema = z.object({
  mediaAssetId: z.uuid(),
  isCover: z.boolean().default(false),
  isCountryOfOrigin: z.boolean().default(false),
});

// BRD Rule 6 "Product Information" / "Product Images": max 8 images, and the
// cover + country-of-origin slots are required among them.
export const createProductSchema = z
  .object({
    name: z.string().min(1).max(200),
    categoryId: z.uuid(),
    brandId: z.uuid(),
    shortDescription: z.string().min(1).max(300),
    detailedDescription: z.string().min(1).max(5000),
    countryOfOrigin: z.string().min(1).max(100),
    price: z.number().positive(),
    shippingCost: z.number().min(0).default(0),
    availableQuantity: z.number().int().min(0),
    warrantyAvailable: z.boolean().default(false),
    isComingSoon: z.boolean().default(false),
    videoMediaAssetId: z.uuid().optional(),
    tags: z.array(z.string().min(1).max(40)).max(20).default([]),
    images: z.array(productImageSchema).min(1).max(8),
  })
  .strict()
  .refine((v) => v.images.filter((i) => i.isCover).length === 1, {
    message: "Exactly one image must be marked as the cover image",
    path: ["images"],
  })
  .refine((v) => v.images.filter((i) => i.isCountryOfOrigin).length === 1, {
    message: "Exactly one image must be marked as the country-of-origin image",
    path: ["images"],
  });
export type CreateProductInput = z.infer<typeof createProductSchema>;

// Partial updates skip the cover/origin refinements — PATCH may touch just
// price or quantity without resending the whole image set.
const updatableProductFields = z.object({
  name: z.string().min(1).max(200),
  categoryId: z.uuid(),
  brandId: z.uuid(),
  shortDescription: z.string().min(1).max(300),
  detailedDescription: z.string().min(1).max(5000),
  countryOfOrigin: z.string().min(1).max(100),
  price: z.number().positive(),
  shippingCost: z.number().min(0),
  availableQuantity: z.number().int().min(0),
  warrantyAvailable: z.boolean(),
  isComingSoon: z.boolean(),
  videoMediaAssetId: z.uuid().nullable(),
  tags: z.array(z.string().min(1).max(40)).max(20),
});
export const updateProductSchema = updatableProductFields.partial().strict();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const replaceProductImagesSchema = z
  .object({ images: z.array(productImageSchema).min(1).max(8) })
  .strict()
  .refine((v) => v.images.filter((i) => i.isCover).length === 1, {
    message: "Exactly one image must be marked as the cover image",
    path: ["images"],
  })
  .refine((v) => v.images.filter((i) => i.isCountryOfOrigin).length === 1, {
    message: "Exactly one image must be marked as the country-of-origin image",
    path: ["images"],
  });
export type ReplaceProductImagesInput = z.infer<typeof replaceProductImagesSchema>;

export const PRODUCT_SORT_OPTIONS = [
  "newest",
  "best_selling",
  "highest_rated",
  "lowest_price",
  "highest_price",
] as const;
export type ProductSortOption = (typeof PRODUCT_SORT_OPTIONS)[number];

export const listProductsQuerySchema = z.object({
  q: z.string().max(200).optional(),
  categoryId: z.uuid().optional(),
  brandSlug: z.string().optional(),
  status: z.enum(["available", "low_stock", "out_of_stock", "coming_soon"]).optional(),
  priceMin: z.coerce.number().min(0).optional(),
  priceMax: z.coerce.number().min(0).optional(),
  sort: z.enum(PRODUCT_SORT_OPTIONS).default("newest"),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;

export const rejectProductSchema = z.object({ reason: z.string().min(1).max(1000) }).strict();
export type RejectProductInput = z.infer<typeof rejectProductSchema>;
