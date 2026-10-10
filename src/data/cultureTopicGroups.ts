/**
 * RC2.3.13R.3.2 — Culture topic hierarchy (grouping layer only).
 *
 * CULTURE ROOT = TOPICS (rectangular cards).
 * INSIDE A TOPIC = existing Culture V2 paths as subtopics + progression nodes.
 *
 * Does NOT duplicate Culture content. References CULTURE_V2_PATHS by stable id.
 * PRE_BETA_FREEZE_EXCEPTION: OWNER_APPROVED_CULTURE_INFORMATION_ARCHITECTURE
 */

import { CULTURE_V2_PATH_IDS, type CultureV2PathId } from "./cultureDeepSchema";
import {
  CULTURE_V2_PATHS,
  culturePathById,
  culturePathForItem,
  nextNodeInPath,
  type CulturePathDef,
} from "./culturePaths";

export type CultureTopicId =
  | "vida_cotidiana"
  | "relacoes_etiqueta"
  | "comida_celebracoes"
  | "escola_trabalho"
  | "cidades_digital"
  | "historia_china"
  | "china_contemporanea";

export type CultureTopicState = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "LOCKED";

export type CultureTopicGroup = {
  id: CultureTopicId;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  /** Existing Culture V2 path ids — exactly one membership per path globally. */
  pathIds: readonly CultureV2PathId[];
  /** Optional local icon key consumed by CultureTopicCard. */
  icon?: "home" | "chat" | "lantern" | "book" | "path" | "library" | "target";
  order: number;
};

/**
 * Canonical ~7 top-level topics. Every CULTURE_V2_PATH_IDS member appears once.
 */
export const CULTURE_TOPIC_GROUPS: readonly CultureTopicGroup[] = [
  {
    id: "vida_cotidiana",
    titlePt: "Vida cotidiana",
    titleEn: "Everyday life",
    descriptionPt: "Entregas, compostos e o ritmo do dia a dia urbano.",
    descriptionEn: "Delivery, compounds, and everyday urban rhythm.",
    pathIds: ["vida_cotidiana"],
    icon: "home",
    order: 1,
  },
  {
    id: "relacoes_etiqueta",
    titlePt: "Relações e etiqueta",
    titleEn: "Relations and etiquette",
    descriptionPt: "Cumprimentos, 客气, família e expectativas sociais.",
    descriptionEn: "Greetings, 客气, family, and social expectations.",
    pathIds: ["etiqueta_relacoes", "familia"],
    icon: "chat",
    order: 2,
  },
  {
    id: "comida_celebracoes",
    titlePt: "Comida e celebrações",
    titleEn: "Food and celebrations",
    descriptionPt: "Mesa compartilhada, festivais e momentos de convívio.",
    descriptionEn: "Shared tables, festivals, and moments of gathering.",
    pathIds: ["comida_mesa", "festivais"],
    icon: "lantern",
    order: 3,
  },
  {
    id: "escola_trabalho",
    titlePt: "Escola e trabalho",
    titleEn: "School and work",
    descriptionPt: "Sala de aula, Gaokao e o ritmo do escritório.",
    descriptionEn: "Classroom, Gaokao, and office rhythm.",
    pathIds: ["escola_universidade", "trabalho"],
    icon: "book",
    order: 4,
  },
  {
    id: "cidades_digital",
    titlePt: "Cidades e vida digital",
    titleEn: "Cities and digital life",
    descriptionPt: "Metrô, trens, WeChat e pagamentos no celular.",
    descriptionEn: "Metro, trains, WeChat, and phone payments.",
    pathIds: ["cidades_transporte", "china_digital"],
    icon: "path",
    order: 5,
  },
  {
    id: "historia_china",
    titlePt: "História da China",
    titleEn: "History of China",
    descriptionPt: "Dinastias, símbolos e mudanças que moldaram o país.",
    descriptionEn: "Dynasties, symbols, and changes that shaped the country.",
    pathIds: ["historia_simbolos"],
    icon: "library",
    order: 6,
  },
  {
    id: "china_contemporanea",
    titlePt: "China contemporânea",
    titleEn: "Contemporary China",
    descriptionPt: "Vida moderna e a ideia de que a China não é uniforme.",
    descriptionEn: "Modern life and China as non-uniform.",
    pathIds: ["china_contemporanea", "diferencas_regionais"],
    icon: "target",
    order: 7,
  },
] as const;

const TOPIC_BY_ID = new Map(CULTURE_TOPIC_GROUPS.map((t) => [t.id, t]));
const TOPIC_BY_PATH = new Map<CultureV2PathId, CultureTopicId>();
for (const topic of CULTURE_TOPIC_GROUPS) {
  for (const pathId of topic.pathIds) {
    TOPIC_BY_PATH.set(pathId, topic.id);
  }
}

export function cultureTopicById(id: string): CultureTopicGroup | undefined {
  return TOPIC_BY_ID.get(id as CultureTopicId);
}

export function cultureTopicForPath(pathId: CultureV2PathId | string): CultureTopicGroup | undefined {
  const topicId = TOPIC_BY_PATH.get(pathId as CultureV2PathId);
  return topicId ? TOPIC_BY_ID.get(topicId) : undefined;
}

export function cultureTopicForItem(itemId: string): CultureTopicGroup | undefined {
  const path = culturePathForItem(itemId);
  return path ? cultureTopicForPath(path.id) : undefined;
}

export function cultureTopicHref(topicId: CultureTopicId | string): string {
  return `/cultura/topico/${topicId}`;
}

/** All ordered path defs inside a topic (skip unknown ids). */
export function cultureTopicPaths(topic: CultureTopicGroup): CulturePathDef[] {
  return topic.pathIds.flatMap((id) => {
    const path = culturePathById(id);
    return path ? [path] : [];
  });
}

/** Aggregate eligible node progress across all subtopics. */
export function cultureTopicProgress(topic: CultureTopicGroup, completedIds: readonly string[]) {
  const paths = cultureTopicPaths(topic);
  const nodeIds = paths.flatMap((p) => p.orderedNodeIds);
  const done = nodeIds.filter((id) => completedIds.includes(id)).length;
  return { done, total: nodeIds.length, subtopicCount: paths.length };
}

export function cultureTopicState(
  topic: CultureTopicGroup,
  completedIds: readonly string[],
): CultureTopicState {
  const { done, total } = cultureTopicProgress(topic, completedIds);
  if (total === 0) return "LOCKED";
  if (done <= 0) return "NOT_STARTED";
  if (done >= total) return "COMPLETED";
  return "IN_PROGRESS";
}

/** First incomplete node inside a topic (path order, then node order). */
export function nextNodeInTopic(
  topic: CultureTopicGroup,
  completedIds: readonly string[],
): { itemId: string; path: CulturePathDef } | undefined {
  for (const path of cultureTopicPaths(topic)) {
    const itemId = nextNodeInPath(path, completedIds);
    if (itemId) return { itemId, path };
  }
  return undefined;
}

/**
 * Globally relevant Culture continuation: recommended incomplete path → topic.
 * Uses existing path recommendation semantics when a next mission item is known.
 */
export function resolveCultureContinuation(
  completedIds: readonly string[],
  nextItemId: string | undefined,
): {
  topic: CultureTopicGroup;
  path: CulturePathDef;
  itemId: string | undefined;
  done: number;
  total: number;
} {
  let path: CulturePathDef | undefined;
  if (nextItemId) {
    path = culturePathForItem(nextItemId);
  }
  if (!path) {
    path =
      CULTURE_V2_PATHS.find((p) => p.orderedNodeIds.some((id) => !completedIds.includes(id))) ??
      CULTURE_V2_PATHS[0];
  }
  const topic = cultureTopicForPath(path.id) ?? CULTURE_TOPIC_GROUPS[0];
  const itemId = nextNodeInPath(path, completedIds) ?? nextItemId;
  const { done, total } = cultureTopicProgress(topic, completedIds);
  return { topic, path, itemId, done, total };
}

/** Migrate legacy path anchor / path id → containing topic. */
export function migrateCulturePathToTopic(
  pathIdOrAnchor: string | null | undefined,
): CultureTopicGroup | undefined {
  if (!pathIdOrAnchor) return undefined;
  const raw = pathIdOrAnchor.startsWith("path:")
    ? pathIdOrAnchor.slice("path:".length)
    : pathIdOrAnchor.startsWith("topic:")
      ? pathIdOrAnchor.slice("topic:".length)
      : pathIdOrAnchor.startsWith("node:")
        ? cultureTopicForItem(pathIdOrAnchor.slice("node:".length))?.id
        : pathIdOrAnchor;
  if (!raw) return undefined;
  return cultureTopicById(raw) ?? cultureTopicForPath(raw);
}

/**
 * Hierarchy integrity — used by validate:culture-topic-hierarchy.
 * Returns machine codes (empty = PASS).
 */
export function assertCultureTopicHierarchy(): string[] {
  const errors: string[] = [];
  if (CULTURE_TOPIC_GROUPS.length < 6 || CULTURE_TOPIC_GROUPS.length > 8) {
    errors.push("TOPIC_COUNT_OUT_OF_RANGE");
  }
  if (CULTURE_TOPIC_GROUPS.length >= 12) {
    errors.push("ROOT_EXPOSES_ALL_PATHS");
  }

  const seen = new Map<string, string>();
  for (const topic of CULTURE_TOPIC_GROUPS) {
    if (topic.pathIds.length === 0) errors.push(`EMPTY_TOPIC:${topic.id}`);
    for (const pathId of topic.pathIds) {
      if (!CULTURE_V2_PATH_IDS.includes(pathId)) {
        errors.push(`UNKNOWN_PATH_IN_TOPIC:${pathId}`);
      }
      if (seen.has(pathId)) {
        errors.push(`DUPLICATE_CULTURE_PATH_MEMBERSHIP:${pathId}`);
      } else {
        seen.set(pathId, topic.id);
      }
    }
  }

  for (const pathId of CULTURE_V2_PATH_IDS) {
    if (!seen.has(pathId)) errors.push(`UNMAPPED_CULTURE_PATH:${pathId}`);
  }

  // Content conservation: grouping must not invent nodes.
  const groupedNodes = new Set<string>();
  for (const topic of CULTURE_TOPIC_GROUPS) {
    for (const path of cultureTopicPaths(topic)) {
      for (const nodeId of path.orderedNodeIds) groupedNodes.add(nodeId);
    }
  }
  const canonicalNodes = new Set(CULTURE_V2_PATHS.flatMap((p) => [...p.orderedNodeIds]));
  for (const id of canonicalNodes) {
    if (!groupedNodes.has(id)) errors.push(`GROUPING_LOST_NODE:${id}`);
  }
  for (const id of groupedNodes) {
    if (!canonicalNodes.has(id)) errors.push(`GROUPING_FAKE_NODE:${id}`);
  }

  return errors;
}
