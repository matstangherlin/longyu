/**
 * V4.9.6C — which Journey units should carry culture, and which must not.
 *
 * Social / daily units need at least one related CultureItem.
 * Pure tone labs and technical hànzì labs are culture-ineligible.
 *
 * New functional units (V4.9.7+) must pick a bucket when they are added.
 */
import { CULTURE_ITEMS, type CultureCategory } from "./culture";
import { JOURNEY, type Unit } from "./journey";

export type CultureUnitEligibility =
  | { unitId: string; title: string; eligible: true }
  | { unitId: string; title: string; eligible: false; reason: string };

/** Explicit ineligibility: do not force culture onto phonetic or glyph labs. */
export const CULTURE_INELIGIBLE_UNITS: Record<string, string> = {
  "u2-1": "Tone contour laboratory (mā má mǎ mà). Perception, not a social situation.",
  "u2-2": "Applied tone practice on syllables. Phonetic drill, not situational culture.",
  "u4-1": "Hànzì radicals as logical pieces. Technical character pedagogy.",
  "u4-2": "Phono-semantic character construction. Technical hànzì lab.",
  "u5-0": "Character construction logic (林 / 明 / 从). Glyph pedagogy.",
  "u5-1": "Counting 1–10 as number pedagogy. Culture of 4/8 may relate later without a unit-level duty.",
  "u5-2": "Compound-word literacy from known pieces (我们 / 中国 / 朋友), not a social situation unit.",
};

/**
 * Architecture hook for later remessas: when a new functional unit lands,
 * evaluate related culture in the same change — do not backfill years later.
 */
export const FUTURE_UNIT_CULTURE_HOOKS: {
  remessa: string;
  themes: string[];
  categories: CultureCategory[];
}[] = [
  {
    remessa: "V4.9.7 China Survival I",
    themes: ["restaurante", "comida", "compras", "pedidos", "pagamentos", "mercados"],
    categories: ["table_food", "contemporary_china", "daily_life"],
  },
  {
    remessa: "V4.9.8 travel",
    themes: ["transporte", "hotel", "aeroporto"],
    categories: ["transport_public", "daily_life", "communication_relations"],
  },
  {
    remessa: "V4.9.9 health and talk",
    themes: ["saúde", "emergência", "conversa cotidiana"],
    categories: ["communication_relations", "daily_life", "social_etiquette"],
  },
];

export function allJourneyUnits(): { phaseId: string; phaseTitle: string; unit: Unit }[] {
  return JOURNEY.flatMap((phase) =>
    phase.units.map((unit) => ({ phaseId: phase.id, phaseTitle: phase.title, unit }))
  );
}

export function cultureEligibilityForUnit(unit: Unit): CultureUnitEligibility {
  const reason = CULTURE_INELIGIBLE_UNITS[unit.id];
  if (reason) return { unitId: unit.id, title: unit.title, eligible: false, reason };
  return { unitId: unit.id, title: unit.title, eligible: true };
}

export function relatedCultureItemIdsForUnit(unit: Unit): string[] {
  const lessonIds = new Set(unit.lessons.map((lesson) => lesson.id));
  return CULTURE_ITEMS.filter((item) => item.relatedLessonIds.some((id) => lessonIds.has(id))).map(
    (item) => item.id
  );
}

export function lessonsWithCultureTouchpoint(unit: Unit): string[] {
  return unit.lessons.filter((lesson) => Boolean(lesson.cultureItemId)).map((lesson) => lesson.id);
}
