import { ConflictError, NotFoundError, ValidationError } from "../../lib/http-errors.js";
import { eventBus } from "../../lib/events.js";
import { usersRepository } from "../users/repository.js";
import { verificationService } from "../verification/service.js";
import { settingsService } from "../settings/service.js";
import { walletRepository, type WalletRepository } from "./repository.js";
import "./events.js";

const NEW_SELLER_ORDER_THRESHOLD = 3;
const FREE_COMMISSION_WINDOW_DAYS = 30; // BRD Rule 5: "Month 1" free, relative to the account's own registration date.

export class WalletService {
  constructor(private readonly repo: WalletRepository) {}

  async getMe(userId: string) {
    const wallet = await this.repo.ensure(userId);
    return wallet;
  }

  getTransactions(userId: string) {
    return this.repo.listTransactions(userId);
  }

  /**
   * BRD Rule 5: free in the account's first month, then a role-based rate
   * (defaults 1% seller / 2% merchant, admin-configurable via
   * `commission_rules`), computed on Total Order Value — and per Rule 4,
   * charged against the deposit only, never the cash collected on delivery.
   */
  async computeCommission(
    userId: string,
    role: "seller" | "merchant",
    totalAmount: number,
  ): Promise<number> {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");

    const accountAgeDays = (Date.now() - user.createdAt.getTime()) / 86_400_000;
    if (accountAgeDays < FREE_COMMISSION_WINDOW_DAYS) return 0;

    const rate = await this.repo.currentCommissionRate(role);
    return Math.round(totalAmount * (rate / 100) * 100) / 100;
  }

  /** `amount` minus whatever commission actually applies (respects the free-first-month exemption) — used wherever Orders needs to release or reverse a net credit. */
  async netOfCommission(
    userId: string,
    role: "seller" | "merchant",
    amount: number,
  ): Promise<number> {
    const commission = await this.computeCommission(userId, role, amount);
    return amount - commission;
  }

  /**
   * Whether this seller has completed enough orders to graduate from the
   * "new seller" pending-until-completion rule to the verified 24h-release
   * fast path. See the file-level note in event handling for the interplay
   * with verification status.
   */
  async releaseTiming(
    sellerId: string,
    completedOrderCount: number,
  ): Promise<"on_completion" | "after_24h"> {
    if (completedOrderCount < NEW_SELLER_ORDER_THRESHOLD) return "on_completion";
    const verified = await verificationService.isAccountVerified(sellerId);
    return verified ? "after_24h" : "on_completion";
  }

  /** Deposit paid: credit the seller's pending balance, then charge commission separately (not netted). */
  async creditDepositAndChargeCommission(
    sellerId: string,
    role: "seller" | "merchant",
    orderId: string,
    depositAmount: number,
  ): Promise<void> {
    await this.repo.applyTransaction(
      sellerId,
      "deposit_credit",
      depositAmount,
      `Deposit received for order ${orderId}`,
      orderId,
      "pending",
    );
    eventBus.publish("wallet.credited", {
      userId: sellerId,
      amount: depositAmount.toFixed(2),
      orderId,
    });

    const commission = await this.computeCommission(sellerId, role, depositAmount);
    if (commission > 0) {
      await this.repo.applyTransaction(
        sellerId,
        "commission_charge",
        -commission,
        `Commission on order ${orderId}`,
        orderId,
        "pending",
      );
      eventBus.publish("commission.charged", {
        userId: sellerId,
        orderId,
        amount: commission.toFixed(2),
      });
    }
  }

  async releasePendingToAvailable(
    sellerId: string,
    amount: number,
    orderId: string,
  ): Promise<void> {
    await this.repo.releasePendingToAvailable(sellerId, amount, orderId);
    eventBus.publish("wallet.balance_released", {
      userId: sellerId,
      amount: amount.toFixed(2),
      orderId,
    });
  }

  /**
   * Seller cancellation / dispute-resolved-for-customer: reverse the
   * fulfiller's net credit (deposit minus commission already charged).
   * `fromBalance` must match where the money actually sits — `"pending"`
   * for an order that hasn't been released yet (the only case for
   * cancellation, since that only happens pre-delivery), or `"available"`
   * for a dispute resolved after the on-completion release already moved
   * it — debiting the wrong bucket would either under-reverse or trip the
   * non-negative CHECK constraint on the other one.
   */
  async reverseCredit(
    sellerId: string,
    orderId: string,
    netAmount: number,
    description: string,
    fromBalance: "pending" | "available" = "pending",
  ): Promise<void> {
    await this.repo.applyTransaction(
      sellerId,
      "refund_reversal",
      -netAmount,
      description,
      orderId,
      fromBalance,
    );
  }

  async requestWithdrawal(userId: string, amount: number) {
    const wallet = await this.repo.ensure(userId);
    if (amount <= 0) throw new ValidationError("Withdrawal amount must be positive");
    const minWithdrawalAmount = await settingsService.get("minWithdrawalAmount");
    if (amount < minWithdrawalAmount)
      throw new ValidationError(`Minimum withdrawal amount is ${minWithdrawalAmount} EGP`);
    if (Number(wallet.availableBalance) < amount)
      throw new ConflictError("Insufficient available balance");

    const request = await this.repo.createWithdrawalRequest(userId, amount.toFixed(2));
    // Reserve the funds immediately so a second request can't double-spend
    // the same available balance while this one is pending admin review.
    await this.repo.applyTransaction(
      userId,
      "withdrawal",
      -amount,
      `Withdrawal request ${request.id}`,
      undefined,
      "available",
    );
    eventBus.publish("withdrawal.requested", {
      withdrawalId: request.id,
      userId,
      amount: amount.toFixed(2),
    });
    return request;
  }

  listWithdrawals(userId: string) {
    return this.repo.listWithdrawalsForWallet(userId);
  }

  // ------------------------------------------------------------- admin

  /**
   * Adds a new versioned commission rate, effective immediately — never
   * edits an existing row (BRD Rule 5: rate changes need "prior notification
   * to all users", which requires the *previous* rate to stay
   * reconstructable for orders already in flight; see the schema comment).
   */
  setCommissionRate(role: "seller" | "merchant", percentage: number) {
    return this.repo.seedDefaultCommissionRule(role, percentage, new Date());
  }

  async currentCommissionRates(): Promise<{ role: "seller" | "merchant"; percentage: number }[]> {
    const [sellerRate, merchantRate] = await Promise.all([
      this.repo.currentCommissionRate("seller"),
      this.repo.currentCommissionRate("merchant"),
    ]);
    return [
      { role: "seller", percentage: sellerRate },
      { role: "merchant", percentage: merchantRate },
    ];
  }

  listPendingWithdrawals() {
    return this.repo.listPendingWithdrawals();
  }

  async processWithdrawal(withdrawalId: string, approve: boolean) {
    const withdrawal = await this.repo.findWithdrawalById(withdrawalId);
    if (!withdrawal) throw new NotFoundError("Withdrawal request not found");
    if (withdrawal.status !== "pending")
      throw new ConflictError("This withdrawal has already been processed");

    if (!approve) {
      // Rejected — return the reserved funds to available balance.
      await this.repo.applyTransaction(
        withdrawal.walletId,
        "withdrawal",
        Number(withdrawal.amount),
        `Withdrawal ${withdrawalId} rejected — funds returned`,
        undefined,
        "available",
      );
    }
    const updated = await this.repo.setWithdrawalStatus(
      withdrawalId,
      approve ? "processed" : "rejected",
    );
    if (!updated) throw new NotFoundError("Withdrawal request not found");
    eventBus.publish("withdrawal.processed", {
      withdrawalId,
      userId: withdrawal.walletId,
      status: updated.status as "processed" | "rejected",
    });
    return updated;
  }
}

export const walletService = new WalletService(walletRepository);
