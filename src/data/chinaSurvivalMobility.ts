/**
 * V4.9.8A — China Survival II: urban mobility (station, directions, taxi).
 * Capabilities in use, not a maps product.
 */
export const CHINA_SURVIVAL_MOBILITY_ARC = {
  id: "china-survival-mobility",
  remessa: "V4.9.8A",
  objectivePt:
    "Consigo me deslocar sozinho por uma cidade chinesa em situações básicas: perguntar, entender, navegar, reparar e chegar.",
  objectiveEn:
    "I can get around a Chinese city in basic situations: ask, understand, navigate, repair, and arrive.",
  lessonIds: ["p6-cidade-lugares", "p6-direcoes", "p6-china-ruas", "p7-imersao-estacao"] as const,
  sceneIds: ["imersao-estacao", "pegar-taxi"] as const,
  missionLessonId: "p7-imersao-estacao",
  cultureItemIds: ["metro-qr"] as const,
  capabilities: [
    "ask_location",
    "ask_route",
    "left",
    "right",
    "straight",
    "route_follow",
    "station",
    "sign",
    "audio_direction",
    "destination",
    "taxi",
    "request_stop",
    "repair",
    "independent_production",
    "speaking",
    "culture",
    "complete_trip",
  ] as const,
} as const;

export const MOBILITY_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_MOBILITY_ARC.lessonIds;
