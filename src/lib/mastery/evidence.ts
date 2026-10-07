/**
 * RC2.3.6 — Learner Evidence Record (LER).
 *
 * One local-first, explainable record of WHAT THE LEARNER DEMONSTRATED.
 * Not a score store: each event keeps target, competency, kind of evidence,
 * result, support used and where it came from, so any derived state can say
 * "why". Pedagogical data only — never raw speech, handwriting images,
 * transcripts or biometric features (the types have no place for them).
 *
 * Rules enforced here:
 *  - technical failure is `SKIPPED_TECHNICAL`, never a learner failure;
 *  - support never turns a correct answer wrong, it lowers `independence`;
 *  - every event has a stable id → recording is idempotent;
 *  - storage is bounded: recent raw window + compact aggregates.
 */
import type { CompetencyDimension } from "../../data/masteryLoop";

export type { CompetencyDimension };

export const KNOWLEDGE_TARGET_TYPES = [
  "TONE",
  "SYLLABLE",
  "INITIAL",
  "FINAL",
  "HANZI",
  "COMPONENT",
  "WORD",
  "CHUNK",
  "GRAMMAR_PATTERN",
  "COMMUNICATIVE_INTENT",
  "SCENARIO",
  "CULTURE_CONCEPT",
  "PRONUNCIATION_CONTRAST",
] as const;
export type KnowledgeTargetType = (typeof KNOWLEDGE_TARGET_TYPES)[number];

/**
 * What kind of evidence an event is. Each skill has a fixed competency and a
 * fixed STRENGTH — how much it can prove about that competency. Recognising a
 * choice is not producing; tracing is not writing from memory; ASR text is not
 * tone; self-compare is participation, not correctness.
 */
export const EVIDENCE_SKILLS = {
  // core lesson / review
  MEANING_CHOICE: { dimension: "meaning", strength: 0.5 },
  LISTENING_CHOICE: { dimension: "listening", strength: 0.55 },
  FORM_RECOGNITION: { dimension: "form", strength: 0.5 },
  PRODUCTION_STEP: { dimension: "production", strength: 0.7 },
  SRS_REVIEW: { dimension: "meaning", strength: 0.6 },
  // Hànzì (#314/#315) — never collapsed into one number
  HANZI_RECOGNITION: { dimension: "form", strength: 0.5 },
  HANZI_ASSEMBLY: { dimension: "form", strength: 0.6 },
  HANZI_COMPLETE: { dimension: "form", strength: 0.6 },
  HANZI_TRACE: { dimension: "form", strength: 0.35 },
  HANZI_MEMORY_WRITE: { dimension: "production", strength: 0.9 },
  HANZI_CONTEXT_USE: { dimension: "production", strength: 0.85 },
  // speech (#316)
  SPEECH_PERCEPTION: { dimension: "listening", strength: 0.7 },
  SPEECH_SELF_COMPARE: { dimension: "production", strength: 0.15 },
  ASR_TEXT: { dimension: "production", strength: 0.45 },
  // Everyday Mandarin — contextual choice ≠ producing it
  CONTEXTUAL_CHOICE: { dimension: "production", strength: 0.3 },
  DIALOGUE_COMPLETION: { dimension: "production", strength: 0.55 },
  SENTENCE_PRODUCTION: { dimension: "production", strength: 0.75 },
  FREE_PRODUCTION: { dimension: "production", strength: 0.85 },
  CONVERSATIONAL_TRANSFER: { dimension: "production", strength: 0.95 },
  // Culture
  CULTURE_OBSERVED: { dimension: "meaning", strength: 0.1 },
  CULTURE_PRACTICE: { dimension: "meaning", strength: 0.35 },
  CULTURE_SCENARIO: { dimension: "meaning", strength: 0.8 },
  CULTURE_RECALL: { dimension: "meaning", strength: 0.7 },
  // legacy prior (never fabricated per-skill evidence)
  LEGACY_PRIOR: { dimension: "meaning", strength: 0.25 },
} as const satisfies Record<string, { dimension: CompetencyDimension; strength: number }>;
export type EvidenceSkill = keyof typeof EVIDENCE_SKILLS;

/** Skills that count as handwriting (form produced by hand). */
export const HANDWRITING_SKILLS: readonly EvidenceSkill[] = ["HANZI_TRACE", "HANZI_MEMORY_WRITE", "HANZI_CONTEXT_USE"];
/** Skills that prove use in context (transfer). */
export const TRANSFER_SKILLS: readonly EvidenceSkill[] = ["CONVERSATIONAL_TRANSFER", "FREE_PRODUCTION", "HANZI_CONTEXT_USE", "CULTURE_SCENARIO"];

export type EvidenceResult = "SUCCESS" | "PARTIAL" | "FAILURE" | "OBSERVED" | "SKIPPED_TECHNICAL";

export const SUPPORT_KINDS = [
  "PORTUGUESE_VISIBLE",
  "PINYIN_VISIBLE",
  "PINYIN_REVEALED",
  "IMAGE_SUPPORT",
  "HINT",
  "PROGRESSIVE_HELP",
  "MODEL_REPLAY",
  "ANSWER_REVEAL",
  "GUIDED_TRACE",
  "ELIMINATE_OPTIONS",
] as const;
export type SupportKind = (typeof SUPPORT_KINDS)[number];

/**
 * Independence policy: the strongest support used caps independence.
 * 1.0 none · 0.85 passive scaffold · 0.75 replay · 0.6 revealed/hint ·
 * 0.5 progressive help · 0.4 guided trace · 0.25 answer shown.
 */
export const SUPPORT_INDEPENDENCE_CAP: Record<SupportKind, number> = {
  PORTUGUESE_VISIBLE: 0.85,
  PINYIN_VISIBLE: 0.85,
  IMAGE_SUPPORT: 0.85,
  MODEL_REPLAY: 0.75,
  PINYIN_REVEALED: 0.6,
  HINT: 0.6,
  ELIMINATE_OPTIONS: 0.55,
  PROGRESSIVE_HELP: 0.5,
  GUIDED_TRACE: 0.4,
  ANSWER_REVEAL: 0.25,
};

export function independenceFor(support: readonly SupportKind[]): number {
  return support.reduce((min, s) => Math.min(min, SUPPORT_INDEPENDENCE_CAP[s] ?? 1), 1);
}

export interface LearningEvidence {
  /** Stable, deterministic: same activity attempt → same id (idempotent). */
  id: string;
  targetId: string;
  targetType: KnowledgeTargetType;
  dimension: CompetencyDimension;
  skill: EvidenceSkill;
  result: EvidenceResult;
  /** 0–1, from `independenceFor(supportUsed)`. */
  independence: number;
  supportUsed: SupportKind[];
  source: { lessonId?: string; activityId: string; masteryPass?: number };
  /** Optional, coarse failure family for error memory (e.g. "TONE_2_VS_3"). */
  errorFamily?: string;
  timestamp: number;
  /** Device that produced the event (multi-device merge prep). */
  deviceId?: string;
}

/** Only these keys are ever stored — anything else (audio, transcript, image) is dropped. */
export const LEARNING_EVIDENCE_FIELDS = [
  "id",
  "targetId",
  "targetType",
  "dimension",
  "skill",
  "result",
  "independence",
  "supportUsed",
  "source",
  "errorFamily",
  "timestamp",
  "deviceId",
] as const;

/** FNV-1a 32 → 8 hex chars; deterministic id material, not crypto. */
export function stableHash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export interface EvidenceInput {
  targetId: string;
  targetType: KnowledgeTargetType;
  skill: EvidenceSkill;
  result: EvidenceResult;
  supportUsed?: readonly SupportKind[];
  source: { lessonId?: string; activityId: string; masteryPass?: number };
  /** Identity of THIS attempt (plan nonce + step + attempt). Same key → same event. */
  attemptKey: string;
  errorFamily?: string;
  timestamp?: number;
  deviceId?: string;
}

export function makeEvidence(input: EvidenceInput): LearningEvidence {
  const skill = EVIDENCE_SKILLS[input.skill] ? input.skill : "MEANING_CHOICE";
  const supportUsed = [...new Set((input.supportUsed ?? []).filter((s) => (SUPPORT_KINDS as readonly string[]).includes(s)))].sort() as SupportKind[];
  const result: EvidenceResult = (["SUCCESS", "PARTIAL", "FAILURE", "OBSERVED", "SKIPPED_TECHNICAL"] as const).includes(input.result) ? input.result : "OBSERVED";
  const ev: LearningEvidence = {
    id: `ev_${stableHash(`${input.attemptKey}|${input.targetId}|${skill}`)}${stableHash(`${input.source.activityId}|${input.attemptKey}`)}`,
    targetId: input.targetId,
    targetType: input.targetType,
    dimension: EVIDENCE_SKILLS[skill].dimension,
    skill,
    result,
    independence: independenceFor(supportUsed),
    supportUsed,
    source: {
      ...(input.source.lessonId ? { lessonId: input.source.lessonId } : {}),
      activityId: String(input.source.activityId).slice(0, 160),
      ...(typeof input.source.masteryPass === "number" ? { masteryPass: input.source.masteryPass } : {}),
    },
    timestamp: typeof input.timestamp === "number" ? input.timestamp : Date.now(),
  };
  if (input.errorFamily && result === "FAILURE") ev.errorFamily = input.errorFamily.slice(0, 48);
  if (input.deviceId) ev.deviceId = input.deviceId.slice(0, 40);
  return ev;
}

/** Strip anything outside the contract (defence in depth for synced/old data). */
export function sanitizeEvidence(raw: Record<string, unknown>): LearningEvidence | null {
  if (!raw || typeof raw.id !== "string" || typeof raw.targetId !== "string") return null;
  const skill = raw.skill as EvidenceSkill;
  if (!EVIDENCE_SKILLS[skill]) return null;
  const out: Record<string, unknown> = {};
  for (const key of LEARNING_EVIDENCE_FIELDS) if (key in raw) out[key] = raw[key];
  return out as unknown as LearningEvidence;
}

// ---------------------------------------------------------------------------
// Storage: recent raw window + compact aggregates (bounded), idempotent.
// ---------------------------------------------------------------------------

export const LER_STORAGE_KEY = "longyu:learner-evidence-v1";
export const LER_SCHEMA_VERSION = 1;
/** Raw events kept for explanation. */
export const LER_RECENT_WINDOW = 1500;
/** Ids remembered for idempotency beyond the raw window. */
export const LER_SEEN_ID_WINDOW = 6000;
const WEEK = 7 * 24 * 60 * 60 * 1000;

export interface EvidenceAggregate {
  targetId: string;
  dimension: CompetencyDimension;
  skill: EvidenceSkill;
  /** ISO-ish week bucket start (ms). */
  week: number;
  success: number;
  partial: number;
  failure: number;
  observed: number;
  /** Σ strength × independence of graded events (for weighting). */
  weight: number;
  firstAt: number;
  lastAt: number;
}

export interface LearnerEvidenceRecord {
  version: number;
  deviceId: string;
  recent: LearningEvidence[];
  /** Older events compacted per target × dimension × skill × week. */
  aggregates: Record<string, EvidenceAggregate>;
  /** Short hashes of every id ever recorded (bounded ring). */
  seen: string[];
  /** Pruned history of OTHER devices, snapshot per device (merge prep). */
  aggregatesByDevice?: Record<string, { compactedThrough: number; aggregates: Record<string, EvidenceAggregate> }>;
}

export function emptyRecord(deviceId = "local"): LearnerEvidenceRecord {
  return { version: LER_SCHEMA_VERSION, deviceId, recent: [], aggregates: {}, seen: [] };
}

function aggKey(e: Pick<LearningEvidence, "targetId" | "dimension" | "skill" | "timestamp">): string {
  const week = Math.floor(e.timestamp / WEEK) * WEEK;
  return `${e.targetId}|${e.dimension}|${e.skill}|${week}`;
}

export function compactInto(aggregates: Record<string, EvidenceAggregate>, e: LearningEvidence): void {
  if (e.result === "SKIPPED_TECHNICAL") return; // never part of learning history
  const key = aggKey(e);
  const week = Math.floor(e.timestamp / WEEK) * WEEK;
  const a = (aggregates[key] ??= { targetId: e.targetId, dimension: e.dimension, skill: e.skill, week, success: 0, partial: 0, failure: 0, observed: 0, weight: 0, firstAt: e.timestamp, lastAt: e.timestamp });
  if (e.result === "SUCCESS") a.success += 1;
  else if (e.result === "PARTIAL") a.partial += 1;
  else if (e.result === "FAILURE") a.failure += 1;
  else a.observed += 1;
  if (e.result !== "OBSERVED") a.weight += EVIDENCE_SKILLS[e.skill].strength * e.independence;
  a.firstAt = Math.min(a.firstAt, e.timestamp);
  a.lastAt = Math.max(a.lastAt, e.timestamp);
}

/** Append idempotently; compact the oldest raw events beyond the window. */
export function appendEvidence(record: LearnerEvidenceRecord, events: readonly LearningEvidence[]): { record: LearnerEvidenceRecord; added: number } {
  const seen = new Set(record.seen);
  const recent = [...record.recent];
  let added = 0;
  for (const e of events) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    recent.push(e);
    added += 1;
  }
  if (added === 0) return { record, added };
  recent.sort((a, b) => a.timestamp - b.timestamp);
  const aggregates = { ...record.aggregates };
  while (recent.length > LER_RECENT_WINDOW) compactInto(aggregates, recent.shift()!);
  const seenList = [...seen];
  return {
    record: { ...record, recent, aggregates, seen: seenList.slice(-LER_SEEN_ID_WINDOW) },
    added,
  };
}

/**
 * Multi-device merge contract (cloud-later): never last-write-wins on the
 * whole record. Raw events union by id; each device's compacted history is a
 * per-device snapshot (newer `compactedThrough` wins for that device only).
 */
export function mergeRecords(local: LearnerEvidenceRecord, remote: LearnerEvidenceRecord): LearnerEvidenceRecord {
  const { record } = appendEvidence(local, remote.recent);
  const byDevice = { ...(record.aggregatesByDevice ?? {}) };
  const remoteSnapshot = { compactedThrough: remote.recent[0]?.timestamp ?? 0, aggregates: remote.aggregates };
  const prev = byDevice[remote.deviceId];
  if (remote.deviceId !== local.deviceId && (!prev || prev.compactedThrough <= remoteSnapshot.compactedThrough)) {
    byDevice[remote.deviceId] = remoteSnapshot;
  }
  for (const [device, snap] of Object.entries(remote.aggregatesByDevice ?? {})) {
    if (device === local.deviceId) continue;
    const mine = byDevice[device];
    if (!mine || mine.compactedThrough <= snap.compactedThrough) byDevice[device] = snap;
  }
  return { ...record, aggregatesByDevice: byDevice };
}

export function loadRecord(): LearnerEvidenceRecord {
  if (typeof localStorage === "undefined") return emptyRecord();
  try {
    const raw = localStorage.getItem(LER_STORAGE_KEY);
    if (!raw) return emptyRecord(newDeviceId());
    const parsed = JSON.parse(raw) as LearnerEvidenceRecord;
    if (!parsed || parsed.version !== LER_SCHEMA_VERSION || !Array.isArray(parsed.recent)) return emptyRecord(newDeviceId());
    return {
      ...parsed,
      recent: parsed.recent.map((e) => sanitizeEvidence(e as unknown as Record<string, unknown>)).filter((e): e is LearningEvidence => e !== null),
    };
  } catch {
    return emptyRecord(newDeviceId());
  }
}

export function saveRecord(record: LearnerEvidenceRecord): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LER_STORAGE_KEY, JSON.stringify(record));
  } catch {
    /* quota — evidence is optional, learning never blocks on it */
  }
}

function newDeviceId(): string {
  return `dev_${stableHash(`${Date.now()}|${Math.random()}`)}`;
}

/** Every graded event that should count (technical skips never do). */
export function learningEvents(record: LearnerEvidenceRecord): LearningEvidence[] {
  return record.recent.filter((e) => e.result !== "SKIPPED_TECHNICAL");
}
