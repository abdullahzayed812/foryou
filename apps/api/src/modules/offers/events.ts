export interface OfferSubmittedPayload {
  offerId: string;
  importRequestId: string;
  sellerId: string;
  customerId: string;
}

export interface OfferEditedPayload {
  offerId: string;
}

export interface OfferCancelledPayload {
  offerId: string;
  importRequestId: string;
}

export interface OfferSelectedPayload {
  offerId: string;
  importRequestId: string;
  sellerId: string;
  customerId: string;
  orderId: string;
}

export interface OfferRejectedPayload {
  offerId: string;
  sellerId: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "offer.submitted": OfferSubmittedPayload;
    "offer.edited": OfferEditedPayload;
    "offer.cancelled": OfferCancelledPayload;
    "offer.selected": OfferSelectedPayload;
    "offer.rejected": OfferRejectedPayload;
  }
}
