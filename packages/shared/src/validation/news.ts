import { z } from "zod";

export const createNewsPostSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(20000),
    coverMediaAssetId: z.uuid().optional(),
  })
  .strict();
export type CreateNewsPostInput = z.infer<typeof createNewsPostSchema>;

export const updateNewsPostSchema = createNewsPostSchema.partial().strict();
export type UpdateNewsPostInput = z.infer<typeof updateNewsPostSchema>;
