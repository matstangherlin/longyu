/**
 * RC2.3.4 — HanziProgressiveWritingContract quality gates.
 */

import { BUILDER_GEOMETRY_NOT_GRADING_SOURCE } from "./gates";
import { gradingSourcePolicy, handwritingReferenceFor, isHandwritingReferenceVerified } from "./handwritingReference";
import { isCharacterTaught } from "./curriculumLeak";
import type { HanziLearningStage } from "./stages";
import { HANZI_CORE_STAGE_ORDER } from "./stages";
import type { TaughtConceptMap } from "../pedagogyV6/discovery";

export interface HanziProgressiveWritingContract {
  character: string;
  charId: string;
  taughtBeforeWriting: boolean;
  largeLegibleGlyph: boolean;
  validReference: boolean;
  stageOrderOk: boolean;
  scaffoldReduction: boolean;
  mobileUsable: boolean;
  fallbackAvailable: boolean;
  formEvidenceRecorded: boolean;
  noFakeStrokeTruth: boolean;
  pass: boolean;
  notes: string[];
}

export function assessWritingContract(input: {
  character: string;
  charId: string;
  stage: HanziLearningStage;
  previousStage?: HanziLearningStage | null;
  taught?: TaughtConceptMap;
  completedLessons?: readonly string[];
  glyphCssPx?: number;
  formEvidenceRecorded?: boolean;
  fallbackAvailable?: boolean;
  mobileCanvasOk?: boolean;
  scaffoldReduced?: boolean;
}): HanziProgressiveWritingContract {
  const notes: string[] = [];
  const taughtBeforeWriting = isCharacterTaught(
    input.charId,
    input.character,
    input.taught,
    input.completedLessons
  );
  if (!taughtBeforeWriting && (input.stage === "TRACE" || input.stage === "MEMORY_WRITE")) {
    notes.push("Writing before discovery/taught");
  }

  const largeLegibleGlyph = (input.glyphCssPx ?? 72) >= 56;
  if (!largeLegibleGlyph) notes.push("Glyph below comfort size");

  const ref = handwritingReferenceFor(input.character);
  const validReference =
    input.stage === "TRACE" || input.stage === "MEMORY_WRITE" || input.stage === "CONTEXT_USE"
      ? isHandwritingReferenceVerified(input.character)
      : true;
  if (!validReference) notes.push("Missing verified handwriting reference");

  let stageOrderOk = true;
  if (input.previousStage && input.previousStage !== "CONTEXT_USE") {
    const prev = HANZI_CORE_STAGE_ORDER.indexOf(input.previousStage as (typeof HANZI_CORE_STAGE_ORDER)[number]);
    const cur = HANZI_CORE_STAGE_ORDER.indexOf(input.stage as (typeof HANZI_CORE_STAGE_ORDER)[number]);
    if (prev >= 0 && cur >= 0 && cur > prev + 2) {
      stageOrderOk = false;
      notes.push("Stage jump too large");
    }
  }

  const noFakeStrokeTruth =
    gradingSourcePolicy().builderGeometry === BUILDER_GEOMETRY_NOT_GRADING_SOURCE &&
    (ref?.source.geometrySource === "HANDWRITING_REFERENCE" || !ref);

  const pass =
    (taughtBeforeWriting || input.stage === "RECOGNIZE" || input.stage === "COMPONENTS") &&
    largeLegibleGlyph &&
    validReference &&
    stageOrderOk &&
    (input.scaffoldReduced ?? true) &&
    (input.mobileCanvasOk ?? true) &&
    (input.fallbackAvailable ?? true) &&
    (input.formEvidenceRecorded ?? true) &&
    noFakeStrokeTruth;

  return {
    character: input.character,
    charId: input.charId,
    taughtBeforeWriting,
    largeLegibleGlyph,
    validReference,
    stageOrderOk,
    scaffoldReduction: input.scaffoldReduced ?? true,
    mobileUsable: input.mobileCanvasOk ?? true,
    fallbackAvailable: input.fallbackAvailable ?? true,
    formEvidenceRecorded: input.formEvidenceRecorded ?? true,
    noFakeStrokeTruth,
    pass,
    notes,
  };
}
