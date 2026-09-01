import type { LessonStep } from "../../data/journey";
import type { ConversationNode, ConversationInteraction, ConversationCheckpoint } from "../../data/conversationScenes";
import { DEFAULT_LOCALE, type SupportedLocale } from "../config";
import { getInstructionLocale } from "../instructionLocale";
import {
  isCanonicalZhOrPinyin,
  localizeStringList,
  resolveInstructionText,
  toCanonicalAnswerIdentity,
} from "./instructionGloss";

const STEP_TEXT_FIELDS = [
  "title",
  "body",
  "prompt",
  "promptPt",
  "pt",
  "targetMeaningPt",
  "explanation",
  "situationPt",
  "patternPt",
  "productionHintPt",
  "groupLabelPt",
  "contrastLabel",
  "suggestion",
  "dialoguePrompt",
  "placeholder",
  "speaker",
  "sourceMeaning",
] as const;

function loc(text: string | undefined, locale: SupportedLocale): string | undefined {
  if (text == null) return text;
  return resolveInstructionText(text, locale);
}

function locRequired(text: string | undefined, locale: SupportedLocale): string | undefined {
  if (text == null) return text;
  if (isCanonicalZhOrPinyin(text)) return text;
  return resolveInstructionText(text, locale);
}

function localizeInteraction(
  interaction: ConversationInteraction,
  locale: SupportedLocale
): ConversationInteraction {
  return {
    ...interaction,
    prompt: resolveInstructionText(interaction.prompt, locale),
    options: localizeStringList(interaction.options, locale),
    correctAnswer: locRequired(interaction.correctAnswer, locale) ?? interaction.correctAnswer,
    explanation: loc(interaction.explanation, locale),
    accepts: localizeStringList(interaction.accepts, locale),
    removedOptions: localizeStringList(interaction.removedOptions, locale),
  };
}

function localizeCheckpoint(
  checkpoint: ConversationCheckpoint,
  locale: SupportedLocale
): ConversationCheckpoint {
  return {
    ...checkpoint,
    prompt: resolveInstructionText(checkpoint.prompt, locale),
    options: localizeStringList(checkpoint.options, locale),
    correctAnswer: locRequired(checkpoint.correctAnswer, locale) ?? checkpoint.correctAnswer,
    explanation: loc(checkpoint.explanation, locale),
  };
}

function localizeNode(node: ConversationNode, locale: SupportedLocale): ConversationNode {
  return {
    ...node,
    pt: loc(node.pt, locale),
    interaction: node.interaction ? localizeInteraction(node.interaction, locale) : undefined,
  };
}

export function localizeLessonTitle(
  title: string | undefined | null,
  locale: SupportedLocale = getInstructionLocale()
): string {
  return resolveInstructionText(title ?? "", locale);
}

export function localizeLessonStep(
  step: LessonStep,
  locale: SupportedLocale = getInstructionLocale()
): LessonStep {
  if (locale === DEFAULT_LOCALE) return step;
  const next: LessonStep = { ...step };
  for (const field of STEP_TEXT_FIELDS) {
    const value = step[field];
    if (typeof value === "string") {
      (next as unknown as Record<string, unknown>)[field] = resolveInstructionText(value, locale);
    }
  }
  if (typeof step.answer === "string") next.answer = locRequired(step.answer, locale);
  if (typeof step.correctAnswer === "string") next.correctAnswer = locRequired(step.correctAnswer, locale);
  if (typeof step.blankAnswer === "string") next.blankAnswer = locRequired(step.blankAnswer, locale);
  next.options = localizeStringList(step.options, locale);
  next.wordBank = localizeStringList(step.wordBank, locale);
  next.bank = localizeStringList(step.bank, locale);
  next.accepts = localizeStringList(step.accepts, locale);
  next.distractors = localizeStringList(step.distractors, locale);
  if (step.target?.some((part) => !isCanonicalZhOrPinyin(part))) {
    next.target = localizeStringList(step.target, locale);
  }
  if (step.targetParts?.some((part) => !isCanonicalZhOrPinyin(part))) {
    next.targetParts = localizeStringList(step.targetParts, locale);
  }
  if (step.pairs) {
    next.pairs = step.pairs.map((pair) => ({
      ...pair,
      left: pair.leftType === "pt" || !isCanonicalZhOrPinyin(pair.left)
        ? resolveInstructionText(pair.left, locale)
        : pair.left,
      right: pair.rightType === "pt" || !isCanonicalZhOrPinyin(pair.right)
        ? resolveInstructionText(pair.right, locale)
        : pair.right,
    }));
  }
  if (step.lines) {
    next.lines = step.lines.map((line) => ({
      ...line,
      pt: loc(line.pt, locale),
    }));
  }
  if (step.optionMeta) {
    next.optionMeta = Object.fromEntries(
      Object.entries(step.optionMeta).map(([key, meta]) => [
        key,
        {
          ...meta,
          meaningPt: meta?.meaningPt ? resolveInstructionText(meta.meaningPt, locale) : meta?.meaningPt,
        },
      ])
    );
  }
  if (step.pairReveal) {
    next.pairReveal = step.pairReveal.map((row) => ({
      ...row,
      meaningPt: resolveInstructionText(row.meaningPt, locale),
    }));
  }
  if (step.nodes) {
    next.nodes = step.nodes.map((node) => localizeNode(node, locale));
  }
  if (step.checkpoint) {
    next.checkpoint = localizeCheckpoint(step.checkpoint, locale);
  }
  if (step.characters) {
    next.characters = step.characters.map((character) => ({
      ...character,
      name: resolveInstructionText(character.name, locale),
    }));
  }
  return next;
}

export function canonicalStepFingerprint(step: LessonStep): string {
  return [
    step.kind,
    step.hanzi ?? "",
    step.pinyin ?? "",
    step.targetHanzi ?? "",
    step.targetPinyin ?? "",
    step.audioText ?? "",
    step.charId ?? "",
    step.chunkId ?? "",
    step.sceneId ?? "",
    step.builderId ?? "",
    (step.targetParts ?? step.target ?? []).map((part) => toCanonicalAnswerIdentity(part)).join(""),
  ].join("|");
}
