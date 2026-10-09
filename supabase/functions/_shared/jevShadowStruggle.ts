/**
 * JEV Wave 3 — Shadow Struggle Lab (research only).
 *
 * Jev may choose among pre-approved intervention candidates.
 * Never grades, never writes Mastery, never invents pedagogy,
 * never affects learner runtime. Deterministic product stays authoritative.
 */

export const SHADOW_POLICY_VERSION = "shadow-struggle-v1" as const;

/** Kill switch: shadow decisions must never drive learner UX while false. */
export const JEV_SHADOW_STRUGGLE_RUNTIME_DEFAULT = false as const;

export const APPROVED_INTERVENTIONS = [
  "CONTINUE",
  "REPLAY_MODEL",
  "SHOW_VISUAL_HINT",
  "PERCEPTION_FIRST",
  "REDUCE_CHOICE_SET",
  "MODEL_AND_RETRY",
  "DEFER_TO_REVIEW",
  "SWITCH_TO_EASIER_EVIDENCE",
  "ABSTAIN",
] as const;

export type ApprovedIntervention = (typeof APPROVED_INTERVENTIONS)[number];

/** Coarse buckets only — never raw counts that identify a user. */
export type CountBucket = "0" | "1" | "2" | "3plus";

export interface StruggleSignals {
  competency: "meaning" | "listening" | "form" | "production" | "culture" | "other";
  masteryState: "none" | "emerging" | "developing" | "firm" | "consolidated";
  errorCountBucket: CountBucket;
  replayCountBucket: CountBucket;
  helpUsed: boolean;
  activeTimeBucket: "short" | "medium" | "long";
  recentIndependentSuccessBucket: CountBucket;
  currentExerciseFamily:
    | "listening_choice"
    | "meaning_choice"
    | "production"
    | "hanzi_trace"
    | "hanzi_memory"
    | "speech_self_compare"
    | "culture_scenario"
    | "other";
  lessonStage: "teach" | "practice" | "check" | "review";
  /** Structured speech — never raw audio. */
  speech?: {
    asrAvailable: boolean;
    selfCompareCompleted: boolean;
    technicalFailure: boolean;
    retryCountBucket: CountBucket;
  };
  /** Structured Hànzì — never stroke paths. */
  hanzi?: {
    traceCompleted: boolean;
    memoryAttempt: boolean;
    hintUsed: boolean;
    retryBucket: CountBucket;
  };
}

export type LearnerOutcome =
  | "succeeded_naturally"
  | "needed_help"
  | "abandoned"
  | "repeated_error"
  | "completed_lesson"
  | "unknown";

export interface ShadowDecisionRecord {
  policyVersion: typeof SHADOW_POLICY_VERSION;
  inputHash: string;
  candidateSet: ApprovedIntervention[];
  deterministicChoice: ApprovedIntervention;
  jevChoice: ApprovedIntervention | null;
  jevConfidence: number | null;
  abstained: boolean;
  shouldInterveneNoul: number | null;
  model: string | null;
  learnerOutcome: LearnerOutcome;
  /** Runtime effect must always be false in shadow phase. */
  appliedToLearner: false;
  reused: boolean;
  costUnits: number;
}

export function bucketCount(n: number): CountBucket {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n === 1) return "1";
  if (n === 2) return "2";
  return "3plus";
}

/** Forbidden payload keys / patterns for shadow Jev input. */
const FORBIDDEN_PAYLOAD = [
  /\bemail\b/i,
  /@/,
  /\buser[_-]?id\b/i,
  /\buuid\b/i,
  /\bBearer\b/i,
  /\beyJ[A-Za-z0-9_-]+\./,
  /\bstroke/i,
  /\baudio[_-]?blob\b/i,
  /\braw[_-]?audio\b/i,
  /\bwav\b|\bmp3\b|\bwebm\b/i,
  /\bhanzi[_-]?path\b/i,
];

export function containsForbiddenShadowPayload(text: string): string[] {
  const found: string[] = [];
  const s = String(text ?? "");
  if (/@/.test(s) || /\bemail\b/i.test(s)) found.push("email_or_user_id");
  if (/\beyJ[A-Za-z0-9_-]+\./.test(s) || /\bBearer\b/i.test(s)) found.push("token");
  if (/\bstroke/i.test(s) || /\bhanzi[_-]?path\b/i.test(s)) found.push("hanzi_strokes");
  if (/\braw[_-]?audio\b/i.test(s) || /\baudio[_-]?blob\b/i.test(s) || /\.(wav|mp3|webm)\b/i.test(s)) {
    found.push("raw_audio");
  }
  void FORBIDDEN_PAYLOAD;
  return [...new Set(found)];
}

/**
 * Deterministic candidate set from coarse signals.
 * Always includes CONTINUE and ABSTAIN. Never invents unapproved ids.
 */
export function buildCandidateSet(signals: StruggleSignals): ApprovedIntervention[] {
  const out = new Set<ApprovedIntervention>(["CONTINUE", "ABSTAIN"]);
  const errors = signals.errorCountBucket;
  const replays = signals.replayCountBucket;

  if (signals.competency === "listening" || signals.currentExerciseFamily === "listening_choice") {
    out.add("REPLAY_MODEL");
    out.add("PERCEPTION_FIRST");
  }
  if (signals.currentExerciseFamily === "meaning_choice" || signals.competency === "meaning") {
    out.add("SHOW_VISUAL_HINT");
    out.add("REDUCE_CHOICE_SET");
  }
  if (signals.competency === "production" || signals.currentExerciseFamily === "production") {
    out.add("MODEL_AND_RETRY");
    out.add("PERCEPTION_FIRST");
  }
  if (signals.currentExerciseFamily === "hanzi_trace" || signals.currentExerciseFamily === "hanzi_memory") {
    out.add("SHOW_VISUAL_HINT");
    out.add("MODEL_AND_RETRY");
    if (signals.hanzi?.hintUsed) out.add("SWITCH_TO_EASIER_EVIDENCE");
  }
  if (signals.currentExerciseFamily === "speech_self_compare") {
    out.add("REPLAY_MODEL");
    out.add("MODEL_AND_RETRY");
    if (signals.speech?.technicalFailure) {
      // Technical failure → continue / abstain only (no pedagogy invent).
      return ["CONTINUE", "ABSTAIN"];
    }
  }
  if (signals.currentExerciseFamily === "culture_scenario") {
    out.add("SHOW_VISUAL_HINT");
    out.add("DEFER_TO_REVIEW");
  }
  if (errors === "2" || errors === "3plus") {
    out.add("DEFER_TO_REVIEW");
    out.add("SWITCH_TO_EASIER_EVIDENCE");
  }
  if (replays === "3plus" && !signals.helpUsed) {
    out.add("SHOW_VISUAL_HINT");
  }
  if (signals.lessonStage === "teach") {
    // Teach-before-test: never escalate to check-like pressure via switch.
    out.delete("SWITCH_TO_EASIER_EVIDENCE");
  }
  return APPROVED_INTERVENTIONS.filter((id) => out.has(id));
}

/**
 * Current deterministic heuristic (authoritative for learner UX).
 * Sparse: prefer CONTINUE unless repeated struggle.
 */
export function deterministicIntervention(signals: StruggleSignals, candidates: ApprovedIntervention[]): ApprovedIntervention {
  const allowed = new Set(candidates);
  const pick = (id: ApprovedIntervention) => (allowed.has(id) ? id : "CONTINUE");

  if (signals.speech?.technicalFailure) return pick("CONTINUE");
  if (signals.errorCountBucket === "0" || signals.errorCountBucket === "1") {
    if (signals.replayCountBucket === "3plus" && allowed.has("REPLAY_MODEL")) return "REPLAY_MODEL";
    return pick("CONTINUE");
  }
  if (signals.errorCountBucket === "2") {
    if (signals.competency === "listening") return pick("REPLAY_MODEL");
    if (signals.competency === "production") return pick("MODEL_AND_RETRY");
    if (!signals.helpUsed) return pick("SHOW_VISUAL_HINT");
    return pick("PERCEPTION_FIRST");
  }
  // 3plus
  if (signals.recentIndependentSuccessBucket === "0") return pick("SWITCH_TO_EASIER_EVIDENCE");
  return pick("DEFER_TO_REVIEW");
}

/** Short semantic state for Jev — bounded, no PII. */
export function buildShadowState(signals: StruggleSignals, candidates: ApprovedIntervention[]): string {
  const lines = [
    `Learner is practicing ${signals.competency}.`,
    `Mastery state (context only, do not rewrite): ${signals.masteryState}.`,
    `Recent recognition/production errors bucket: ${signals.errorCountBucket}.`,
    `Replay bucket: ${signals.replayCountBucket}.`,
    `Help already used: ${signals.helpUsed ? "yes" : "no"}.`,
    `Active time bucket: ${signals.activeTimeBucket}.`,
    `Recent independent success bucket: ${signals.recentIndependentSuccessBucket}.`,
    `Current task family: ${signals.currentExerciseFamily}.`,
    `Lesson stage: ${signals.lessonStage}.`,
  ];
  if (signals.speech) {
    lines.push(
      `Speech signals: ASR=${signals.speech.asrAvailable} selfCompare=${signals.speech.selfCompareCompleted} technicalFailure=${signals.speech.technicalFailure} retry=${signals.speech.retryCountBucket}.`,
    );
  }
  if (signals.hanzi) {
    lines.push(
      `Hanzi signals: traceCompleted=${signals.hanzi.traceCompleted} memoryAttempt=${signals.hanzi.memoryAttempt} hintUsed=${signals.hanzi.hintUsed} retry=${signals.hanzi.retryBucket}.`,
    );
  }
  lines.push(`Approved candidates only: ${candidates.join(", ")}.`);
  lines.push("Choose one candidate. Prefer ABSTAIN when uncertain. Do not grade correctness. Do not change Mastery.");
  const state = lines.join("\n");
  if (containsForbiddenShadowPayload(state).length) {
    throw new Error("shadow_state_forbidden_payload");
  }
  return state;
}

export function buildShadowQuestions(candidates: ApprovedIntervention[]): Record<
  string,
  { type: "choice" | "noul"; instructions: string; criteria?: Record<string, string> }
> {
  const criteria: Record<string, string> = {};
  for (const id of candidates) {
    criteria[id] = interventionCriterion(id);
  }
  return {
    intervention: {
      type: "choice",
      instructions: "Which approved intervention is most appropriate for this struggle signal set",
      criteria,
    },
    should_intervene: {
      type: "noul",
      instructions: "The learner would benefit from an intervention now (vs continuing undisturbed)",
    },
  };
}

function interventionCriterion(id: ApprovedIntervention): string {
  switch (id) {
    case "CONTINUE":
      return "Do not intervene; let the learner continue";
    case "REPLAY_MODEL":
      return "Replay the model audio or demonstration";
    case "SHOW_VISUAL_HINT":
      return "Show a visual or pinyin hint already prepared by the app";
    case "PERCEPTION_FIRST":
      return "Step back to listening/perception before production";
    case "REDUCE_CHOICE_SET":
      return "Reduce the number of choices on the current item";
    case "MODEL_AND_RETRY":
      return "Show a model answer then retry the same skill";
    case "DEFER_TO_REVIEW":
      return "Defer the target to a later review round";
    case "SWITCH_TO_EASIER_EVIDENCE":
      return "Switch to an easier approved evidence activity for the same skill";
    case "ABSTAIN":
      return "Abstain: uncertainty too high; keep deterministic behavior";
    default:
      return id;
  }
}

export const SHADOW_CONFIDENCE = { high: 0.8, medium: 0.6 } as const;

export function isLowConfidence(confidence: number | null | undefined): boolean {
  return typeof confidence !== "number" || !Number.isFinite(confidence) || confidence < SHADOW_CONFIDENCE.medium;
}

/**
 * Resolve Jev choice among candidates. Invalid / low-confidence → ABSTAIN.
 * Never invents ids outside the candidate set.
 */
export function resolveShadowChoice(input: {
  rawChoice: string | null | undefined;
  confidence: number | null | undefined;
  candidates: ApprovedIntervention[];
  shouldInterveneNoul?: number | null;
}): { choice: ApprovedIntervention; abstained: boolean; reason: string } {
  const allowed = new Set(input.candidates);
  if (!allowed.has("ABSTAIN")) allowed.add("ABSTAIN");
  if (isLowConfidence(input.confidence)) {
    return { choice: "ABSTAIN", abstained: true, reason: "low_confidence" };
  }
  const raw = String(input.rawChoice ?? "").trim().toUpperCase();
  if (!raw || raw === "ABSTAIN") {
    return { choice: "ABSTAIN", abstained: true, reason: "abstain_or_empty" };
  }
  if (!allowed.has(raw as ApprovedIntervention)) {
    return { choice: "ABSTAIN", abstained: true, reason: "unapproved_invention" };
  }
  // Optional: if should_intervene is clearly no, prefer CONTINUE when available.
  if (typeof input.shouldInterveneNoul === "number" && input.shouldInterveneNoul < 0.35 && allowed.has("CONTINUE")) {
    if (raw !== "CONTINUE" && raw !== "ABSTAIN") {
      return { choice: "CONTINUE", abstained: false, reason: "should_intervene_low" };
    }
  }
  return { choice: raw as ApprovedIntervention, abstained: false, reason: "ok" };
}

/** Sparse trigger: do not call Jev on every tap. */
export function shouldTriggerShadowCall(signals: StruggleSignals): boolean {
  if (signals.speech?.technicalFailure) return false;
  if (signals.errorCountBucket === "2" || signals.errorCountBucket === "3plus") return true;
  if (signals.replayCountBucket === "3plus" && signals.errorCountBucket !== "0") return true;
  if (signals.helpUsed && signals.errorCountBucket !== "0") return true;
  return false;
}

export function stableShadowHash(parts: unknown): string {
  const json = JSON.stringify(parts);
  let h = 2166136261;
  for (let i = 0; i < json.length; i++) {
    h ^= json.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function shadowInputHash(state: string, candidates: ApprovedIntervention[]): string {
  return stableShadowHash({ policy: SHADOW_POLICY_VERSION, state, candidates });
}

/** Mastery / grading writes that shadow must never perform. */
export const FORBIDDEN_SHADOW_WRITES = [
  "masteryState",
  "evidenceStrength",
  "consolidated",
  "firm",
  "weak",
  "gradeCorrect",
  "gradeIncorrect",
  "toneCorrect",
  "hanziCorrect",
  "inventExercise",
  "unlockCurriculum",
] as const;

export function assertNoMasteryWrite(record: ShadowDecisionRecord): boolean {
  return record.appliedToLearner === false;
}

export type ShadowRecommendation = "KEEP_SHADOW" | "READY_FOR_CONTROLLED_EXPERIMENT" | "NOT_WORTH_RUNTIME";

export interface ShadowMetrics {
  events: number;
  uniqueStates: number;
  jevAvailable: boolean;
  interveneRate: number;
  agreementRate: number;
  falseInterruptionRate: number;
  missedStruggleRate: number;
  lowConfidenceRate: number;
  abstainRate: number;
  estimatedCallsPer100Sessions: number;
  costEstimate: number;
  recommendation: ShadowRecommendation;
}

/**
 * Evaluate shadow decisions vs outcomes.
 * False interruption: Jev intervenes but learner succeeds naturally.
 * Missed struggle: Jev says CONTINUE/ABSTAIN but learner repeatedly fails.
 */
export function computeShadowMetrics(records: ShadowDecisionRecord[], opts?: { jevAvailable?: boolean }): ShadowMetrics {
  const events = records.length;
  const uniqueStates = new Set(records.map((r) => r.inputHash)).size;
  let agree = 0;
  let intervene = 0;
  let falseInt = 0;
  let interveneDenom = 0;
  let missed = 0;
  let continueDenom = 0;
  let lowConf = 0;
  let abstain = 0;
  let cost = 0;

  for (const r of records) {
    cost += r.costUnits;
    if (r.abstained || r.jevChoice === "ABSTAIN" || isLowConfidence(r.jevConfidence)) lowConf += 1;
    if (r.abstained || r.jevChoice === "ABSTAIN") abstain += 1;
    const jev = r.jevChoice ?? "ABSTAIN";
    if (jev === r.deterministicChoice) agree += 1;
    const jevIntervened = jev !== "CONTINUE" && jev !== "ABSTAIN";
    if (jevIntervened) {
      intervene += 1;
      interveneDenom += 1;
      if (r.learnerOutcome === "succeeded_naturally") falseInt += 1;
    }
    if (jev === "CONTINUE" || jev === "ABSTAIN") {
      continueDenom += 1;
      if (r.learnerOutcome === "repeated_error" || r.learnerOutcome === "abandoned") missed += 1;
    }
  }

  const interveneRate = events ? intervene / events : 0;
  const agreementRate = events ? agree / events : 0;
  const falseInterruptionRate = interveneDenom ? falseInt / interveneDenom : 0;
  const missedStruggleRate = continueDenom ? missed / continueDenom : 0;
  const lowConfidenceRate = events ? lowConf / events : 0;
  const abstainRate = events ? abstain / events : 0;
  // Sparse: ~1 shadow call per struggle episode; estimate 8 struggle moments / 100 sessions if beta is light.
  const estimatedCallsPer100Sessions = Math.round(interveneRate * 12 + (shouldEstimateBaseCalls(events) ? 4 : 0));

  const recommendation = recommendShadowPromotion({
    events,
    falseInterruptionRate,
    missedStruggleRate,
    agreementRate,
    lowConfidenceRate,
    jevAvailable: opts?.jevAvailable ?? true,
  });

  return {
    events,
    uniqueStates,
    jevAvailable: opts?.jevAvailable ?? true,
    interveneRate: round4(interveneRate),
    agreementRate: round4(agreementRate),
    falseInterruptionRate: round4(falseInterruptionRate),
    missedStruggleRate: round4(missedStruggleRate),
    lowConfidenceRate: round4(lowConfidenceRate),
    abstainRate: round4(abstainRate),
    estimatedCallsPer100Sessions,
    costEstimate: round4(cost),
    recommendation,
  };
}

function shouldEstimateBaseCalls(events: number): boolean {
  return events > 0;
}

export function recommendShadowPromotion(m: {
  events: number;
  falseInterruptionRate: number;
  missedStruggleRate: number;
  agreementRate: number;
  lowConfidenceRate: number;
  jevAvailable: boolean;
}): ShadowRecommendation {
  if (!m.jevAvailable) return "KEEP_SHADOW";
  // Do not enable runtime after tiny samples.
  if (m.events < 100) return "KEEP_SHADOW";
  if (m.falseInterruptionRate > 0.35) return "NOT_WORTH_RUNTIME";
  if (m.missedStruggleRate > 0.4 && m.agreementRate < 0.45) return "NOT_WORTH_RUNTIME";
  if (
    m.events >= 200 &&
    m.falseInterruptionRate <= 0.2 &&
    m.missedStruggleRate <= 0.25 &&
    m.agreementRate >= 0.55 &&
    m.lowConfidenceRate <= 0.4
  ) {
    return "READY_FOR_CONTROLLED_EXPERIMENT";
  }
  return "KEEP_SHADOW";
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Engagement metrics must not be treated as learning success for promotion. */
export const NON_LEARNING_OPTIMIZATION_METRICS = ["sessionLength", "engagement", "xp", "dau"] as const;

export function isLearningRelevantMetric(name: string): boolean {
  return ["falseInterruptionRate", "missedStruggleRate", "agreementRate", "evidenceQuality", "reducedFrustration"].includes(
    name,
  );
}
