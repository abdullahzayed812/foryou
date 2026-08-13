import type { ReactNode } from "react";
import { Card } from "./Card";

const TONES = {
  brand: "bg-gradient-to-br from-brand-50 to-accent-50 text-brand-700",
  success: "bg-success-50 text-success-700",
  warning: "bg-warning-50 text-warning-700",
  danger: "bg-danger-50 text-danger-700",
  neutral: "bg-neutral-100 text-neutral-700",
} as const;

export function StatCard({
  icon,
  label,
  value,
  hint,
  tone = "brand",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: keyof typeof TONES;
}) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${TONES[tone]}`}
      >
        <span className="h-5 w-5">{icon}</span>
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-xs font-medium text-neutral-500">{label}</span>
        {/* Never truncate — this often renders money amounts, and clipping a
            number with an ellipsis reads as a real (wrong) value, not as cut off. */}
        <span className="font-display text-lg leading-snug font-bold break-words text-neutral-900">
          {value}
        </span>
        {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      </span>
    </Card>
  );
}
