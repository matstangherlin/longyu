/**
 * RC2.3.1 — first exposure visual contract.
 */
import type { LessonStep } from "../../data/journey";
import { resolveCurriculumVisual, CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL } from "./resolveCurriculumVisual";

export interface FirstExposureFinding {
  code: typeof CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL | null;
  conceptId: string;
  hanzi: string;
  justifiedException?: string;
}

/**
 * Audita se a primeira Descoberta/exposição de conceitos concretos usa visual
 * quando o asset existe.
 */
export function auditConcreteFirstExposure(input: {
  lessonId: string;
  steps: readonly LessonStep[];
  unitIndex?: number;
  justifiedExceptions?: Readonly<Record<string, string>>;
}): FirstExposureFinding[] {
  const findings: FirstExposureFinding[] = [];
  const seen = new Set<string>();
  for (const step of input.steps) {
    const blob = [step.hanzi, step.targetHanzi, step.text, step.audioText].filter(Boolean).join("");
    const resolved = resolveCurriculumVisual({
      text: blob,
      conceptId: step.imageId,
      unitIndex: input.unitIndex ?? 0,
      allowUntaughtTarget: true,
    });
    if (!resolved.concept || resolved.visualClass !== "CONCRETE_VISUAL") continue;
    if (seen.has(resolved.concept.id)) continue;
    seen.add(resolved.concept.id);

    const isExposure = step.pedagogyRole === "discovery" || step.kind === "intro" || step.kind === "listen" || step.kind === "flashcard";
    if (!isExposure) continue;

    const hasVisual = Boolean(step.imageId || step.iconId || step.kind === "image_choice");
    if (hasVisual && resolved.hasLocalAsset) continue;

    if (!resolved.hasLocalAsset) {
      findings.push({
        code: null,
        conceptId: resolved.concept.id,
        hanzi: resolved.concept.hanzi,
        justifiedException: "ASSET_REQUIRED",
      });
      continue;
    }

    const justified = input.justifiedExceptions?.[resolved.concept.id];
    findings.push({
      code: justified ? null : CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL,
      conceptId: resolved.concept.id,
      hanzi: resolved.concept.hanzi,
      justifiedException: justified,
    });
  }
  return findings;
}
