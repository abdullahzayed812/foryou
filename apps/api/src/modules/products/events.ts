export interface ProductPublishedPayload {
  productId: string;
  ownerId: string;
}

export interface ProductPendingReviewPayload {
  productId: string;
  ownerId: string;
}

export interface ProductStockDepletedPayload {
  productId: string;
}

export interface ProductStockRestockedPayload {
  productId: string;
  subscriberIds: string[];
}

export interface ProductPriceChangedPayload {
  productId: string;
  oldPrice: string;
  newPrice: string;
}

export interface ProductReportedPayload {
  productId: string;
  reporterId: string;
  reason: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "product.published": ProductPublishedPayload;
    "product.pending_review": ProductPendingReviewPayload;
    "product.stock.depleted": ProductStockDepletedPayload;
    "product.stock.restocked": ProductStockRestockedPayload;
    "product.price_changed": ProductPriceChangedPayload;
    "product.reported": ProductReportedPayload;
  }
}
