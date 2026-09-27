/**
 * RC2.2.19 — orientação pedagógica Jornada ↔ Cultura.
 *
 * Toda ponte da Jornada para a Cultura diz honestamente o que ela é:
 * - SUGGESTION: momento cultural opcional na trilha (pode ignorar).
 * - RECOMMENDED: a aula CORE de Cultura ancorada no tópico que o aluno acabou
 *   de concluir — o "Continuar" leva até ela, mas voltar à Jornada é permitido.
 * - CURRICULUM_GATE: marco cultural que o próximo trecho assume (selo) — é o
 *   único que segura a trilha, e diz por quê.
 *
 * Toda abertura a partir da Jornada leva `?src=jornada&from=/jornada…`, então
 * a Cultura sempre devolve o aluno à Jornada (cultureReturnPath).
 */
export type JourneyCultureGuidanceType = "SUGGESTION" | "RECOMMENDED" | "CURRICULUM_GATE";

export type JourneyCultureSource = "moment" | "core_after_topic" | "progression_gate";

export const JOURNEY_CULTURE_RETURN_ROUTE = "/jornada";

export function journeyCultureGuidanceType(source: JourneyCultureSource): JourneyCultureGuidanceType {
  switch (source) {
    case "progression_gate":
      return "CURRICULUM_GATE";
    case "core_after_topic":
      return "RECOMMENDED";
    default:
      return "SUGGESTION";
  }
}

/** Só o marco segura a trilha; sugestão e recomendação sempre deixam voltar. */
export function journeyCultureAllowsSkip(type: JourneyCultureGuidanceType): boolean {
  return type !== "CURRICULUM_GATE";
}

/** A aula de Cultura aberta pela Jornada devolve para a Jornada. */
export function journeyCultureReturnsToJourney(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const from = params.get("from") ?? "";
  return params.get("src") === "jornada" && from.startsWith(JOURNEY_CULTURE_RETURN_ROUTE);
}
