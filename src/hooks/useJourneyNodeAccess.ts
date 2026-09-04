/**
 * Acesso a um node da Jornada, com a mesma autoridade em todo lugar.
 *
 * A Jornada não é o único caminho até um engine: `/som?journeyNode=...`,
 * `/pinyin?journeyNode=...`, `/hanzi?journeyNode=...` e `/jornada/reforco/:id`
 * abrem direto por URL. Até a V4.9.1 esses caminhos não checavam prerequisite
 * algum — bastava conhecer o link para pular o portão que o painel aplicava.
 *
 * Este hook monta o estado do aluno exatamente como a Jornada monta e delega a
 * decisão para `evaluateJourneyNodeReadiness`. Deep link e painel passam a ler
 * a mesma resposta; o `currentTopicId` é derivado da mesma função pura que a
 * JourneyPage usa, para que o escape hatch valha nos dois caminhos.
 */
import { useMemo } from "react";
import { ALL_LESSONS, currentLessonId } from "../data/journey";
import type { JourneyNode } from "../data/journeyOrchestrator";
import {
  evaluateJourneyNodeReadiness,
  type JourneyNodeReadiness,
  type LearnerReadinessState,
} from "../lib/journeyReadiness";
import { completedJourneyNodeIds } from "../lib/journeyNodeProgress";
import { useStore } from "../lib/store";

export function useLearnerReadinessState(): LearnerReadinessState {
  const completedLessons = useStore((state) => state.completedLessons);
  const lessonMasteryById = useStore((state) => state.lessonMasteryById);
  const learnedChunks = useStore((state) => state.learnedChunks);
  const learnedChars = useStore((state) => state.learnedChars);
  const srs = useStore((state) => state.srs);
  const isPremium = useStore((state) => state.isPremium);

  const knownPatternCount = useMemo(
    () =>
      new Set(
        ALL_LESSONS.filter((lesson) => completedLessons.includes(lesson.id)).flatMap((lesson) =>
          (lesson.steps ?? []).map((step) => step.patternPt).filter((value): value is string => Boolean(value))
        )
      ).size,
    [completedLessons]
  );

  return useMemo(
    () => ({
      completedLessons,
      lessonMasteryById,
      learnedChunks,
      learnedChars,
      knownPatternCount,
      srs,
      completedNodeIds: completedJourneyNodeIds(),
      currentTopicId: currentLessonId(completedLessons, isPremium, lessonMasteryById),
    }),
    [completedLessons, lessonMasteryById, learnedChunks, learnedChars, knownPatternCount, srs, isPremium]
  );
}

/** `undefined` quando não há node — rota livre, sem portão a aplicar. */
export function useJourneyNodeAccess(node: JourneyNode | undefined): JourneyNodeReadiness | undefined {
  const state = useLearnerReadinessState();
  return useMemo(() => (node ? evaluateJourneyNodeReadiness(node, state) : undefined), [node, state]);
}
