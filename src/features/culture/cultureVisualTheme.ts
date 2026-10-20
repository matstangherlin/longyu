import type { CultureTopicId } from "../../data/cultureTopicGroups";
import type { JourneySceneId } from "../journey/scenes/journeySceneRegistry";

/**
 * RC2.3.13R.3.2.6 — each Culture topic's visual theme (presentation only).
 *
 * heroScene: the one thematic living illustration in the topic hero (never on
 * subtopics, never more than one per page). ornamentOffset: where that
 * topic's side-motif cycle starts (index into ORNAMENT_MOTIFS), so every
 * topic does not open on the same lantern.
 */
export const CULTURE_TOPIC_VISUAL: Readonly<Record<CultureTopicId, { heroScene: JourneySceneId; ornamentOffset: number }>> = {
  vida_cotidiana: { heroScene: "lantern-street", ornamentOffset: 2 },
  relacoes_etiqueta: { heroScene: "courtyard", ornamentOffset: 7 },
  comida_celebracoes: { heroScene: "tea-table", ornamentOffset: 0 },
  escola_trabalho: { heroScene: "digital-life", ornamentOffset: 6 },
  cidades_digital: { heroScene: "modern-city", ornamentOffset: 3 },
  historia_china: { heroScene: "brush-seal", ornamentOffset: 5 },
  china_contemporanea: { heroScene: "high-speed-rail", ornamentOffset: 4 },
};

export function cultureTopicVisual(topicId: string) {
  return CULTURE_TOPIC_VISUAL[topicId as CultureTopicId];
}
