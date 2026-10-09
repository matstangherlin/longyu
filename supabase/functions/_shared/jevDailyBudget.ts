/**
 * JEV Wave 2 — persistent daily Jev budget for beta ops (not isolate-local breaker).
 * Pure decision helpers; Edge persists counters in jev_ops_daily.
 */

export const JEV_DAILY_BUDGET = {
  /** Soft warning — watch TypeSafe usage. */
  warnAt: 40,
  /** Disable semantic clustering; keep classification if still under max. */
  degradeClusterAt: 60,
  /** Stop new paid evaluations for the day; feedback storage unaffected. */
  maxEvaluations: 80,
} as const;

export type JevBudgetLevel = "GREEN" | "WARN" | "DEGRADE_CLUSTER" | "EXHAUSTED";

export function jevBudgetLevel(evaluationsToday: number): JevBudgetLevel {
  if (evaluationsToday >= JEV_DAILY_BUDGET.maxEvaluations) return "EXHAUSTED";
  if (evaluationsToday >= JEV_DAILY_BUDGET.degradeClusterAt) return "DEGRADE_CLUSTER";
  if (evaluationsToday >= JEV_DAILY_BUDGET.warnAt) return "WARN";
  return "GREEN";
}

export function allowNewJevEvaluation(level: JevBudgetLevel): boolean {
  return level !== "EXHAUSTED";
}

export function allowSemanticClustering(level: JevBudgetLevel): boolean {
  return level === "GREEN" || level === "WARN";
}
