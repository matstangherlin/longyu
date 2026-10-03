/**
 * RC2.3.4 — annotate lesson plans with progressive writing metadata.
 * No new StepKind. Reuses hanzi_build / recognize steps + optional writingMode.
 *
 * Writing fields live on a runtime overlay type — NOT on LessonStep in
 * journey.ts — so CURRICULUM_SOURCES fingerprint stays e566a250c5a6.
 */

import type { LessonStep } from "../../data/journey";
import type { MasteryPass } from "../../data/masteryLoop";
import { MAX_HANDWRITING_PRODUCTIONS_PER_SESSION, stagesForMasteryPass, type HanziLearningStage } from "./stages";
import { canGradeMemoryWrite, canOfferTrace, handwritingReferenceFor } from "./handwritingReference";
import { assertWritingEligible } from "./curriculumLeak";
import type { TaughtConceptMap } from "../pedagogyV6/discovery";
import { getFormEvidence } from "./evidence";

export type HanziWritingMode = "trace" | "memory_write" | "draw_missing_stroke" | "none";

/** Runtime overlay on LessonStep — keep out of curriculum-fingerprint sources. */
export type LessonStepWritingOverlay = {
  hanziWritingStage?: HanziLearningStage;
  hanziWritingMode?: HanziWritingMode;
  handwritingCharId?: string;
  hanziGuideLevel?: 0 | 1 | 2 | 3;
  hanziWritingFallback?: "assemble" | "stroke_order_quiz" | "skip_gesture";
};

export type LessonStepWithWriting = LessonStep & LessonStepWritingOverlay;

export function asWritingStep(step: LessonStep): LessonStepWithWriting {
  return step as LessonStepWithWriting;
}

export interface HanziWritingPlanResult {
  steps: LessonStepWithWriting[];
  writingInjected: number;
  blockedByLeak: number;
  blockedByData: number;
  productionsBudget: number;
}

function charFromStep(step: LessonStep): { character: string; charId: string } | null {
  if (step.charId && step.hanzi) return { character: step.hanzi, charId: step.charId };
  if (step.hanzi) {
    const ref = handwritingReferenceFor(step.hanzi);
    return { character: step.hanzi, charId: ref?.charId ?? step.hanzi };
  }
  if (step.targetHanzi) {
    const ref = handwritingReferenceFor(step.targetHanzi);
    return { character: step.targetHanzi, charId: ref?.charId ?? step.targetHanzi };
  }
  return null;
}

function nextWritingMode(
  pass: MasteryPass | number,
  character: string,
  charId: string
): { stage: HanziLearningStage; mode: HanziWritingMode; guide: 0 | 1 | 2 | 3 } | null {
  const stages = stagesForMasteryPass(pass);
  const ev = getFormEvidence(charId, character);
  if (pass <= 1) return null;
  if (pass === 2) {
    if (stages.includes("COMPLETE") && canOfferTrace(character)) {
      return { stage: "COMPLETE", mode: "draw_missing_stroke", guide: 2 };
    }
    return null;
  }
  if (pass === 3) {
    if (canOfferTrace(character) && ev.tracingCorrect < 2) {
      return { stage: "TRACE", mode: "trace", guide: ev.tracingAttempts === 0 ? 3 : 2 };
    }
    return null;
  }
  if (pass >= 4) {
    if (canGradeMemoryWrite(character)) {
      return { stage: "MEMORY_WRITE", mode: "memory_write", guide: 0 };
    }
  }
  return null;
}

/**
 * Enrich existing form-related steps with writing metadata.
 * Caps handwritten productions per session.
 */
export function applyHanziProgressiveWritingToPlan(input: {
  lessonId: string;
  masteryPass: number;
  steps: LessonStep[];
  taught?: TaughtConceptMap;
  completedLessons?: readonly string[];
}): HanziWritingPlanResult {
  let writingInjected = 0;
  let blockedByLeak = 0;
  let blockedByData = 0;
  const budget = MAX_HANDWRITING_PRODUCTIONS_PER_SESSION;
  const out: LessonStepWithWriting[] = [];

  for (const step of input.steps) {
    const isForm =
      step.kind === "hanzi_build" ||
      step.kind === "recognize" ||
      step.kind === "decompose" ||
      step.kind === "match_pairs";

    if (!isForm || writingInjected >= budget) {
      out.push(step);
      continue;
    }

    const target = charFromStep(step);
    if (!target) {
      out.push(step);
      continue;
    }

    const plan = nextWritingMode(input.masteryPass, target.character, target.charId);
    if (!plan) {
      out.push(step);
      continue;
    }

    const gate = assertWritingEligible({
      charId: target.charId,
      character: target.character,
      stage: plan.stage,
      taught: input.taught,
      completedLessons: input.completedLessons,
    });

    if (!gate.ok) {
      if (gate.code === "HANDWRITING_CURRICULUM_LEAK") blockedByLeak += 1;
      else blockedByData += 1;
      out.push({
        ...step,
        hanziWritingFallback: "assemble",
      });
      continue;
    }

    writingInjected += 1;
    out.push({
      ...step,
      hanziWritingStage: plan.stage,
      hanziWritingMode: plan.mode,
      handwritingCharId: target.charId,
      hanziGuideLevel: plan.guide,
      hanziWritingFallback: "assemble",
    });
  }

  return {
    steps: out,
    writingInjected,
    blockedByLeak,
    blockedByData,
    productionsBudget: budget,
  };
}
