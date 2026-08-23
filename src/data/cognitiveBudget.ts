/**
 * Pedagogia V4.0 — piso cognitivo por Mastery Pass.
 *
 * O orçamento do planner (~7–10 passos) não pode tratar conversa extra,
 * reforço e variedade cosmética como iguais à competência do pass:
 *
 *   M1 descoberta/compreensão
 *   M2 recuperação/consolidação
 *   M3 produção obrigatória
 *   M4 transferência obrigatória (quando a estrutura já é praticável)
 *
 * Uma segunda conversation_scene nunca remove o requisito essencial.
 */

import type { StepKind } from "./journey";
import { kindMatchesPreferred, masteryPassProfile, type MasteryPass } from "./masteryLoop";

export const PRODUCTIVE_CHALLENGE_KINDS: ReadonlySet<StepKind> = new Set([
  "free_production",
  "produce",
  "write",
  "sentence_build",
  "translation_build",
  "dictation",
  "reverse_recall",
  "sentence_transform",
  "substitution_drill",
]);

export const TRANSFER_CHALLENGE_KINDS: ReadonlySet<StepKind> = new Set(["transfer_task"]);

const RECOGNITION_KINDS: ReadonlySet<StepKind> = new Set([
  "comprehend",
  "listen",
  "listen_select",
  "image_choice",
  "recognize",
  "flashcard",
  "match_pairs",
  "contextual_choice",
]);

const DISCRIMINATION_KINDS: ReadonlySet<StepKind> = new Set([
  "odd_one_out",
  "audio_discrimination",
  "compare_with_image",
  "tone_pair",
  "spot_error",
]);

export type CognitiveFloorKind = "recognition" | "discrimination" | "production" | "transfer";

export type CognitiveFillRank =
  | "required"
  | "remediation"
  | "conversation_primary"
  | "reinforcement"
  | "conversation_extra"
  | "cosmetic";

const FILL_RANK: Record<CognitiveFillRank, number> = {
  required: 0,
  remediation: 1,
  conversation_primary: 2,
  reinforcement: 3,
  conversation_extra: 4,
  cosmetic: 5,
};

export interface CognitiveBudgetStep {
  kind: StepKind;
  productionOpen?: boolean;
  postConversationPhase?: boolean;
  conversationDerived?: boolean;
  sceneId?: string;
  productionFrameId?: string;
  title?: string;
  correctAnswer?: string;
  answer?: string;
  prompt?: string;
  hanzi?: string;
  text?: string;
  mode?: string;
}

export function cognitiveStepSignature(step: CognitiveBudgetStep): string {
  return [
    step.kind,
    step.sceneId,
    step.productionFrameId,
    step.title,
    step.correctAnswer,
    step.answer,
    step.prompt,
    step.hanzi,
    step.text,
  ]
    .filter((part): part is string => Boolean(part))
    .join("|");
}

/** Conversa não conta como o piso de produção: é uso, não o desafio produtivo do pass. */
export function isProductiveChallengeStep(step: CognitiveBudgetStep): boolean {
  if (step.kind === "conversation_scene") return false;
  if (TRANSFER_CHALLENGE_KINDS.has(step.kind)) return false;
  if (step.kind === "write" && step.mode === "free_reflection") return false;
  return PRODUCTIVE_CHALLENGE_KINDS.has(step.kind);
}

export function isTransferChallengeStep(step: CognitiveBudgetStep): boolean {
  return TRANSFER_CHALLENGE_KINDS.has(step.kind);
}

export function isRecognitionStep(step: CognitiveBudgetStep): boolean {
  return RECOGNITION_KINDS.has(step.kind);
}

export function isDiscriminationStep(step: CognitiveBudgetStep): boolean {
  return DISCRIMINATION_KINDS.has(step.kind);
}

export function requiredCognitiveFloor(pass: MasteryPass): CognitiveFloorKind[] {
  switch (pass) {
    case 1:
      return ["recognition"];
    case 2:
      return ["recognition", "discrimination"];
    case 3:
      return ["production"];
    case 4:
      return ["transfer", "production"];
  }
}

export function stepMatchesFloorKind(step: CognitiveBudgetStep, kind: CognitiveFloorKind): boolean {
  switch (kind) {
    case "recognition":
      return isRecognitionStep(step);
    case "discrimination":
      return isDiscriminationStep(step);
    case "production":
      return isProductiveChallengeStep(step);
    case "transfer":
      return isTransferChallengeStep(step);
  }
}

export function planHasFloorKind(plan: readonly CognitiveBudgetStep[], kind: CognitiveFloorKind): boolean {
  return plan.some((step) => stepMatchesFloorKind(step, kind));
}

export function countKind(plan: readonly CognitiveBudgetStep[], kind: StepKind): number {
  return plan.filter((step) => step.kind === kind).length;
}

/**
 * O piso do pass é aplicável neste plano-base? Transferência só é exigida
 * quando o plano já tinha um transfer_task (estrutura + glifos ok).
 */
export function applicableFloorKinds(
  pass: MasteryPass,
  basePlan: readonly CognitiveBudgetStep[]
): CognitiveFloorKind[] {
  return requiredCognitiveFloor(pass).filter((kind) => {
    if (kind === "transfer") return planHasFloorKind(basePlan, "transfer");
    if (kind === "production") return planHasFloorKind(basePlan, "production");
    if (kind === "discrimination") return planHasFloorKind(basePlan, "discrimination");
    return planHasFloorKind(basePlan, "recognition") || basePlan.length > 0;
  });
}

export function missingFloorKinds(
  plan: readonly CognitiveBudgetStep[],
  kinds: readonly CognitiveFloorKind[]
): CognitiveFloorKind[] {
  return kinds.filter((kind) => !planHasFloorKind(plan, kind));
}

/** True quando o recorte da pass perdeu um requisito que o plano-base tinha. */
export function conversationEvictedPassFloor(
  basePlan: readonly CognitiveBudgetStep[],
  trimmedPlan: readonly CognitiveBudgetStep[],
  pass: MasteryPass
): boolean {
  const applicable = applicableFloorKinds(pass, basePlan);
  return missingFloorKinds(trimmedPlan, applicable).length > 0;
}

export interface ScoredBudgetItem<T extends CognitiveBudgetStep> {
  step: T;
  score: number;
  index: number;
}

function isDiscouragedOnPass(kind: StepKind, pass: MasteryPass): boolean {
  return masteryPassProfile(pass).discouragedKinds.includes(kind);
}

function fillRankFor<T extends CognitiveBudgetStep>(
  item: ScoredBudgetItem<T>,
  pass: MasteryPass,
  firstConversationIndex: number | undefined,
  reserved: ReadonlySet<string>
): CognitiveFillRank {
  const signature = cognitiveStepSignature(item.step);
  if (reserved.has(signature)) return "required";
  if (item.step.kind === "conversation_scene") {
    return item.index === firstConversationIndex ? "conversation_primary" : "conversation_extra";
  }
  if (item.score >= 3) return "remediation";
  if (kindMatchesPreferred(item.step.kind, pass)) return "reinforcement";
  if (item.step.postConversationPhase || item.step.conversationDerived) return "cosmetic";
  return "reinforcement";
}

/**
 * Reserva o piso do pass e só então preenche o orçamento.
 * Extra conversation_scene perde para produção (M3) e transferência (M4).
 */
export function keepMasteryPassSteps<T extends CognitiveBudgetStep>(
  items: readonly ScoredBudgetItem<T>[],
  options: { pass: MasteryPass; min: number; max: number }
): T[] {
  if (items.length === 0) return [];
  const byIndex = [...items].sort((a, b) => a.index - b.index);
  const firstConversationIndex = byIndex.find((item) => item.step.kind === "conversation_scene")?.index;

  const reserved: ScoredBudgetItem<T>[] = [];
  const reservedSigs = new Set<string>();
  const basePlan = byIndex.map((item) => item.step);
  for (const kind of applicableFloorKinds(options.pass, basePlan)) {
    const matches = byIndex.filter((item) => {
      const signature = cognitiveStepSignature(item.step);
      return stepMatchesFloorKind(item.step, kind) && !reservedSigs.has(signature);
    });
    const found =
      matches.find((item) => !isDiscouragedOnPass(item.step.kind, options.pass)) ?? matches[0];
    if (!found) continue;
    reserved.push(found);
    reservedSigs.add(cognitiveStepSignature(found.step));
  }

  const rankOf = (item: ScoredBudgetItem<T>) =>
    FILL_RANK[fillRankFor(item, options.pass, firstConversationIndex, reservedSigs)];

  const fill = items
    .filter((item) => !reservedSigs.has(cognitiveStepSignature(item.step)))
    .sort((a, b) => rankOf(a) - rankOf(b) || b.score - a.score || a.index - b.index);

  const kept = [...reserved];
  const seenKinds = new Set(kept.map((item) => item.step.kind));
  const keptSigs = new Set(reservedSigs);

  for (const item of fill) {
    if (kept.length >= options.max) break;
    if (isDiscouragedOnPass(item.step.kind, options.pass)) continue;
    if (item.score < -1 && kept.length >= options.min) continue;
    const duplicateKind = seenKinds.has(item.step.kind);
    const floorKind =
      isTransferChallengeStep(item.step) ||
      isProductiveChallengeStep(item.step) ||
      (item.step.kind === "conversation_scene" && item.index === firstConversationIndex);
    if (duplicateKind && kept.length >= options.max - 2 && !floorKind) continue;
    const signature = cognitiveStepSignature(item.step);
    if (keptSigs.has(signature)) continue;
    kept.push(item);
    keptSigs.add(signature);
    seenKinds.add(item.step.kind);
  }

  if (kept.length < options.min) {
    const padding = [
      ...byIndex.filter((item) => !isDiscouragedOnPass(item.step.kind, options.pass)),
      ...byIndex,
    ];
    for (const item of padding) {
      if (kept.length >= options.min) break;
      const signature = cognitiveStepSignature(item.step);
      if (keptSigs.has(signature)) continue;
      kept.push(item);
      keptSigs.add(signature);
    }
  }

  kept.sort((a, b) => a.index - b.index);
  return kept.map((item) => item.step);
}
