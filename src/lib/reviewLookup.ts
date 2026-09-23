/**
 * RC2.2.8 · D — Revisão é aprendizagem, não prova.
 *
 * Na aba Revisão e na revisão/remediação da Jornada o aluno PODE consultar o
 * Hànzì (hover no desktop, toque/segurar no mobile): pinyin, significado, áudio
 * e "Ver no Atlas". Consultar antes de responder não é erro — é aprendizagem
 * assistida — mas também não é recordação independente:
 *
 * - `reviewAssistanceUsed = true` na tentativa;
 * - a sugestão automática nunca é Easy (preferência: Hard);
 * - a nota efetiva de um acerto assistido fica no máximo em Hard.
 *
 * Em prova de verdade a consulta continua bloqueada: nivelamento, Phase
 * Challenge, teste de módulo e avaliação pontuada (D5, K12).
 */

import type { Grade } from "./srs";

export type LearningSurface =
  | "review"
  | "journey_review"
  | "journey_remediation"
  | "lesson"
  | "placement"
  | "phase_challenge"
  | "module_challenge"
  | "graded_assessment";

/** D5 / K12 — superfícies de prova: consulta DESATIVADA. */
export const EXAM_SURFACES: readonly LearningSurface[] = [
  "placement",
  "phase_challenge",
  "module_challenge",
  "graded_assessment",
];

/** D1 / D8 — superfícies de revisão: consulta PERMITIDA e registrada. */
export const REVIEW_LOOKUP_SURFACES: readonly LearningSurface[] = ["review", "journey_review", "journey_remediation"];

export function isGlossLookupAllowed(surface: LearningSurface): boolean {
  return !EXAM_SURFACES.includes(surface);
}

export function tracksReviewAssistance(surface: LearningSurface): boolean {
  return REVIEW_LOOKUP_SURFACES.includes(surface);
}

const GRADE_ORDER: Grade[] = ["again", "hard", "good", "easy"];

/** D7.1 — teto de nota para acerto com consulta. */
export const ASSISTED_GRADE_CEILING: Grade = "hard";

export function capAssistedGrade(grade: Grade, assisted: boolean): Grade {
  if (!assisted) return grade;
  return GRADE_ORDER.indexOf(grade) > GRADE_ORDER.indexOf(ASSISTED_GRADE_CEILING) ? ASSISTED_GRADE_CEILING : grade;
}

/** Sugestão automática da revisão (mesmos cortes de tempo de antes + teto assistido). */
export function reviewSuggestedGrade(input: { correct: boolean; elapsedMs: number; assisted: boolean }): Grade {
  if (!input.correct) return "again";
  const base: Grade = input.elapsedMs <= 8000 ? "easy" : input.elapsedMs >= 22000 ? "hard" : "good";
  return capAssistedGrade(base, input.assisted);
}

/** D6.2 — independente = acertou sem consultar antes de responder. */
export function isIndependentRecall(input: { correct: boolean; assisted: boolean }): boolean {
  return input.correct && !input.assisted;
}

/** F4 — rota canônica do Atlas para um Hànzì (primeiro caractere CJK). */
export function atlasHrefForHanzi(text: string, charId?: string): string | null {
  if (charId) return `/hanzi/atlas?char=${encodeURIComponent(charId)}`;
  const first = Array.from(text ?? "").find((char) => /[㐀-鿿豈-﫿]/u.test(char));
  return first ? `/hanzi/atlas?char=${encodeURIComponent(first)}` : null;
}
