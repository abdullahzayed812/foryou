import { z } from "zod";
import {
  customerProfileFieldsSchema,
  sellerProfileFieldsSchema,
  merchantProfileFieldsSchema,
} from "./users.js";

export const emailSchema = z.email();
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const registerCustomerSchema = z
  .object({ email: emailSchema, password: passwordSchema })
  .extend(customerProfileFieldsSchema.shape)
  .strict();
export type RegisterCustomerInput = z.infer<typeof registerCustomerSchema>;

export const registerSellerSchema = z
  .object({ email: emailSchema, password: passwordSchema })
  .extend(sellerProfileFieldsSchema.shape)
  .strict();
export type RegisterSellerInput = z.infer<typeof registerSellerSchema>;

export const registerMerchantSchema = z
  .object({ email: emailSchema, password: passwordSchema })
  .extend(merchantProfileFieldsSchema.shape)
  .strict();
export type RegisterMerchantInput = z.infer<typeof registerMerchantSchema>;

export const verifyOtpSchema = z
  .object({ email: emailSchema, code: z.string().length(6) })
  .strict();
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const resendOtpSchema = z.object({ email: emailSchema }).strict();
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1) }).strict();
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({ email: emailSchema }).strict();
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({ token: z.string().min(1), newPassword: passwordSchema })
  .strict();
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const changePasswordSchema = z
  .object({ currentPassword: z.string().min(1), newPassword: passwordSchema })
  .strict();
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
