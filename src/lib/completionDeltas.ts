/**
 * RC2.2.28 — deltas de conclusão para a cerimônia (só apresentação).
 *
 * LessonPlayer calcula o que MUDOU nesta conclusão e passa para
 * LessonVictory. Nada é concedido aqui.
 */
import { ALL_LESSONS, getPhaseById, type FlatLesson, type Lesson } from "../data/journey";
import { ENGINE_UNLOCK_COPY, TREINO_UNLOCK_COPY, UNLOCK_LESSONS, type EngineTrack } from "./journeyUnlocks";
import type { CompletionKind } from "./completionSequence";

export interface CompletionDeltaInput {
  /** FlatLesson (com phaseId) ou Lesson — phaseId é resolvido via ALL_LESSONS se faltar. */
  lesson: FlatLesson | Lesson;
  /** IDs já concluídos ANTES desta sessão (sem a lição atual). */
  completedBefore: readonly string[];
  /** IDs concluídos DEPOIS (incluindo a atual se passou). */
  completedAfter: readonly string[];
  /** Domínio de tema 0–4 depois desta sessão. */
  masteryAfter?: number;
  masteryBefore?: number;
}

export interface CompletionDeltas {
  completionKind: CompletionKind;
  unitCompletionDelta: boolean;
  phaseCompletionDelta: boolean;
  featureUnlockDelta: string | null;
  unlockLabel: string | null;
}

function phaseIdOf(lesson: FlatLesson | Lesson): string | null {
  if ("phaseId" in lesson && typeof lesson.phaseId === "string") return lesson.phaseId;
  return ALL_LESSONS.find((item) => item.id === lesson.id)?.phaseId ?? null;
}

function unitLessonIds(lesson: FlatLesson | Lesson): string[] {
  const phaseId = phaseIdOf(lesson);
  const phase = phaseId ? getPhaseById(phaseId) : undefined;
  if (!phase) return [lesson.id];
  const unit = phase.units.find((u) => u.lessons.some((l) => l.id === lesson.id));
  return unit ? unit.lessons.map((l) => l.id) : [lesson.id];
}

function phaseLessonIds(lesson: FlatLesson | Lesson): string[] {
  const phaseId = phaseIdOf(lesson);
  const phase = phaseId ? getPhaseById(phaseId) : undefined;
  if (!phase) return [lesson.id];
  return phase.units.flatMap((u) => u.lessons.map((l) => l.id));
}

function allDone(ids: readonly string[], completed: readonly string[]): boolean {
  return ids.length > 0 && ids.every((id) => completed.includes(id));
}

function featureUnlockFor(lessonId: string): { track: EngineTrack | "treino"; label: string } | null {
  for (const [track, unlockLessonId] of Object.entries(UNLOCK_LESSONS) as Array<[EngineTrack | "treino", string]>) {
    if (unlockLessonId !== lessonId) continue;
    if (track === "treino") return { track, label: TREINO_UNLOCK_COPY.title };
    return { track, label: ENGINE_UNLOCK_COPY[track as EngineTrack].title };
  }
  return null;
}

/**
 * Calcula se esta conclusão fechou unidade/fase e/ou liberou tipografia de
 * feature. Puro — o gate executa.
 */
export function computeCompletionDeltas(input: CompletionDeltaInput): CompletionDeltas {
  const { lesson, completedBefore, completedAfter } = input;
  const unitIds = unitLessonIds(lesson);
  const phaseIds = phaseLessonIds(lesson);
  const unitWasOpen = !allDone(unitIds, completedBefore);
  const unitNowDone = allDone(unitIds, completedAfter);
  const phaseWasOpen = !allDone(phaseIds, completedBefore);
  const phaseNowDone = allDone(phaseIds, completedAfter);
  const unitCompletionDelta = unitWasOpen && unitNowDone;
  const phaseCompletionDelta = phaseWasOpen && phaseNowDone;
  const unlock = featureUnlockFor(lesson.id);
  const featureUnlockDelta =
    unlock && !completedBefore.includes(lesson.id) && completedAfter.includes(lesson.id) ? unlock.label : null;

  let completionKind: CompletionKind = "LESSON";
  if (phaseCompletionDelta) completionKind = "PHASE";
  else if (unitCompletionDelta) completionKind = "UNIT";
  else if (input.masteryAfter != null && input.masteryAfter >= 4 && (input.masteryBefore ?? 0) < 4) {
    completionKind = "UNIT";
  }

  return {
    completionKind,
    unitCompletionDelta,
    phaseCompletionDelta,
    featureUnlockDelta,
    unlockLabel: featureUnlockDelta,
  };
}

/** Lista estável de ids de lição (para testes). */
export function journeyLessonCount(): number {
  return ALL_LESSONS.length;
}
