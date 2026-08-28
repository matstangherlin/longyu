import type { ReviewExercise } from "../../features/revisao/reviewExerciseBuilder";
import { DEFAULT_LOCALE, type SupportedLocale } from "../config";
import { getInterfaceLocale } from "../locale";
import {
  isCanonicalZhOrPinyin,
  localizeStringList,
  resolveInstructionText,
} from "./instructionGloss";

function loc(text: string | undefined, locale: SupportedLocale): string | undefined {
  if (text == null) return text;
  if (isCanonicalZhOrPinyin(text)) return text;
  return resolveInstructionText(text, locale);
}

function locRequired(text: string, locale: SupportedLocale): string {
  if (isCanonicalZhOrPinyin(text)) return text;
  return resolveInstructionText(text, locale);
}

export function localizeReviewExercise(
  exercise: ReviewExercise | null,
  locale: SupportedLocale = getInterfaceLocale()
): ReviewExercise | null {
  if (!exercise || locale === DEFAULT_LOCALE) return exercise;
  return {
    ...exercise,
    prompt: locRequired(exercise.prompt, locale),
    question: loc(exercise.question, locale),
    displayText: loc(exercise.displayText, locale),
    answer: locRequired(exercise.answer, locale),
    answerLabel: locRequired(exercise.answerLabel, locale),
    explanation: locRequired(exercise.explanation, locale),
    options: exercise.options?.map((option) => ({
      ...option,
      value: locRequired(option.value, locale),
      label: locRequired(option.label, locale),
      detail: loc(option.detail, locale),
    })),
    pieces: exercise.pieces?.map((piece) => ({
      ...piece,
      value: locRequired(piece.value, locale),
    })),
    targetValues: localizeStringList(exercise.targetValues, locale),
    pairs: exercise.pairs?.map((pair) => ({
      ...pair,
      left:
        pair.leftType === "pt" || !isCanonicalZhOrPinyin(pair.left)
          ? locRequired(pair.left, locale)
          : pair.left,
      right:
        pair.rightType === "pt" || !isCanonicalZhOrPinyin(pair.right)
          ? locRequired(pair.right, locale)
          : pair.right,
    })),
    entity: {
      ...exercise.entity,
      meaningPt: locRequired(exercise.entity.meaningPt, locale),
      literalPt: loc(exercise.entity.literalPt, locale),
      mnemonicPt: loc(exercise.entity.mnemonicPt, locale),
    },
  };
}
