import type { ReactNode } from "react";

const TONES = {
  neutral: "bg-neutral-100 text-neutral-700 ring-1 ring-inset ring-neutral-200/80",
  brand: "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-200/70",
  success: "bg-success-50 text-success-700 ring-1 ring-inset ring-success-200/70",
  warning: "bg-warning-50 text-warning-700 ring-1 ring-inset ring-warning-200/70",
  danger: "bg-danger-50 text-danger-700 ring-1 ring-inset ring-danger-200/70",
} as const;

export function Badge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: keyof typeof TONES;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}
