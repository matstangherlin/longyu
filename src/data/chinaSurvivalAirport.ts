/**
 * V4.9.8B — China Survival II: inside the airport.
 * Gate, document, listening — not a street search for the airport.
 */
export const CHINA_SURVIVAL_AIRPORT_ARC = {
  id: "china-survival-airport",
  remessa: "V4.9.8B",
  objectivePt:
    "Consigo uma situação básica de aeroporto em mandarim: documento, voo/portão, áudio, placa e reparo até chegar ao portão.",
  objectiveEn:
    "I can handle a basic airport situation in Mandarin: document, flight/gate, audio, a sign, and repair until I reach the gate.",
  lessonIds: ["p6-china-cidades-2", "p7-imersao-aeroporto"] as const,
  sceneIds: ["no-aeroporto"] as const,
  missionLessonId: "p7-imersao-aeroporto",
  teachLessonId: "p6-china-cidades-2",
  streetFindLessonId: "p6-china-cidades-2",
  cultureItemIds: [] as const,
  capabilities: [
    "identify_airport",
    "find_checkin_or_relevant_area",
    "show_passport",
    "identify_flight",
    "ask_flight",
    "find_gate",
    "understand_gate_number",
    "understand_basic_direction",
    "recognize_luggage_context",
    "ask_for_help",
    "repair_misunderstanding",
    "complete_airport_flow",
    "listening",
    "production",
    "speaking",
    "conversation",
    "sign",
  ] as const,
} as const;

export const AIRPORT_SURVIVAL_TOPIC_IDS = CHINA_SURVIVAL_AIRPORT_ARC.lessonIds;
