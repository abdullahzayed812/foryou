export interface ReviewCreatedPayload {
  reviewId: string;
  revieweeId: string;
  revieweeRole: "seller" | "merchant";
  rating: number;
}

/** Admin hid/unhid a review, or deleted it outright (BRD FR-04 "Reviews Management"). */
export interface ReviewModeratedPayload {
  reviewId: string;
  hidden: boolean;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "review.created": ReviewCreatedPayload;
    "review.moderated": ReviewModeratedPayload;
  }
}
