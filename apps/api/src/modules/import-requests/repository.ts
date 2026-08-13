import { eq, and, or, isNull, notInArray, inArray, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { importRequests, importRequestLinks, importRequestIgnores } from "./schema.js";
import { sellerProfiles } from "../users/schema.js";

export type ImportRequestRow = typeof importRequests.$inferSelect;

const WITH_LINKS = { links: true } as const;

export class ImportRequestsRepository {
  async create(
    data: typeof importRequests.$inferInsert,
    links: string[],
  ): Promise<ImportRequestRow> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(importRequests).values(data).returning();
      if (!row) throw new Error("failed to create import request");
      await tx
        .insert(importRequestLinks)
        .values(links.map((url) => ({ importRequestId: row.id, url })));
      return row;
    });
  }

  findById(id: string) {
    return db.query.importRequests.findFirst({
      where: eq(importRequests.id, id),
      with: WITH_LINKS,
    });
  }

  /** Batch lookup — used to resolve each offer's parent request (and from there its customer) without N+1 queries. */
  findByIds(ids: string[]) {
    if (ids.length === 0) return Promise.resolve([]);
    return db.query.importRequests.findMany({ where: inArray(importRequests.id, ids) });
  }

  listForCustomer(customerId: string) {
    return db.query.importRequests.findMany({
      where: eq(importRequests.customerId, customerId),
      with: WITH_LINKS,
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  /**
   * "Matching sellers" (BRD Rule 3 Stage 2), scoped to: active seller role,
   * request still open, seller hasn't already ignored it, and — when the
   * request specifies one — the seller's `importCountries` includes the
   * request's `sourceCountry`. A request with no `sourceCountry` broadcasts
   * to every active seller (see the schema comment on that gap).
   */
  async listOpenForSeller(sellerId: string) {
    const seller = await db.query.sellerProfiles.findFirst({
      where: eq(sellerProfiles.userId, sellerId),
    });
    const ignored = await db.query.importRequestIgnores.findMany({
      where: eq(importRequestIgnores.sellerId, sellerId),
    });
    const ignoredIds = ignored.map((i) => i.importRequestId);

    const conditions = [eq(importRequests.status, "open")];
    if (ignoredIds.length > 0) conditions.push(notInArray(importRequests.id, ignoredIds));
    if (seller && seller.importCountries.length > 0) {
      // `inArray` on a scalar column against a JS array parameterizes as a
      // normal IN-list — safe. A raw `= any(${jsArray})` template looks
      // equivalent but postgres.js doesn't serialize an interpolated JS
      // array as a Postgres array literal, so it throws "malformed array
      // literal" — learned the hard way running this against real Postgres.
      conditions.push(
        or(
          isNull(importRequests.sourceCountry),
          inArray(importRequests.sourceCountry, seller.importCountries),
        )!,
      );
    }

    return db.query.importRequests.findMany({ where: and(...conditions), with: WITH_LINKS });
  }

  /**
   * Whether this request was ever distributed/visible to this seller — same
   * country-match criteria as `listOpenForSeller`, minus its open-status and
   * ignored filters, so a seller who saw or bid on a request can still view
   * its detail after it closes or after they ignore it.
   */
  async isMatchedToSeller(request: ImportRequestRow, sellerId: string): Promise<boolean> {
    if (!request.sourceCountry) return true;

    const seller = await db.query.sellerProfiles.findFirst({
      where: eq(sellerProfiles.userId, sellerId),
    });
    if (!seller || seller.importCountries.length === 0) return true;
    return seller.importCountries.includes(request.sourceCountry);
  }

  async ignore(importRequestId: string, sellerId: string): Promise<void> {
    await db
      .insert(importRequestIgnores)
      .values({ importRequestId, sellerId })
      .onConflictDoNothing();
  }

  async setStatus(
    id: string,
    status: ImportRequestRow["status"],
  ): Promise<ImportRequestRow | undefined> {
    const [row] = await db
      .update(importRequests)
      .set({ status, updatedAt: new Date() })
      .where(eq(importRequests.id, id))
      .returning();
    return row;
  }

  async incrementDepositStrike(id: string): Promise<ImportRequestRow | undefined> {
    const [row] = await db
      .update(importRequests)
      .set({
        depositDeadlineStrikes: sql`${importRequests.depositDeadlineStrikes} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(importRequests.id, id))
      .returning();
    return row;
  }
}

export const importRequestsRepository = new ImportRequestsRepository();
