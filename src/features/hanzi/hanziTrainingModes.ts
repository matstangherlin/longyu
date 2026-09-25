import { CHARACTERS, DECOMPOSABLE } from "../../data/characters";
import { hanziLessonFor } from "../../data/hanziPedagogy";
import { RADICALS, radicalById } from "../../data/radicals";
import {
  COMPLETE_BUILDERS,
  COMPONENT_BUILDERS,
  FRAGMENT_BUILDERS,
  SENTENCE_BUILDERS,
  type HanziBuilder,
} from "../../data/hanziBuilder";
import type { HanziPracticeMode } from "../../lib/hanziPracticeRounds";
import type { MessageKey } from "../../locales/pt-BR";

/**
 * Modos de treino de hànzì (os mesmos de antes, agora com rodadas de 8).
 * Montagem usa o Hanzi Builder; "Significado" e "Peças" são os quizzes que
 * já existiam na página de hànzì.
 */
export interface HanziModeMeta {
  id: HanziPracticeMode;
  kind: "builder" | "quiz";
  titleKey: MessageKey;
  descKey: MessageKey;
  glyph: string;
}

export const HANZI_MODE_META: readonly HanziModeMeta[] = [
  { id: "fragments", kind: "builder", titleKey: "hanziHub.modeFragments", descKey: "hanziHub.modeFragmentsDesc", glyph: "木" },
  { id: "components", kind: "builder", titleKey: "hanziHub.modeComponents", descKey: "hanziHub.modeComponentsDesc", glyph: "好" },
  { id: "meaning", kind: "quiz", titleKey: "hanziHub.modeMeaning", descKey: "hanziHub.modeMeaningDesc", glyph: "人" },
  { id: "complete", kind: "builder", titleKey: "hanziHub.modeComplete", descKey: "hanziHub.modeCompleteDesc", glyph: "口" },
  { id: "pieces", kind: "quiz", titleKey: "hanziHub.modePieces", descKey: "hanziHub.modePiecesDesc", glyph: "亻" },
  { id: "sentences", kind: "builder", titleKey: "hanziHub.modeSentences", descKey: "hanziHub.modeSentencesDesc", glyph: "你" },
];

export function hanziModeMeta(id: HanziPracticeMode): HanziModeMeta {
  return HANZI_MODE_META.find((mode) => mode.id === id) ?? HANZI_MODE_META[0]!;
}

export const BUILDERS_BY_MODE: Record<"fragments" | "complete" | "components" | "sentences", HanziBuilder[]> = {
  fragments: FRAGMENT_BUILDERS,
  complete: COMPLETE_BUILDERS,
  components: COMPONENT_BUILDERS,
  sentences: SENTENCE_BUILDERS,
};

export const charIdByHanzi = new Map(CHARACTERS.map((char) => [char.hanzi, char.id]));

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface MeaningQuestion {
  kind: "meaning";
  char: (typeof CHARACTERS)[number];
  prompt?: undefined;
  answer: string;
  options: string[];
}

export interface PiecesQuestion {
  kind: "pieces";
  char: (typeof DECOMPOSABLE)[number];
  prompt: string;
  answer: string;
  options: string[];
}

export type HanziQuizQuestion = MeaningQuestion | PiecesQuestion;

export function makeMeaningQuestion(pool: typeof CHARACTERS = CHARACTERS): MeaningQuestion {
  const char = pool[Math.floor(Math.random() * pool.length)]!;
  const distractors = shuffle(pool.filter((c) => c.id !== char.id)).slice(0, 3);
  return { kind: "meaning", char, answer: char.meaningPt, options: shuffle([char, ...distractors].map((c) => c.meaningPt)) };
}

export function makePiecesQuestion(
  pool: typeof DECOMPOSABLE = DECOMPOSABLE.filter((char) => char.components.length > 0)
): PiecesQuestion {
  const char = pool[Math.floor(Math.random() * pool.length)]!;
  const lesson = hanziLessonFor(char);
  const target =
    lesson.components.find((part) => part.role === "som") ??
    lesson.components[Math.floor(Math.random() * lesson.components.length)]!;
  const radical = radicalById[target.componentId];
  const answer = radical ? `${radical.variant ?? radical.glyph} · ${radical.namePt}` : target.componentId;
  const distractors = shuffle(
    RADICALS.filter((candidate) => candidate.id !== target.componentId).map(
      (candidate) => `${candidate.variant ?? candidate.glyph} · ${candidate.namePt}`
    )
  ).slice(0, 3);
  return {
    kind: "pieces",
    char,
    prompt:
      target.role === "som"
        ? "Qual peça funciona principalmente como pista de som?"
        : "Qual peça ajuda principalmente no sentido ou na forma visual?",
    answer,
    options: shuffle([answer, ...distractors]),
  };
}
