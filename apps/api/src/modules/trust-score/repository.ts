import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { trustScores, trustScoreEvents } from "./schema.js";

export type TrustScoreRow = typeof trustScores.$inferSelect;

export class TrustScoreRepository {
  findByUserId(userId: string) {
    return db.query.trustScores.findFirst({ where: eq(trustScores.userId, userId) });
  }

  async initialize(userId: string): Promise<TrustScoreRow> {
    const [row] = await db.insert(trustScores).values({ userId }).onConflictDoNothing().returning();
    return row ?? (await this.findByUserId(userId))!;
  }

  /**
   * Clamps to [0, 100] and records the ledger entry in one transaction so the
   * cached `score` on trust_scores can never drift from the sum of its
   * trust_score_events history.
   */
  async applyDelta(
    userId: string,
    delta: number,
    reason: string,
    sourceEvent: string,
  ): Promise<TrustScoreRow> {
    return db.transaction(async (tx) => {
      const [existing] = await tx
        .insert(trustScores)
        .values({ userId })
        .onConflictDoNothing()
        .returning();
      const current =
        existing ??
        (await tx.query.trustScores.findFirst({ where: eq(trustScores.userId, userId) }))!;

      const nextScore = Math.min(100, Math.max(0, current.score + delta));
      const appliedDelta = nextScore - current.score;

      const [updated] = await tx
        .update(trustScores)
        .set({ score: nextScore, updatedAt: new Date() })
        .where(eq(trustScores.userId, userId))
        .returning();

      await tx.insert(trustScoreEvents).values({
        userId,
        delta: appliedDelta,
        scoreAfter: nextScore,
        reason,
        sourceEvent,
      });

      return updated!;
    });
  }

  history(userId: string, limit = 50) {
    return db.query.trustScoreEvents.findMany({
      where: eq(trustScoreEvents.userId, userId),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
      limit,
    });
  }
}

export const trustScoreRepository = new TrustScoreRepository();
