/**
 * RC2.3.0 — contrato universal de qualidade pedagógica.
 */
import type { LessonStep } from "../../data/journey";
import { conceptsChargedBeforeTaught, type TaughtConceptMap } from "./discovery";
import {
  interactionFamilyFor,
  saturationScore,
  saturationWarningForLesson,
  perceptualItemFromStep,
  type SaturationScore,
} from "./perceptualRepetition";
import { cognitiveOperationFor } from "../semanticRepetition";
import { resolveVisualConcept } from "../../data/visualVocabulary";

export type CognitiveLadderRung =
  | "EXPOSURE"
  | "RECOGNITION"
  | "DISCRIMINATION"
  | "RECALL"
  | "PRODUCE"
  | "USE_IN_CONTEXT"
  | "TRANSFER";

export interface ActivityContractAnswer {
  id: string;
  question: string;
  ok: boolean;
  detail?: string;
}

export interface PedagogicalSessionAudit {
  lessonId: string;
  masteryPass: number;
  answers: ActivityContractAnswer[];
  saturation: SaturationScore;
  chargedBeforeTaught: { stepIndex: number; conceptId: string }[];
  visualSupportMissing: string[];
  fail: boolean;
  warn: boolean;
}

const CONCRETE_HANZI_VISUAL: Record<string, string> = {
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

export function ladderRungForKind(kind: string): CognitiveLadderRung {
  const op = cognitiveOperationFor(kind);
  switch (op) {
    case "TEACH":
      return "EXPOSURE";
    case "HEAR":
    case "RECOGNIZE":
      return "RECOGNITION";
    case "DISCRIMINATE":
      return "DISCRIMINATION";
    case "RECALL":
      return "RECALL";
    case "PRODUCE":
    case "BUILD":
      return "PRODUCE";
    case "USE_IN_CONTEXT":
      return kind === "transfer_task" ? "TRANSFER" : "USE_IN_CONTEXT";
    default:
      return "RECOGNITION";
  }
}

function stepHasObjective(step: LessonStep): boolean {
  return Boolean(step.objective || step.title || step.prompt || step.promptPt || step.kind === "intro");
}

function stepLooksConcreteVisual(step: LessonStep): string | null {
  const blob = [step.hanzi, step.targetHanzi, step.correctAnswer, step.answer, step.text, step.audioText]
    .filter(Boolean)
    .join("");
  for (const [hanzi, concept] of Object.entries(CONCRETE_HANZI_VISUAL)) {
    if (blob.includes(hanzi)) return concept;
  }
  return null;
}

function stepHasVisual(step: LessonStep): boolean {
  if (step.imageId || step.iconId || step.correctImageId || step.imageOptions?.length) return true;
  if (step.kind === "image_choice" || step.kind === "compare_with_image") return true;
  return false;
}

/**
 * Audita uma sessão planejada contra o contrato Pedagogy V6.
 */
export function auditPedagogicalSession(input: {
  lessonId: string;
  masteryPass: number;
  steps: readonly LessonStep[];
  taught?: TaughtConceptMap;
}): PedagogicalSessionAudit {
  const { lessonId, masteryPass, steps } = input;
  const taught = input.taught ?? {};
  const saturation = saturationScore(steps.map(perceptualItemFromStep));
  const satWarn = saturationWarningForLesson(lessonId, saturation);
  const chargedBeforeTaught = conceptsChargedBeforeTaught(steps, taught);

  const visualSupportMissing: string[] = [];
  for (const step of steps) {
    if (step.kind === "intro" || step.pedagogyRole === "discovery") continue;
    const concept = stepLooksConcreteVisual(step);
    if (!concept) continue;
    if (stepHasVisual(step)) continue;
    // Concept catalogued as visualizable?
    if (resolveVisualConcept(concept as never) || CONCRETE_HANZI_VISUAL) {
      visualSupportMissing.push(`${concept}@${step.kind}`);
    }
  }

  const families = new Set(steps.map((s) => interactionFamilyFor(s.kind)));
  const rungs = new Set(steps.map((s) => ladderRungForKind(s.kind)));
  const hasDiscovery = steps.some((s) => s.pedagogyRole === "discovery" || s.kind === "intro");
  const productionShare =
    steps.filter((s) => /produc|build|write|free_production|conversation|dialogue_completion|reverse_recall/.test(s.kind))
      .length / Math.max(1, steps.length);
  const choiceShare =
    steps.filter((s) => interactionFamilyFor(s.kind) === "choice").length / Math.max(1, steps.length);

  const answers: ActivityContractAnswer[] = [
    {
      id: "objective_clear",
      question: "O aluno sabe qual é o objetivo?",
      ok: steps.every(stepHasObjective) || steps.some((s) => s.title),
    },
    {
      id: "taught_before_tested",
      question: "O conteúdo foi ensinado antes de ser cobrado?",
      ok: chargedBeforeTaught.length === 0,
      detail: chargedBeforeTaught.map((v) => v.conceptId).join(","),
    },
    {
      id: "cognitive_operation",
      question: "Há operação cognitiva clara por passo?",
      ok: steps.every((s) => Boolean(cognitiveOperationFor(s.kind))),
    },
    {
      id: "competency_measured",
      question: "Qual competência está sendo medida?",
      ok: rungs.size >= 1,
      detail: [...rungs].join(","),
    },
    {
      id: "variety",
      question: "A sessão evita saturação perceptiva?",
      ok: !satWarn || masteryPass === 1,
      detail: `targetDominance=${saturation.targetDominance.toFixed(2)}`,
    },
    {
      id: "pass_distinct",
      question: "A pass tem perfil cognitivo adequado?",
      ok:
        masteryPass === 1
          ? hasDiscovery || rungs.has("EXPOSURE") || rungs.has("RECOGNITION")
          : masteryPass === 2
            ? families.size >= 2
            : masteryPass === 3
              ? productionShare >= 0.25 || choiceShare < 0.75
              : masteryPass === 4
                ? productionShare >= 0.2 || rungs.has("TRANSFER") || rungs.has("USE_IN_CONTEXT")
                : true,
    },
    {
      id: "no_padding",
      question: "Sem padding artificial até o teto?",
      ok: steps.length <= 15,
      detail: `count=${steps.length}`,
    },
    {
      id: "visual_when_concrete",
      question: "Conceito concreto tem visual quando aplicável?",
      ok: visualSupportMissing.length === 0 || masteryPass >= 3,
      detail: visualSupportMissing.slice(0, 5).join(","),
    },
  ];

  const fail = answers.some((a) => !a.ok && (a.id === "taught_before_tested" || a.id === "no_padding"));
  const warn =
    (!fail && answers.some((a) => !a.ok)) ||
    satWarn ||
    visualSupportMissing.length > 0;

  return {
    lessonId,
    masteryPass,
    answers,
    saturation,
    chargedBeforeTaught,
    visualSupportMissing,
    fail,
    warn,
  };
}
