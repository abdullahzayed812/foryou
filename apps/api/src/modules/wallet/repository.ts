import { eq, and, desc, lt, sql, sum, count } from "drizzle-orm";
import { db } from "../../db/index.js";
import { wallets, walletTransactions, withdrawalRequests, commissionRules } from "./schema.js";

export type WalletRow = typeof wallets.$inferSelect;
export type WalletTransactionType = (typeof walletTransactions.$inferInsert)["type"];

export class WalletRepository {
  async ensure(userId: string): Promise<WalletRow> {
    const [row] = await db.insert(wallets).values({ userId }).onConflictDoNothing().returning();
    return row ?? (await this.findById(userId))!;
  }

  findById(userId: string) {
    return db.query.wallets.findFirst({ where: eq(wallets.userId, userId) });
  }

  /** Every balance mutation goes through here: one transaction, one ledger row, always in sync. */
  async applyTransaction(
    walletId: string,
    type: WalletTransactionType,
    amount: number,
    description: string,
    orderId?: string,
    balance: "pending" | "available" = "pending",
  ): Promise<WalletRow> {
    return db.transaction(async (tx) => {
      await tx.insert(wallets).values({ userId: walletId }).onConflictDoNothing();

      const [updated] =
        balance === "pending"
          ? await tx
              .update(wallets)
              .set({
                pendingBalance: sql`${wallets.pendingBalance} + ${amount}`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, walletId))
              .returning()
          : await tx
              .update(wallets)
              .set({
                availableBalance: sql`${wallets.availableBalance} + ${amount}`,
                updatedAt: new Date(),
              })
              .where(eq(wallets.userId, walletId))
              .returning();
      if (!updated) throw new Error("failed to update wallet balance");

      await tx.insert(walletTransactions).values({
        walletId,
        type,
        amount: amount.toFixed(2),
        orderId,
        description,
      });

      return updated;
    });
  }

  /** Moves an amount from pending to available in one transaction (balance release). */
  async releasePendingToAvailable(
    walletId: string,
    amount: number,
    orderId: string,
  ): Promise<void> {
    await db.transaction(async (tx) => {
      await tx
        .update(wallets)
        .set({
          pendingBalance: sql`${wallets.pendingBalance} - ${amount}`,
          availableBalance: sql`${wallets.availableBalance} + ${amount}`,
          updatedAt: new Date(),
        })
        .where(eq(wallets.userId, walletId));

      await tx.insert(walletTransactions).values({
        walletId,
        type: "balance_release",
        amount: amount.toFixed(2),
        orderId,
        description: "Deposit released from pending to available balance",
      });
    });
  }

  listTransactions(walletId: string, limit = 50) {
    return db.query.walletTransactions.findMany({
      where: eq(walletTransactions.walletId, walletId),
      orderBy: [desc(walletTransactions.createdAt)],
      limit,
    });
  }

  async createWithdrawalRequest(walletId: string, amount: string) {
    const [row] = await db.insert(withdrawalRequests).values({ walletId, amount }).returning();
    if (!row) throw new Error("failed to create withdrawal request");
    return row;
  }

  listWithdrawalsForWallet(walletId: string) {
    return db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.walletId, walletId),
      orderBy: (t, { desc: d }) => [d(t.createdAt)],
    });
  }

  listPendingWithdrawals() {
    return db.query.withdrawalRequests.findMany({
      where: eq(withdrawalRequests.status, "pending"),
    });
  }

  async setWithdrawalStatus(id: string, status: "processed" | "rejected") {
    const [row] = await db
      .update(withdrawalRequests)
      .set({ status, processedAt: new Date() })
      .where(eq(withdrawalRequests.id, id))
      .returning();
    return row;
  }

  findWithdrawalById(id: string) {
    return db.query.withdrawalRequests.findFirst({ where: eq(withdrawalRequests.id, id) });
  }

  /** Latest rule effective at (or before) `at`, for the given role. */
  async currentCommissionRate(role: "seller" | "merchant", at: Date = new Date()): Promise<number> {
    const rule = await db.query.commissionRules.findFirst({
      where: and(eq(commissionRules.role, role), lt(commissionRules.effectiveFrom, at)),
      orderBy: [desc(commissionRules.effectiveFrom)],
    });
    return rule ? Number(rule.percentage) : role === "seller" ? 1 : 2; // BRD Rule 5 defaults
  }

  async seedDefaultCommissionRule(
    role: "seller" | "merchant",
    percentage: number,
    effectiveFrom: Date,
  ) {
    const [row] = await db
      .insert(commissionRules)
      .values({ role, percentage: percentage.toFixed(2), effectiveFrom })
      .returning();
    if (!row) throw new Error("failed to create commission rule");
    return row;
  }

  // ------------------------------------------------------------- admin stats

  async platformBalances(): Promise<{ pending: number; available: number }> {
    const [row] = await db
      .select({ pending: sum(wallets.pendingBalance), available: sum(wallets.availableBalance) })
      .from(wallets);
    return { pending: Number(row?.pending ?? 0), available: Number(row?.available ?? 0) };
  }

  async pendingWithdrawalsTotal(): Promise<{ count: number; total: number }> {
    const [row] = await db
      .select({ count: count(), total: sum(withdrawalRequests.amount) })
      .from(withdrawalRequests)
      .where(eq(withdrawalRequests.status, "pending"));
    return { count: row?.count ?? 0, total: Number(row?.total ?? 0) };
  }
}

export const walletRepository = new WalletRepository();
