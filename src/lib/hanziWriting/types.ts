/**
 * RC2.3.4 — shared types for progressive Hànzì writing.
 * Handwriting geometry is NEVER derived from HanziBuilder SVG paths.
 */

import type { GuideLevel, HanziLearningStage } from "./stages";

export type HandwritingValidationStatus = "VERIFIED" | "PARTIAL" | "UNAVAILABLE";

export type StrokeErrorCategory =
  | "STROKE_ORDER"
  | "START_POSITION"
  | "END_POSITION"
  | "DIRECTION"
  | "SHAPE"
  | "MISSING_STROKE"
  | "EXTRA_STROKE";

export type WritingUiVerdict = "Ótimo" | "Quase" | "Tente novamente";

export type HanziWritingState =
  | "NOT_STARTED"
  | "SEEN"
  | "ASSEMBLED"
  | "TRACED"
  | "COPIED"
  | "WRITTEN"
  | "STABLE";

export interface Point2D {
  x: number;
  y: number;
}

/** One canonical stroke in normalized 0–100 space (HANDWRITING_REFERENCE only). */
export interface HandwritingStroke {
  id: string;
  order: number;
  /** Polyline samples from start → end. */
  points: readonly Point2D[];
  /** Approximate direction unit vector (end − start). */
  direction: Point2D;
  labelPt: string;
}

export interface HandwritingTolerance {
  /** Max distance (norm units) for start acceptance. */
  startRadius: number;
  endRadius: number;
  /** Max angular deviation in degrees for direction. */
  directionDegrees: number;
  /** Max mean point-to-path distance for shape. */
  shapeMeanDistance: number;
  /** Minimum coverage of reference length the user must travel. */
  minLengthRatio: number;
  maxLengthRatio: number;
}

export interface HanziHandwritingReference {
  character: string;
  charId: string;
  status: HandwritingValidationStatus;
  strokes: readonly HandwritingStroke[];
  strokeOrder: readonly string[];
  boundingArea: { minX: number; minY: number; maxX: number; maxY: number };
  tolerance: HandwritingTolerance;
  source: {
    provenance: string;
    license: string;
    version: string;
    /** Explicit: never BUILDER_GEOMETRY for grading. */
    geometrySource: "HANDWRITING_REFERENCE";
    validatedAgainst: string;
    notesPt: string;
  };
  /** When status !== VERIFIED, why graded memory-write is blocked. */
  blockReason?: string;
}

export interface StrokeAttemptSample {
  points: readonly Point2D[];
}

export interface StrokeEvalResult {
  accepted: boolean;
  category: StrokeErrorCategory | null;
  confidence: number;
  feedbackPt: string;
  feedbackEn: string;
}

export interface CharacterEvalResult {
  complete: boolean;
  verdict: WritingUiVerdict;
  confidence: number;
  strokeResults: readonly StrokeEvalResult[];
  orderIssue: boolean;
  shapeIssue: boolean;
  helpUsed: boolean;
  undoUsed: boolean;
  replayUsed: boolean;
}

export interface HanziFormEvidence {
  character: string;
  charId: string;
  recognitionCorrect: number;
  recognitionAttempts: number;
  assemblyCorrect: number;
  assemblyAttempts: number;
  completeCorrect: number;
  completeAttempts: number;
  strokeOrderOk: number;
  strokeOrderAttempts: number;
  tracingCorrect: number;
  tracingAttempts: number;
  memoryWriteCorrect: number;
  memoryWriteAttempts: number;
  contextWriteCorrect: number;
  contextWriteAttempts: number;
  helpUsedCount: number;
  undoUsedCount: number;
  replayUsedCount: number;
  lastStage: HanziLearningStage | null;
  writingState: HanziWritingState;
  updatedAt: number;
}

export interface HanziWritingTelemetryEvent {
  characterId: string;
  stage: HanziLearningStage;
  masteryPass: number;
  attemptCount: number;
  helpUsed: boolean;
  undoUsed: boolean;
  replayUsed: boolean;
  strokeCount: number;
  orderIssue: boolean;
  shapeIssue: boolean;
  completed: boolean;
  correct: boolean;
  /** Never store raw stroke coordinates permanently. */
  at: number;
}

export interface HanziWritingSessionBudget {
  handwritingProductions: number;
  maxHandwritingProductions: number;
  guideLevel: GuideLevel;
}

export type MemoryWritePromptKind = "meaning" | "audio" | "sentence_blank";

export interface MemoryWritePrompt {
  kind: MemoryWritePromptKind;
  /** Never reveals the target glyph. */
  promptPt: string;
  promptEn: string;
  audioText?: string;
  sentenceBefore?: string;
  sentenceAfter?: string;
  meaningPt?: string;
  pinyin?: string;
}
