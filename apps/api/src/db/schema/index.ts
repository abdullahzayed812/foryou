// Barrel of every Drizzle table definition, grouped by domain (architecture
// doc §03). Populated module-by-module — kept as a single import surface so
// `db/index.ts` and drizzle-kit always see the full schema.
export * from "../../modules/users/schema.js";
export * from "../../modules/auth/schema.js";
export * from "../../modules/media/schema.js";
export * from "../../modules/verification/schema.js";
export * from "../../modules/trust-score/schema.js";
export * from "../../modules/categories/schema.js";
export * from "../../modules/brands/schema.js";
export * from "../../modules/products/schema.js";
export * from "../../modules/import-requests/schema.js";
export * from "../../modules/offers/schema.js";
export * from "../../modules/orders/schema.js";
export * from "../../modules/wallet/schema.js";
export * from "../../modules/payments/schema.js";
export * from "../../modules/reviews/schema.js";
export * from "../../modules/disputes/schema.js";
export * from "../../modules/notifications/schema.js";
export * from "../../modules/wishlist/schema.js";
export * from "../../modules/news/schema.js";
export * from "../../modules/settings/schema.js";
