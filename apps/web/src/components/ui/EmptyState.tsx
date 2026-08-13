import type { ReactNode } from "react";

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-14 text-center">
      <p className="font-display text-base font-semibold text-neutral-700">{title}</p>
      {hint && <p className="max-w-sm text-sm text-neutral-500">{hint}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
