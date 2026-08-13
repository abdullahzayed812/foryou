import { ConflictError, ForbiddenError, NotFoundError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { ordersRepository } from "../orders/repository.js";
import { reviewsRepository, type ReviewsRepository } from "./repository.js";
import "./events.js";

const EDIT_WINDOW_DAYS = 7; // architect recommendation — BRD names an edit window without giving its length.
const REMINDER_WINDOW_DAYS = 3; // BRD: reminder popup "continues 3 days or until submitted".

export class ReviewsService {
  constructor(private readonly repo: ReviewsRepository) {}

  async create(customerId: string, orderId: string, rating: number, comment?: string) {
    const order = await ordersRepository.findById(orderId);
    if (!order || order.customerId !== customerId) throw new NotFoundError("Order not found");
    if (order.stage !== "completed")
      throw new ConflictError("You can only review an order after it's completed");
    if (order.openDisputeId)
      throw new ConflictError("Reviews are disabled while this order has an open dispute");
    const existing = await this.repo.findByOrderId(orderId);
    if (existing) throw new ConflictError("This order has already been reviewed");

    const revieweeId = order.sellerId ?? order.merchantId;
    if (!revieweeId) throw new ConflictError("This order has no seller or merchant to review");
    const revieweeRole: "seller" | "merchant" = order.sellerId ? "seller" : "merchant";

    const editableUntil = new Date(Date.now() + EDIT_WINDOW_DAYS * 86_400_000);
    const review = await this.repo.create({
      orderId,
      customerId,
      revieweeId,
      rating,
      comment,
      editableUntil,
    });

    eventBus.publish("review.created", { reviewId: review.id, revieweeId, revieweeRole, rating });
    return review;
  }

  async update(customerId: string, reviewId: string, rating: number, comment?: string) {
    const review = await this.repo.findById(reviewId);
    if (!review || review.customerId !== customerId) throw new NotFoundError("Review not found");
    if (review.editableUntil.getTime() < Date.now())
      throw new ConflictError("This review can no longer be edited");

    const order = await ordersRepository.findById(review.orderId);
    if (order?.openDisputeId)
      throw new ConflictError("Reviews are disabled while this order has an open dispute");

    const updated = await this.repo.update(reviewId, { rating, comment });
    if (!updated) throw new NotFoundError("Review not found");
    return updated;
  }

  listMine(customerId: string) {
    return this.repo.listMine(customerId);
  }

  listForReviewee(revieweeId: string) {
    return this.repo.listForReviewee(revieweeId);
  }

  ratingStats(revieweeId: string) {
    return this.repo.ratingStats(revieweeId);
  }

  /** BRD: mandatory post-completion review reminder — orders completed in the last 3 days, not yet reviewed. */
  async listPendingReminders(customerId: string) {
    const since = new Date(Date.now() - REMINDER_WINDOW_DAYS * 86_400_000);
    return this.repo.listPendingForCustomer(customerId, since);
  }

  async reply(fulfillerId: string, reviewId: string, reply: string) {
    const review = await this.repo.findById(reviewId);
    if (!review) throw new NotFoundError("Review not found");
    if (review.reply) throw new ConflictError("This review already has a reply");
    if (review.revieweeId !== fulfillerId)
      throw new ForbiddenError("You can only reply to reviews left for you");

    return this.repo.createReply(reviewId, fulfillerId, reply);
  }

  // ------------------------------------------------------------- admin

  listAllForAdmin() {
    return this.repo.listAllForAdmin();
  }

  async setHidden(reviewId: string, hidden: boolean) {
    const review = await this.repo.setHidden(reviewId, hidden);
    if (!review) throw new NotFoundError("Review not found");
    eventBus.publish("review.moderated", { reviewId, hidden });
    return review;
  }

  /** BRD "Moderate Replies": removing a review's reply without touching the review itself. */
  async deleteReply(reviewId: string) {
    const review = await this.repo.findById(reviewId);
    if (!review) throw new NotFoundError("Review not found");
    if (!review.reply) throw new NotFoundError("This review has no reply");
    await this.repo.deleteReply(reviewId);
  }

  async remove(reviewId: string) {
    const review = await this.repo.findById(reviewId);
    if (!review) throw new NotFoundError("Review not found");
    await this.repo.remove(reviewId);
    eventBus.publish("review.moderated", { reviewId, hidden: true });
  }
}

export const reviewsService = new ReviewsService(reviewsRepository);
