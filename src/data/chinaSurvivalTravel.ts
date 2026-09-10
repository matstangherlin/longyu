/**
 * V4.9.8B — aggregate travel contract: mobility + hotel + airport.
 * Master transfer teaches nothing new.
 */
export const CHINA_SURVIVAL_TRAVEL_ARC = {
  id: "china-survival-travel",
  remessa: "V4.9.8B",
  objectivePt:
    "Consigo uma viagem curta Hotel → transporte → aeroporto com mandarim já adquirido.",
  objectiveEn:
    "I can make a short Hotel → transport → airport trip with Mandarin I already have.",
  lessonIds: [
    "p6-survival-mandarin",
    "p6-direcoes",
    "p6-china-ruas",
    "p7-imersao-estacao",
    "p7-imersao-hotel",
    "p7-imersao-aeroporto",
    "p7-imersao-viagem",
  ] as const,
  sceneIds: ["checkin-hotel", "imersao-estacao", "pegar-taxi", "no-aeroporto"] as const,
  transferLessonId: "p7-imersao-viagem",
  hotelArcId: "china-survival-hotel",
  mobilityArcId: "china-survival-mobility",
  airportArcId: "china-survival-airport",
  capabilities: ["mobility", "hotel", "airport", "transfer"] as const,
} as const;

export const TRAVEL_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_TRAVEL_ARC.lessonIds;
