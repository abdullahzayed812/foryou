import { isAxiosError } from "axios";
import type { ApiErrorBody, ErrorCode } from "@foryou/shared";

export class ApiError extends Error {
  readonly code: ErrorCode | string;
  readonly status: number;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode | string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalizes any thrown error into an ApiError so the rest of the app (forms,
 * toasts) only ever switches on `error.code` — the stable contract from
 * architecture doc §04 — never on a parsed HTTP status or message string.
 */
export function toApiError(err: unknown): ApiError {
  if (err instanceof ApiError) return err;
  if (isAxiosError<ApiErrorBody>(err)) {
    const body = err.response?.data;
    if (body?.error) {
      return new ApiError(
        err.response?.status ?? 0,
        body.error.code,
        body.error.message,
        body.error.details,
      );
    }
    return new ApiError(err.response?.status ?? 0, "NETWORK_ERROR", err.message);
  }
  return new ApiError(0, "UNKNOWN", err instanceof Error ? err.message : "Unknown error");
}
