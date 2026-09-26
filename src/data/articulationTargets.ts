/**
 * RC2.2.17 · CB/EC/ED — articulação (consoantes e vogais), sistema SEPARADO
 * de tom.
 *
 * Tom é contorno de altura da voz (ToneContour / toneKnowledge). Língua,
 * lábios e ponto de articulação explicam FONEMAS — nunca o tom. Nada aqui é
 * usado para ensinar 1º/2º/3º/4º tom.
 *
 * Esta onda priorizou tons (Part EE). Os contrastes abaixo ficam registrados
 * como arquitetura para a próxima consolidação pedagógica (RC2.2.18 —
 * Pronunciation Core), sem UI nem conteúdo novo agora.
 */
export type ArticulationContrastId =
  | "b-p"
  | "d-t"
  | "g-k"
  | "z-c-s"
  | "zh-ch-sh"
  | "j-q-x"
  | "u-umlaut"
  | "r-retroflex"
  | "an-ang"
  | "en-eng"
  | "in-ing"
  | "e"
  | "apical-i";

export type ArticulationFeature = "aspiration" | "place" | "tongue-shape" | "lip-rounding" | "nasal-ending" | "vowel-quality";

export interface ArticulationTarget {
  id: ArticulationContrastId;
  feature: ArticulationFeature;
  /** Precisa de desenho de língua/boca (ArticulationDiagram) quando implementado. */
  needsDiagram: boolean;
  status: "PLANNED_RC2_2_18";
}

export const ARTICULATION_TARGETS: readonly ArticulationTarget[] = [
  { id: "b-p", feature: "aspiration", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "d-t", feature: "aspiration", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "g-k", feature: "aspiration", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "z-c-s", feature: "place", needsDiagram: true, status: "PLANNED_RC2_2_18" },
  { id: "zh-ch-sh", feature: "tongue-shape", needsDiagram: true, status: "PLANNED_RC2_2_18" },
  { id: "j-q-x", feature: "place", needsDiagram: true, status: "PLANNED_RC2_2_18" },
  { id: "u-umlaut", feature: "lip-rounding", needsDiagram: true, status: "PLANNED_RC2_2_18" },
  { id: "r-retroflex", feature: "tongue-shape", needsDiagram: true, status: "PLANNED_RC2_2_18" },
  { id: "an-ang", feature: "nasal-ending", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "en-eng", feature: "nasal-ending", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "in-ing", feature: "nasal-ending", needsDiagram: false, status: "PLANNED_RC2_2_18" },
  { id: "e", feature: "vowel-quality", needsDiagram: true, status: "PLANNED_RC2_2_18" },
  { id: "apical-i", feature: "vowel-quality", needsDiagram: true, status: "PLANNED_RC2_2_18" },
] as const;
