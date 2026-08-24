/**
 * Papel curricular declarativo (ONB-007).
 *
 * Não inferir só pelo StepKind: um `tone` pode ser laboratório de percepção
 * ou aplicação de um cumprimento já usado. O autor declara o papel; o
 * fallback só cobre lições antigas ainda sem o campo.
 */

export type CurriculumRole =
  | "acquisition"
  | "perception_lab"
  | "hanzi_lab"
  | "review"
  | "transfer"
  | "immersion";

export type CurriculumRoleHint = {
  id: string;
  title?: string;
  skill?: string;
  isReview?: boolean;
  curriculumRole?: CurriculumRole;
  steps?: ReadonlyArray<{ kind?: string }>;
};

const HANZI_LAB_IDS = new Set([
  "p1-o-que-e-hanzi",
  "p1-primeiros-hanzi",
]);

const PERCEPTION_LAB_IDS = new Set([
  "p1-engine-2-lab",
  "p2-ma-primeiro-tom",
  "p2-ma-segundo-tom",
  "p2-ma-terceiro-tom",
  "p2-ma-quarto-tom",
  "p2-comparar-tom-1-4",
  "p2-comparar-tom-2-3",
]);

export function inferCurriculumRole(lesson: CurriculumRoleHint): CurriculumRole {
  if (lesson.curriculumRole) return lesson.curriculumRole;
  if (lesson.isReview) return "review";

  const id = lesson.id;
  if (HANZI_LAB_IDS.has(id)) return "hanzi_lab";
  if (PERCEPTION_LAB_IDS.has(id)) return "perception_lab";

  const idLower = id.toLocaleLowerCase("pt-BR");
  const titleLower = (lesson.title ?? "").toLocaleLowerCase("pt-BR");

  if (idLower.includes("imers") || idLower.includes("immersion") || titleLower.includes("imersão")) {
    return "immersion";
  }
  if (idLower.includes("engine") || idLower.endsWith("-lab") || idLower.includes("-lab-")) {
    return "perception_lab";
  }
  if (
    (idLower.includes("hanzi") || idLower.includes("char-") || idLower.includes("-char-")) &&
    (idLower.includes("lab") || idLower.includes("primeiros") || idLower.includes("o-que-e-hanzi"))
  ) {
    return "hanzi_lab";
  }
  if (
    lesson.skill === "som" &&
    (idLower.includes("ma-") ||
      idLower.includes("tom") ||
      idLower.includes("comparar-tom") ||
      idLower.includes("sandhi"))
  ) {
    return "perception_lab";
  }

  // Labs fonéticos posteriores (l5/l6/l8-compare…) não dependem de ID.
  // Contar drills de tom no autoral: 3+ drills e mais percepção que conversa
  // = laboratório. 你好/谢谢 com 2 tons e diálogo ficam acquisition de propósito
  // — quebram a parede de labs, não a disfarçam.
  if (lesson.skill === "som") {
    const perception = (lesson.steps ?? []).filter((step) =>
      step.kind === "tone" || step.kind === "tone_pair" || step.kind === "audio_discrimination"
    ).length;
    const communicative = (lesson.steps ?? []).filter(
      (step) =>
        step.kind === "conversation_scene" ||
        step.kind === "free_production" ||
        step.kind === "transfer_task"
    ).length;
    if (perception >= 3 && perception > communicative) return "perception_lab";
  }
  if (lesson.steps?.some((step) => step.kind === "transfer_task" || step.kind === "structural_transfer")) {
    return "transfer";
  }
  return "acquisition";
}
