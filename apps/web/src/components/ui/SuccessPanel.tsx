import type { ReactNode } from "react";
import { CheckCircleIcon } from "./icons";

/**
 * A full visual confirmation for completed flows (visual-polish spec §9.8) —
 * a large success-coloured check, a `font-display` headline, a
 * secondary-text explanation and an optional next-step action. Use this
 * instead of a toast for "Request submitted", "Payment successful", etc.
 */
export function SuccessPanel({
  title,
  body,
  action,
}: {
  title: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-50 text-success-600">
        <CheckCircleIcon className="h-9 w-9" />
      </span>
      <h1 className="font-display text-xl font-bold text-neutral-900">{title}</h1>
      {body && <p className="max-w-sm text-sm leading-relaxed text-neutral-600">{body}</p>}
      {action && <div className="mt-3 w-full max-w-xs">{action}</div>}
    </div>
  );
}
