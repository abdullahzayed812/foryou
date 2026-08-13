export interface BrandChangedPayload {
  brandId: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "brand.created": BrandChangedPayload;
    "brand.updated": BrandChangedPayload;
    "brand.deleted": BrandChangedPayload;
  }
}
