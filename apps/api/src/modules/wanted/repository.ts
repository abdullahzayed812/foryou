import { and, eq, ne, sql, count, inArray, gte, lt, isNull, desc, asc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { orders } from "../orders/schema.js";
import {
  wantedCycles,
  wantedLikes,
  wantedNotifyRequests,
  type wantedCycleStatusEnum,
} from "./schema.js";

export type WantedCycleRow = typeof wantedCycles.$inferSelect;
export type WantedCycleStatus = (typeof wantedCycleStatusEnum.enumValues)[number];

/** Express order stages that represent a real, paid sale (not a cancelled or unpaid checkout). */
const SOLD_STAGES = ["deposit_paid", "processing", "delivered", "completed"] as const;

export class WantedRepository {
  // ------------------------------------------------------------- cycles

  findById(id: string) {
    return db.query.wantedCycles.findFirst({ where: eq(wantedCycles.id, id) });
  }

  /** The one non-completed cycle for a product, if any (active or importing). */
  findOpenCycle(productId: string) {
    return db.query.wantedCycles.findFirst({
      where: and(eq(wantedCycles.productId, productId), ne(wantedCycles.status, "completed")),
    });
  }

  listByProduct(productId: string): Promise<WantedCycleRow[]> {
    return db.query.wantedCycles.findMany({
      where: eq(wantedCycles.productId, productId),
      orderBy: [asc(wantedCycles.cycleNumber)],
    });
  }

  async nextCycleNumber(productId: string): Promise<number> {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${wantedCycles.cycleNumber}), 0)` })
      .from(wantedCycles)
      .where(eq(wantedCycles.productId, productId));
    return Number(row?.max ?? 0) + 1;
  }

  async createCycle(productId: string, cycleNumber: number): Promise<WantedCycleRow> {
    const [row] = await db
      .insert(wantedCycles)
      .values({ productId, cycleNumber, status: "active" })
      .returning();
    if (!row) throw new Error("failed to create wanted cycle");
    return row;
  }

  async setCycleStatus(
    id: string,
    status: WantedCycleStatus,
    extra: Partial<Pick<WantedCycleRow, "importedQuantity" | "importingAt" | "completedAt">> = {},
  ): Promise<WantedCycleRow | undefined> {
    const [row] = await db
      .update(wantedCycles)
      .set({ status, ...extra })
      .where(eq(wantedCycles.id, id))
      .returning();
    return row;
  }

  // -------------------------------------------------------- interactions

  async addLike(cycleId: string, customerId: string): Promise<void> {
    await db
      .insert(wantedLikes)
      .values({ wantedCycleId: cycleId, customerId })
      .onConflictDoNothing();
  }

  async removeLike(cycleId: string, customerId: string): Promise<void> {
    await db
      .delete(wantedLikes)
      .where(
        and(eq(wantedLikes.wantedCycleId, cycleId), eq(wantedLikes.customerId, customerId)),
      );
  }

  async addNotifyRequest(cycleId: string, customerId: string): Promise<void> {
    await db
      .insert(wantedNotifyRequests)
      .values({ wantedCycleId: cycleId, customerId })
      .onConflictDoNothing();
  }

  async removeNotifyRequest(cycleId: string, customerId: string): Promise<void> {
    await db
      .delete(wantedNotifyRequests)
      .where(
        and(
          eq(wantedNotifyRequests.wantedCycleId, cycleId),
          eq(wantedNotifyRequests.customerId, customerId),
        ),
      );
  }

  async viewerState(
    cycleId: string,
    customerId: string,
  ): Promise<{ liked: boolean; notified: boolean }> {
    const [like, notify] = await Promise.all([
      db.query.wantedLikes.findFirst({
        where: and(
          eq(wantedLikes.wantedCycleId, cycleId),
          eq(wantedLikes.customerId, customerId),
        ),
      }),
      db.query.wantedNotifyRequests.findFirst({
        where: and(
          eq(wantedNotifyRequests.wantedCycleId, cycleId),
          eq(wantedNotifyRequests.customerId, customerId),
        ),
      }),
    ]);
    return { liked: Boolean(like), notified: Boolean(notify) };
  }

  // ------------------------------------------------------------- counts

  async likeCounts(cycleIds: string[]): Promise<Map<string, number>> {
    if (cycleIds.length === 0) return new Map();
    const rows = await db
      .select({ cycleId: wantedLikes.wantedCycleId, n: count() })
      .from(wantedLikes)
      .where(inArray(wantedLikes.wantedCycleId, cycleIds))
      .groupBy(wantedLikes.wantedCycleId);
    return new Map(rows.map((r) => [r.cycleId, Number(r.n)]));
  }

  async notifyCounts(cycleIds: string[]): Promise<Map<string, number>> {
    if (cycleIds.length === 0) return new Map();
    const rows = await db
      .select({ cycleId: wantedNotifyRequests.wantedCycleId, n: count() })
      .from(wantedNotifyRequests)
      .where(inArray(wantedNotifyRequests.wantedCycleId, cycleIds))
      .groupBy(wantedNotifyRequests.wantedCycleId);
    return new Map(rows.map((r) => [r.cycleId, Number(r.n)]));
  }

  // ------------------------------------------------- notify-me fan-out

  listPendingNotifyRequests(cycleId: string) {
    return db.query.wantedNotifyRequests.findMany({
      where: and(
        eq(wantedNotifyRequests.wantedCycleId, cycleId),
        isNull(wantedNotifyRequests.notifiedAt),
      ),
    });
  }

  async markNotified(cycleId: string): Promise<void> {
    await db
      .update(wantedNotifyRequests)
      .set({ notifiedAt: new Date() })
      .where(
        and(
          eq(wantedNotifyRequests.wantedCycleId, cycleId),
          isNull(wantedNotifyRequests.notifiedAt),
        ),
      );
  }

  // ----------------------------------------------------------- analytics

  /**
   * Real EXPRESS sales attributable to a completed cycle: paid orders for
   * this product placed between the cycle completing and the next cycle
   * opening (or now). Returns units sold and the set of buyer ids — the
   * buyer ids let us compute a real notify→purchase conversion without
   * inventing anything (§10): a notify requester who later placed such an
   * order counts as converted.
   */
  async salesForWindow(
    productId: string,
    from: Date,
    to: Date | null,
  ): Promise<{ unitsSold: number; buyerIds: string[] }> {
    const conds = [
      eq(orders.productId, productId),
      eq(orders.type, "express"),
      inArray(orders.stage, [...SOLD_STAGES]),
      gte(orders.createdAt, from),
    ];
    if (to) conds.push(lt(orders.createdAt, to));

    const rows = await db
      .select({ customerId: orders.customerId, quantity: orders.quantity })
      .from(orders)
      .where(and(...conds));

    const unitsSold = rows.reduce((sum, r) => sum + (r.quantity ?? 0), 0);
    const buyerIds = [...new Set(rows.map((r) => r.customerId))];
    return { unitsSold, buyerIds };
  }

  async notifyRequesterIds(cycleId: string): Promise<string[]> {
    const rows = await db
      .select({ customerId: wantedNotifyRequests.customerId })
      .from(wantedNotifyRequests)
      .where(eq(wantedNotifyRequests.wantedCycleId, cycleId));
    return rows.map((r) => r.customerId);
  }

  /** Every non-completed cycle with its product attached — the service filters by owner/role for the dashboard. */
  listOpenCyclesWithProduct() {
    return db.query.wantedCycles.findMany({
      where: ne(wantedCycles.status, "completed"),
      with: { product: true },
      orderBy: [desc(wantedCycles.createdAt)],
    });
  }
}

export const wantedRepository = new WantedRepository();
