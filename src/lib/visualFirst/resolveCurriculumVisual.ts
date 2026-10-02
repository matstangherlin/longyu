/**
 * RC2.3.1 — resolução curricular de visual (substitui EARLY_VISUAL_CONCRETE piloto).
 */
import {
  VISUAL_CONCEPTS,
  defaultVisualDistractors,
  isVisualConceptAllowed,
  resolveVisualConcept,
  visualConceptsInHanziText,
  visualStyleFamily,
  type VisualConcept,
  type VisualConceptId,
  type VisualStyleFamily,
} from "../../data/visualVocabulary";
import { classifyVisualText, type VisualClass } from "./classify";

export const VISUAL_STYLE_FAMILY_MISMATCH = "VISUAL_STYLE_FAMILY_MISMATCH" as const;
export const VISUAL_CURRICULUM_LEAK = "VISUAL_CURRICULUM_LEAK" as const;
export const CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL = "CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL" as const;
export const VISUAL_PRESENTATION_SATURATION = "VISUAL_PRESENTATION_SATURATION" as const;
export const VISUAL_SUPPORT_MISSING = "VISUAL_SUPPORT_MISSING" as const;
export const ASSET_REQUIRED = "ASSET_REQUIRED" as const;

export interface CurriculumVisualResolution {
  concept: VisualConcept | null;
  visualClass: VisualClass;
  conceptId: string | null;
  hanzi: string | null;
  allowedByUnit: boolean;
  imageOnlySafe: boolean;
  hasLocalAsset: boolean;
  /** emoji fallback ≠ visual curriculum complete */
  emojiOnlyFallback: boolean;
  justifiedException?: string;
}

export interface ResolveCurriculumVisualInput {
  text?: string;
  conceptId?: string;
  unitIndex?: number;
  taughtConceptIds?: ReadonlySet<string> | readonly string[];
  /** Se true, permite conceitos ainda não ensinados (só Descoberta do próprio alvo). */
  allowUntaughtTarget?: boolean;
}

export function resolveCurriculumVisual(input: ResolveCurriculumVisualInput): CurriculumVisualResolution {
  const unitIndex = input.unitIndex ?? 0;
  const taught = new Set(
    Array.isArray(input.taughtConceptIds)
      ? input.taughtConceptIds
      : input.taughtConceptIds
        ? [...input.taughtConceptIds]
        : []
  );

  let concept: VisualConcept | undefined;
  if (input.conceptId) concept = resolveVisualConcept(input.conceptId);
  if (!concept && input.text) {
    const found = visualConceptsInHanziText(input.text);
    concept = found[0];
  }

  const hanzi = concept?.hanzi ?? (input.text && /^[\u4e00-\u9fff]+/.test(input.text) ? input.text.slice(0, 4) : null);
  const visualClass = classifyVisualText(hanzi ?? input.text ?? "");
  if (!concept) {
    return {
      concept: null,
      visualClass,
      conceptId: null,
      hanzi,
      allowedByUnit: false,
      imageOnlySafe: false,
      hasLocalAsset: false,
      emojiOnlyFallback: false,
      justifiedException: visualClass === "CONCRETE_VISUAL" ? ASSET_REQUIRED : undefined,
    };
  }

  const allowedByUnit = isVisualConceptAllowed(concept.id, unitIndex);
  const hasLocalAsset = Boolean(concept.imageSrc);
  const taughtOk =
    input.allowUntaughtTarget ||
    taught.size === 0 ||
    taught.has(concept.id) ||
    taught.has(`concept:${concept.id}`) ||
    taught.has(concept.hanzi);

  return {
    concept,
    visualClass,
    conceptId: concept.id,
    hanzi: concept.hanzi,
    allowedByUnit: allowedByUnit && taughtOk,
    imageOnlySafe: concept.imageOnlySafe !== false,
    hasLocalAsset,
    emojiOnlyFallback: !hasLocalAsset && Boolean(concept.emoji),
  };
}

/** Política de distractores visuais por mastery pass. */
export function visualDistractorsForPass(input: {
  targetId: VisualConceptId;
  masteryPass: number;
  unitIndex: number;
  count?: number;
  taughtIds?: ReadonlySet<string>;
}): VisualConceptId[] {
  const count = input.count ?? 3;
  const target = resolveVisualConcept(input.targetId);
  if (!target) return [];

  const curated = defaultVisualDistractors(input.targetId, count * 2);
  const pool = curated.length
    ? curated
    : (VISUAL_CONCEPTS.filter(
        (c) =>
          c.id !== target.id &&
          c.category === target.category &&
          isVisualConceptAllowed(c.id, input.unitIndex) &&
          !(target.ambiguousWith ?? []).includes(c.id) &&
          visualStyleFamily(c.visualStyle) === visualStyleFamily(target.visualStyle)
      ).map((c) => c.id) as VisualConceptId[]);

  const taught = input.taughtIds;
  const filtered = pool.filter((id) => {
    if (!isVisualConceptAllowed(id, input.unitIndex)) return false;
    if (taught && taught.size > 0 && !taught.has(id) && !taught.has(`concept:${id}`)) {
      // Pass 1: allow distinct untaught only if same category and imageOnlySafe
      if (input.masteryPass <= 1) {
        const c = resolveVisualConcept(id);
        return Boolean(c?.imageOnlySafe !== false);
      }
      return false;
    }
    return true;
  });

  // Pass 1 → distinct; Pass 4 → keep semantic neighbors (already same category)
  const ordered =
    input.masteryPass >= 4
      ? filtered
      : filtered.sort((a, b) => {
          const ca = resolveVisualConcept(a);
          const cb = resolveVisualConcept(b);
          // Prefer different sceneTags for early passes (more distinct)
          const overlapA = (ca?.sceneTags ?? []).filter((t) => (target.sceneTags ?? []).includes(t)).length;
          const overlapB = (cb?.sceneTags ?? []).filter((t) => (target.sceneTags ?? []).includes(t)).length;
          return overlapA - overlapB;
        });

  return ordered.slice(0, count);
}

export function assertStyleFamilyConsistent(optionIds: readonly string[]): {
  ok: boolean;
  code: typeof VISUAL_STYLE_FAMILY_MISMATCH | null;
  family: VisualStyleFamily | null;
} {
  const families = new Set<VisualStyleFamily>();
  for (const id of optionIds) {
    const c = resolveVisualConcept(id);
    if (!c) continue;
    families.add(visualStyleFamily(c.visualStyle));
  }
  if (families.size > 1) {
    return { ok: false, code: VISUAL_STYLE_FAMILY_MISMATCH, family: null };
  }
  return { ok: true, code: null, family: [...families][0] ?? null };
}

export function detectCurriculumLeak(optionIds: readonly string[], unitIndex: number): string[] {
  return optionIds.filter((id) => !isVisualConceptAllowed(id, unitIndex));
}
