import { z } from "zod";

export const submitIdentityVerificationSchema = z
  .object({
    nationalIdMediaAssetId: z.uuid(),
    selfieMediaAssetId: z.uuid(),
  })
  .strict();
export type SubmitIdentityVerificationInput = z.infer<typeof submitIdentityVerificationSchema>;

export const submitBusinessVerificationSchema = z
  .object({
    commercialRegistrationMediaAssetId: z.uuid(),
  })
  .strict();
export type SubmitBusinessVerificationInput = z.infer<typeof submitBusinessVerificationSchema>;

export const rejectVerificationSchema = z
  .object({
    reason: z.string().min(1).max(1000),
  })
  .strict();
export type RejectVerificationInput = z.infer<typeof rejectVerificationSchema>;

export const requestMoreDocsSchema = z
  .object({
    message: z.string().min(1).max(1000),
  })
  .strict();
export type RequestMoreDocsInput = z.infer<typeof requestMoreDocsSchema>;

export const revokeVerificationSchema = z
  .object({
    type: z.enum(["identity", "business"]),
    reason: z.string().min(1).max(1000),
  })
  .strict();
export type RevokeVerificationInput = z.infer<typeof revokeVerificationSchema>;
