import { useId } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

/** Accessible on/off switch — `role="switch"` with a real focusable button, RTL-aware knob travel. */
export function Toggle({ checked, onChange, label, description, disabled }: ToggleProps) {
  const labelId = useId();
  const descId = description ? `${labelId}-desc` : undefined;

  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p id={labelId} className="text-sm font-medium text-neutral-900">
          {label}
        </p>
        {description && (
          <p id={descId} className="mt-0.5 text-xs text-neutral-500">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={descId}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full outline-none transition-colors duration-150 focus-visible:ring-4 focus-visible:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-brand-600" : "bg-neutral-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 rounded-full bg-white shadow-soft transition-transform duration-150 ${
            checked
              ? "translate-x-5 rtl:-translate-x-5"
              : "translate-x-0.5 rtl:-translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
