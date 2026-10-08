/**
 * RC2.3.4 — unique Hànzì learning progression contract.
 *
 * Pedagogical order (explicit):
 * RECOGNIZE → COMPONENTS → ASSEMBLE → COMPLETE → TRACE → MEMORY_WRITE
 * Optional contextual application: CONTEXT_USE
 */

import type { MasteryPass } from "../../data/masteryLoop";

export const HANZI_LEARNING_STAGES = [
  "RECOGNIZE",
  "COMPONENTS",
  "ASSEMBLE",
  "COMPLETE",
  "TRACE",
  "MEMORY_WRITE",
  "CONTEXT_USE",
] as const;

export type HanziLearningStage = (typeof HANZI_LEARNING_STAGES)[number];

/** Core production ladder (excludes contextual application). */
export const HANZI_CORE_STAGE_ORDER: readonly HanziLearningStage[] = [
  "RECOGNIZE",
  "COMPONENTS",
  "ASSEMBLE",
  "COMPLETE",
  "TRACE",
  "MEMORY_WRITE",
] as const;

export const STAGE_LABEL_PT: Record<HanziLearningStage, string> = {
  RECOGNIZE: "Reconhecer",
  COMPONENTS: "Componentes",
  ASSEMBLE: "Montar",
  COMPLETE: "Completar",
  TRACE: "Traçar",
  MEMORY_WRITE: "Escrever de memória",
  CONTEXT_USE: "Usar em contexto",
};

/** Map stages onto Pedagogy V6 mastery passes. */
export function stagesForMasteryPass(pass: MasteryPass | number): readonly HanziLearningStage[] {
  switch (pass) {
    case 1:
      return ["RECOGNIZE", "COMPONENTS"];
    case 2:
      return ["ASSEMBLE", "COMPLETE"];
    case 3:
      return ["TRACE", "COMPLETE", "CONTEXT_USE"];
    case 4:
      return ["MEMORY_WRITE", "CONTEXT_USE"];
    default:
      return ["RECOGNIZE"];
  }
}

export function stageIndex(stage: HanziLearningStage): number {
  return HANZI_CORE_STAGE_ORDER.indexOf(stage as (typeof HANZI_CORE_STAGE_ORDER)[number]);
}

export function isStageAtLeast(current: HanziLearningStage, minimum: HanziLearningStage): boolean {
  if (minimum === "CONTEXT_USE") return current === "CONTEXT_USE";
  if (current === "CONTEXT_USE") return true;
  const a = stageIndex(current);
  const b = stageIndex(minimum);
  if (a < 0 || b < 0) return false;
  return a >= b;
}

/** Max handwritten productions per session — avoid writing fatigue. */
export const MAX_HANDWRITING_PRODUCTIONS_PER_SESSION = 3;

/** Guide fading levels (TRACE progressive scaffold). */
export const GUIDE_LEVELS = [3, 2, 1, 0] as const;
export type GuideLevel = (typeof GUIDE_LEVELS)[number];

/**
 * GUIDE 3: full ghost + next stroke highlight
 * GUIDE 2: light ghost, no persistent highlight
 * GUIDE 1: grid + start point only
 * GUIDE 0: grid or empty canvas
 */
export function guideLevelForStage(
  stage: HanziLearningStage,
  attemptCount: number,
  helpUsed: boolean
): GuideLevel {
  if (stage === "TRACE") {
    if (attemptCount <= 0) return 3;
    if (attemptCount === 1) return 2;
    if (helpUsed) return 1;
    return 1;
  }
  if (stage === "MEMORY_WRITE" || stage === "CONTEXT_USE") {
    return attemptCount === 0 && helpUsed ? 1 : 0;
  }
  if (stage === "COMPLETE") return 2;
  return 3;
}

export function pinyinVisibleForStage(stage: HanziLearningStage, masteryPass: number): "always" | "on_demand" | "hidden" {
  if (masteryPass >= 4) return "hidden";
  if (stage === "MEMORY_WRITE" || stage === "CONTEXT_USE") return "on_demand";
  if (stage === "TRACE" && masteryPass >= 3) return "on_demand";
  return "always";
}

export function targetGlyphVisibleForStage(stage: HanziLearningStage, masteryPass: number): boolean {
  if (stage === "MEMORY_WRITE" || stage === "CONTEXT_USE") return false;
  if (masteryPass >= 4 && stage === "TRACE") return false;
  return true;
}
