import type { ReactNode } from "react";

/**
 * Designed empty state (visual-polish spec §9.8): a soft icon medallion, a
 * primary-text headline, a secondary-text explanation, and — ideally — a CTA
 * pointing at the next step. `icon` should be one of the shared `icons.tsx`
 * glyphs so the weight matches the rest of the app.
 */
export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-16 text-center">
      {icon && (
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          <span className="h-7 w-7">{icon}</span>
        </span>
      )}
      <p className="font-display text-base font-semibold text-neutral-900">{title}</p>
      {hint && <p className="max-w-sm text-sm leading-relaxed text-neutral-600">{hint}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
