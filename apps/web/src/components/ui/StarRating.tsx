export function StarRatingDisplay({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="flex text-warning-500" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n}>{n <= Math.round(rating) ? "★" : "☆"}</span>
        ))}
      </span>
      <span className="text-sm text-neutral-500">
        {rating.toFixed(1)}
        {count !== undefined ? ` (${count})` : ""}
      </span>
    </span>
  );
}

export function StarRatingInput({
  value,
  onChange,
  name,
}: {
  value: number;
  onChange: (rating: number) => void;
  name: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="flex gap-1 text-2xl text-warning-500">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          onClick={() => onChange(n)}
          className="leading-none transition-transform duration-100 hover:scale-110 active:scale-95"
        >
          {n <= value ? "★" : "☆"}
        </button>
      ))}
    </div>
  );
}
