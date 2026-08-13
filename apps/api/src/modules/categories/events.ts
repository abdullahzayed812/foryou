export interface CategoryChangedPayload {
  categoryId: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "category.created": CategoryChangedPayload;
    "category.updated": CategoryChangedPayload;
    "category.deleted": CategoryChangedPayload;
  }
}
