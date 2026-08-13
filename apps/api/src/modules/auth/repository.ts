import { eq, and, gt, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { refreshTokens, otpCodes, passwordResetTokens, loginAttempts } from "./schema.js";
import type { otpPurposeEnum } from "./schema.js";

type OtpPurpose = (typeof otpPurposeEnum.enumValues)[number];

export class AuthRepository {
  // ---- refresh tokens ----

  async createRefreshToken(data: {
    userId: string;
    family: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }) {
    const [row] = await db.insert(refreshTokens).values(data).returning();
    return row;
  }

  findActiveRefreshTokenByHash(tokenHash: string) {
    return db.query.refreshTokens.findFirst({
      where: and(
        eq(refreshTokens.tokenHash, tokenHash),
        isNull(refreshTokens.revokedAt),
        gt(refreshTokens.expiresAt, new Date()),
      ),
    });
  }

  findAnyRefreshTokenByHash(tokenHash: string) {
    return db.query.refreshTokens.findFirst({ where: eq(refreshTokens.tokenHash, tokenHash) });
  }

  async revokeRefreshToken(id: string): Promise<void> {
    await db.update(refreshTokens).set({ revokedAt: new Date() }).where(eq(refreshTokens.id, id));
  }

  /** Theft-detection: a revoked token being presented again nukes every token in its family. */
  async revokeFamily(family: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.family, family), isNull(refreshTokens.revokedAt)));
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)));
  }

  // ---- OTP ----

  async createOtp(data: {
    userId: string;
    purpose: OtpPurpose;
    codeHash: string;
    expiresAt: Date;
  }) {
    const [row] = await db.insert(otpCodes).values(data).returning();
    return row;
  }

  findLatestActiveOtp(userId: string, purpose: OtpPurpose) {
    return db.query.otpCodes.findFirst({
      where: and(
        eq(otpCodes.userId, userId),
        eq(otpCodes.purpose, purpose),
        isNull(otpCodes.consumedAt),
        gt(otpCodes.expiresAt, new Date()),
      ),
      orderBy: (t, { desc }) => [desc(t.createdAt)],
    });
  }

  async incrementOtpAttempts(id: string): Promise<void> {
    await db
      .update(otpCodes)
      .set({ attempts: sql`${otpCodes.attempts} + 1` })
      .where(eq(otpCodes.id, id));
  }

  async consumeOtp(id: string): Promise<void> {
    await db.update(otpCodes).set({ consumedAt: new Date() }).where(eq(otpCodes.id, id));
  }

  // ---- password reset ----

  async createPasswordResetToken(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    const [row] = await db.insert(passwordResetTokens).values(data).returning();
    return row;
  }

  findActivePasswordResetToken(tokenHash: string) {
    return db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, tokenHash),
        isNull(passwordResetTokens.usedAt),
        gt(passwordResetTokens.expiresAt, new Date()),
      ),
    });
  }

  async consumePasswordResetToken(id: string): Promise<void> {
    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  // ---- login attempts (audit trail; Redis is the fast enforcement path) ----

  async recordLoginAttempt(data: {
    email: string;
    ipAddress?: string;
    success: boolean;
  }): Promise<void> {
    await db.insert(loginAttempts).values(data);
  }
}

export const authRepository = new AuthRepository();
