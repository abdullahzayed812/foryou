import type { CSSProperties } from "react";

/**
 * Decorative, fixed, non-interactive background for the authenticated app
 * shell — a warm gradient field, a few slow-drifting brand/accent orbs and
 * a sparse rising-particle layer. Everything here is `aria-hidden` and
 * `pointer-events-none`; `prefers-reduced-motion` (handled globally in
 * index.css) freezes the motion to a static, still-premium gradient.
 */

type Orb = {
  position: string;
  size: string;
  color: string;
  opacity: number;
  vars: CSSProperties;
};

const ORBS: Orb[] = [
  {
    position: "-left-[12%] -top-[18%]",
    size: "h-[46vmax] w-[46vmax]",
    color: "var(--color-brand-300)",
    opacity: 0.45,
    vars: { "--fy-dur": "36s", "--fy-dx": "7%", "--fy-dy": "5%" } as CSSProperties,
  },
  {
    position: "-right-[16%] top-[6%]",
    size: "h-[40vmax] w-[40vmax]",
    color: "var(--color-accent-300)",
    opacity: 0.32,
    vars: { "--fy-dur": "44s", "--fy-dx": "-6%", "--fy-dy": "7%", "--fy-delay": "-8s" } as CSSProperties,
  },
  {
    position: "left-[18%] -bottom-[22%]",
    size: "h-[42vmax] w-[42vmax]",
    color: "var(--color-brand-200)",
    opacity: 0.5,
    vars: { "--fy-dur": "30s", "--fy-dx": "5%", "--fy-dy": "-6%", "--fy-delay": "-14s" } as CSSProperties,
  },
];

// Deterministic so it renders identically every mount (no layout jitter).
const PARTICLES = Array.from({ length: 16 }, (_, i) => {
  const seed = (i * 9301 + 49297) % 233280;
  const rand = seed / 233280;
  return {
    left: `${Math.round(rand * 100)}%`,
    size: 3 + Math.round(rand * 5),
    duration: `${22 + Math.round(rand * 22)}s`,
    delay: `${-Math.round(rand * 30)}s`,
    opacity: 0.18 + rand * 0.28,
  };
});

export function AmbientBackground() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base wash — warm off-white ground lifting to a faint mint at the top. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--color-brand-100) 55%, var(--color-neutral-50)) 0%, var(--color-neutral-50) 42%, var(--color-neutral-50) 100%)",
        }}
      />

      {ORBS.map((orb, i) => (
        <div
          key={i}
          className={`fy-drift absolute ${orb.position} ${orb.size} rounded-full`}
          style={{
            ...orb.vars,
            opacity: orb.opacity,
            background: `radial-gradient(circle at center, ${orb.color}, transparent 68%)`,
            filter: "blur(56px)",
          }}
        />
      ))}

      {/* Rising particles — sparse, low-opacity teal specks. */}
      <div className="absolute inset-0">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="fy-rise absolute bottom-0 rounded-full bg-brand-500"
            style={
              {
                left: p.left,
                width: p.size,
                height: p.size,
                "--fy-dur": p.duration,
                "--fy-delay": p.delay,
                "--fy-o": p.opacity,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* Soft top sheen + bottom fade to keep content legible over the field. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 50% 0%, rgba(255,255,255,0.5), transparent 60%), linear-gradient(0deg, var(--color-neutral-50) 0%, transparent 22%)",
        }}
      />
    </div>
  );
}
