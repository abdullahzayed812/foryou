import { Router, type Request, type Response } from "express";
import {
  registerCustomerSchema,
  registerSellerSchema,
  registerMerchantSchema,
  verifyOtpSchema,
  resendOtpSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
} from "./dto.js";
import { authService } from "./service.js";
import { requireAuth } from "./middleware.js";
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from "./cookies.js";
import { redisRateLimit } from "../../middleware/rate-limit.js";
import { TokenInvalidError, UnauthenticatedError } from "../../lib/http-errors.js";
import type { TokenPair } from "./service.js";

export const authRouter = Router();

function requestMeta(req: Request) {
  return { userAgent: req.headers["user-agent"], ipAddress: req.ip };
}

function respondWithTokens(res: Response, tokens: TokenPair, extra: Record<string, unknown> = {}) {
  setRefreshCookie(res, tokens.refreshToken, tokens.refreshTokenExpiresAt);
  res.json({ accessToken: tokens.accessToken, ...extra });
}

const authLimiter = redisRateLimit({ windowMs: 60_000, limit: 10, keyPrefix: "auth" });
const otpLimiter = redisRateLimit({ windowMs: 60_000, limit: 5, keyPrefix: "otp" });

authRouter.post("/register/customer", authLimiter, async (req, res) => {
  const input = registerCustomerSchema.parse(req.body);
  const result = await authService.registerCustomer(input);
  res.status(201).json(result);
});

authRouter.post("/register/seller", authLimiter, async (req, res) => {
  const input = registerSellerSchema.parse(req.body);
  const result = await authService.registerSeller(input);
  res.status(201).json(result);
});

authRouter.post("/register/merchant", authLimiter, async (req, res) => {
  const input = registerMerchantSchema.parse(req.body);
  const result = await authService.registerMerchant(input);
  res.status(201).json(result);
});

authRouter.post("/otp/verify", otpLimiter, async (req, res) => {
  const input = verifyOtpSchema.parse(req.body);
  const { accessToken, refreshToken, refreshTokenExpiresAt } = await authService.verifyOtp(
    input.email,
    input.code,
    requestMeta(req),
  );
  respondWithTokens(res, { accessToken, refreshToken, refreshTokenExpiresAt });
});

authRouter.post("/otp/resend", otpLimiter, async (req, res) => {
  const input = resendOtpSchema.parse(req.body);
  await authService.resendOtp(input.email);
  res.status(202).json({ message: "If that email needs verification, a new code has been sent." });
});

authRouter.post("/login", authLimiter, async (req, res) => {
  const input = loginSchema.parse(req.body);
  const tokens = await authService.login(input, requestMeta(req));
  respondWithTokens(res, tokens);
});

authRouter.post("/refresh", async (req, res) => {
  const presented = getRefreshCookie(req);
  if (!presented) throw new TokenInvalidError("No refresh token presented");
  const tokens = await authService.refresh(presented, requestMeta(req));
  respondWithTokens(res, tokens);
});

authRouter.post("/logout", async (req, res) => {
  const presented = getRefreshCookie(req);
  if (presented) await authService.logout(presented);
  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.post("/logout-all", requireAuth, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  await authService.logoutAllDevices(req.user.id);
  clearRefreshCookie(res);
  res.status(204).send();
});

authRouter.post("/password/forgot", authLimiter, async (req, res) => {
  const input = forgotPasswordSchema.parse(req.body);
  await authService.forgotPassword(input.email);
  res.status(202).json({ message: "If that email exists, a reset link has been sent." });
});

authRouter.post("/password/reset", authLimiter, async (req, res) => {
  const input = resetPasswordSchema.parse(req.body);
  await authService.resetPassword(input.token, input.newPassword);
  res.status(204).send();
});

authRouter.post("/password/change", requireAuth, async (req, res) => {
  if (!req.user) throw new UnauthenticatedError();
  const input = changePasswordSchema.parse(req.body);
  await authService.changePassword(req.user.id, input.currentPassword, input.newPassword);
  res.status(204).send();
});
