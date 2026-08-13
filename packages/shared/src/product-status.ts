export const PRODUCT_STATUSES = ["available", "low_stock", "out_of_stock", "coming_soon"] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/**
 * BRD Rule 6 "Product Availability": status tracks quantity automatically
 * (0 → Out of Stock) except "Coming Soon", which is a seller/merchant
 * decision independent of quantity (not yet arrived, not just sold out) —
 * the BRD doesn't publish a "low stock" cutoff, so 5 units is an architect
 * recommendation, not a requirement.
 */
export const LOW_STOCK_THRESHOLD = 5;

export function deriveProductStatus(
  availableQuantity: number,
  isComingSoon: boolean,
): ProductStatus {
  if (isComingSoon) return "coming_soon";
  if (availableQuantity <= 0) return "out_of_stock";
  if (availableQuantity <= LOW_STOCK_THRESHOLD) return "low_stock";
  return "available";
}
