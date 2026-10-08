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
 *
 * Sempre emite um finding por conceito concreto na primeira exposição:
 * - code=null + sem exceção → coberto (aluno encontra o visual)
 * - justifiedException=ASSET_REQUIRED → sem asset (não conta como PASS nem fail duro)
 * - code=CONCRETE_FIRST_EXPOSURE_WITHOUT_VISUAL → fail (salvo exceção justificada)
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
      conceptId: step.visualConceptId || step.imageId,
      unitIndex: input.unitIndex ?? 0,
      allowUntaughtTarget: true,
    });
    if (!resolved.concept || resolved.visualClass !== "CONCRETE_VISUAL") continue;
    if (seen.has(resolved.concept.id)) continue;
    seen.add(resolved.concept.id);

    const isExposure =
      step.pedagogyRole === "discovery" ||
      step.kind === "intro" ||
      step.kind === "listen" ||
      step.kind === "flashcard";
    if (!isExposure) continue;

    const hasVisual = Boolean(step.imageId || step.iconId || step.visualConceptId || step.kind === "image_choice");

    if (!resolved.hasLocalAsset) {
      findings.push({
        code: null,
        conceptId: resolved.concept.id,
        hanzi: resolved.concept.hanzi,
        justifiedException: "ASSET_REQUIRED",
      });
      continue;
    }

    if (hasVisual) {
      findings.push({
        code: null,
        conceptId: resolved.concept.id,
        hanzi: resolved.concept.hanzi,
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
