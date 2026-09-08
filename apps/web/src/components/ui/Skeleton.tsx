import type { ReactNode } from "react";

/**
 * Content-shaped loading placeholders (visual-polish spec §9.5 / §9.7) —
 * always prefer these over a centred `<PageSpinner />` on pages that render
 * lists, cards or media, so the page reads as "loading real content".
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-md bg-neutral-200/80 ${className}`} aria-hidden="true" />
  );
}

/** A card-shaped row matching the standard list Card (icon medallion + two text lines + trailing badge). */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-2xl border border-neutral-200/70 bg-white p-4 shadow-soft"
        >
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            <Skeleton className="h-3.5 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </div>
      ))}
    </div>
  );
}

/** A grid of product-card-shaped tiles (square media + title + price line). */
export function CardGridSkeleton({ tiles = 8 }: { tiles?: number }) {
  return (
    <div
      className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
      role="status"
      aria-label="Loading"
    >
      {Array.from({ length: tiles }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col overflow-hidden rounded-2xl border border-neutral-200/70 bg-white shadow-soft"
        >
          <Skeleton className="aspect-square w-full rounded-none" />
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3.5 w-3/4" />
            <Skeleton className="mt-1 h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A single detail-panel skeleton (heading + stacked lines), for show pages. */
export function PanelSkeleton({ lines = 4, children }: { lines?: number; children?: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-soft"
      role="status"
      aria-label="Loading"
    >
      <Skeleton className="h-5 w-1/3" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={`h-3 ${i % 2 ? "w-2/3" : "w-full"}`} />
      ))}
      {children}
    </div>
  );
}
