/**
 * JEV Wave 2 — Jev severity score → P-candidate (never store score as P-level).
 * P0/P1 candidates always require human confirmation.
 */

export type PCandidate = "P0" | "P1" | "P2" | "P3";

export interface SeverityMapResult {
  /** Raw Jev score 0–3 (advisory). */
  jevScore: number | null;
  /** Operational urgency candidate — NOT auto-confirmed. */
  pCandidate: PCandidate;
  humanConfirmationRequired: boolean;
  reason: string;
}

/**
 * Deterministic mapper. Jev score rises with severity; P0 is highest urgency.
 * score 0 → P3; 1 → P2; 2 → P1; 3 → P0 candidate (human must confirm P0/P1).
 */
export function mapJevScoreToPCandidate(score: number | null | undefined): SeverityMapResult {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return {
      jevScore: null,
      pCandidate: "P2",
      humanConfirmationRequired: true,
      reason: "missing_score",
    };
  }
  const clamped = Math.max(0, Math.min(3, Math.round(score)));
  const table: Record<number, SeverityMapResult> = {
    0: { jevScore: 0, pCandidate: "P3", humanConfirmationRequired: false, reason: "score_0_cosmetic" },
    1: { jevScore: 1, pCandidate: "P2", humanConfirmationRequired: false, reason: "score_1_annoyance" },
    2: { jevScore: 2, pCandidate: "P1", humanConfirmationRequired: true, reason: "score_2_blocks_flow" },
    3: { jevScore: 3, pCandidate: "P0", humanConfirmationRequired: true, reason: "score_3_blocks_app_or_data" },
  };
  return table[clamped];
}

/** Guard: never treat raw score as P-label string. */
export function isRawScoreUsedAsPLevel(value: unknown): boolean {
  return typeof value === "number" || (typeof value === "string" && /^[0-3]$/.test(value));
}
