/**
 * V4.9.9A — China Survival III: health as capabilities, not a medical course.
 */
export const CHINA_SURVIVAL_HEALTH_ARC = {
  id: "china-survival-health",
  remessa: "V4.9.9A",
  objectivePt:
    "Consigo dizer que não estou bem, explicar um sintoma simples, pedir médico e achar atendimento em mandarim.",
  objectiveEn:
    "I can say I am unwell, describe a simple symptom, ask for a doctor, and find care in Mandarin.",
  lessonIds: ["p6-saude", "p7-imersao-saude"] as const,
  sceneIds: ["nao-me-sinto-bem", "na-clinica"] as const,
  missionLessonId: "p7-imersao-saude",
  teachLessonId: "p6-saude",
  cultureItemIds: [] as const,
  capabilities: [
    "say_unwell",
    "say_sick",
    "describe_headache",
    "describe_stomach_pain",
    "describe_fever",
    "ask_for_doctor",
    "ask_for_hospital",
    "understand_basic_symptom_question",
    "answer_basic_symptom_question",
    "ask_repeat",
    "ask_slow",
    "complete_health_interaction",
    "listening",
    "production",
    "speaking",
    "conversation",
    "repair",
  ] as const,
} as const;

export const HEALTH_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_HEALTH_ARC.lessonIds;
