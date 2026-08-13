export function Spinner({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className}`} role="status" aria-label="Loading">
      <span className="absolute inset-0 rounded-full border-2 border-brand-100" />
      <span className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-brand-600 border-r-accent-500" />
    </span>
  );
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <Spinner className="h-8 w-8" />
    </div>
  );
}
