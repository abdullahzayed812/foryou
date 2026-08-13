export interface OtpRequestedPayload {
  userId: string;
  email: string;
}

export interface OtpVerifiedPayload {
  userId: string;
}

export interface LoginFailedPayload {
  email: string;
  ipAddress?: string;
}

export interface TokenRefreshedPayload {
  userId: string;
}

export interface PasswordResetRequestedPayload {
  userId: string;
  email: string;
}

declare module "../../lib/events.js" {
  interface EventMap {
    "otp.requested": OtpRequestedPayload;
    "otp.verified": OtpVerifiedPayload;
    "login.failed": LoginFailedPayload;
    "token.refreshed": TokenRefreshedPayload;
    "password_reset.requested": PasswordResetRequestedPayload;
  }
}
