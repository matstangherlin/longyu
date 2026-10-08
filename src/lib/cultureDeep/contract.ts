/**
 * RC2.3.3 — CultureDeepContract + depth scorecard.
 */

import type { CultureItem, CultureItemKind } from "../../data/culture";
import type { CultureMission, CultureMissionStep } from "../../data/cultureQuest";
import { CULTURE_HUB_ONLY_ITEM_IDS, CULTURE_JOURNEY_PLACEMENT, CULTURE_STORY_FLAGSHIP_IDS } from "../../data/cultureNative";
import { CULTURE_PROGRESSION_GATES, requiredCultureItemIdsForGate } from "../../data/cultureProgressionGates";
import { everydayIntentsForCultureItem } from "./everydayBridge";
import { flagshipVisualCoverage } from "./visuals";

export const DEPTH_DIMENSIONS = [
  "SOURCE",
  "CONTEXT",
  "VARIABILITY",
  "STORY",
  "DECISION",
  "REACTION",
  "LANGUAGE",
  "VISUAL",
  "MEMORY",
  "JOURNEY_INTEGRATION",
] as const;

export type CultureDepthDimension = (typeof DEPTH_DIMENSIONS)[number];

export type CultureDepthClass = "SHALLOW" | "BASIC" | "DEEP" | "FLAGSHIP_DEEP";

export type DimensionScore = {
  dimension: CultureDepthDimension;
  pass: boolean;
  note: string;
};

export type CultureDeepContract = {
  itemId: string;
  kind: CultureItemKind;
  scope: CultureItem["scope"];
  category: CultureItem["category"];
  /** What the learner observes */
  observes: boolean;
  /** Situation / context present */
  context: boolean;
  /** Cultural practice/idea taught */
  practiceIdea: boolean;
  /** Scope declared */
  scoped: boolean;
  /** Variability disclosed when relevant */
  variability: boolean;
  /** Learner decision */
  decision: boolean;
  /** Character reaction consequence */
  reaction: boolean;
  /** Known Mandarin appears */
  mandarin: boolean;
  /** Memory target concrete */
  memory: boolean;
  /** Source provenance */
  source: boolean;
  /** Journey placement or hub-only intentional */
  journeyLink: boolean;
  dimensions: DimensionScore[];
  depthClass: CultureDepthClass;
  intentionalBasic?: boolean;
};

function hasStory(mission: CultureMission | undefined): boolean {
  return Boolean(mission?.steps.some((s) => s.kind === "story" && (s.beats?.length ?? 0) > 0));
}

function hasDecision(mission: CultureMission | undefined): boolean {
  return Boolean(
    mission?.steps.some((s) => s.kind === "scenario_choice" || s.kind === "dialogue_choice")
  );
}

function hasReaction(mission: CultureMission | undefined): boolean {
  if (!mission) return false;
  for (const step of mission.steps) {
    for (const opt of step.options ?? []) {
      if (opt.reaction) return true;
      // Meaningful feedback that is not bare "Boa." / "Não."
      const fb = `${opt.feedback.pt} ${opt.feedback.en}`.trim();
      if (fb.length > 24 && !/^(boa\.?|não\.?|yes\.?|no\.?|good\.?)$/i.test(fb)) {
        return true;
      }
    }
  }
  return false;
}

function hasVisual(mission: CultureMission | undefined, item: CultureItem): boolean {
  if (mission?.steps.some((s) => s.visual || s.beats?.some((b) => b.visual))) return true;
  // History / festival may use timeline/calendar renderers instead of story visuals
  return item.kind === "history" || item.kind === "festival";
}

function memoryIsConcrete(mission: CultureMission | undefined): boolean {
  const targets = mission?.memoryTargets ?? [];
  if (!targets.length) return false;
  return targets.every((t) => {
    const c = `${t.concept.pt} ${t.prompt.pt}`;
    return c.length > 20 && !/lembre desta li[cç][aã]o/i.test(c);
  });
}

function dimension(
  dimension: CultureDepthDimension,
  pass: boolean,
  note: string
): DimensionScore {
  return { dimension, pass, note };
}

/**
 * Objective depth classification.
 *
 * DEEP requires: context, explanation/why, decision (or kind-exempt), reaction/feedback,
 * variability (when practice), source, language link OR kind-exempt, recall/memory.
 *
 * FLAGSHIP_DEEP: must be in story flagships + all DEEP dims + story + visual + mandarin + reaction.
 *
 * SHALLOW: fewer than 4 passing core dims among SOURCE/CONTEXT/STORY|CONTEXT/DECISION|kind/MEMORY.
 */
export function assessCultureDeepContract(
  item: CultureItem,
  mission: CultureMission | undefined
): CultureDeepContract {
  const isFlagship = (CULTURE_STORY_FLAGSHIP_IDS as readonly string[]).includes(item.id);
  const hubOnly = (CULTURE_HUB_ONLY_ITEM_IDS as readonly string[]).includes(item.id);
  const journeyPlacement = CULTURE_JOURNEY_PLACEMENT.find((p) => p.itemId === item.id);
  const gate = CULTURE_PROGRESSION_GATES.find((g) =>
    requiredCultureItemIdsForGate(g).includes(item.id)
  );

  const socialKind = item.kind === "documented_practice";
  const decisionRequired = socialKind;
  const decisionOk = decisionRequired ? hasDecision(mission) : true;
  const reactionOk = socialKind ? hasReaction(mission) : hasReaction(mission) || !decisionRequired;
  const variabilityRelevant = socialKind || Boolean(item.variabilityPt);
  const variabilityOk = variabilityRelevant
    ? Boolean(item.variabilityPt || item.variabilityEn || mission?.steps.some((s) => s.variability))
    : true;

  const observes = hasStory(mission) || Boolean(item.situationPt);
  const context = Boolean(item.situationPt || item.summaryPt || mission?.steps.some((s) => s.kind === "story"));
  const practiceIdea = Boolean(item.whyPt || item.bodyPt || mission?.steps.some((s) => s.kind === "culture_teach"));
  const scoped = Boolean(item.scope);
  const mandarin =
    Boolean(item.relatedChunkRefs?.length) ||
    Boolean(mission?.steps.some((s) => s.beats?.some((b) => b.hanzi)));
  const memory = memoryIsConcrete(mission);
  const source = (item.sources?.length ?? 0) > 0;
  const journeyLink = hubOnly || Boolean(journeyPlacement) || Boolean(gate);
  const visual = hasVisual(mission, item);
  const story = hasStory(mission) || item.kind === "history" || item.kind === "festival";

  const intents = everydayIntentsForCultureItem(item.id);
  const languageDim =
    mandarin ||
    intents.length > 0 ||
    item.kind === "history" ||
    item.kind === "festival" ||
    item.kind === "legend" ||
    item.kind === "literature" ||
    item.kind === "symbol";

  const dimensions: DimensionScore[] = [
    dimension("SOURCE", source, source ? "has sources" : "missing sources"),
    dimension("CONTEXT", context, context ? "situation/context present" : "no context"),
    dimension("VARIABILITY", variabilityOk, variabilityOk ? "scoped/variability ok" : "missing variability"),
    dimension("STORY", story, story ? "story or kind renderer" : "no story"),
    dimension("DECISION", decisionOk, decisionOk ? "decision ok for kind" : "missing decision"),
    dimension("REACTION", reactionOk, reactionOk ? "meaningful reaction/feedback" : "weak/missing reaction"),
    dimension("LANGUAGE", languageDim, languageDim ? "mandarin/intent/kind-exempt" : "no language link"),
    dimension(
      "VISUAL",
      visual,
      visual
        ? isFlagship
          ? `flagship visual ${flagshipVisualCoverage(mission?.steps.find((s) => s.visual || s.beats?.some((b) => b.visual))?.visual ?? mission?.steps.flatMap((s) => s.beats ?? []).find((b) => b.visual)?.visual)}`
          : "visual present"
        : "missing visual"
    ),
    dimension("MEMORY", memory, memory ? "concrete memory target" : "missing/vague memory"),
    dimension(
      "JOURNEY_INTEGRATION",
      journeyLink,
      hubOnly ? "hub-only intentional" : journeyPlacement ? `after ${journeyPlacement.afterTopicId}` : "unlinked"
    ),
  ];

  const passCount = dimensions.filter((d) => d.pass).length;
  const deepRequired: CultureDepthDimension[] = socialKind
    ? ["SOURCE", "CONTEXT", "VARIABILITY", "STORY", "DECISION", "REACTION", "LANGUAGE", "MEMORY"]
    : ["SOURCE", "CONTEXT", "STORY", "LANGUAGE", "MEMORY"];
  const deepOk = deepRequired.every((dim) => dimensions.find((d) => d.dimension === dim)?.pass);

  let depthClass: CultureDepthClass;
  let intentionalBasic = false;

  if (isFlagship) {
    const flagshipDims: CultureDepthDimension[] = [
      "SOURCE",
      "CONTEXT",
      "VARIABILITY",
      "STORY",
      "DECISION",
      "REACTION",
      "LANGUAGE",
      "VISUAL",
      "MEMORY",
      "JOURNEY_INTEGRATION",
    ];
    const flagOk = flagshipDims.every((dim) => dimensions.find((d) => d.dimension === dim)?.pass);
    depthClass = flagOk ? "FLAGSHIP_DEEP" : deepOk ? "DEEP" : passCount >= 4 ? "BASIC" : "SHALLOW";
  } else if (deepOk && passCount >= 7) {
    depthClass = "DEEP";
  } else if (passCount >= 4) {
    depthClass = "BASIC";
    // History/literature short intros can be intentional BASIC if sourced + labeled
    intentionalBasic =
      (item.kind === "history" || item.kind === "literature" || item.kind === "symbol") && source && context;
  } else {
    depthClass = "SHALLOW";
  }

  return {
    itemId: item.id,
    kind: item.kind,
    scope: item.scope,
    category: item.category,
    observes,
    context,
    practiceIdea,
    scoped,
    variability: variabilityOk,
    decision: decisionOk,
    reaction: reactionOk,
    mandarin,
    memory,
    source,
    journeyLink,
    dimensions,
    depthClass,
    intentionalBasic: intentionalBasic || undefined,
  };
}

export function enrichMissionStepsForDepth(steps: CultureMissionStep[]): CultureMissionStep[] {
  // Ensure independent/recall weights dominate for mastery (Prompt 21).
  return steps.map((step) => {
    if (step.role === "demo" || step.kind === "story" || step.kind === "culture_teach") {
      return { ...step, scoreWeight: step.scoreWeight ?? 0 };
    }
    if (step.role === "guided") {
      return { ...step, scoreWeight: step.scoreWeight ?? 0.35 };
    }
    if (step.kind === "culture_recall" || step.role === "recall") {
      return { ...step, scoreWeight: step.scoreWeight ?? 1.3 };
    }
    if (step.role === "independent" || step.kind === "scenario_choice" || step.kind === "dialogue_choice") {
      return { ...step, scoreWeight: step.scoreWeight ?? 1.1 };
    }
    if (step.kind === "match") {
      return { ...step, scoreWeight: step.scoreWeight ?? 0.45 };
    }
    return step;
  });
}
