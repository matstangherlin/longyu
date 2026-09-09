/**
 * V4.9.7A.1 — Culture Quest Engine.
 *
 * CultureItem stays the sourced catalog. CultureMission orchestrates
 * story, decisions, dialogue, memory, and rewards without a second Mandarin journey.
 */

export const CULTURE_MISSION_XP = 8;
export const CULTURE_REVIEW_INTERVALS_DAYS = [1, 3, 7, 21] as const;

export const CULTURE_ROUTE_IDS = [
  "first-meetings",
  "home-visits",
  "table-food",
  "everyday-china",
  "festivals",
] as const;

export type CultureRouteId = (typeof CULTURE_ROUTE_IDS)[number];

export const CULTURE_SEAL_IDS = [
  "visitor-ready",
  "chinese-table",
  "social-etiquette",
  "gift-sense",
  "festivals",
  "urban-china",
  "work-school",
] as const;

export type CultureSealId = (typeof CULTURE_SEAL_IDS)[number];

export type CultureLocaleText = {
  pt: string;
  en: string;
};

export type CultureSpeaker = "mei" | "wang" | "lin" | "narrator";

export type CultureMissionStepKind =
  | "story"
  | "scenario_choice"
  | "dialogue_choice"
  | "sequence"
  | "match"
  | "culture_recall"
  | "culture_summary";

export type CultureStoryBeat = {
  id: string;
  speaker?: CultureSpeaker;
  hanzi?: string;
  pinyin?: string;
  text: CultureLocaleText;
  visual?: "door-shoes" | "shared-table" | "chopsticks-table" | "qr-till" | "metro-door" | "gift-hands";
};

export type CultureChoiceOption = {
  id: string;
  label: CultureLocaleText;
  preferred: boolean;
  feedback: CultureLocaleText;
  mayVary?: boolean;
};

export type CultureSequenceItem = {
  id: string;
  label: CultureLocaleText;
};

export type CultureMatchPair = {
  id: string;
  left: CultureLocaleText;
  right: CultureLocaleText;
};

export type CultureMissionStep = {
  id: string;
  kind: CultureMissionStepKind;
  prompt?: CultureLocaleText;
  body?: CultureLocaleText;
  beats?: CultureStoryBeat[];
  options?: CultureChoiceOption[];
  sequence?: CultureSequenceItem[];
  sequenceCorrect?: string[];
  matchPairs?: CultureMatchPair[];
  scored?: boolean;
  memoryTargetId?: string;
  visual?: CultureStoryBeat["visual"];
};

export type CultureReviewVariantKind = "scenario_choice" | "story_error" | "sequence";

export type CultureReviewVariant = {
  kind: CultureReviewVariantKind;
  prompt: CultureLocaleText;
  options?: CultureChoiceOption[];
  sequence?: CultureSequenceItem[];
  sequenceCorrect?: string[];
};

export type CultureMemoryTarget = {
  id: string;
  cultureItemId: string;
  concept: CultureLocaleText;
  prompt: CultureLocaleText;
  options: CultureChoiceOption[];
  distractors: CultureLocaleText[];
  reviewVariants: [CultureReviewVariant, CultureReviewVariant, CultureReviewVariant];
};

export type CultureReward = {
  xp: number;
  sealIds?: CultureSealId[];
};

export type CultureMission = {
  id: string;
  cultureItemId: string;
  titlePt: string;
  titleEn: string;
  routeId: CultureRouteId;
  difficulty: 1 | 2 | 3;
  estimatedMinutes: number;
  flagship: boolean;
  steps: CultureMissionStep[];
  memoryTargets: CultureMemoryTarget[];
  reward: CultureReward;
  takeaways: CultureLocaleText[];
};

export type CultureRoute = {
  id: CultureRouteId;
  titlePt: string;
  titleEn: string;
  itemIds: readonly string[];
};

export const CULTURE_ROUTES: CultureRoute[] = [
  {
    id: "first-meetings",
    titlePt: "Primeiros encontros",
    titleEn: "First meetings",
    itemIds: ["greetings-nihao", "thanks-keqi", "qingwen-ask"],
  },
  {
    id: "home-visits",
    titlePt: "Casa e visitas",
    titleEn: "Home and visits",
    itemIds: ["visiting-home", "host-insistence", "gift-receiving", "family-terms"],
  },
  {
    id: "table-food",
    titlePt: "Mesa chinesa",
    titleEn: "Chinese table",
    itemIds: ["shared-dishes", "chopsticks-rest"],
  },
  {
    id: "everyday-china",
    titlePt: "China cotidiana",
    titleEn: "Everyday China",
    itemIds: ["digital-pay", "metro-qr", "office-hours", "teacher-title"],
  },
  {
    id: "festivals",
    titlePt: "Festivais",
    titleEn: "Festivals",
    itemIds: ["spring-festival", "mid-autumn", "qingming", "dragon-boat", "four-and-eight"],
  },
];

export type CultureSealDef = {
  id: CultureSealId;
  emoji: string;
  titlePt: string;
  titleEn: string;
  requiredItemIds: readonly string[];
};

export const CULTURE_SEALS: CultureSealDef[] = [
  {
    id: "visitor-ready",
    emoji: "🏠",
    titlePt: "Visitante preparado",
    titleEn: "Ready guest",
    requiredItemIds: ["visiting-home", "host-insistence"],
  },
  {
    id: "chinese-table",
    emoji: "🍚",
    titlePt: "Mesa chinesa",
    titleEn: "Chinese table",
    requiredItemIds: ["shared-dishes", "chopsticks-rest"],
  },
  {
    id: "social-etiquette",
    emoji: "🤝",
    titlePt: "Etiqueta social",
    titleEn: "Social etiquette",
    requiredItemIds: ["greetings-nihao", "thanks-keqi", "qingwen-ask"],
  },
  {
    id: "gift-sense",
    emoji: "🎁",
    titlePt: "Presentes com cuidado",
    titleEn: "Careful gifts",
    requiredItemIds: ["gift-receiving", "four-and-eight"],
  },
  {
    id: "festivals",
    emoji: "🏮",
    titlePt: "Festivais",
    titleEn: "Festivals",
    requiredItemIds: ["spring-festival", "mid-autumn", "qingming", "dragon-boat"],
  },
  {
    id: "urban-china",
    emoji: "🚇",
    titlePt: "China urbana",
    titleEn: "Urban China",
    requiredItemIds: ["digital-pay", "metro-qr"],
  },
  {
    id: "work-school",
    emoji: "🏢",
    titlePt: "Trabalho e escola",
    titleEn: "Work and school",
    requiredItemIds: ["teacher-title", "office-hours"],
  },
];

export const CULTURE_FLAGSHIP_ITEM_IDS = [
  "visiting-home",
  "host-insistence",
  "shared-dishes",
  "gift-receiving",
  "digital-pay",
  "metro-qr",
] as const;

export type CultureMasteryRecord = {
  itemId: string;
  completed: boolean;
  stars: 0 | 1 | 2 | 3;
  bestScore: number;
  attempts: number;
  reviewDueAt: number | null;
  reviewStage: number;
};

export type CultureMemoryRecord = {
  targetId: string;
  cultureItemId: string;
  due: number;
  stage: number;
  reps: number;
  lapses: number;
  lastResult?: "pass" | "fail";
  updatedAt: number;
};

export function loc(pt: string, en: string): CultureLocaleText {
  return { pt, en };
}

export function cultureText(copy: CultureLocaleText | undefined, locale: "pt-BR" | "en"): string {
  if (!copy) return "";
  return locale === "en" ? copy.en : copy.pt;
}

export function isCultureStepScored(step: CultureMissionStep): boolean {
  if (step.scored === false) return false;
  return (
    step.kind === "scenario_choice" ||
    step.kind === "dialogue_choice" ||
    step.kind === "sequence" ||
    step.kind === "match" ||
    step.kind === "culture_recall"
  );
}

export function cultureStarsForAttempt(score: number, memoryCorrect: boolean): 1 | 2 | 3 {
  if (memoryCorrect && score >= 0.9) return 3;
  if (score >= 0.7) return 2;
  return 1;
}

export function nextCultureReviewDue(stage: number, now = Date.now()): number {
  const capped = Math.max(0, Math.min(CULTURE_REVIEW_INTERVALS_DAYS.length - 1, stage));
  const days = CULTURE_REVIEW_INTERVALS_DAYS[capped] ?? 1;
  return now + days * 24 * 60 * 60 * 1000;
}

export function cultureRouteForItem(itemId: string): CultureRoute | undefined {
  return CULTURE_ROUTES.find((route) => route.itemIds.includes(itemId));
}

export function preferredOptionId(step: CultureMissionStep): string | undefined {
  return step.options?.find((option) => option.preferred)?.id;
}
