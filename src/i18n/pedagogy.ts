/**
 * Pedagogical localization contract (V4.8.0 → V4.8.3).
 *
 * Two layers, never two Journeys:
 *
 * CANONICAL PEDAGOGY (locale-invariant)
 *   lessonId · topicId · stepId · targetId · hanzi · pinyin · audio
 *   answer identity · difficulty · pass · mastery · SRS itemId
 *
 * LOCALIZED PEDAGOGY (interface locale overlay)
 *   title · instruction · explanation · hint · feedback
 *   source-language gloss · context copy · grammar note
 *
 * Do NOT ship journey-en.ts / lesson-en.ts / topic21-en.ts.
 * Canonical Chinese stays in the pt-BR source tree. English is overlay-only.
 *
 * V4.8.2 first 20: PT-text-as-key compatibility overlay.
 * V4.8.3 topics 21–50: stable loc ids `p.{topicId}.m{pass}.s{nn}.{field}`
 * plus the same PT-text overlay as a compatibility resolver.
 */

import { DEFAULT_LOCALE, type SupportedLocale } from "./config";

export const CONTENT_LAYERS = ["CANONICAL_ZH", "LOCALIZABLE_INSTRUCTION"] as const;
export type ContentLayer = (typeof CONTENT_LAYERS)[number];

/**
 * UI chrome vs Mandarin gloss.
 * "Continue" is UI. "Hello" as the meaning of 你好 is a gloss.
 */
export const TEXT_ROLES = ["UI_TRANSLATION", "CHINESE_GLOSS"] as const;
export type TextRole = (typeof TEXT_ROLES)[number];

/**
 * Localizable string with a required pt-BR fallback.
 * Keys are constrained to SupportedLocale — not Record<string, string>.
 */
export type LocalizedText = {
  "pt-BR": string;
  en?: string;
};

export const CANONICAL_ZH_FIELD_NAMES = [
  "hanzi",
  "pinyin",
  "toneless",
  "tone",
  "audio",
  "audioText",
  "audioId",
  "targetId",
  "lexicalId",
  "itemId",
  "glyph",
  "components",
] as const;

export type CanonicalZhFieldName = (typeof CANONICAL_ZH_FIELD_NAMES)[number];

export const LOCALIZABLE_INSTRUCTION_FIELD_NAMES = [
  "translation",
  "meaning",
  "meaningPt",
  "explanation",
  "instruction",
  "hint",
  "feedback",
  "grammarNote",
  "context",
  "notePt",
  "mnemonicPt",
  "title",
  "intro",
] as const;

export type LocalizableInstructionFieldName = (typeof LOCALIZABLE_INSTRUCTION_FIELD_NAMES)[number];

export interface CanonicalZhContent {
  hanzi?: string;
  pinyin?: string;
  toneless?: string;
  tone?: 1 | 2 | 3 | 4 | 5;
  audio?: string;
  audioText?: string;
  audioId?: string;
  targetId?: string;
  lexicalId?: string;
  itemId?: string;
  glyph?: string;
}

export interface LocalizableInstructionContent {
  translation?: LocalizedText;
  explanation?: LocalizedText;
  instruction?: LocalizedText;
  hint?: LocalizedText;
  feedback?: LocalizedText;
  grammarNote?: LocalizedText;
  context?: LocalizedText;
}

/**
 * Lesson identity stays canonical. Overlays attach by lesson id + locale.
 * Never duplicate the lesson tree per language.
 */
export interface LocalizedLessonOverlay {
  lessonId: string;
  localized: Partial<Record<SupportedLocale, LocalizableInstructionContent>>;
}

export function resolveLocalizedText(
  text: LocalizedText | null | undefined,
  locale: SupportedLocale,
  fallback: SupportedLocale = DEFAULT_LOCALE
): string {
  if (!text) return "";
  const direct = text[locale];
  if (typeof direct === "string" && direct.length > 0) return direct;
  const home = text[fallback];
  return typeof home === "string" ? home : "";
}

export function isCanonicalZhField(name: string): name is CanonicalZhFieldName {
  return (CANONICAL_ZH_FIELD_NAMES as readonly string[]).includes(name);
}

export function isLocalizableInstructionField(name: string): name is LocalizableInstructionFieldName {
  return (LOCALIZABLE_INSTRUCTION_FIELD_NAMES as readonly string[]).includes(name);
}
