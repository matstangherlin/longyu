import type { Character, Chunk, ItemType } from "../../data/types";
import type { ReviewDomain } from "../../lib/srs";
import type { Track } from "../../lib/store";

export type BlitzQuestionKind =
  | "audio_to_hanzi"
  | "hanzi_to_meaning"
  | "meaning_to_hanzi"
  | "missing_piece"
  | "tone_number";

export interface BlitzQuestion {
  id: string;
  kind: BlitzQuestionKind;
  prompt: string;
  stimulus?: string;
  audioText?: string;
  options: string[];
  answer: string;
  sourceType: ItemType;
  sourceId: string;
  reviewDomain: ReviewDomain;
  track: Track;
}

export interface BlitzSessionConfig {
  timeLimitSeconds: number;
  /** null keeps the standalone time-only modality. */
  maxQuestions: number | null;
}

export type BlitzTerminationReason = "TIME_LIMIT_REACHED" | "MAX_QUESTIONS_REACHED";

export function reachedBlitzQuestionLimit(answered: number, config: BlitzSessionConfig): boolean {
  return config.maxQuestions != null && answered >= config.maxQuestions;
}

function unique(values: (string | undefined)[]): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter((value): value is string => Boolean(value)))];
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function deterministicShuffle<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  let state = hash(seed) || 1;
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const swapIndex = state % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function choices(answer: string, distractors: string[], seed: string, limit = 4): string[] {
  return deterministicShuffle(unique([answer, ...distractors]).slice(0, limit), seed);
}

function chunkQuestions(chunk: Chunk, chunks: readonly Chunk[], characters: readonly Character[]): BlitzQuestion[] {
  const otherHanzi = chunks.filter((item) => item.id !== chunk.id).map((item) => item.hanzi);
  const otherMeanings = chunks.filter((item) => item.id !== chunk.id).map((item) => item.meaningPt);
  const result: BlitzQuestion[] = [
    {
      id: `audio_to_hanzi:chunk:${chunk.id}`,
      kind: "audio_to_hanzi",
      prompt: "Qual frase você ouviu?",
      audioText: chunk.hanzi,
      options: choices(chunk.hanzi, otherHanzi, `${chunk.id}:audio`),
      answer: chunk.hanzi,
      sourceType: "chunk",
      sourceId: chunk.id,
      reviewDomain: "som",
      track: "som",
    },
    {
      id: `hanzi_to_meaning:chunk:${chunk.id}`,
      kind: "hanzi_to_meaning",
      prompt: "O que esta frase quer dizer?",
      stimulus: chunk.hanzi,
      options: choices(chunk.meaningPt, otherMeanings, `${chunk.id}:meaning`),
      answer: chunk.meaningPt,
      sourceType: "chunk",
      sourceId: chunk.id,
      reviewDomain: "significado",
      track: "fala",
    },
    {
      id: `meaning_to_hanzi:chunk:${chunk.id}`,
      kind: "meaning_to_hanzi",
      prompt: "Escolha a frase em mandarim.",
      stimulus: chunk.meaningPt,
      options: choices(chunk.hanzi, otherHanzi, `${chunk.id}:hanzi`),
      answer: chunk.hanzi,
      sourceType: "chunk",
      sourceId: chunk.id,
      reviewDomain: "uso",
      track: "fala",
    },
  ];

  const glyphs = [...chunk.hanzi].filter((glyph) => /[\u3400-\u9fff]/u.test(glyph));
  if (glyphs.length >= 2) {
    const missingIndex = hash(chunk.id) % glyphs.length;
    const answer = glyphs[missingIndex];
    const distractors = unique([
      ...characters.map((character) => character.hanzi),
      ...chunks.flatMap((item) => [...item.hanzi]),
    ]).filter((glyph) => glyph !== answer && /[\u3400-\u9fff]/u.test(glyph));
    result.push({
      id: `missing_piece:chunk:${chunk.id}`,
      kind: "missing_piece",
      prompt: "Qual peça completa a frase?",
      stimulus: glyphs.map((glyph, index) => (index === missingIndex ? "＿" : glyph)).join(""),
      options: choices(answer, distractors, `${chunk.id}:missing`),
      answer,
      sourceType: "chunk",
      sourceId: chunk.id,
      reviewDomain: "forma",
      track: "hanzi",
    });
  }
  return result;
}

function characterQuestions(character: Character, characters: readonly Character[]): BlitzQuestion[] {
  const toneLabel = character.tone === 5 ? "Tom neutro" : `${character.tone}º tom`;
  return [
    {
      id: `tone_number:char:${character.id}`,
      kind: "tone_number",
      prompt: "Qual é o tom desta pronúncia?",
      stimulus: character.hanzi,
      audioText: character.hanzi,
      options: deterministicShuffle(["1º tom", "2º tom", "3º tom", "4º tom", "Tom neutro"], `${character.id}:tone`),
      answer: toneLabel,
      sourceType: "char",
      sourceId: character.id,
      reviewDomain: "som",
      track: "som",
    },
    {
      id: `meaning_to_hanzi:char:${character.id}`,
      kind: "meaning_to_hanzi",
      prompt: "Qual hànzì corresponde a este significado?",
      stimulus: character.meaningPt,
      options: choices(
        character.hanzi,
        characters.filter((item) => item.id !== character.id).map((item) => item.hanzi),
        `${character.id}:shape`
      ),
      answer: character.hanzi,
      sourceType: "char",
      sourceId: character.id,
      reviewDomain: "forma",
      track: "hanzi",
    },
  ];
}

/** Baralho determinístico e estritamente limitado ao vocabulário desbloqueado. */
export function buildMandarinBlitzDeck(
  learnedChunks: readonly Chunk[],
  learnedCharacters: readonly Character[],
  seed = "longyu-blitz"
): BlitzQuestion[] {
  const questions = [
    ...learnedChunks.flatMap((chunk) => chunkQuestions(chunk, learnedChunks, learnedCharacters)),
    ...learnedCharacters.flatMap((character) => characterQuestions(character, learnedCharacters)),
  ].filter((question) => question.options.length >= 2 && question.options.includes(question.answer));
  return deterministicShuffle(questions, seed);
}

