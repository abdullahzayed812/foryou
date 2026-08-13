import { type ButtonHTMLAttributes, type ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
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
  primary:
    "bg-gradient-to-r from-brand-500 to-accent-500 text-white shadow-soft hover:shadow-glow hover:from-brand-600 hover:to-accent-600 focus-visible:outline-accent-500",
  secondary:
    "bg-white text-neutral-800 border border-neutral-200 shadow-soft hover:border-neutral-300 hover:bg-neutral-50 focus-visible:outline-brand-500",
  ghost: "bg-transparent text-brand-700 hover:bg-brand-50 focus-visible:outline-brand-500",
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
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold tracking-tight transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:active:scale-100 ${fullWidth ? "w-full" : ""} ${variantClasses[variant]} ${className}`}
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
