/**
 * JEV Wave 2 — confidence thresholds (calibratable; starting policy).
 */

export type ConfidenceBand = "high" | "medium" | "low";

export const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.6,
} as const;

export function confidenceBand(value: number | null | undefined): ConfidenceBand {
  if (typeof value !== "number" || !Number.isFinite(value)) return "low";
  if (value >= CONFIDENCE_THRESHOLDS.high) return "high";
  if (value >= CONFIDENCE_THRESHOLDS.medium) return "medium";
  return "low";
}

export function needsHumanReviewFromConfidence(overall: number | null | undefined): boolean {
  return confidenceBand(overall) === "low";
}

export function overallConfidence(parts: Array<number | null | undefined>): number | null {
  const nums = parts.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  if (!nums.length) return null;
  return Math.min(...nums);
}
