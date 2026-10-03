/**
 * RC2.3.3 — full culture depth audit + journey gate justification.
 */

import { CULTURE_ITEMS, type CultureItem } from "../../data/culture";
import { getCultureMission } from "../../data/cultureMissions";
import {
  CULTURE_HUB_ONLY_ITEM_IDS,
  CULTURE_JOURNEY_PLACEMENT,
  CULTURE_STORY_FLAGSHIP_IDS,
  cultureLessonIdForItem,
} from "../../data/cultureNative";
import {
  CULTURE_PROGRESSION_GATES,
  requiredCultureItemIdsForGate,
  type CultureProgressionGate,
} from "../../data/cultureProgressionGates";
import { CULTURE_ROUTES, CULTURE_SEALS } from "../../data/cultureQuest";
import { assessCultureDeepContract, type CultureDeepContract, type CultureDepthClass } from "./contract";
import { everydayIntentsForCultureItem } from "./everydayBridge";
import { runCultureEditorialGates, type CultureGateFinding } from "./gates";
import { estimatedMinutesForMode } from "./modes";

export type CultureDepthAuditRow = {
  itemId: string;
  kind: CultureItem["kind"];
  scope: CultureItem["scope"];
  category: CultureItem["category"];
  track: string;
  journeyOrHub: "journey" | "hub-only";
  sources: number;
  sourceRoles: string[];
  estimatedMinutes: number;
  story: boolean;
  visual: boolean;
  mandarin: boolean;
  decision: boolean;
  reaction: boolean;
  guidedPractice: boolean;
  independentPractice: boolean;
  recall: boolean;
  memoryTarget: boolean;
  variability: boolean;
  relatedLessons: string[];
  relatedChunks: string[];
  relatedHanzi: string[];
  everydayIntents: string[];
  journeyPlacement: string | null;
  relatedGates: string[];
  depthClass: CultureDepthClass;
  intentionalBasic?: boolean;
  dimensions: CultureDeepContract["dimensions"];
  editorialFindings: CultureGateFinding[];
};

export type CultureGateAuditRow = {
  gateId: string;
  required: boolean;
  reason: string;
  nextLessonDependency: string;
  requiredCultureItemIds: readonly string[];
  estimatedInterruptionMinutes: number;
  returnPath: string;
  justified: boolean;
  justificationNote: string;
};

function relatedGatesForItem(itemId: string): string[] {
  return CULTURE_PROGRESSION_GATES.filter((g) => requiredCultureItemIdsForGate(g).includes(itemId)).map(
    (g) => g.id
  );
}

function trackForItem(itemId: string): string {
  const route = CULTURE_ROUTES.find((r) => r.itemIds.includes(itemId));
  return route?.id ?? "unrouted";
}

export function auditCultureItem(item: CultureItem): CultureDepthAuditRow {
  const mission = getCultureMission(item.id);
  const contract = assessCultureDeepContract(item, mission);
  const placement = CULTURE_JOURNEY_PLACEMENT.find((p) => p.itemId === item.id);
  const hubOnly = (CULTURE_HUB_ONLY_ITEM_IDS as readonly string[]).includes(item.id);
  const steps = mission?.steps ?? [];

  return {
    itemId: item.id,
    kind: item.kind,
    scope: item.scope,
    category: item.category,
    track: trackForItem(item.id),
    journeyOrHub: hubOnly ? "hub-only" : "journey",
    sources: item.sources.length,
    sourceRoles: item.sources.map((s) => s.role ?? "evergreen"),
    estimatedMinutes: item.estimatedMinutes,
    story: contract.dimensions.find((d) => d.dimension === "STORY")?.pass ?? false,
    visual: contract.dimensions.find((d) => d.dimension === "VISUAL")?.pass ?? false,
    mandarin: contract.mandarin,
    decision: contract.decision,
    reaction: contract.reaction,
    guidedPractice: steps.some((s) => s.role === "guided"),
    independentPractice: steps.some((s) => s.role === "independent"),
    recall: steps.some((s) => s.kind === "culture_recall" || s.role === "recall"),
    memoryTarget: contract.memory,
    variability: contract.variability,
    relatedLessons: item.relatedLessonIds,
    relatedChunks: item.relatedChunkRefs ?? [],
    relatedHanzi: item.relatedHanziRefs ?? [],
    everydayIntents: everydayIntentsForCultureItem(item.id),
    journeyPlacement: placement?.afterTopicId ?? null,
    relatedGates: relatedGatesForItem(item.id),
    depthClass: contract.depthClass,
    intentionalBasic: contract.intentionalBasic,
    dimensions: contract.dimensions,
    editorialFindings: runCultureEditorialGates(item, mission),
  };
}

export function auditAllCultureItems(): CultureDepthAuditRow[] {
  return CULTURE_ITEMS.map(auditCultureItem);
}

/**
 * Pedagogical justification for each progression gate.
 * FAIL when the next topic does not actually presuppose the cultural knowledge.
 */
const GATE_JUSTIFICATIONS: Record<
  string,
  { required: boolean; note: string; interruptionMinutes: number }
> = {
  "gate-social-etiquette": {
    required: true,
    note: "l9 assumes greetings/thanks/请问 frames already understood as social practice.",
    interruptionMinutes: 8,
  },
  "gate-urban-china": {
    required: true,
    note: "p6-survival-mandarin survival phrases for metro/pay presuppose QR and digital-pay context.",
    interruptionMinutes: 10,
  },
  "gate-chinese-table": {
    required: true,
    note: "p7-imersao-casa-amigo home dinner immersion presupposes shared-table / chopsticks norms.",
    interruptionMinutes: 10,
  },
};

export function auditCultureJourneyGates(): CultureGateAuditRow[] {
  return CULTURE_PROGRESSION_GATES.map((gate: CultureProgressionGate) => {
    const meta = GATE_JUSTIFICATIONS[gate.id];
    const requiredIds = requiredCultureItemIdsForGate(gate);
    const minutes = requiredIds.reduce((sum, id) => {
      const mission = getCultureMission(id);
      if (!mission) return sum + 3;
      return sum + estimatedMinutesForMode(mission, "journey");
    }, 0);
    const justified = Boolean(meta?.required);
    return {
      gateId: gate.id,
      required: meta?.required ?? false,
      reason: gate.reasonPt,
      nextLessonDependency: gate.beforeTopicId,
      requiredCultureItemIds: requiredIds,
      estimatedInterruptionMinutes: meta?.interruptionMinutes ?? minutes,
      returnPath: `/jornada?gate=${gate.id}&focus=${gate.beforeTopicId}`,
      justified,
      justificationNote: meta?.note ?? "NO JUSTIFICATION — FAIL",
    };
  });
}

export function cultureDepthSummary(rows: CultureDepthAuditRow[]) {
  const byClass: Record<CultureDepthClass, number> = {
    SHALLOW: 0,
    BASIC: 0,
    DEEP: 0,
    FLAGSHIP_DEEP: 0,
  };
  for (const row of rows) byClass[row.depthClass] += 1;
  const flagships = rows.filter((r) => (CULTURE_STORY_FLAGSHIP_IDS as readonly string[]).includes(r.itemId));
  const editorial = rows.flatMap((r) => r.editorialFindings.filter((f) => f.code));
  return {
    total: rows.length,
    byClass,
    flagshipCount: flagships.length,
    flagshipsDeep: flagships.filter((f) => f.depthClass === "FLAGSHIP_DEEP").length,
    shallowCount: byClass.SHALLOW,
    hubOnly: rows.filter((r) => r.journeyOrHub === "hub-only").length,
    journey: rows.filter((r) => r.journeyOrHub === "journey").length,
    editorialFindingCount: editorial.length,
    seals: CULTURE_SEALS.map((s) => s.id),
  };
}

export function cultureLessonPathForAudit(itemId: string): string {
  return cultureLessonIdForItem(itemId);
}
