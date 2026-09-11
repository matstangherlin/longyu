import { CHINA_SURVIVAL_EVERYDAY_ARC } from "./chinaSurvivalEveryday";

/**
 * V4.9.9B — China Survival capstone. Zero new vocabulary.
 * Coverage is across three authored variants, not one 45-minute exam.
 */
export const CHINA_SURVIVAL_CAPSTONE = {
  id: "china-survival-capstone",
  remessa: "V4.9.9B",
  productNamePt: "Um dia na China",
  productNameEn: "A day in China",
  lessonId: "p7-china-survival",
  newRefs: [] as const,
  variants: ["A", "B", "C"] as const,
  sceneIdsByVariant: {
    A: ["conversa-cotidiana", "imersao-restaurante", "imersao-estacao", "checkin-hotel"],
    B: ["conversa-cotidiana", "conversa-na-loja", "pegar-taxi", "no-aeroporto"],
    C: ["conversa-cotidiana", "nao-me-sinto-bem", "na-clinica"],
  } as const,
  capabilities: [
    "first_contact",
    "restaurant",
    "shopping",
    "mobility",
    "hotel_airport",
    "health",
    "repair",
    "listening",
    "speaking",
    "production",
    "decision",
    "transfer",
    "completion",
  ] as const,
} as const;

export const CHINA_SURVIVAL_CAPSTONE_ARC = CHINA_SURVIVAL_CAPSTONE;

export const CHINA_SURVIVAL_GLOBAL_ARC = {
  id: "china-survival-global",
  remessa: "V4.9.9B",
  lessonIds: [CHINA_SURVIVAL_EVERYDAY_ARC.lessonIds[0], CHINA_SURVIVAL_CAPSTONE.lessonId] as const,
  requiredArcs: [
    "FIRST_CONTACT",
    "IDENTITY",
    "ROUTINE_TIME",
    "RESTAURANT",
    "SHOPPING",
    "MOBILITY",
    "HOTEL",
    "AIRPORT",
    "HEALTH",
    "EVERYDAY",
  ] as const,
  coverageByVariant: {
    A: ["FIRST_CONTACT", "EVERYDAY", "RESTAURANT", "MOBILITY", "HOTEL"],
    B: ["FIRST_CONTACT", "EVERYDAY", "SHOPPING", "MOBILITY", "AIRPORT"],
    C: ["EVERYDAY", "ROUTINE_TIME", "IDENTITY", "HEALTH"],
  } as const,
} as const;

export const CAPSTONE_SURVIVAL_TOPIC_IDS = [CHINA_SURVIVAL_CAPSTONE.lessonId] as const;

export type CapstoneVariant = (typeof CHINA_SURVIVAL_CAPSTONE.variants)[number];

export function capstoneVariantFor(attemptNumber = 0): CapstoneVariant {
  const index = ((attemptNumber % 3) + 3) % 3;
  return CHINA_SURVIVAL_CAPSTONE.variants[index];
}
