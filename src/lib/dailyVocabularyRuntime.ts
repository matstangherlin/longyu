/**
 * RC2.2.15 — cola entre o estado do app e as funções puras da Palavra do dia
 * (src/lib/dailyVocabulary.ts + src/lib/dailyVocabularyPlan.ts).
 *
 * Significado = idioma do CURSO (CourseDirection). O idioma da interface só
 * decide a frase de chamada ("Toque para…") e o nome do canal.
 */
import type { CourseDirectionId } from "../i18n/courseDirection";
import {
  buildDailyVocabularyPool,
  dailyVocabularyCandidate,
  meaningForDirection,
  notificationHint,
  rankDailyVocabulary,
  type DailyVocabularyCandidate,
  type DailyVocabularyLearner,
  type RankedDailyVocabulary,
} from "./dailyVocabulary";
import { DAILY_VOCABULARY_ROUTE, type DailyVocabularyExposure, type PlanWord } from "./dailyVocabularyPlan";

export interface DailyVocabularyStateSlice {
  completedLessons: readonly string[];
  learnedChars: readonly string[];
  learnedChunks: readonly string[];
  srs: Readonly<Record<string, { reps?: number } | undefined>>;
  dailyVocabulary?: { exposures?: readonly DailyVocabularyExposure[] } | null;
}

export function learnerFromState(s: DailyVocabularyStateSlice): DailyVocabularyLearner {
  return { completedLessons: s.completedLessons, learnedChars: s.learnedChars, learnedChunks: s.learnedChunks, srs: s.srs };
}

export function exposuresFromState(s: DailyVocabularyStateSlice): readonly DailyVocabularyExposure[] {
  return s.dailyVocabulary?.exposures ?? [];
}

export function rankedForState(s: DailyVocabularyStateSlice, direction: CourseDirectionId, today: string): RankedDailyVocabulary[] {
  return rankDailyVocabulary({ learner: learnerFromState(s), direction, history: exposuresFromState(s), todayKey: today });
}

export function planWordFor(candidate: DailyVocabularyCandidate, direction: CourseDirectionId): PlanWord | null {
  const meaning = meaningForDirection(candidate, direction);
  if (!meaning) return null;
  return { id: candidate.id, hanzi: candidate.hanzi, pinyin: candidate.pinyin, meaning, hint: notificationHint(candidate, direction) };
}

export function planWordsFor(ranked: readonly RankedDailyVocabulary[], direction: CourseDirectionId): PlanWord[] {
  return ranked.map((item) => planWordFor(item.candidate, direction)).filter((word): word is PlanWord => word != null);
}

/**
 * Palavra de HOJE sem notificação (Web, ou sem permissão): a já definida para
 * hoje, se ainda existe no pool; senão a primeira candidata segura. null = nada.
 */
export function todayAssignmentFor(s: DailyVocabularyStateSlice, direction: CourseDirectionId, today: string): string | null {
  const existing = exposuresFromState(s).find((entry) => entry.dateKey === today);
  if (existing && dailyVocabularyCandidate(existing.lexicalId)) return existing.lexicalId;
  return rankedForState(s, direction, today)[0]?.candidate.id ?? null;
}

export function todayExposure(s: DailyVocabularyStateSlice, today: string): DailyVocabularyExposure | null {
  return exposuresFromState(s).find((entry) => entry.dateKey === today) ?? null;
}

/** Rota da palavra só para ids do pool (deep link / toque na notificação). */
export function dailyVocabularyRouteFor(lexicalId: string | null | undefined): string | null {
  const candidate = dailyVocabularyCandidate(lexicalId);
  return candidate ? `${DAILY_VOCABULARY_ROUTE}/${candidate.id}` : null;
}

export { buildDailyVocabularyPool };
