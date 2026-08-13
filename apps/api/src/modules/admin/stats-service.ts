import { usersService } from "../users/service.js";
import { ordersRepository } from "../orders/repository.js";
import { disputesRepository } from "../disputes/repository.js";
import { walletRepository } from "../wallet/repository.js";
import { reviewsRepository } from "../reviews/repository.js";

/**
 * Composes read-only aggregates from across the modules this session
 * needs — no schema of its own, no writes. BRD Rule 8 explicitly calls out
 * "Dispute statistics: admin-only," which this generalizes to a full
 * platform dashboard rather than a one-off endpoint.
 */
export class AdminStatsService {
  async getPlatformStats() {
    const [
      usersByRole,
      usersByStatus,
      ordersByStage,
      completedGMV,
      disputesByStatus,
      disputesByResolution,
      counterfeitConfirmedCount,
      falseDisputeCount,
      walletBalances,
      pendingWithdrawals,
      reviewStats,
    ] = await Promise.all([
      usersService.countByRole(),
      usersService.countByStatus(),
      ordersRepository.countByStage(),
      ordersRepository.completedGMV(),
      disputesRepository.countByStatus(),
      disputesRepository.countByResolution(),
      disputesRepository.countCounterfeitConfirmed(),
      disputesRepository.countFalseDisputes(),
      walletRepository.platformBalances(),
      walletRepository.pendingWithdrawalsTotal(),
      reviewsRepository.platformStats(),
    ]);

    return {
      users: { byRole: usersByRole, byStatus: usersByStatus },
      orders: { byStage: ordersByStage, completedGMV },
      disputes: {
        byStatus: disputesByStatus,
        byResolution: disputesByResolution,
        counterfeitConfirmedCount,
        falseDisputeCount,
      },
      wallet: { platformBalances: walletBalances, pendingWithdrawals },
      reviews: reviewStats,
    };
  }
}

export const adminStatsService = new AdminStatsService();
