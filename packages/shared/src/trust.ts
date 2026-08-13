export const TRUST_LEVELS = ["excellent", "good", "average", "low"] as const;
export type TrustLevel = (typeof TRUST_LEVELS)[number];

/**
 * BRD Rule 2 names four levels (Excellent/Good/Average/Low) and says the
 * account starts at score 50 ("Neutral") but never publishes exact cutoffs —
 * these thresholds are an architect recommendation, not a BRD requirement.
 * Only the badge/level this function returns is ever shown to non-admins;
 * the numeric score itself stays admin-only.
 */
export function deriveTrustLevel(score: number): TrustLevel {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "low";
}
