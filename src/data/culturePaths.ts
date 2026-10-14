/**
 * RC2.3.13F — 12 canonical Culture V2 learning paths.
 * Progression within a path is gently ordered; across paths the learner is free.
 * Each item has exactly one primary path (no conflicting duplicates).
 * Paths never block Mandarin Journey.
 */

import { CULTURE_V2_PATH_IDS, type CultureV2PathId } from "./cultureDeepSchema";

export type CulturePathStatus = "ACTIVE" | "EXPANSION_PENDING";

export type CulturePathDef = {
  id: CultureV2PathId;
  titlePt: string;
  titleEn: string;
  descriptionPt: string;
  descriptionEn: string;
  /** Gentle recommended order within the path. */
  orderedNodeIds: readonly string[];
  status: CulturePathStatus;
};

/**
 * Existing 30 items remapped + 6 RC2.3.13F hub-only additions.
 * Every path has ≥1 meaningful node (no empty / coming-soon-only paths).
 */
export const CULTURE_V2_PATHS: readonly CulturePathDef[] = [
  {
    id: "vida_cotidiana",
    titlePt: "Vida cotidiana",
    titleEn: "Everyday life",
    descriptionPt: "Entregas, compostos residenciais e o ritmo do dia a dia urbano.",
    descriptionEn: "Delivery, residential compounds, and everyday urban rhythm.",
    orderedNodeIds: ["delivery-life"],
    status: "EXPANSION_PENDING",
  },
  {
    id: "etiqueta_relacoes",
    titlePt: "Etiqueta e relações",
    titleEn: "Etiquette and relationships",
    descriptionPt: "Cumprimentos, 客气, 面子, presentes e 关系.",
    descriptionEn: "Greetings, 客气, 面子, gifts, and 关系.",
    orderedNodeIds: ["greetings-nihao", "thanks-keqi", "qingwen-ask", "gift-receiving", "guanxi-relations"],
    status: "ACTIVE",
  },
  {
    id: "comida_mesa",
    titlePt: "Comida e mesa",
    titleEn: "Food and table",
    descriptionPt: "Pratos compartilhados, hashis e o convívio à mesa.",
    descriptionEn: "Shared dishes, chopsticks, and table companionship.",
    orderedNodeIds: ["shared-dishes", "chopsticks-rest"],
    status: "ACTIVE",
  },
  {
    id: "familia",
    titlePt: "Família",
    titleEn: "Family",
    descriptionPt: "Visitas, parentesco e expectativas em casa.",
    descriptionEn: "Visits, kinship, and expectations at home.",
    orderedNodeIds: ["visiting-home", "host-insistence", "family-terms"],
    status: "ACTIVE",
  },
  {
    id: "escola_universidade",
    titlePt: "Escola e universidade",
    titleEn: "School and university",
    descriptionPt: "老师, respeito em sala e o contexto do Gaokao.",
    descriptionEn: "老师, classroom respect, and Gaokao context.",
    orderedNodeIds: ["teacher-title", "gaokao-context"],
    status: "ACTIVE",
  },
  {
    id: "trabalho",
    titlePt: "Trabalho",
    titleEn: "Work",
    descriptionPt: "Ritmo profissional e small talk no escritório.",
    descriptionEn: "Professional rhythm and office small talk.",
    orderedNodeIds: ["office-hours"],
    status: "EXPANSION_PENDING",
  },
  {
    id: "cidades_transporte",
    titlePt: "Cidades e transporte",
    titleEn: "Cities and transport",
    descriptionPt: "Metrô, QR e trem de alta velocidade.",
    descriptionEn: "Metro, QR, and high-speed rail.",
    orderedNodeIds: ["metro-qr", "high-speed-rail"],
    status: "ACTIVE",
  },
  {
    id: "china_digital",
    titlePt: "China digital",
    titleEn: "Digital China",
    descriptionPt: "WeChat, pagamentos e a vida no celular.",
    descriptionEn: "WeChat, payments, and life on the phone.",
    orderedNodeIds: ["wechat-life", "digital-pay"],
    status: "ACTIVE",
  },
  {
    id: "festivais",
    titlePt: "Festivais",
    titleEn: "Festivals",
    descriptionPt: "Primavera, lua, Qingming, barcos e lanternas.",
    descriptionEn: "Spring Festival, moon, Qingming, boats, and lanterns.",
    orderedNodeIds: [
      "spring-festival",
      "lantern-festival",
      "mid-autumn",
      "qingming",
      "dragon-boat",
    ],
    status: "ACTIVE",
  },
  {
    id: "historia_simbolos",
    titlePt: "História e símbolos",
    titleEn: "History and symbols",
    descriptionPt: "Dinastias, clássicos e símbolos que ainda circulam.",
    descriptionEn: "Dynasties, classics, and symbols that still circulate.",
    orderedNodeIds: [
      "china-history-timeline",
      "qin-unification",
      "han-dynasty",
      "tang-dynasty",
      "song-dynasty",
      "ming-qing",
      "chinese-dragon",
      "sun-wukong",
      "journey-to-the-west",
      "four-and-eight",
    ],
    status: "ACTIVE",
  },
  {
    id: "china_contemporanea",
    titlePt: "China contemporânea",
    titleEn: "Contemporary China",
    descriptionPt: "Hotel, consumo urbano e negociação no cotidiano moderno.",
    descriptionEn: "Hotels, urban consumption, and bargaining in modern daily life.",
    orderedNodeIds: ["hotel-checkin-register", "bargaining-context"],
    status: "ACTIVE",
  },
  {
    id: "diferencas_regionais",
    titlePt: "Diferenças regionais",
    titleEn: "Regional differences",
    descriptionPt: "Norte e sul, línguas locais e a ideia de que a China não é uniforme.",
    descriptionEn: "North and south, local languages, and China as non-uniform.",
    orderedNodeIds: ["regional-china"],
    status: "ACTIVE",
  },
] as const;

const PATH_BY_ID = new Map(CULTURE_V2_PATHS.map((p) => [p.id, p]));

export function culturePathById(id: CultureV2PathId): CulturePathDef | undefined {
  return PATH_BY_ID.get(id);
}

export function culturePathForItem(itemId: string): CulturePathDef | undefined {
  return CULTURE_V2_PATHS.find((path) => path.orderedNodeIds.includes(itemId));
}

export function culturePathProgress(path: CulturePathDef, completedIds: readonly string[]) {
  const done = path.orderedNodeIds.filter((id) => completedIds.includes(id)).length;
  return { done, total: path.orderedNodeIds.length };
}

/** Deterministic next node inside a path (first incomplete in order). */
export function nextNodeInPath(path: CulturePathDef, completedIds: readonly string[]): string | undefined {
  return path.orderedNodeIds.find((id) => !completedIds.includes(id));
}

/**
 * Recommended path: unfinished path that contains the next mission item,
 * else first incomplete path, else first path.
 */
export function resolveRecommendedCulturePath(
  completedIds: readonly string[],
  nextItemId: string | undefined,
): CulturePathDef {
  if (nextItemId) {
    const byNext = culturePathForItem(nextItemId);
    if (byNext) return byNext;
  }
  const incomplete = CULTURE_V2_PATHS.find((path) =>
    path.orderedNodeIds.some((id) => !completedIds.includes(id)),
  );
  return incomplete ?? CULTURE_V2_PATHS[0];
}

/** Assert taxonomy completeness (gate aid). */
export function assertCulturePathTaxonomy(): string[] {
  const errors: string[] = [];
  if (CULTURE_V2_PATHS.length !== CULTURE_V2_PATH_IDS.length) {
    errors.push("PATH_COUNT_MISMATCH");
  }
  for (const id of CULTURE_V2_PATH_IDS) {
    if (!PATH_BY_ID.has(id)) errors.push(`PATH_MISSING:${id}`);
  }
  const seen = new Set<string>();
  for (const path of CULTURE_V2_PATHS) {
    if (path.orderedNodeIds.length === 0) errors.push(`PATH_EMPTY:${path.id}`);
    for (const nodeId of path.orderedNodeIds) {
      if (seen.has(nodeId)) errors.push(`DUPLICATE_PATH_NODE:${nodeId}`);
      seen.add(nodeId);
    }
  }
  return errors;
}
