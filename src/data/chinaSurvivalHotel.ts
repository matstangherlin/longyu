/**
 * V4.9.8B — China Survival II: hotel check-in.
 * Capabilities in use, not a 30-word hotel list.
 */
export const CHINA_SURVIVAL_HOTEL_ARC = {
  id: "china-survival-hotel",
  remessa: "V4.9.8B",
  objectivePt:
    "Consigo atravessar um check-in simples de hotel em mandarim: recepção, reserva, passaporte, quarto, cartão e um pedido útil.",
  objectiveEn:
    "I can get through a simple hotel check-in in Mandarin: reception, reservation, passport, room, key card, and one useful request.",
  lessonIds: ["p6-survival-mandarin", "p7-imersao-hotel"] as const,
  sceneIds: ["checkin-hotel"] as const,
  missionLessonId: "p7-imersao-hotel",
  teachLessonId: "p6-survival-mandarin",
  cultureItemIds: ["hotel-checkin-register"] as const,
  capabilities: [
    "find_reception",
    "state_reservation",
    "show_passport",
    "understand_room_number",
    "ask_room_location",
    "understand_nights",
    "recognize_room_card",
    "ask_wifi",
    "ask_bathroom",
    "ask_for_help",
    "resolve_simple_problem",
    "close_checkin",
    "listening",
    "production",
    "speaking",
    "conversation",
    "repair",
  ] as const,
} as const;

export const HOTEL_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_HOTEL_ARC.lessonIds;
