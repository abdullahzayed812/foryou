import { z } from "zod";
import { countryEnum } from "./countries.js";
import { isImportDescriptionAllowed } from "./import-description-validator.js";

// BRD Rule 3 "Import Request": "Product prices are NOT allowed inside notes"
// — the platform's whole value proposition is sellers competing blind on
// price, so a customer hinting a target price undermines that. This is a
// best-effort heuristic, not a guarantee — it can't catch every phrasing,
// but it catches the obvious cases. See import-description-validator.ts.
const notesSchema = z
  .object({
    color: z.string().max(100).optional(),
    size: z.string().max(50).optional(),
    quantity: z.string().max(50).optional(),
    preferences: z.string().max(500).optional(),
  })
  .refine((v) => !v.preferences || isImportDescriptionAllowed(v.preferences), {
    message: "Notes may not mention prices or budgets — sellers compete blind on price",
    path: ["preferences"],
  });

export const createImportRequestSchema = z
  .object({
    links: z.array(z.url()).min(1).max(20),
    notes: notesSchema.optional(),
    // Not explicit in the BRD (which only says "the system automatically
    // sends the request to matching Sellers" without saying how matching
    // works) — an architect addition so distribution has something concrete
    // to match against a seller's `importCountries`. Omit it to broadcast to
    // every active seller. A fixed enum, not free text — see countries.ts.
    sourceCountry: countryEnum.optional(),
  })
  .strict();
export type CreateImportRequestInput = z.infer<typeof createImportRequestSchema>;

export const DEPOSIT_PERCENTAGES = [20, 30, 40, 50] as const;
export type DepositPercentage = (typeof DEPOSIT_PERCENTAGES)[number];

export const createOfferSchema = z
  .object({
    totalPrice: z.number().positive(),
    estimatedDeliveryDays: z.number().int().positive().max(180),
    depositPercentage: z.union([z.literal(20), z.literal(30), z.literal(40), z.literal(50)]),
  })
  .strict();
export type CreateOfferInput = z.infer<typeof createOfferSchema>;

export const updateOfferSchema = createOfferSchema.partial().strict();
export type UpdateOfferInput = z.infer<typeof updateOfferSchema>;
