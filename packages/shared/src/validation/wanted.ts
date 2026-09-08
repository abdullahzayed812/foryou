import { z } from "zod";

/**
 * FOR YOU product lifecycle (WANTED → IMPORTING → EXPRESS → OUT OF STOCK).
 * Only the first three are stored on `products.lifecycle`; "out of stock" is
 * a derived display state (`lifecycle === "express"` && stock `status ===
 * "out_of_stock"`) so the existing quantity-driven `productStatusEnum` stays
 * the single source of truth for stock. A product keeps the same id across
 * every stage and across repeated WANTED cycles.
 */
export const PRODUCT_LIFECYCLE_STAGES = ["wanted", "importing", "express"] as const;
export type ProductLifecycleStage = (typeof PRODUCT_LIFECYCLE_STAGES)[number];

export const WANTED_CYCLE_STATUSES = ["active", "importing", "completed"] as const;
export type WantedCycleStatus = (typeof WANTED_CYCLE_STATUSES)[number];

/** Seller/Merchant finishing an import: the quantity that actually arrived and is being added to EXPRESS stock. */
export const completeImportSchema = z
  .object({ importedQuantity: z.number().int().positive().max(1_000_000) })
  .strict();
export type CompleteImportInput = z.infer<typeof completeImportSchema>;
