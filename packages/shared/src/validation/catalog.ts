import { z } from "zod";

const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only");

export const createCategorySchema = z
  .object({
    nameEn: z.string().min(1).max(100),
    nameAr: z.string().min(1).max(100),
    slug: slugSchema,
    parentId: z.uuid().optional(),
  })
  .strict();
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

export const updateCategorySchema = createCategorySchema.partial().strict();
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const createBrandSchema = z
  .object({
    name: z.string().min(1).max(100),
    slug: slugSchema,
    logoMediaAssetId: z.uuid().optional(),
  })
  .strict();
export type CreateBrandInput = z.infer<typeof createBrandSchema>;

export const updateBrandSchema = createBrandSchema.partial().strict();
export type UpdateBrandInput = z.infer<typeof updateBrandSchema>;
