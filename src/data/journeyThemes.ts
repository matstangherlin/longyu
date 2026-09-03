import { resolveInstructionText } from "../i18n/overlays/instructionGloss";
import { JOURNEY } from "./journey";
import { isTopicMasteryLesson } from "./topicMastery";

export interface Theme {
  id: string;
  titlePt: string;
  titleEn: string;
  goal: { "pt-BR": string; en: string };
  prerequisiteThemes: string[];
  topicIds: string[];
  outcomes: string[];
  coreVocabulary: string[];
  corePatterns: string[];
  recommendedBoosters: string[];
}

const units = JOURNEY.flatMap((phase) => phase.units);

/** Theme identity is derived from the real Journey units, preserving every topic id and order. */
export const JOURNEY_THEMES: Theme[] = units.map((unit, index) => ({
  id: `theme:${unit.id}`,
  titlePt: unit.title,
  titleEn: resolveInstructionText(unit.title, "en"),
  goal: { "pt-BR": unit.goal, en: resolveInstructionText(unit.goal, "en") },
  prerequisiteThemes: index > 0 ? [`theme:${units[index - 1].id}`] : [],
  topicIds: unit.lessons.filter(isTopicMasteryLesson).map((lesson) => lesson.id),
  outcomes: unit.focusSituations,
  coreVocabulary: [...unit.focusChunks, ...unit.focusHanzi],
  corePatterns: unit.focusGrammar,
  recommendedBoosters: unit.id === "u1-1" ? ["booster:foundations-blitz:v1"] : [],
}));

export function themeForTopic(topicId: string): Theme | undefined {
  return JOURNEY_THEMES.find((theme) => theme.topicIds.includes(topicId));
}
