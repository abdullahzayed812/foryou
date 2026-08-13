import type { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-neutral-200/70 bg-white p-6 shadow-soft sm:p-8 ${className}`}
    >
      {children}
    </div>
  );
}
