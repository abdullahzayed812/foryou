import { pgTable, uuid, numeric, text, timestamp, pgEnum, index, check } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "../users/schema.js";

export const walletTransactionTypeEnum = pgEnum("wallet_transaction_type", [
  "deposit_credit", // deposit paid -> pending balance
  "balance_release", // pending -> available (24h verified / 3-orders new-seller rule)
  "commission_charge",
  "withdrawal",
  "refund_reversal", // deposit refunded to customer -> reverse the seller's credit
]);

export const withdrawalStatusEnum = pgEnum("withdrawal_status", [
  "pending",
  "processed",
  "rejected",
]);

export const wallets = pgTable(
  "wallets",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    pendingBalance: numeric("pending_balance", { precision: 10, scale: 2 }).notNull().default("0"),
    availableBalance: numeric("available_balance", { precision: 10, scale: 2 })
      .notNull()
      .default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("wallets_pending_non_negative", sql`${table.pendingBalance} >= 0`),
    check("wallets_available_non_negative", sql`${table.availableBalance} >= 0`),
  ],
);

/** Immutable ledger — every credit/debit, never updated after insert (architecture doc §03). */
export const walletTransactions = pgTable(
  "wallet_transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.userId, { onDelete: "cascade" }),
    type: walletTransactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(), // signed
    orderId: uuid("order_id"),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("wallet_transactions_wallet_id_idx").on(table.walletId, table.createdAt)],
);

export const withdrawalRequests = pgTable(
  "withdrawal_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    walletId: uuid("wallet_id")
      .notNull()
      .references(() => wallets.userId, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    status: withdrawalStatusEnum("status").notNull().default("pending"),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("withdrawal_requests_wallet_id_idx").on(table.walletId, table.status)],
);

/**
 * Versioned, never edited in place (architecture doc §03) — "changes require
 * prior notification to all users" (BRD Rule 5) means the *previous* rate
 * must stay reconstructable for orders already in flight when a rate change
 * takes effect, not just the current one.
 */
export const commissionRules = pgTable("commission_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  role: text("role", { enum: ["seller", "merchant"] }).notNull(),
  percentage: numeric("percentage", { precision: 5, scale: 2 }).notNull(),
  effectiveFrom: timestamp("effective_from", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
