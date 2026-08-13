import { eq, and, ne } from "drizzle-orm";
import { db } from "../../db/index.js";
import { offers } from "./schema.js";

export type OfferRow = typeof offers.$inferSelect;

export class OffersRepository {
  async create(data: typeof offers.$inferInsert): Promise<OfferRow> {
    const [row] = await db.insert(offers).values(data).returning();
    if (!row) throw new Error("failed to create offer");
    return row;
  }

  findById(id: string) {
    return db.query.offers.findFirst({ where: eq(offers.id, id) });
  }

  /** Matches the partial unique index: only an `active` offer blocks a new submission — a past selected/rejected/cancelled one doesn't. */
  findActiveBySellerAndRequest(importRequestId: string, sellerId: string) {
    return db.query.offers.findFirst({
      where: and(
        eq(offers.importRequestId, importRequestId),
        eq(offers.sellerId, sellerId),
        eq(offers.status, "active"),
      ),
    });
  }

  /** Any offer at all (any status) — used to grant a seller detail access to a request they've bid on. */
  async existsForSellerAndRequest(importRequestId: string, sellerId: string): Promise<boolean> {
    const row = await db.query.offers.findFirst({
      where: and(eq(offers.importRequestId, importRequestId), eq(offers.sellerId, sellerId)),
      columns: { id: true },
    });
    return !!row;
  }

  listForRequest(importRequestId: string) {
    return db.query.offers.findMany({
      where: and(eq(offers.importRequestId, importRequestId), eq(offers.status, "active")),
      orderBy: (t, { asc }) => [asc(t.totalPrice)],
    });
  }

  listForSeller(sellerId: string) {
    return db.query.offers.findMany({
      where: eq(offers.sellerId, sellerId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  async update(
    id: string,
    data: Partial<typeof offers.$inferInsert>,
  ): Promise<OfferRow | undefined> {
    const [row] = await db
      .update(offers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(offers.id, id))
      .returning();
    return row;
  }

  async rejectOthers(importRequestId: string, selectedOfferId: string): Promise<OfferRow[]> {
    return db
      .update(offers)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(and(eq(offers.importRequestId, importRequestId), ne(offers.id, selectedOfferId)))
      .returning();
  }
}

export const offersRepository = new OffersRepository();
