import { forwardRef, useId, type SelectHTMLAttributes, type ReactNode } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, id, className = "", children, ...rest },
  ref,
) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-medium text-neutral-700">
        {label}
      </label>
      <select
        id={fieldId}
        ref={ref}
        aria-invalid={Boolean(error)}
        aria-describedby={[hintId, errorId].filter(Boolean).join(" ") || undefined}
        className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-neutral-900 shadow-soft transition-all duration-150 outline-none ${
          error
            ? "border-danger-400 focus:border-danger-500 focus:ring-4 focus:ring-danger-500/15"
            : "border-neutral-200 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15"
        } ${className}`}
        {...rest}
      >
        {children}
      </select>
      {hint && !error && (
        <p id={hintId} className="text-xs text-neutral-500">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="text-xs text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
});
