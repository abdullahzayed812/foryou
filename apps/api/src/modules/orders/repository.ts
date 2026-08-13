import { eq, and, or, lt, desc, inArray, isNotNull, isNull, count, sum } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders, orderTimelineEvents } from "./schema.js";

export type OrderRow = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderStage = OrderRow["stage"];

function withTimeline() {
  return { timeline: { orderBy: [orderTimelineEvents.createdAt] } };
}

export class OrdersRepository {
  async create(data: NewOrder): Promise<OrderRow> {
    const [row] = await db.insert(orders).values(data).returning();
    if (!row) throw new Error("failed to create order");
    return row;
  }

  findById(id: string) {
    return db.query.orders.findFirst({ where: eq(orders.id, id), with: withTimeline() });
  }

  findByOfferId(offerId: string) {
    return db.query.orders.findFirst({ where: eq(orders.offerId, offerId) });
  }

  listForCustomer(customerId: string) {
    return db.query.orders.findMany({
      where: eq(orders.customerId, customerId),
      with: withTimeline(),
      orderBy: [desc(orders.createdAt)],
    });
  }

  listForSeller(sellerId: string) {
    return db.query.orders.findMany({
      where: eq(orders.sellerId, sellerId),
      with: withTimeline(),
      orderBy: [desc(orders.createdAt)],
    });
  }

  listForMerchant(merchantId: string) {
    return db.query.orders.findMany({
      where: eq(orders.merchantId, merchantId),
      with: withTimeline(),
      orderBy: [desc(orders.createdAt)],
    });
  }

  /** Completed order count for a seller — drives the "new seller" pending-balance rule (BRD Rule 4). */
  async countCompletedForSeller(sellerId: string): Promise<number> {
    const rows = await db.query.orders.findMany({
      where: and(eq(orders.sellerId, sellerId), eq(orders.stage, "completed")),
      columns: { id: true },
    });
    return rows.length;
  }

  async setStage(
    id: string,
    stage: OrderStage,
    extra: Partial<NewOrder> = {},
  ): Promise<OrderRow | undefined> {
    const [row] = await db
      .update(orders)
      .set({ stage, updatedAt: new Date(), ...extra })
      .where(eq(orders.id, id))
      .returning();
    return row;
  }

  async incrementDepositStrike(id: string): Promise<OrderRow | undefined> {
    const row = await this.findById(id);
    if (!row) return undefined;
    const [updated] = await db
      .update(orders)
      .set({ depositDeadlineStrikes: row.depositDeadlineStrikes + 1, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return updated;
  }

  async addTimelineEvent(
    orderId: string,
    step: (typeof orderTimelineEvents.$inferInsert)["step"],
    source: "automatic" | "manual",
    note?: string,
  ) {
    const [row] = await db
      .insert(orderTimelineEvents)
      .values({ orderId, step, source, note })
      .returning();
    return row;
  }

  /** Deposit deadline enforcement job (BRD Rule 4 §Deposit Payment Deadline). */
  listExpiredAwaitingDeposit(now: Date = new Date()) {
    return db.query.orders.findMany({
      where: and(eq(orders.stage, "awaiting_deposit"), lt(orders.depositDeadlineAt, now)),
    });
  }

  /** Auto-close job (BRD Rule 3 Stage 6: 48h with no customer response). */
  listStaleDelivered(cutoff: Date) {
    return db.query.orders.findMany({
      where: and(eq(orders.stage, "delivered"), lt(orders.deliveredAt, cutoff)),
    });
  }

  /**
   * Orders whose deposit was paid more than `cutoff` ago and haven't been
   * released yet — candidates for the verified-seller 24h balance release
   * (BRD Rule 4). Whether a given seller/merchant is actually eligible
   * (verified + past the "new seller" 3-order threshold) is checked
   * per-order by the caller.
   *
   * Deliberately NOT filtered to "still in flight" (deposit_paid/processing)
   * — an order frequently *completes* well within 24h (the customer
   * confirms receipt same-day), and `complete()` only releases early via the
   * "new seller" on-completion path. A verified/experienced fulfiller's
   * order can sit in `completed` for the rest of its life waiting on this
   * job, so excluding that stage here would leave the balance stuck in
   * pending forever — only `cancelled` orders are excluded, since
   * `cancelBySeller` already reversed that credit.
   */
  listEligibleFor24hRelease(cutoff: Date) {
    return db.query.orders.findMany({
      where: and(
        inArray(orders.stage, ["deposit_paid", "processing", "delivered", "completed"]),
        or(isNotNull(orders.sellerId), isNotNull(orders.merchantId)),
        isNull(orders.balanceReleasedAt),
        isNull(orders.openDisputeId),
        lt(orders.depositPaidAt, cutoff),
      ),
    });
  }

  async markBalanceReleased(id: string): Promise<void> {
    await db
      .update(orders)
      .set({ balanceReleasedAt: new Date(), updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  /** Set by Disputes on open, cleared on resolution (see schema.ts comment). */
  async setOpenDispute(id: string, disputeId: string | null): Promise<void> {
    await db
      .update(orders)
      .set({ openDisputeId: disputeId, updatedAt: new Date() })
      .where(eq(orders.id, id));
  }

  // ------------------------------------------------------------- admin stats

  async countByStage(): Promise<{ stage: OrderStage; count: number }[]> {
    const rows = await db
      .select({ stage: orders.stage, count: count() })
      .from(orders)
      .groupBy(orders.stage);
    return rows.map((r) => ({ stage: r.stage, count: Number(r.count) }));
  }

  /** Gross Merchandise Value — total value of every order that ever completed, platform-wide. */
  async completedGMV(): Promise<number> {
    const [row] = await db
      .select({ total: sum(orders.totalAmount) })
      .from(orders)
      .where(eq(orders.stage, "completed"));
    return Number(row?.total ?? 0);
  }
}

export const ordersRepository = new OrdersRepository();
