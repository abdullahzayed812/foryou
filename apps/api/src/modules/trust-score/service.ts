import { deriveTrustLevel, type TrustLevel } from "@foryou/shared";
import { NotFoundError } from "../../lib/http-errors.js";
import { usersRepository } from "../users/repository.js";
import { trustScoreRepository, type TrustScoreRepository } from "./repository.js";

export interface TrustBadge {
  level: TrustLevel;
}

const DEFAULT_SCORE = 50;

export class TrustScoreService {
  constructor(private readonly repo: TrustScoreRepository) {}

  async ensureInitialized(userId: string): Promise<void> {
    await this.repo.initialize(userId);
  }

  /** Public-facing: badge/level only — the numeric score is admin-only (BRD Rule 2). */
  async getBadge(userId: string): Promise<TrustBadge> {
    const row = await this.repo.findByUserId(userId);
    return { level: deriveTrustLevel(row?.score ?? DEFAULT_SCORE) };
  }

  /**
   * Admin-only: the real number, per BRD "actual numeric Trust Score is
   * visible only to Administrators." Defaults to 50 when the `trust_scores`
   * row hasn't materialized yet (lazily created by the `user.registered`
   * subscriber) rather than 404ing — a score of 50 is a true invariant for
   * every account (BRD Rule 2) independent of whether that background init
   * has landed, so treating "row missing" as "not found" would just be a
   * race condition surfaced as a bug.
   */
  async getNumericForAdmin(userId: string) {
    const user = await usersRepository.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    const row = await this.repo.findByUserId(userId);
    const score = row?.score ?? DEFAULT_SCORE;
    return { userId, score, level: deriveTrustLevel(score) };
  }

  async getHistoryForAdmin(userId: string) {
    return this.repo.history(userId);
  }

  /** Applies a point delta from a domain event. Called by event subscribers as those modules land (Phases 7–9). */
  adjustScore(userId: string, delta: number, reason: string, sourceEvent: string) {
    return this.repo.applyDelta(userId, delta, reason, sourceEvent);
  }
}

export const trustScoreService = new TrustScoreService(trustScoreRepository);
