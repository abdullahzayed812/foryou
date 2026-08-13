import { z } from "zod";

// BRD Rule 8 — the exact set of valid dispute reasons.
export const DISPUTE_REASONS = [
  "wrong_product",
  "wrong_color",
  "wrong_size",
  "damaged_product",
  "missing_items",
  "item_not_delivered",
  "non_original_product",
  "delivery_delay",
] as const;
export type DisputeReason = (typeof DISPUTE_REASONS)[number];

export const openDisputeSchema = z
  .object({
    orderId: z.uuid(),
    reason: z.enum(DISPUTE_REASONS),
    description: z.string().min(10).max(2000),
    // BRD Rule 8: "Required evidence: description + photos (required), video optional."
    photoMediaAssetIds: z.array(z.uuid()).min(1).max(10),
    videoMediaAssetIds: z.array(z.uuid()).max(3).optional(),
  })
  .strict();
export type OpenDisputeInput = z.infer<typeof openDisputeSchema>;

export const respondToDisputeSchema = z.object({ response: z.string().min(1).max(2000) }).strict();
export type RespondToDisputeInput = z.infer<typeof respondToDisputeSchema>;

export const DISPUTE_RESOLUTIONS = [
  "full_refund",
  "partial_refund",
  "replacement",
  "missing_item_shipment",
  "rejected",
] as const;
export type DisputeResolution = (typeof DISPUTE_RESOLUTIONS)[number];

export const resolveDisputeSchema = z
  .object({
    resolution: z.enum(DISPUTE_RESOLUTIONS),
    resolutionNote: z.string().min(1).max(2000),
    // Required only for partial_refund — validated in the service, where the order total is known.
    refundAmount: z.number().positive().optional(),
    // BRD Rule 8 "Counterfeit Products" / "False Disputes" escalation paths — independent of `resolution`.
    counterfeitConfirmed: z.boolean().optional(),
    falseDispute: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.resolution !== "partial_refund" || v.refundAmount !== undefined, {
    message: "refundAmount is required for a partial refund",
    path: ["refundAmount"],
  })
  .refine((v) => !(v.counterfeitConfirmed && v.falseDispute), {
    message: "A dispute can't be both a confirmed counterfeit and a false dispute",
    path: ["falseDispute"],
  });
export type ResolveDisputeInput = z.infer<typeof resolveDisputeSchema>;
