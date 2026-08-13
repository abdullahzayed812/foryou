import { eq, desc, count } from "drizzle-orm";
import { db } from "../../db/index.js";
import { disputes, disputeEvidence } from "./schema.js";

export type DisputeRow = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;

function withEvidence() {
  return { evidence: true } as const;
}

export class DisputesRepository {
  async create(
    data: NewDispute,
    evidence: { mediaAssetId: string; kind: "photo" | "video" }[],
  ): Promise<DisputeRow> {
    return db.transaction(async (tx) => {
      const [row] = await tx.insert(disputes).values(data).returning();
      if (!row) throw new Error("failed to create dispute");
      if (evidence.length > 0) {
        await tx.insert(disputeEvidence).values(evidence.map((e) => ({ disputeId: row.id, ...e })));
      }
      return row;
    });
  }

  findById(id: string) {
    return db.query.disputes.findFirst({ where: eq(disputes.id, id), with: withEvidence() });
  }

  findByOrderId(orderId: string) {
    return db.query.disputes.findFirst({ where: eq(disputes.orderId, orderId) });
  }

  listMine(customerId: string) {
    return db.query.disputes.findMany({
      where: eq(disputes.customerId, customerId),
      with: withEvidence(),
      orderBy: [desc(disputes.createdAt)],
    });
  }

  listForFulfiller(fulfillerId: string) {
    return db.query.disputes.findMany({
      where: eq(disputes.fulfillerId, fulfillerId),
      with: withEvidence(),
      orderBy: [desc(disputes.createdAt)],
    });
  }

  /** Admin queue — open or awaiting-review disputes, oldest first (BRD: "seller has 48h to respond"). */
  listQueueForAdmin() {
    return db.query.disputes.findMany({
      where: eq(disputes.status, "open"),
      with: withEvidence(),
      orderBy: [disputes.createdAt],
    });
  }

  listAwaitingAdminReview() {
    return db.query.disputes.findMany({
      where: eq(disputes.status, "seller_responded"),
      with: withEvidence(),
      orderBy: [disputes.createdAt],
    });
  }

  async recordSellerResponse(id: string, response: string): Promise<DisputeRow | undefined> {
    const [row] = await db
      .update(disputes)
      .set({
        sellerResponse: response,
        sellerRespondedAt: new Date(),
        status: "seller_responded",
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning();
    return row;
  }

  async resolve(
    id: string,
    adminId: string,
    data: {
      resolution: DisputeRow["resolution"];
      resolutionNote: string;
      refundAmount?: string;
      counterfeitConfirmed: boolean;
      falseDispute: boolean;
    },
  ): Promise<DisputeRow | undefined> {
    const [row] = await db
      .update(disputes)
      .set({
        ...data,
        status: "resolved",
        resolvedByAdminId: adminId,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(disputes.id, id))
      .returning();
    return row;
  }

  // ------------------------------------------------------------- admin stats

  async countByStatus(): Promise<{ status: DisputeRow["status"]; count: number }[]> {
    const rows = await db
      .select({ status: disputes.status, count: count() })
      .from(disputes)
      .groupBy(disputes.status);
    return rows.map((r) => ({ status: r.status, count: Number(r.count) }));
  }

  async countByResolution(): Promise<{ resolution: DisputeRow["resolution"]; count: number }[]> {
    const rows = await db
      .select({ resolution: disputes.resolution, count: count() })
      .from(disputes)
      .where(eq(disputes.status, "resolved"))
      .groupBy(disputes.resolution);
    return rows.map((r) => ({ resolution: r.resolution, count: Number(r.count) }));
  }

  async countCounterfeitConfirmed(): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(disputes)
      .where(eq(disputes.counterfeitConfirmed, true));
    return row?.value ?? 0;
  }

  async countFalseDisputes(): Promise<number> {
    const [row] = await db
      .select({ value: count() })
      .from(disputes)
      .where(eq(disputes.falseDispute, true));
    return row?.value ?? 0;
  }
}

export const disputesRepository = new DisputesRepository();
