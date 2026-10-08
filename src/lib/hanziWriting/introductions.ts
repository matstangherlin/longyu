/**
 * RC2.3.4A — where the Journey first introduces each Hànzì.
 *
 * Derived from the authored lessons, never typed by hand: a character counts
 * as introduced by the first lesson whose steps put that character in focus
 * (recognize / decompose / hanzi_evolution / hanzi_build). Replaces the
 * informal "p1-primeiros-hanzi teaches 木 / 人" allowlist from RC2.3.4.
 */

import { CHARACTERS } from "../../data/characters";
import { ALL_LESSONS, type LessonStep } from "../../data/journey";

export interface HanziIntroduction {
  charId: string;
  character: string;
  lessonId: string;
  lessonIndex: number;
  stepKind: LessonStep["kind"];
}

const charById = new Map(CHARACTERS.map((char) => [char.id, char]));
const charByGlyph = new Map(CHARACTERS.map((char) => [char.hanzi, char]));

/** Characters a single step puts in focus (teaching/exposure kinds only). */
export function introducedCharIdsForStep(step: LessonStep): string[] {
  switch (step.kind) {
    case "recognize":
    case "decompose":
      return step.charId ? [step.charId] : [];
    case "hanzi_evolution":
      return step.charIds ?? [];
    case "hanzi_build": {
      const glyph = typeof step.correctAnswer === "string" ? step.correctAnswer : step.hanzi;
      const char = glyph ? charByGlyph.get(glyph) : undefined;
      return char ? [char.id] : step.charId ? [step.charId] : [];
    }
    default:
      return [];
  }
}

function buildIndex(): Map<string, HanziIntroduction> {
  const index = new Map<string, HanziIntroduction>();
  ALL_LESSONS.forEach((lesson, lessonIndex) => {
    for (const step of lesson.steps) {
      for (const charId of introducedCharIdsForStep(step)) {
        if (index.has(charId)) continue;
        const char = charById.get(charId);
        if (!char) continue;
        index.set(charId, {
          charId,
          character: char.hanzi,
          lessonId: lesson.id,
          lessonIndex,
          stepKind: step.kind,
        });
      }
    }
  });
  return index;
}

let cached: Map<string, HanziIntroduction> | null = null;

export function hanziIntroductionIndex(): ReadonlyMap<string, HanziIntroduction> {
  cached ??= buildIndex();
  return cached;
}

export function firstIntroductionFor(charId: string): HanziIntroduction | null {
  return hanziIntroductionIndex().get(charId) ?? null;
}

/** True when a completed lesson put the character in focus. */
export function introducedByCompletedLessons(charId: string, completedLessons: readonly string[] | undefined): boolean {
  if (!completedLessons?.length) return false;
  const completed = new Set(completedLessons);
  return ALL_LESSONS.some(
    (lesson) => completed.has(lesson.id) && lesson.steps.some((step) => introducedCharIdsForStep(step).includes(charId))
  );
}
