// Validation lives in @foryou/shared so the API and the web app validate
// against the exact same Zod schemas — see architecture doc §10 "Forms".
export {
  registerCustomerSchema,
  type RegisterCustomerInput,
  registerSellerSchema,
  type RegisterSellerInput,
  registerMerchantSchema,
  type RegisterMerchantInput,
  verifyOtpSchema,
  type VerifyOtpInput,
  resendOtpSchema,
  type ResendOtpInput,
  loginSchema,
  type LoginInput,
  forgotPasswordSchema,
  type ForgotPasswordInput,
  resetPasswordSchema,
  type ResetPasswordInput,
  changePasswordSchema,
  type ChangePasswordInput,
} from "@foryou/shared";
