export interface ReviewReply {
  id: string;
  reviewId: string;
  replierId: string;
  reply: string;
  createdAt: string;
}

export interface Review {
  id: string;
  orderId: string;
  customerId: string;
  revieweeId: string;
  rating: number;
  comment: string | null;
  editableUntil: string;
  hiddenAt: string | null;
  createdAt: string;
  updatedAt: string;
  reply: ReviewReply | null;
}

export interface RatingStats {
  average: number;
  count: number;
}

export interface PendingReviewReminder {
  orderId: string;
  completedAt: string;
  sellerId: string | null;
  merchantId: string | null;
}
