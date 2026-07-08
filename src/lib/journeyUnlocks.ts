import { ALL_LESSONS, JOURNEY, getLesson, getPhaseById, type JourneyPhase } from "../data/journey";
import type { DomainTrack } from "../data/domains";
import { TOOL_UNLOCK_LESSONS } from "./proAccess";

/** Lições que liberam cada competência / área do app. */
export const UNLOCK_LESSONS = TOOL_UNLOCK_LESSONS;

export type EngineTrack = DomainTrack;

export function hasCompletedLesson(completed: string[], lessonId: string): boolean {
  return completed.includes(lessonId);
}

export function isEngineUnlocked(track: EngineTrack, completed: string[]): boolean {
  return hasCompletedLesson(completed, UNLOCK_LESSONS[track]);
}

export function isTreinoUnlocked(completed: string[]): boolean {
  return completed.length >= 3 || hasCompletedLesson(completed, UNLOCK_LESSONS.treino);
}

export function isPremiumLesson(lessonId: string): boolean {
  return !!getLesson(lessonId)?.premium;
}

export function canAccessLesson(lessonId: string, isPremium: boolean): boolean {
  const lesson = getLesson(lessonId);
  if (!lesson) return false;
  return !lesson.premium || isPremium;
}

/** Fase em que o aluno está (primeira lição incompleta). */
export function currentPhase(completed: string[]): JourneyPhase | undefined {
  const next = ALL_LESSONS.find((l) => !completed.includes(l.id));
  if (!next) return JOURNEY.at(-1);
  return getPhaseById(next.phaseId);
}

export function phaseProgress(completed: string[], phase: JourneyPhase): { done: number; total: number } {
  const lessons = phase.units.flatMap((u) => u.lessons);
  const done = lessons.filter((l) => completed.includes(l.id)).length;
  return { done, total: lessons.length };
}

export const ENGINE_UNLOCK_COPY: Record<EngineTrack, { title: string; desc: string; after: string }> = {
  fala: {
    title: "Fala",
    desc: "Conclua a lição «Olá» para treinar frases em voz alta.",
    after: "Lição 1 · Olá",
  },
  som: {
    title: "Som",
    desc: "Termine a Fase 1 (Primeiro Contato) para treinar os 4 tons.",
    after: "Fase 1 · Revisão final",
  },
  hanzi: {
    title: "Hànzì",
    desc: "Conclua a revisão da primeira leitura para abrir caracteres como peças lógicas.",
    after: "Fase 4 · Hànzì Lógico",
  },
  leitura: {
    title: "Leitura",
    desc: "Conclua «Microtexto 1» na jornada para ler textos guiados.",
    after: "Lição 13 · Microtexto 1",
  },
};

export const TREINO_UNLOCK_COPY = {
  title: "Treino livre",
  desc: "Complete 3 lições na jornada para praticar cada competência à vontade.",
  after: "Primeira revisão",
};
