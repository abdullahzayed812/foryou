import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/lib/api-error";
import { AlertIcon } from "./icons";

const KNOWN_CODES = new Set([
  "VALIDATION_FAILED",
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "ACCOUNT_SUSPENDED",
  "MAINTENANCE_MODE",
  "INTERNAL_ERROR",
]);

/** Generic error banner for non-auth flows — falls back to the backend's own message when the code isn't one of the common cross-cutting ones. */
export function ErrorAlert({ error }: { error: unknown }) {
  const { t, i18n } = useTranslation();
  if (!error) return null;

  const apiError = error instanceof ApiError ? error : null;
  const code = apiError?.code ?? "INTERNAL_ERROR";
  const message =
    typeof code === "string" && KNOWN_CODES.has(code)
      ? t(`errors.${code}`)
      : (apiError?.message ?? t("errors.INTERNAL_ERROR"));
  // Backend messages are English-only — showing them verbatim in Arabic
  // would break localization, so fall back to the generic message instead.
  const display =
    i18n.language !== "en" && !KNOWN_CODES.has(String(code)) ? t("errors.INTERNAL_ERROR") : message;

  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm text-danger-700"
    >
      <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{display}</span>
    </div>
  );
}

export function InfoAlert({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-brand-200/70 bg-brand-50 px-4 py-3 text-sm text-brand-800">
      {children}
    </div>
  );
}
