import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api-error";
import { AlertIcon } from "./icons";

export function ErrorBanner({ error }: { error: unknown }) {
  const { t } = useTranslation();
  if (!error) return null;

  const code = error instanceof ApiError ? error.code : "INTERNAL_ERROR";
  const message = i18nHasKey(code) ? t(`auth.errors.${code}`) : t("auth.errors.INTERNAL_ERROR");

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

const KNOWN_CODES = new Set([
  "VALIDATION_FAILED",
  "INVALID_CREDENTIALS",
  "EMAIL_NOT_VERIFIED",
  "ACCOUNT_SUSPENDED",
  "CONFLICT",
  "OTP_INVALID",
  "OTP_EXPIRED",
  "RATE_LIMITED",
  "UNAUTHENTICATED",
  "INTERNAL_ERROR",
]);

function i18nHasKey(code: string): boolean {
  return KNOWN_CODES.has(code);
}
