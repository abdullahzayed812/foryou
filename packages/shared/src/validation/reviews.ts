import { z } from "zod";

export const createReviewSchema = z
  .object({
    orderId: z.uuid(),
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  })
  .strict();
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

export const updateReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  })
  .strict();
export type UpdateReviewInput = z.infer<typeof updateReviewSchema>;

export const replyToReviewSchema = z.object({ reply: z.string().min(1).max(2000) }).strict();
export type ReplyToReviewInput = z.infer<typeof replyToReviewSchema>;
