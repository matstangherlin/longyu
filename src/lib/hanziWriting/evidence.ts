/**
 * RC2.3.4 — local form / writing evidence (device-only).
 * Separate evidence channels so recognition does not inflate writing mastery.
 * No cloud sync (#273 untouched). Merge semantics prepared via versioned blob.
 */

import type { HanziLearningStage } from "./stages";
import { hanziFormToEvidence } from "../mastery/adapters";
import { recordLearningEvidence } from "../mastery/recorder";
import { readScoped, writeScoped } from "../accountStorage";
import type { HanziFormEvidence, HanziWritingState, HanziWritingTelemetryEvent } from "./types";

export const HANZI_FORM_EVIDENCE_STORAGE_KEY = "longyu:hanzi-form-evidence-v1";
export const HANZI_WRITING_TELEMETRY_STORAGE_KEY = "longyu:hanzi-writing-telemetry-v1";
export const HANZI_FORM_EVIDENCE_SCHEMA_VERSION = 1;

export type HanziFormEvidenceMap = Record<string, HanziFormEvidence>;

function emptyEvidence(character: string, charId: string): HanziFormEvidence {
  return {
    character,
    charId,
    recognitionCorrect: 0,
    recognitionAttempts: 0,
    assemblyCorrect: 0,
    assemblyAttempts: 0,
    completeCorrect: 0,
    completeAttempts: 0,
    strokeOrderOk: 0,
    strokeOrderAttempts: 0,
    tracingCorrect: 0,
    tracingAttempts: 0,
    memoryWriteCorrect: 0,
    memoryWriteAttempts: 0,
    contextWriteCorrect: 0,
    contextWriteAttempts: 0,
    helpUsedCount: 0,
    undoUsedCount: 0,
    replayUsedCount: 0,
    lastStage: null,
    writingState: "NOT_STARTED",
    updatedAt: Date.now(),
  };
}

export function loadFormEvidenceMap(): HanziFormEvidenceMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = readScoped(HANZI_FORM_EVIDENCE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as { version?: number; items?: HanziFormEvidenceMap };
    if (!parsed || typeof parsed !== "object") return {};
    return parsed.items ?? (parsed as unknown as HanziFormEvidenceMap);
  } catch {
    return {};
  }
}

export function saveFormEvidenceMap(map: HanziFormEvidenceMap): void {
  if (typeof window === "undefined") return;
  try {
    writeScoped(
      HANZI_FORM_EVIDENCE_STORAGE_KEY,
      JSON.stringify({ version: HANZI_FORM_EVIDENCE_SCHEMA_VERSION, items: map, cloudMergeReady: true })
    );
  } catch {
    /* quota / private mode — ignore */
  }
}

export function getFormEvidence(charId: string, character?: string): HanziFormEvidence {
  const map = loadFormEvidenceMap();
  return map[charId] ?? emptyEvidence(character ?? charId, charId);
}

function deriveWritingState(ev: HanziFormEvidence): HanziWritingState {
  if (ev.memoryWriteCorrect >= 3 && ev.tracingCorrect >= 2) return "STABLE";
  if (ev.memoryWriteCorrect >= 1) return "WRITTEN";
  if (ev.tracingCorrect >= 2 && ev.helpUsedCount === 0) return "COPIED";
  if (ev.tracingCorrect >= 1) return "TRACED";
  if (ev.assemblyCorrect >= 1 || ev.completeCorrect >= 1) return "ASSEMBLED";
  if (ev.recognitionCorrect >= 1 || ev.recognitionAttempts >= 1) return "SEEN";
  return "NOT_STARTED";
}

export type FormEvidenceChannel =
  | "recognition"
  | "assembly"
  | "complete"
  | "strokeOrder"
  | "tracing"
  | "memoryWrite"
  | "contextWrite";

export function recordFormEvidence(input: {
  charId: string;
  character: string;
  channel: FormEvidenceChannel;
  correct: boolean;
  stage?: HanziLearningStage;
  helpUsed?: boolean;
  undoUsed?: boolean;
  replayUsed?: boolean;
}): HanziFormEvidence {
  const map = loadFormEvidenceMap();
  const ev = map[input.charId] ?? emptyEvidence(input.character, input.charId);
  const bump = (okKey: keyof HanziFormEvidence, tryKey: keyof HanziFormEvidence) => {
    (ev[tryKey] as number) += 1;
    if (input.correct) (ev[okKey] as number) += 1;
  };

  switch (input.channel) {
    case "recognition":
      bump("recognitionCorrect", "recognitionAttempts");
      break;
    case "assembly":
      bump("assemblyCorrect", "assemblyAttempts");
      break;
    case "complete":
      bump("completeCorrect", "completeAttempts");
      break;
    case "strokeOrder":
      bump("strokeOrderOk", "strokeOrderAttempts");
      break;
    case "tracing":
      bump("tracingCorrect", "tracingAttempts");
      break;
    case "memoryWrite":
      bump("memoryWriteCorrect", "memoryWriteAttempts");
      break;
    case "contextWrite":
      bump("contextWriteCorrect", "contextWriteAttempts");
      break;
  }

  if (input.helpUsed) ev.helpUsedCount += 1;
  if (input.undoUsed) ev.undoUsedCount += 1;
  if (input.replayUsed) ev.replayUsedCount += 1;
  if (input.stage) ev.lastStage = input.stage;
  ev.writingState = deriveWritingState(ev);
  ev.updatedAt = Date.now();
  map[input.charId] = ev;
  saveFormEvidenceMap(map);
  // RC2.3.6 — same event in the Learner Evidence Record, channel kept separate
  // (tracing is guided; it never counts as writing from memory).
  try {
    const now = Date.now();
    recordLearningEvidence([
      hanziFormToEvidence({
        character: input.character,
        channel: input.channel,
        correct: input.correct,
        helpUsed: input.helpUsed,
        replayUsed: input.replayUsed,
        attemptKey: `${input.charId}|${input.channel}|${input.stage ?? "-"}|${now}`,
        timestamp: now,
      }),
    ]);
  } catch {
    /* evidence is optional */
  }
  return ev;
}

/**
 * Writing strength 0–1 from writing channels only (not recognition).
 * Prevents recognition grind from inflating form/writing status.
 */
export function writingStrength(ev: HanziFormEvidence): number {
  const traceRate = ev.tracingAttempts ? ev.tracingCorrect / ev.tracingAttempts : 0;
  const memRate = ev.memoryWriteAttempts ? ev.memoryWriteCorrect / ev.memoryWriteAttempts : 0;
  const assembleRate = ev.assemblyAttempts ? ev.assemblyCorrect / ev.assemblyAttempts : 0;
  const hasWritingEvidence = ev.tracingAttempts + ev.memoryWriteAttempts > 0;
  if (!hasWritingEvidence) {
    // Assembly alone never counts as writing mastery
    return assembleRate * 0.15;
  }
  return Math.min(1, traceRate * 0.45 + memRate * 0.55);
}

export function meaningStrength(ev: HanziFormEvidence): number {
  if (!ev.recognitionAttempts) return 0;
  return ev.recognitionCorrect / ev.recognitionAttempts;
}

/** Prefer writing tasks in Review when meaning strong but writing weak. */
export function prefersWritingReview(ev: HanziFormEvidence): boolean {
  return meaningStrength(ev) >= 0.7 && writingStrength(ev) < 0.45;
}

export function appendWritingTelemetry(event: HanziWritingTelemetryEvent): void {
  if (typeof window === "undefined") return;
  try {
    const raw = readScoped(HANZI_WRITING_TELEMETRY_STORAGE_KEY);
    const list: HanziWritingTelemetryEvent[] = raw ? (JSON.parse(raw) as HanziWritingTelemetryEvent[]) : [];
    list.push(event);
    // Cap local ring buffer — never store stroke coordinates.
    const trimmed = list.slice(-200);
    writeScoped(HANZI_WRITING_TELEMETRY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    /* ignore */
  }
}

export function loadWritingTelemetry(): HanziWritingTelemetryEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readScoped(HANZI_WRITING_TELEMETRY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HanziWritingTelemetryEvent[]) : [];
  } catch {
    return [];
  }
}

export function writingStateLabelPt(state: HanziWritingState): string {
  switch (state) {
    case "NOT_STARTED":
      return "Não iniciado";
    case "SEEN":
      return "Reconhecido";
    case "ASSEMBLED":
      return "Montado";
    case "TRACED":
      return "Traçado";
    case "COPIED":
      return "Copiado";
    case "WRITTEN":
      return "Escrito";
    case "STABLE":
      return "Estável";
  }
}
