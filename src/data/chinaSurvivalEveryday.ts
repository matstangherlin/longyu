/**
 * V4.9.9B — Everyday conversation as connected recall, not a new word list.
 */
export const CHINA_SURVIVAL_EVERYDAY_ARC = {
  id: "china-survival-everyday",
  remessa: "V4.9.9B",
  objectivePt:
    "Consigo manter uma conversa cotidiana simples e usar o mandarim que já aprendi.",
  objectiveEn:
    "I can keep a simple everyday conversation going with Mandarin I already learned.",
  lessonIds: ["p7-conversa-cotidiana"] as const,
  sceneIds: ["conversa-cotidiana"] as const,
  cultureItemIds: [] as const,
  capabilities: [
    "greet",
    "respond_greeting",
    "introduce_self",
    "ask_name",
    "tell_origin",
    "ask_origin",
    "talk_study_or_work",
    "talk_family_or_friend",
    "ask_wellbeing",
    "tell_wellbeing",
    "talk_today",
    "talk_tomorrow",
    "tell_time",
    "talk_weather",
    "make_simple_plan",
    "reciprocal_question",
    "repair",
    "close_conversation",
    "listening",
    "speaking",
    "open_production",
    "conversation",
  ] as const,
} as const;

export const EVERYDAY_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_EVERYDAY_ARC.lessonIds;
