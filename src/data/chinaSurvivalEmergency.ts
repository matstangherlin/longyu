/**
 * V4.9.9A — urgent help with phrases already taught.
 * Not a 20-situation emergency course and not official medical advice.
 */
export const CHINA_SURVIVAL_EMERGENCY_ARC = {
  id: "china-survival-emergency",
  remessa: "V4.9.9A",
  objectivePt:
    "Consigo pedir ajuda agora, pedir um médico e localizar atendimento com mandarim já adquirido.",
  objectiveEn:
    "I can ask for help now, ask for a doctor, and locate care with Mandarin I already have.",
  lessonIds: ["p6-saude", "p7-imersao-saude"] as const,
  sceneIds: ["na-clinica"] as const,
  missionLessonId: "p7-imersao-saude",
  teachLessonId: "p6-saude",
  officialEmergencyNumberImplemented: false,
  cultureItemIds: [] as const,
  capabilities: [
    "ask_for_help",
    "say_need_doctor",
    "identify_hospital",
    "communicate_urgent_need",
    "repair_misunderstanding",
    "complete_help_request",
  ] as const,
} as const;

export const CHINA_SURVIVAL_HEALTH_EMERGENCY_ARC = {
  id: "china-survival-health-emergency",
  remessa: "V4.9.9A",
  healthArcId: "china-survival-health",
  emergencyArcId: CHINA_SURVIVAL_EMERGENCY_ARC.id,
  lessonIds: ["p6-saude", "p7-imersao-saude"] as const,
  sceneIds: ["nao-me-sinto-bem", "na-clinica"] as const,
} as const;

export const EMERGENCY_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_EMERGENCY_ARC.lessonIds;
