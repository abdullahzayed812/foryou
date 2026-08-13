import type { Role } from "@foryou/shared";
import { env } from "../../config/env.js";
import { eventBus } from "../../lib/events.js";
import { sendMail, otpEmailHtml } from "../../lib/mailer.js";
import {
  ConflictError,
  InvalidCredentialsError,
  EmailNotVerifiedError,
  AccountSuspendedError,
  OtpInvalidError,
  OtpExpiredError,
  TokenInvalidError,
  NotFoundError,
} from "../../lib/http-errors.js";
import { usersRepository, type UsersRepository, type UserRow } from "../users/repository.js";
import { authRepository, type AuthRepository } from "./repository.js";
import { hashPassword, verifyPassword } from "./password.js";
import { signAccessToken } from "./jwt.js";
import { generateRefreshToken, rotateRefreshToken, hashRefreshToken } from "./refresh-token.js";
import { generateOtpCode, hashOtpCode, OTP_TTL_MINUTES, OTP_MAX_ATTEMPTS } from "./otp.js";
import { randomBytes, createHash } from "node:crypto";
import "./events.js";
import "../users/events.js";
import type {
  RegisterCustomerInput,
  RegisterSellerInput,
  RegisterMerchantInput,
  LoginInput,
} from "./dto.js";

export interface RequestMeta {
  userAgent?: string;
  ipAddress?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshTokenExpiresAt: Date;
}

const PASSWORD_RESET_TTL_MINUTES = 30;

export class AuthService {
  constructor(
    private readonly authRepo: AuthRepository,
    private readonly usersRepo: UsersRepository,
  ) {}

  // ---------------------------------------------------------------- register

  async registerCustomer(input: RegisterCustomerInput) {
    const { email, password, ...profile } = input;
    const user = await this.createAccount(email, password, "customer");
    await this.usersRepo.createCustomerProfile({ userId: user.id, ...profile });
    await this.issueAndSendOtp(user);
    eventBus.publish("user.registered", { userId: user.id, email: user.email, role: "customer" });
    return { userId: user.id, email: user.email };
  }

  async registerSeller(input: RegisterSellerInput) {
    const { email, password, ...profile } = input;
    const user = await this.createAccount(email, password, "seller");
    await this.usersRepo.createSellerProfile({ userId: user.id, ...profile });
    await this.issueAndSendOtp(user);
    eventBus.publish("user.registered", { userId: user.id, email: user.email, role: "seller" });
    return { userId: user.id, email: user.email };
  }

  async registerMerchant(input: RegisterMerchantInput) {
    const { email, password, ...profile } = input;
    const user = await this.createAccount(email, password, "merchant");
    await this.usersRepo.createMerchantProfile({ userId: user.id, ...profile });
    await this.issueAndSendOtp(user);
    eventBus.publish("user.registered", { userId: user.id, email: user.email, role: "merchant" });
    return { userId: user.id, email: user.email };
  }

  private async createAccount(email: string, password: string, role: Role): Promise<UserRow> {
    const existing = await this.usersRepo.findByEmail(email);
    if (existing) throw new ConflictError("An account with this email already exists");
    const passwordHash = await hashPassword(password);
    const user = await this.usersRepo.createUser({ email, passwordHash });
    await this.usersRepo.addRole(user.id, role);
    return user;
  }

  // -------------------------------------------------------------------- OTP

  private async issueAndSendOtp(user: UserRow): Promise<void> {
    const code = generateOtpCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);
    await this.authRepo.createOtp({
      userId: user.id,
      purpose: "register",
      codeHash: hashOtpCode(code),
      expiresAt,
    });
    eventBus.publish("otp.requested", { userId: user.id, email: user.email });
    await sendMail(user.email, "Your FOR YOU verification code", otpEmailHtml(code));
  }

  async resendOtp(email: string): Promise<void> {
    const user = await this.usersRepo.findByEmail(email);
    // Deliberately no error on unknown email — otherwise this endpoint becomes
    // an account-existence oracle. Silently no-op instead.
    if (!user || user.emailVerifiedAt) return;
    await this.issueAndSendOtp(user);
  }

  async verifyOtp(
    email: string,
    code: string,
    meta: RequestMeta,
  ): Promise<TokenPair & { userId: string }> {
    const user = await this.usersRepo.findByEmail(email);
    if (!user) throw new OtpInvalidError();

    const otp = await this.authRepo.findLatestActiveOtp(user.id, "register");
    if (!otp) throw new OtpExpiredError();
    if (otp.attempts >= OTP_MAX_ATTEMPTS)
      throw new OtpInvalidError("Too many attempts — request a new code");

    if (otp.codeHash !== hashOtpCode(code)) {
      await this.authRepo.incrementOtpAttempts(otp.id);
      throw new OtpInvalidError();
    }

    await this.authRepo.consumeOtp(otp.id);
    await this.usersRepo.markEmailVerified(user.id);
    eventBus.publish("otp.verified", { userId: user.id });

    const roles = await this.usersRepo.getRoles(user.id);
    const tokens = await this.issueTokenPair(user.id, roles, meta);
    return { userId: user.id, ...tokens };
  }

  // ------------------------------------------------------------------ login

  async login(input: LoginInput, meta: RequestMeta): Promise<TokenPair> {
    const user = await this.usersRepo.findByEmail(input.email);
    const valid = user ? await verifyPassword(user.passwordHash, input.password) : false;

    if (!user || !valid) {
      await this.authRepo.recordLoginAttempt({
        email: input.email.toLowerCase(),
        ipAddress: meta.ipAddress,
        success: false,
      });
      eventBus.publish("login.failed", { email: input.email, ipAddress: meta.ipAddress });
      throw new InvalidCredentialsError();
    }

    if (user.status !== "active") throw new AccountSuspendedError();
    if (!user.emailVerifiedAt) throw new EmailNotVerifiedError();

    await this.authRepo.recordLoginAttempt({
      email: input.email.toLowerCase(),
      ipAddress: meta.ipAddress,
      success: true,
    });

    const roles = await this.usersRepo.getRoles(user.id);
    return this.issueTokenPair(user.id, roles, meta);
  }

  // ---------------------------------------------------------------- refresh

  async refresh(presentedToken: string, meta: RequestMeta): Promise<TokenPair> {
    const tokenHash = hashRefreshToken(presentedToken);
    const row = await this.authRepo.findAnyRefreshTokenByHash(tokenHash);
    if (!row) throw new TokenInvalidError();

    if (row.revokedAt || row.expiresAt < new Date()) {
      // Presenting an already-used/expired refresh token is treated as
      // possible theft — kill the whole family, forcing a fresh login.
      await this.authRepo.revokeFamily(row.family);
      throw new TokenInvalidError("Session expired — please log in again");
    }

    await this.authRepo.revokeRefreshToken(row.id);
    const { token, hash } = rotateRefreshToken(row.family);
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000);
    await this.authRepo.createRefreshToken({
      userId: row.userId,
      family: row.family,
      tokenHash: hash,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });

    const roles = await this.usersRepo.getRoles(row.userId);
    eventBus.publish("token.refreshed", { userId: row.userId });
    const accessToken = signAccessToken({ sub: row.userId, roles });
    return { accessToken, refreshToken: token, refreshTokenExpiresAt: expiresAt };
  }

  async logout(presentedToken: string): Promise<void> {
    const tokenHash = hashRefreshToken(presentedToken);
    const row = await this.authRepo.findAnyRefreshTokenByHash(tokenHash);
    if (row && !row.revokedAt) await this.authRepo.revokeRefreshToken(row.id);
  }

  async logoutAllDevices(userId: string): Promise<void> {
    await this.authRepo.revokeAllForUser(userId);
  }

  // --------------------------------------------------------------- password

  async forgotPassword(email: string): Promise<void> {
    const user = await this.usersRepo.findByEmail(email);
    if (!user) return; // no account-existence oracle

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000);
    await this.authRepo.createPasswordResetToken({ userId: user.id, tokenHash, expiresAt });
    eventBus.publish("password_reset.requested", { userId: user.id, email: user.email });

    const resetUrl = `${env.WEB_URL}/reset-password?token=${token}`;
    await sendMail(
      user.email,
      "Reset your FOR YOU password",
      `<p>Click the link below to reset your password. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>If you didn't request this, you can ignore this email.</p>`,
    );
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const row = await this.authRepo.findActivePasswordResetToken(tokenHash);
    if (!row) throw new TokenInvalidError("This reset link is invalid or has expired");

    await this.authRepo.consumePasswordResetToken(row.id);
    const passwordHash = await hashPassword(newPassword);
    await this.usersRepo.updatePasswordHash(row.userId, passwordHash);
    // A password reset invalidates every existing session, on the assumption
    // the reset was triggered because a session/credential may be compromised.
    await this.authRepo.revokeAllForUser(row.userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepo.findById(userId);
    if (!user) throw new NotFoundError("User not found");
    const valid = await verifyPassword(user.passwordHash, currentPassword);
    if (!valid) throw new InvalidCredentialsError("Current password is incorrect");
    const passwordHash = await hashPassword(newPassword);
    await this.usersRepo.updatePasswordHash(userId, passwordHash);
  }

  // ------------------------------------------------------------------ utils

  private async issueTokenPair(
    userId: string,
    roles: Role[],
    meta: RequestMeta,
  ): Promise<TokenPair> {
    const accessToken = signAccessToken({ sub: userId, roles });
    const { token, hash, family } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000);
    await this.authRepo.createRefreshToken({
      userId,
      family,
      tokenHash: hash,
      expiresAt,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
    });
    return { accessToken, refreshToken: token, refreshTokenExpiresAt: expiresAt };
  }
}

export const authService = new AuthService(authRepository, usersRepository);
