/**
 * RC2.3.0 — contrato visual nas primeiras aulas (piloto).
 * Expansão completa = RC2.3.1.
 */
import type { LessonStep } from "../../data/journey";
import { resolveVisualConcept, type VisualConceptId } from "../../data/visualVocabulary";

/** Conceitos concretos do piloto que devem preferir visual na Descoberta/prática. */
export const EARLY_VISUAL_CONCRETE: Readonly<Record<string, VisualConceptId | string>> = {
  水: "water",
  饭: "rice",
  茶: "tea",
  书: "book",
  车: "car",
  家: "home",
  猫: "cat",
  狗: "dog",
  手机: "phone",
};

export const VISUAL_SUPPORT_MISSING = "VISUAL_SUPPORT_MISSING" as const;

export function concreteVisualIdForText(text: string): string | null {
  for (const [hanzi, id] of Object.entries(EARLY_VISUAL_CONCRETE)) {
    if (text.includes(hanzi)) return id;
  }
  return null;
}

export function isAbstractPedagogyLesson(lessonId: string): boolean {
  return /pinyin|tom|tone|o-que-e-mandarim|o-que-e-hanzi|o-que-e-pinyin|o-que-e-tom/.test(lessonId);
}

export interface VisualCoverageFinding {
  code: typeof VISUAL_SUPPORT_MISSING | null;
  conceptId: string;
  stepKind: string;
  justifiedAbstract: boolean;
}

export function auditEarlyVisualSupport(
  lessonId: string,
  steps: readonly LessonStep[]
): VisualCoverageFinding[] {
  const abstractLesson = isAbstractPedagogyLesson(lessonId);
  const findings: VisualCoverageFinding[] = [];
  for (const step of steps) {
    if (step.kind === "intro" || step.pedagogyRole === "discovery") continue;
    const blob = [step.hanzi, step.targetHanzi, step.correctAnswer, step.answer, step.text, step.audioText]
      .filter(Boolean)
      .join("");
    const conceptId = concreteVisualIdForText(blob);
    if (!conceptId) continue;
    const hasVisual =
      Boolean(step.imageId || step.iconId || step.correctImageId) ||
      step.kind === "image_choice" ||
      step.kind === "compare_with_image";
    if (hasVisual) continue;
    const inBank = Boolean(resolveVisualConcept(conceptId as VisualConceptId));
    if (!inBank && !EARLY_VISUAL_CONCRETE[Object.keys(EARLY_VISUAL_CONCRETE).find((k) => blob.includes(k)) ?? ""]) {
      continue;
    }
    findings.push({
      code: abstractLesson ? null : VISUAL_SUPPORT_MISSING,
      conceptId,
      stepKind: step.kind,
      justifiedAbstract: abstractLesson,
    });
  }
  return findings;
}

/** Enriquece um passo concreto com visual do banco quando ausente. */
export function enrichStepWithVisual(step: LessonStep): LessonStep {
  if (step.imageId || step.iconId || step.kind === "image_choice") return step;
  const blob = [step.hanzi, step.targetHanzi, step.correctAnswer, step.answer, step.text].filter(Boolean).join("");
  const conceptId = concreteVisualIdForText(blob);
  if (!conceptId) return step;
  const concept = resolveVisualConcept(conceptId as VisualConceptId);
  if (!concept) return step;
  return {
    ...step,
    imageId: concept.id,
    iconId: concept.id,
  };
}
