/**
 * The four BRD user roles. `admin` is intentionally never combined with the
 * marketplace roles on one account (see architecture doc §05 / §15 — avoids
 * self-dealing conflicts of interest).
 */
export const ROLES = ["customer", "seller", "merchant", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const MARKETPLACE_ROLES = ["customer", "seller", "merchant"] as const;
export type MarketplaceRole = (typeof MARKETPLACE_ROLES)[number];

export function isMarketplaceRole(role: string): role is MarketplaceRole {
  return (MARKETPLACE_ROLES as readonly string[]).includes(role);
}
