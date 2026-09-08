import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * The project has exactly four button treatments (visual-polish spec §9.6):
   * - `primary`   — the one gold CTA per screen (filled `--color-accent`, dark text)
   * - `secondary` — teal-outlined, for the next-most-important action
   * - `ghost`     — text-only, for low-priority actions
   * - `danger`    — error-outlined, for destructive actions (cancel/reject/suspend)
   */
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  /** Defaults to true. Use `false` for an inline/content-sized button instead
   * of a `className="w-auto"` override — Tailwind doesn't guarantee a
   * caller's utility class beats a base class of equal specificity based on
   * JSX order, only on each utility's position in the generated stylesheet,
   * so `w-auto` in `className` used to silently lose to this component's
   * own `w-full` in some places. */
  fullWidth?: boolean;
  children: ReactNode;
}

const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  // Dark text on gold — white on `--color-accent` (#E8A33D) fails WCAG AA
  // (~1.9:1); `--color-text-primary` on it is ~8.7:1.
  primary:
    "bg-accent-500 text-neutral-900 shadow-soft hover:bg-accent-600 hover:shadow-glow focus-visible:outline-accent-600",
  secondary:
    "bg-white text-brand-700 border border-brand-600 shadow-soft hover:bg-brand-50 focus-visible:outline-brand-600",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-500",
  danger:
    "bg-white text-danger-600 border border-danger-500 shadow-soft hover:bg-danger-50 focus-visible:outline-danger-500",
};

export function Button({
  variant = "primary",
  loading,
  disabled,
  fullWidth = true,
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 ${fullWidth ? "w-full" : ""} ${variantClasses[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
}
