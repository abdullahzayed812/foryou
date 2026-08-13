import { eq, and, gte, desc, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { reviews, reviewReplies } from "./schema.js";
import { orders } from "../orders/schema.js";

export type ReviewRow = typeof reviews.$inferSelect;
export type NewReview = typeof reviews.$inferInsert;

function withReply() {
  return { reply: true } as const;
}

export class ReviewsRepository {
  async create(data: NewReview): Promise<ReviewRow> {
    const [row] = await db.insert(reviews).values(data).returning();
    if (!row) throw new Error("failed to create review");
    return row;
  }

  findById(id: string) {
    return db.query.reviews.findFirst({ where: eq(reviews.id, id), with: withReply() });
  }

  findByOrderId(orderId: string) {
    return db.query.reviews.findFirst({ where: eq(reviews.orderId, orderId) });
  }

  async update(id: string, data: Partial<NewReview>): Promise<ReviewRow | undefined> {
    const [row] = await db
      .update(reviews)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return row;
  }

  /** Excludes admin-hidden reviews — this is the reviewee-facing and public-facing read. */
  listForReviewee(revieweeId: string) {
    return db.query.reviews.findMany({
      where: and(eq(reviews.revieweeId, revieweeId), isNull(reviews.hiddenAt)),
      with: withReply(),
      orderBy: [desc(reviews.createdAt)],
    });
  }

  listMine(customerId: string) {
    return db.query.reviews.findMany({
      where: eq(reviews.customerId, customerId),
      with: withReply(),
      orderBy: [desc(reviews.createdAt)],
    });
  }

  async createReply(reviewId: string, replierId: string, reply: string) {
    const [row] = await db.insert(reviewReplies).values({ reviewId, replierId, reply }).returning();
    if (!row) throw new Error("failed to create reply");
    return row;
  }

  /** BRD "View rating statistics" (Seller/Merchant capability). Excludes admin-hidden reviews. */
  async ratingStats(revieweeId: string): Promise<{ average: number; count: number }> {
    const [row] = await db
      .select({
        average: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
        count: sql<string>`count(*)`,
      })
      .from(reviews)
      .where(and(eq(reviews.revieweeId, revieweeId), isNull(reviews.hiddenAt)));
    return { average: Number(row?.average ?? 0), count: Number(row?.count ?? 0) };
  }

  /** Platform-wide rating stats — admin stats dashboard. */
  async platformStats(): Promise<{ average: number; count: number }> {
    const [row] = await db
      .select({
        average: sql<string>`coalesce(avg(${reviews.rating}), 0)`,
        count: sql<string>`count(*)`,
      })
      .from(reviews);
    return { average: Number(row?.average ?? 0), count: Number(row?.count ?? 0) };
  }

  /**
   * Completed orders (for this customer) that don't have a review yet —
   * drives the mandatory post-completion review reminder (BRD: "popup on
   * login, continues 3 days or until submitted").
   */
  async listPendingForCustomer(customerId: string, since: Date) {
    return db
      .select({
        orderId: orders.id,
        completedAt: orders.completedAt,
        sellerId: orders.sellerId,
        merchantId: orders.merchantId,
      })
      .from(orders)
      .leftJoin(reviews, eq(reviews.orderId, orders.id))
      .where(
        and(
          eq(orders.customerId, customerId),
          eq(orders.stage, "completed"),
          gte(orders.completedAt, since),
          sql`${reviews.id} IS NULL`,
        ),
      );
  }

  // ------------------------------------------------------------- admin

  /** All reviews, newest first — no hidden/visible filtering, admins see everything. */
  listAllForAdmin() {
    return db.query.reviews.findMany({
      with: withReply(),
      orderBy: [desc(reviews.createdAt)],
    });
  }

  async setHidden(id: string, hidden: boolean): Promise<ReviewRow | undefined> {
    const [row] = await db
      .update(reviews)
      .set({ hiddenAt: hidden ? new Date() : null, updatedAt: new Date() })
      .where(eq(reviews.id, id))
      .returning();
    return row;
  }

  async remove(id: string): Promise<void> {
    await db.delete(reviews).where(eq(reviews.id, id));
  }

  async deleteReply(reviewId: string): Promise<void> {
    await db.delete(reviewReplies).where(eq(reviewReplies.reviewId, reviewId));
  }
}

export const reviewsRepository = new ReviewsRepository();
