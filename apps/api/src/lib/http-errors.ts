import { ERROR_CODES, type ErrorCode } from "@foryou/shared";

/**
 * Every thrown business error should be (or extend) AppError so the central
 * error-handling middleware (middleware/error-handler.ts) can turn it into
 * the stable `{ error: { code, message, details } }` envelope from the API
 * design doc, instead of leaking a raw stack trace to the client.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: ErrorCode | string;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode | string, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message = "Validation failed", details?: unknown) {
    super(422, ERROR_CODES.VALIDATION_FAILED, message, details);
  }
}

export class UnauthenticatedError extends AppError {
  constructor(message = "Authentication required") {
    super(401, ERROR_CODES.UNAUTHENTICATED, message);
  }
}

export class InvalidCredentialsError extends AppError {
  constructor(message = "Invalid email or password") {
    super(401, ERROR_CODES.INVALID_CREDENTIALS, message);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message = "Token has expired") {
    super(401, ERROR_CODES.TOKEN_EXPIRED, message);
  }
}

export class TokenInvalidError extends AppError {
  constructor(message = "Token is invalid") {
    super(401, ERROR_CODES.TOKEN_INVALID, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, ERROR_CODES.FORBIDDEN, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(404, ERROR_CODES.NOT_FOUND, message);
  }
}

export class ConflictError extends AppError {
  constructor(message = "Resource conflict", details?: unknown) {
    super(409, ERROR_CODES.CONFLICT, message, details);
  }
}

export class RateLimitedError extends AppError {
  constructor(message = "Too many requests") {
    super(429, ERROR_CODES.RATE_LIMITED, message);
  }
}

export class AccountSuspendedError extends AppError {
  constructor(message = "This account has been suspended") {
    super(403, ERROR_CODES.ACCOUNT_SUSPENDED, message);
  }
}

export class EmailNotVerifiedError extends AppError {
  constructor(message = "Please verify your email before logging in") {
    super(403, ERROR_CODES.EMAIL_NOT_VERIFIED, message);
  }
}

export class OtpInvalidError extends AppError {
  constructor(message = "Invalid verification code") {
    super(400, ERROR_CODES.OTP_INVALID, message);
  }
}

export class OtpExpiredError extends AppError {
  constructor(message = "Verification code has expired — request a new one") {
    super(400, ERROR_CODES.OTP_EXPIRED, message);
  }
}
