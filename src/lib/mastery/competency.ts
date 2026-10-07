/**
 * RC2.3.6 — competency derivation (per target × dimension, never averaged).
 *
 * Deterministic and explainable: every state is computed from evidence events
 * plus fixed rules, and returns the rules it applied. Principles:
 *  - UNKNOWN ≠ weak: no evidence is UNSEEN, exposure is EXPOSED, too little
 *    graded evidence is DEVELOPING — never "needs practice";
 *  - one answer never makes STABLE: minimum evidence, independence, spacing
 *    across days and variety of activities are required (anti-gaming);
 *  - weak kinds of evidence have a ceiling (contextual choice, ASR text,
 *    guided tracing, self-compare cannot prove more than DEVELOPING);
 *  - technical failure never counts (SKIPPED_TECHNICAL is invisible here);
 *  - decay comes from the existing SRS (`due`) — no second scheduler.
 */
import {
  EVIDENCE_SKILLS,
  HANDWRITING_SKILLS,
  type CompetencyDimension,
  type EvidenceAggregate,
  type EvidenceSkill,
  type LearningEvidence,
} from "./evidence";

export const COMPETENCY_STATES = ["UNSEEN", "EXPOSED", "DEVELOPING", "NEEDS_PRACTICE", "STRONG", "STABLE", "REVIEW_DUE"] as const;
export type CompetencyState = (typeof COMPETENCY_STATES)[number];
export type StateConfidence = "NONE" | "LOW" | "MEDIUM" | "HIGH";

/** A view is a competency dimension or the handwriting sub-view of form/production. */
export type CompetencyView = CompetencyDimension | "handwriting";
export const COMPETENCY_VIEWS: readonly CompetencyView[] = ["meaning", "listening", "form", "production", "handwriting"];

const DAY = 24 * 60 * 60 * 1000;

export const COMPETENCY_POLICY = {
  /** Graded events needed before any "strong/needs practice" label. */
  minGradedForLabel: 3,
  /** Independence at or above this counts as "on your own". */
  independentAt: 0.75,
  strongP: 0.7,
  stableP: 0.82,
  needsPracticeP: 0.45,
  minFailuresForNeedsPractice: 2,
  stableIndependentSuccesses: 3,
  stableDistinctDays: 3,
  stableSpanDays: 6,
  stableDistinctActivities: 2,
  strongIndependentSuccesses: 2,
  /** Recency half-life and floor for weights. */
  halfLifeDays: 45,
  recencyFloor: 0.35,
  /** Beta prior strength (pulls small samples toward 0.5). */
  priorWeight: 1,
  /** Without SRS info, strong/stable become REVIEW_DUE after this long. */
  staleAfterDays: { STRONG: 21, STABLE: 60 },
} as const;

/** Highest state a skill can support on its own. */
export const SKILL_CEILING: Record<EvidenceSkill, CompetencyState> = {
  MEANING_CHOICE: "STABLE",
  LISTENING_CHOICE: "STABLE",
  FORM_RECOGNITION: "STABLE",
  PRODUCTION_STEP: "STABLE",
  SRS_REVIEW: "STABLE",
  HANZI_RECOGNITION: "STABLE",
  HANZI_ASSEMBLY: "STABLE",
  HANZI_COMPLETE: "STABLE",
  HANZI_TRACE: "DEVELOPING",
  HANZI_MEMORY_WRITE: "STABLE",
  HANZI_CONTEXT_USE: "STABLE",
  SPEECH_PERCEPTION: "STABLE",
  SPEECH_SELF_COMPARE: "EXPOSED",
  ASR_TEXT: "DEVELOPING",
  CONTEXTUAL_CHOICE: "DEVELOPING",
  DIALOGUE_COMPLETION: "STRONG",
  SENTENCE_PRODUCTION: "STABLE",
  FREE_PRODUCTION: "STABLE",
  CONVERSATIONAL_TRANSFER: "STABLE",
  CULTURE_OBSERVED: "EXPOSED",
  CULTURE_PRACTICE: "DEVELOPING",
  CULTURE_SCENARIO: "STABLE",
  CULTURE_RECALL: "STABLE",
  LEGACY_PRIOR: "EXPOSED",
};

const RANK: Record<CompetencyState, number> = { UNSEEN: 0, EXPOSED: 1, NEEDS_PRACTICE: 2, DEVELOPING: 2, REVIEW_DUE: 3, STRONG: 4, STABLE: 5 };
const minState = (a: CompetencyState, b: CompetencyState) => (RANK[a] <= RANK[b] ? a : b);

export interface ViewState {
  view: CompetencyView;
  state: CompetencyState;
  confidence: StateConfidence;
  /** Internal estimate 0–1. Never shown to the learner. */
  estimate: number;
  graded: number;
  successes: number;
  failures: number;
  independentSuccesses: number;
  distinctDays: number;
  distinctActivities: number;
  lastAt: number | null;
  /** Rules applied, in order (QA panel / "why"). */
  rules: string[];
  /** Raw evidence ids used (most recent first, capped). */
  evidenceIds: string[];
}

export interface DeriveInput {
  view: CompetencyView;
  /** Raw events for ONE target (any dimension; filtered here). */
  events: readonly LearningEvidence[];
  /** Compacted history for the same target. */
  aggregates?: readonly EvidenceAggregate[];
  /** True when the existing SRS says a review of this target is due. */
  srsDue?: boolean;
  now?: number;
}

function inView(view: CompetencyView, skill: EvidenceSkill, dimension: CompetencyDimension): boolean {
  if (view === "handwriting") return HANDWRITING_SKILLS.includes(skill);
  return dimension === view;
}

const VALUE = { SUCCESS: 1, PARTIAL: 0.5, FAILURE: 0 } as const;

export function deriveViewState(input: DeriveInput): ViewState {
  const now = input.now ?? Date.now();
  const P = COMPETENCY_POLICY;
  const rules: string[] = [];
  const events = input.events
    .filter((e) => e.result !== "SKIPPED_TECHNICAL" && inView(input.view, e.skill, e.dimension))
    .sort((a, b) => b.timestamp - a.timestamp);
  const aggs = (input.aggregates ?? []).filter((a) => inView(input.view, a.skill, a.dimension));

  const recency = (at: number) => Math.max(P.recencyFloor, Math.pow(0.5, (now - at) / (P.halfLifeDays * DAY)));
  let wSum = 0;
  let vSum = 0;
  let graded = 0;
  let successes = 0;
  let failures = 0;
  let independentSuccesses = 0;
  let observed = 0;
  const days = new Set<number>();
  const activities = new Set<string>();
  let ceiling: CompetencyState = "EXPOSED";
  let lastAt: number | null = null;

  for (const e of events) {
    lastAt = Math.max(lastAt ?? 0, e.timestamp);
    if (e.result === "OBSERVED") {
      observed += 1;
      continue;
    }
    graded += 1;
    const w = EVIDENCE_SKILLS[e.skill].strength * Math.max(0.1, e.independence) * recency(e.timestamp);
    wSum += w;
    vSum += w * VALUE[e.result];
    if (e.result === "SUCCESS") {
      successes += 1;
      if (e.independence >= P.independentAt) {
        independentSuccesses += 1;
        days.add(Math.floor(e.timestamp / DAY));
        activities.add(e.source.activityId.split(":").slice(0, 2).join(":"));
        if (RANK[SKILL_CEILING[e.skill]] > RANK[ceiling]) ceiling = SKILL_CEILING[e.skill];
      } else if (RANK[ceiling] < RANK.DEVELOPING) ceiling = "DEVELOPING";
    }
    if (e.result === "FAILURE") failures += 1;
  }
  for (const a of aggs) {
    lastAt = Math.max(lastAt ?? 0, a.lastAt);
    observed += a.observed;
    const n = a.success + a.partial + a.failure;
    if (n === 0) continue;
    graded += n;
    successes += a.success;
    failures += a.failure;
    const w = a.weight * recency(a.lastAt);
    wSum += w;
    vSum += (w * (a.success + 0.5 * a.partial)) / n;
    // Compacted history keeps counts, not independence: it counts toward
    // spacing (its week) but cannot by itself lift the ceiling above STRONG.
    if (a.success > 0) {
      days.add(Math.floor(a.lastAt / DAY));
      activities.add(`agg:${a.skill}`);
      const c = minState(SKILL_CEILING[a.skill], "STRONG");
      if (RANK[c] > RANK[ceiling]) ceiling = c;
    }
  }

  const estimate = (vSum + 0.5 * P.priorWeight) / (wSum + P.priorWeight);
  const dayList = [...days].sort((a, b) => a - b);
  const spanDays = dayList.length ? dayList[dayList.length - 1] - dayList[0] : 0;
  const base = { view: input.view, estimate, graded, successes, failures, independentSuccesses, distinctDays: days.size, distinctActivities: activities.size, lastAt, evidenceIds: events.slice(0, 12).map((e) => e.id) };

  if (graded === 0 && observed === 0) return { ...base, state: "UNSEEN", confidence: "NONE", rules: ["NO_EVIDENCE"] };
  if (graded === 0) return { ...base, state: "EXPOSED", confidence: "LOW", rules: ["ONLY_EXPOSURE"] };

  let state: CompetencyState;
  if (graded < P.minGradedForLabel) {
    state = "DEVELOPING";
    rules.push("BELOW_MIN_EVIDENCE");
  } else if (estimate < P.needsPracticeP && failures >= P.minFailuresForNeedsPractice) {
    state = "NEEDS_PRACTICE";
    rules.push("REPEATED_DIFFICULTY");
  } else if (
    estimate >= P.stableP &&
    independentSuccesses >= P.stableIndependentSuccesses &&
    days.size >= P.stableDistinctDays &&
    spanDays >= P.stableSpanDays &&
    activities.size >= P.stableDistinctActivities
  ) {
    state = "STABLE";
    rules.push("SPACED_INDEPENDENT_VARIED");
  } else if (estimate >= P.strongP && independentSuccesses >= P.strongIndependentSuccesses) {
    state = "STRONG";
    rules.push("CONSISTENT_INDEPENDENT");
    if (estimate >= P.stableP) rules.push("STABLE_NEEDS_SPACING_OR_VARIETY");
  } else {
    state = "DEVELOPING";
    rules.push(independentSuccesses < P.strongIndependentSuccesses ? "NEEDS_MORE_INDEPENDENT_SUCCESS" : "MIXED_RESULTS");
  }

  // Conflict rule: the two most recent graded events failed → not strong now.
  const recentGraded = events.filter((e) => e.result !== "OBSERVED").slice(0, 2);
  if ((state === "STRONG" || state === "STABLE") && recentGraded.length === 2 && recentGraded.every((e) => e.result === "FAILURE")) {
    state = "DEVELOPING";
    rules.push("RECENT_FAILURES_OVERRIDE");
  }

  // Ceiling by kind of evidence (e.g. contextual choice cannot prove production).
  if (state === "STRONG" || state === "STABLE") {
    const capped = minState(state, ceiling);
    if (capped !== state) {
      rules.push(`CEILING_${ceiling}`);
      state = capped === "EXPOSED" ? "DEVELOPING" : capped;
    }
  }

  // Decay through the existing SRS (or staleness when no SRS item exists).
  if (state === "STRONG" || state === "STABLE") {
    const staleDays = P.staleAfterDays[state];
    if (input.srsDue) {
      rules.push("SRS_DUE");
      state = "REVIEW_DUE";
    } else if (lastAt !== null && now - lastAt > staleDays * DAY) {
      rules.push("STALE");
      state = "REVIEW_DUE";
    }
  }

  const confidence: StateConfidence = graded >= 8 && days.size >= 3 ? "HIGH" : graded >= P.minGradedForLabel ? "MEDIUM" : "LOW";
  return { ...base, state, confidence, rules };
}

// ---------------------------------------------------------------------------
// Error memory: repeated evidence, never a single miss
// ---------------------------------------------------------------------------

export interface ErrorSignal {
  family: string;
  targets: string[];
  failures: number;
  attempts: number;
  lastAt: number;
}

export const ERROR_SIGNAL_POLICY = { minFailures: 3, minFailureRatio: 0.5, windowDays: 30 } as const;

export function deriveErrorSignals(events: readonly LearningEvidence[], now = Date.now()): ErrorSignal[] {
  const since = now - ERROR_SIGNAL_POLICY.windowDays * DAY;
  const byFamily = new Map<string, { targets: Set<string>; failures: number; attempts: Set<string>; lastAt: number; tries: number }>();
  const familyOf = (e: LearningEvidence) => e.errorFamily ?? `${e.dimension.toUpperCase()}:${e.targetId}`;
  // attempts = all graded events of targets that ever failed in the family
  const failed = events.filter((e) => e.timestamp >= since && e.result === "FAILURE");
  for (const e of failed) {
    const f = familyOf(e);
    const row = byFamily.get(f) ?? { targets: new Set(), failures: 0, attempts: new Set(), lastAt: 0, tries: 0 };
    row.targets.add(e.targetId);
    row.failures += 1;
    row.attempts.add(e.id);
    row.lastAt = Math.max(row.lastAt, e.timestamp);
    byFamily.set(f, row);
  }
  const out: ErrorSignal[] = [];
  for (const [family, row] of byFamily) {
    const dimension = failed.find((e) => familyOf(e) === family)!.dimension;
    const tries = events.filter((e) => e.timestamp >= since && row.targets.has(e.targetId) && e.dimension === dimension && (e.result === "SUCCESS" || e.result === "FAILURE" || e.result === "PARTIAL")).length;
    if (row.attempts.size >= ERROR_SIGNAL_POLICY.minFailures && row.failures / Math.max(1, tries) >= ERROR_SIGNAL_POLICY.minFailureRatio) {
      out.push({ family, targets: [...row.targets], failures: row.failures, attempts: tries, lastAt: row.lastAt });
    }
  }
  return out.sort((a, b) => b.failures - a.failures || b.lastAt - a.lastAt);
}
