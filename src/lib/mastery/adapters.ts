/**
 * RC2.3.6 — adapters from the evidence channels that already exist to the
 * Learner Evidence Record. Pure functions: no storage, no store, no network.
 *
 * Each adapter keeps the meaning of its source and never upgrades it:
 *  - speech: perception → listening; self-compare → participation (OBSERVED);
 *    ASR match → moderate production of the TEXT (never tone); ASR miss is
 *    not a learner error (OBSERVED); mic/permission failure → SKIPPED_TECHNICAL;
 *    conversational transfer → strong production;
 *  - Hànzì: recognition / assembly / completion / tracing / memory write /
 *    context use stay separate skills; a guided trace is never a memory write;
 *  - Everyday: contextual choice < dialogue completion < sentence < free <
 *    conversational transfer;
 *  - Culture: observed < practiced < scenario / recall;
 *  - legacy mastery: one weak prior on MEANING, never per-skill events.
 */
import type { SpeechLearningEvidence } from "../speechEvidence";
import type { FormEvidenceChannel } from "../hanziWriting/evidence";
import type { HelpAffordance } from "../../features/lesson/reviewHelpParity";
import {
  makeEvidence,
  type EvidenceResult,
  type EvidenceSkill,
  type KnowledgeTargetType,
  type LearningEvidence,
  type SupportKind,
} from "./evidence";

// ---------------------------------------------------------------------------
// Target ids — one canonical spelling per target (see knowledgeGraph.ts).
// ---------------------------------------------------------------------------

export const targetId = {
  hanzi: (glyph: string) => `hanzi:${glyph}`,
  word: (hanzi: string) => `word:${hanzi}`,
  chunk: (chunkId: string) => `chunk:${chunkId}`,
  syllable: (toneless: string, tone: number) => `syl:${toneless.toLowerCase()}${tone}`,
  tone: (tone: number) => `tone:${tone}`,
  contrast: (contrastId: string) => `contrast:${contrastId}`,
  intent: (intent: string) => `intent:${intent}`,
  scenario: (sceneId: string) => `scene:${sceneId}`,
  culture: (conceptId: string) => `culture:${conceptId}`,
  component: (radicalId: string) => `component:${radicalId}`,
} as const;

/** Single-glyph text is a HANZI target, longer text a WORD. */
export function textTarget(text: string): { targetId: string; targetType: KnowledgeTargetType } {
  const clean = text.replace(/[\s，。！？、,.!?]/g, "");
  const glyphs = [...clean];
  if (glyphs.length === 1) return { targetId: targetId.hanzi(glyphs[0]), targetType: "HANZI" };
  return { targetId: targetId.word(clean), targetType: glyphs.length > 4 ? "CHUNK" : "WORD" };
}

// ---------------------------------------------------------------------------
// Support mapping (existing help affordances → support kinds)
// ---------------------------------------------------------------------------

const HELP_TO_SUPPORT: Partial<Record<HelpAffordance | string, SupportKind>> = {
  audio: "MODEL_REPLAY",
  audio_slow: "MODEL_REPLAY",
  pinyin: "PINYIN_REVEALED",
  meaning: "PORTUGUESE_VISIBLE",
  context: "HINT",
  image: "IMAGE_SUPPORT",
  hint: "HINT",
  reveal: "ANSWER_REVEAL",
  eliminate: "ELIMINATE_OPTIONS",
};

export function supportFromHelp(help: readonly string[] | undefined, extra: { helpLevel?: number; helpRequests?: number } = {}): SupportKind[] {
  const out = new Set<SupportKind>();
  for (const h of help ?? []) {
    const s = HELP_TO_SUPPORT[h];
    if (s) out.add(s);
  }
  if ((extra.helpRequests ?? 0) > 0 || (extra.helpLevel ?? 0) > 0) out.add("PROGRESSIVE_HELP");
  if ((extra.helpLevel ?? 0) >= 3) out.add("ANSWER_REVEAL");
  return [...out];
}

// ---------------------------------------------------------------------------
// Speech (#316)
// ---------------------------------------------------------------------------

export interface SpeechAdapterContext {
  /** True when the activity ended because of mic / permission / service failure. */
  technicalFailure?: boolean;
  lessonId?: string;
}

function speechTarget(conceptId: string): { targetId: string; targetType: KnowledgeTargetType } {
  if (conceptId.startsWith("contrast:")) return { targetId: conceptId, targetType: "PRONUNCIATION_CONTRAST" };
  if (conceptId.startsWith("phrase:")) return textTarget(conceptId.slice("phrase:".length));
  return textTarget(conceptId);
}

export function speechToEvidence(ev: SpeechLearningEvidence, ctx: SpeechAdapterContext = {}): LearningEvidence[] {
  const t = speechTarget(ev.conceptId);
  const base = { ...t, source: { activityId: ev.activityId, ...(ctx.lessonId ? { lessonId: ctx.lessonId } : {}) }, timestamp: ev.at };
  const key = `${ev.activityId}|${ev.mode}|${ev.at}`;
  const out: LearningEvidence[] = [];
  const add = (skill: EvidenceSkill, result: EvidenceResult, supportUsed: SupportKind[] = [], errorFamily?: string) =>
    out.push(makeEvidence({ ...base, skill, result, supportUsed, attemptKey: `${key}|${skill}`, errorFamily }));

  if (ctx.technicalFailure) {
    // Microphone denied, no recognizer, no network: not a learning event.
    add(ev.mode === "PERCEPTION" ? "SPEECH_PERCEPTION" : "SPEECH_SELF_COMPARE", "SKIPPED_TECHNICAL");
    return out;
  }

  switch (ev.mode) {
    case "PERCEPTION": {
      if (ev.perceptionTrials <= 0) {
        // Audio never confirmed → the round did not count (RC2.3.5 rule).
        add("SPEECH_PERCEPTION", "SKIPPED_TECHNICAL");
        break;
      }
      const ratio = ev.perceptionCorrect / ev.perceptionTrials;
      const family = t.targetType === "PRONUNCIATION_CONTRAST" ? `PERCEPTION_${ev.conceptId.slice("contrast:".length)}`.slice(0, 48) : undefined;
      add("SPEECH_PERCEPTION", ratio >= 0.66 ? "SUCCESS" : ratio > 0 ? "PARTIAL" : "FAILURE", [], family);
      break;
    }
    case "SELF_COMPARE":
      // Recording and hearing yourself is participation, never correctness.
      if (ev.recordingCaptured) add("SPEECH_SELF_COMPARE", "OBSERVED", ev.modelHeard ? ["MODEL_REPLAY"] : []);
      else if (!ev.completed) add("SPEECH_SELF_COMPARE", "SKIPPED_TECHNICAL");
      break;
    case "ASR":
      if (!ev.recognitionAttempted) break;
      // A match says "the device transcribed the target text" — moderate production
      // of the words, NOT a tone score. A miss is not a learner error.
      add("ASR_TEXT", ev.recognitionSucceeded === true ? "SUCCESS" : "OBSERVED");
      break;
    case "CONVERSATIONAL_TRANSFER":
      add("CONVERSATIONAL_TRANSFER", ev.completed ? "SUCCESS" : "OBSERVED");
      break;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Hànzì form evidence (#314/#315)
// ---------------------------------------------------------------------------

const CHANNEL_SKILL: Record<FormEvidenceChannel, EvidenceSkill> = {
  recognition: "HANZI_RECOGNITION",
  assembly: "HANZI_ASSEMBLY",
  complete: "HANZI_COMPLETE",
  strokeOrder: "HANZI_TRACE",
  tracing: "HANZI_TRACE",
  memoryWrite: "HANZI_MEMORY_WRITE",
  contextWrite: "HANZI_CONTEXT_USE",
};

export interface HanziFormEventInput {
  character: string;
  channel: FormEvidenceChannel;
  correct: boolean;
  helpUsed?: boolean;
  replayUsed?: boolean;
  /** Attempt identity (stage + attempt count + time). */
  attemptKey: string;
  lessonId?: string;
  masteryPass?: number;
  timestamp?: number;
}

export function hanziFormToEvidence(input: HanziFormEventInput): LearningEvidence {
  const skill = CHANNEL_SKILL[input.channel];
  const supportUsed: SupportKind[] = [];
  // Tracing is guided by definition: it can never pass as memory writing.
  if (skill === "HANZI_TRACE") supportUsed.push("GUIDED_TRACE");
  if (input.helpUsed) supportUsed.push("HINT");
  if (input.replayUsed) supportUsed.push("MODEL_REPLAY");
  return makeEvidence({
    targetId: targetId.hanzi(input.character),
    targetType: "HANZI",
    skill,
    result: input.correct ? "SUCCESS" : "FAILURE",
    supportUsed,
    source: { activityId: `hanzi-writing:${input.channel}:${input.character}`, ...(input.lessonId ? { lessonId: input.lessonId } : {}), ...(typeof input.masteryPass === "number" ? { masteryPass: input.masteryPass } : {}) },
    attemptKey: input.attemptKey,
    errorFamily: input.correct ? undefined : `HANZI_${input.channel.toUpperCase()}`,
    timestamp: input.timestamp,
  });
}

// ---------------------------------------------------------------------------
// Lesson / review steps (one event per step outcome, never lesson-wide smear)
// ---------------------------------------------------------------------------

/** Step kind → skill. Kinds not listed are teaching/exposure and emit OBSERVED. */
const STEP_KIND_SKILL: Record<string, EvidenceSkill> = {
  // meaning (choices — recognition, not production)
  comprehend: "MEANING_CHOICE",
  flashcard: "MEANING_CHOICE",
  image_choice: "MEANING_CHOICE",
  compare_with_image: "MEANING_CHOICE",
  odd_one_out: "MEANING_CHOICE",
  match_pairs: "MEANING_CHOICE",
  map_direction: "MEANING_CHOICE",
  city_context: "MEANING_CHOICE",
  menu_reading: "MEANING_CHOICE",
  price_task: "MEANING_CHOICE",
  schedule_reading: "MEANING_CHOICE",
  // listening
  listen: "LISTENING_CHOICE",
  listen_select: "LISTENING_CHOICE",
  dictation: "LISTENING_CHOICE",
  tone: "LISTENING_CHOICE",
  tone_pair: "LISTENING_CHOICE",
  audio_to_action: "LISTENING_CHOICE",
  audio_discrimination: "SPEECH_PERCEPTION",
  // form (reading the written form)
  recognize: "HANZI_RECOGNITION",
  decompose: "FORM_RECOGNITION",
  hanzi_build: "HANZI_ASSEMBLY",
  microread: "FORM_RECOGNITION",
  spot_error: "FORM_RECOGNITION",
  place_label: "FORM_RECOGNITION",
  sign_reading: "FORM_RECOGNITION",
  // communicative ladder: choice < completion < sentence < free < transfer
  contextual_choice: "CONTEXTUAL_CHOICE",
  dialogue_choice: "CONTEXTUAL_CHOICE",
  fill_blank: "DIALOGUE_COMPLETION",
  dialogue_completion: "DIALOGUE_COMPLETION",
  substitution_drill: "DIALOGUE_COMPLETION",
  sentence_build: "SENTENCE_PRODUCTION",
  translation_build: "SENTENCE_PRODUCTION",
  sentence_transform: "SENTENCE_PRODUCTION",
  address_build: "SENTENCE_PRODUCTION",
  route_sequence: "SENTENCE_PRODUCTION",
  produce: "PRODUCTION_STEP",
  write: "PRODUCTION_STEP",
  reverse_recall: "PRODUCTION_STEP",
  free_production: "FREE_PRODUCTION",
  transfer_task: "FREE_PRODUCTION",
  conversation_repair: "FREE_PRODUCTION",
  conversation_scene: "CONVERSATIONAL_TRANSFER",
};

/** Learner agency (Everyday contract) refines the skill when present. */
const AGENCY_SKILL: Record<string, EvidenceSkill> = {
  RECOGNIZE: "MEANING_CHOICE",
  CHOOSE: "CONTEXTUAL_CHOICE",
  COMPLETE: "DIALOGUE_COMPLETION",
  PRODUCE: "SENTENCE_PRODUCTION",
  SPEAK: "SENTENCE_PRODUCTION",
  TRANSFER: "CONVERSATIONAL_TRANSFER",
};

export interface StepLike {
  kind: string;
  charId?: string;
  hanzi?: string;
  targetHanzi?: string;
  correctAnswer?: string;
  answer?: string;
  text?: string;
  chunkId?: string;
  sceneId?: string;
  everydayIntent?: string;
  learnerAgency?: string;
  pedagogyRole?: string;
  audioSequence?: string[];
}

export interface StepOutcome {
  step: StepLike;
  /** undefined = teaching / exposure step (no grading). */
  wasCorrect?: boolean;
  /** True when the step ended by a technical failure (audio/mic/service). */
  technicalFailure?: boolean;
  help?: readonly string[];
  helpLevel?: number;
  helpRequests?: number;
  lessonId?: string;
  masteryPass?: number;
  /** Plan nonce + step index (+ attempt) — makes the event idempotent. */
  attemptKey: string;
  activityId: string;
  /** Glyph → char lookup for steps that only carry `charId`. */
  glyphForCharId?: (charId: string) => string | undefined;
  errorFamily?: string;
  timestamp?: number;
}

function stepTargets(o: StepOutcome): { targetId: string; targetType: KnowledgeTargetType }[] {
  const s = o.step;
  const out: { targetId: string; targetType: KnowledgeTargetType }[] = [];
  const glyph = s.charId ? o.glyphForCharId?.(s.charId) : undefined;
  const text = glyph ?? s.targetHanzi ?? s.hanzi ?? (typeof s.correctAnswer === "string" && /\p{Script=Han}/u.test(s.correctAnswer) ? s.correctAnswer : undefined) ?? (s.text && /\p{Script=Han}/u.test(s.text) ? s.text : undefined);
  if (s.chunkId) out.push({ targetId: targetId.chunk(s.chunkId), targetType: "CHUNK" });
  else if (text) out.push(textTarget(text));
  if (s.everydayIntent && s.everydayIntent !== "UNKNOWN") out.push({ targetId: targetId.intent(s.everydayIntent), targetType: "COMMUNICATIVE_INTENT" });
  if (s.kind === "conversation_scene" && s.sceneId) out.push({ targetId: targetId.scenario(s.sceneId), targetType: "SCENARIO" });
  return out;
}

export function stepToEvidence(o: StepOutcome): LearningEvidence[] {
  const mapped = STEP_KIND_SKILL[o.step.kind];
  // intro / hanzi_evolution and other exposure-only kinds teach; they prove nothing.
  if (!mapped) return [];
  const targets = stepTargets(o);
  if (targets.length === 0) return [];
  const graded = typeof o.wasCorrect === "boolean";
  const discovery = o.step.pedagogyRole === "discovery";
  let skill: EvidenceSkill = mapped;
  if (o.step.learnerAgency && AGENCY_SKILL[o.step.learnerAgency] && ["CONTEXTUAL_CHOICE", "DIALOGUE_COMPLETION", "SENTENCE_PRODUCTION", "MEANING_CHOICE"].includes(skill)) {
    skill = AGENCY_SKILL[o.step.learnerAgency];
  }
  const result: EvidenceResult = o.technicalFailure ? "SKIPPED_TECHNICAL" : !graded || discovery ? "OBSERVED" : o.wasCorrect ? "SUCCESS" : "FAILURE";
  const supportUsed = supportFromHelp(o.help, { helpLevel: o.helpLevel, helpRequests: o.helpRequests });
  return targets.map((t) => {
    // Intent / scenario targets only receive communicative skills.
    const targetSkill: EvidenceSkill =
      t.targetType === "COMMUNICATIVE_INTENT" || t.targetType === "SCENARIO"
        ? (["CONTEXTUAL_CHOICE", "DIALOGUE_COMPLETION", "SENTENCE_PRODUCTION", "FREE_PRODUCTION", "CONVERSATIONAL_TRANSFER"] as EvidenceSkill[]).includes(skill)
          ? skill
          : "CONTEXTUAL_CHOICE"
        : skill;
    return makeEvidence({
      ...t,
      skill: targetSkill,
      result,
      supportUsed,
      source: { activityId: o.activityId, ...(o.lessonId ? { lessonId: o.lessonId } : {}), ...(typeof o.masteryPass === "number" ? { masteryPass: o.masteryPass } : {}) },
      attemptKey: o.attemptKey,
      errorFamily: result === "FAILURE" ? o.errorFamily : undefined,
      timestamp: o.timestamp,
    });
  });
}

// ---------------------------------------------------------------------------
// SRS review grade
// ---------------------------------------------------------------------------

const REVIEW_DOMAIN_SKILL: Record<string, EvidenceSkill> = {
  som: "LISTENING_CHOICE",
  significado: "SRS_REVIEW",
  forma: "FORM_RECOGNITION",
  pinyin: "FORM_RECOGNITION",
  leitura: "FORM_RECOGNITION",
  fala: "PRODUCTION_STEP",
  uso: "CONTEXTUAL_CHOICE",
};

export function srsReviewToEvidence(input: {
  text: string;
  reviewDomain?: string;
  grade: "again" | "hard" | "good" | "easy";
  help?: readonly string[];
  attemptKey: string;
  timestamp?: number;
}): LearningEvidence {
  const t = textTarget(input.text);
  return makeEvidence({
    ...t,
    skill: REVIEW_DOMAIN_SKILL[input.reviewDomain ?? "significado"] ?? "SRS_REVIEW",
    result: input.grade === "again" ? "FAILURE" : input.grade === "hard" ? "PARTIAL" : "SUCCESS",
    supportUsed: supportFromHelp(input.help),
    source: { activityId: `review:${input.reviewDomain ?? "significado"}` },
    attemptKey: input.attemptKey,
    timestamp: input.timestamp,
  });
}

// ---------------------------------------------------------------------------
// Culture (Culture Deep)
// ---------------------------------------------------------------------------

export type CultureEvidenceEvent = "introduced" | "practiced" | "scenario" | "recall_ok" | "recall_miss";

export function cultureToEvidence(input: { conceptId: string; event: CultureEvidenceEvent; attemptKey: string; activityId: string; timestamp?: number }): LearningEvidence {
  const map: Record<CultureEvidenceEvent, [EvidenceSkill, EvidenceResult]> = {
    introduced: ["CULTURE_OBSERVED", "OBSERVED"],
    practiced: ["CULTURE_PRACTICE", "SUCCESS"],
    scenario: ["CULTURE_SCENARIO", "SUCCESS"],
    recall_ok: ["CULTURE_RECALL", "SUCCESS"],
    recall_miss: ["CULTURE_RECALL", "FAILURE"],
  };
  const [skill, result] = map[input.event];
  return makeEvidence({
    targetId: targetId.culture(input.conceptId),
    targetType: "CULTURE_CONCEPT",
    skill,
    result,
    source: { activityId: input.activityId },
    attemptKey: input.attemptKey,
    timestamp: input.timestamp,
  });
}

// ---------------------------------------------------------------------------
// Legacy mastery → baseline prior (never fabricated per-skill evidence)
// ---------------------------------------------------------------------------

export interface LegacyItemPrior {
  text: string;
  /** Old SRS reps / lesson passes — only used to decide if a prior exists. */
  reps: number;
  lastAt: number;
}

/**
 * One OBSERVED `LEGACY_PRIOR` per item that the learner already met before
 * RC2.3.6. It marks the target as "met" (EXPOSED) and nothing more: no
 * handwriting, no listening, no production evidence is invented.
 */
export function legacyPriorToEvidence(items: readonly LegacyItemPrior[]): LearningEvidence[] {
  return items
    .filter((i) => i.reps > 0 && i.text)
    .map((i) =>
      makeEvidence({
        ...textTarget(i.text),
        skill: "LEGACY_PRIOR",
        result: "OBSERVED",
        source: { activityId: "legacy:baseline" },
        attemptKey: `legacy|${i.text}`,
        timestamp: i.lastAt,
      })
    );
}
