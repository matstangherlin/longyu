/**
 * Pedagogia V3.4 — Mastery Completion, ponto de entrada único.
 *
 * masteryPilot.ts importa apenas deste índice (nunca de completion.ts/types.ts
 * diretamente), para manter o limite do módulo claro.
 */
export {
  COMPLETION_LESSON_IDS,
  COMPLETION_LEXICAL_TARGETS,
  completionBonusStepsFor,
  isCompletionLesson,
  type CompletionLessonId,
} from "./completion";
export type { LexicalItemSpec, UnitLexicalTargets, VocabRole } from "./types";
