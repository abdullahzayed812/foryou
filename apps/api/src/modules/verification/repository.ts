import { eq, and, inArray, desc } from "drizzle-orm";
import { db } from "../../db/index.js";
import { verificationRequests, verificationDocuments } from "./schema.js";

export type VerificationRequestRow = typeof verificationRequests.$inferSelect;
const LIVE_STATUSES = ["pending", "more_docs_needed"] as const;

export class VerificationRepository {
  findLiveRequest(userId: string, type: VerificationRequestRow["type"]) {
    return db.query.verificationRequests.findFirst({
      where: and(
        eq(verificationRequests.userId, userId),
        eq(verificationRequests.type, type),
        inArray(verificationRequests.status, LIVE_STATUSES),
      ),
    });
  }

  findApprovedRequest(userId: string, type: VerificationRequestRow["type"]) {
    return db.query.verificationRequests.findFirst({
      where: and(
        eq(verificationRequests.userId, userId),
        eq(verificationRequests.type, type),
        eq(verificationRequests.status, "approved"),
      ),
    });
  }

  latestForUser(userId: string) {
    return db.query.verificationRequests.findMany({
      where: eq(verificationRequests.userId, userId),
      orderBy: [desc(verificationRequests.createdAt)],
    });
  }

  async create(data: {
    userId: string;
    type: VerificationRequestRow["type"];
  }): Promise<VerificationRequestRow> {
    const [row] = await db.insert(verificationRequests).values(data).returning();
    if (!row) throw new Error("failed to create verification request");
    return row;
  }

  findById(id: string) {
    return db.query.verificationRequests.findFirst({
      where: eq(verificationRequests.id, id),
      with: { documents: true },
    });
  }

  async addDocuments(
    verificationRequestId: string,
    docs: {
      mediaAssetId: string;
      documentType: (typeof verificationDocuments.$inferInsert)["documentType"];
    }[],
  ): Promise<void> {
    if (docs.length === 0) return;
    await db
      .insert(verificationDocuments)
      .values(docs.map((d) => ({ verificationRequestId, ...d })));
  }

  async setStatus(
    id: string,
    status: VerificationRequestRow["status"],
    data: { reviewedBy?: string; rejectionReason?: string } = {},
  ): Promise<VerificationRequestRow> {
    const [row] = await db
      .update(verificationRequests)
      .set({ status, reviewedAt: new Date(), updatedAt: new Date(), ...data })
      .where(eq(verificationRequests.id, id))
      .returning();
    if (!row) throw new Error("verification request not found");
    return row;
  }

  queue(status: VerificationRequestRow["status"] = "pending") {
    return db.query.verificationRequests.findMany({
      where: eq(verificationRequests.status, status),
      orderBy: [verificationRequests.createdAt],
      with: { documents: true },
    });
  }
}

export const verificationRepository = new VerificationRepository();
