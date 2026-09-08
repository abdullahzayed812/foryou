import type { ReactNode } from "react";

/**
 * The one canonical page title block (visual-polish spec §9.3 / §9.4):
 * `font-display` H1 in `--color-text-primary`, an optional description in
 * `--color-text-secondary`, and an optional actions slot (put the single
 * primary CTA here). Keeps hierarchy and spacing identical on every page.
 */
export function PageHeader({
  title,
  subtitle,
  actions,
  align = "start",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  align?: "start" | "center";
}) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-3 ${
        align === "center" ? "flex-col items-center text-center" : ""
      }`}
    >
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-bold tracking-tight text-neutral-900">{title}</h1>
        {subtitle && (
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
