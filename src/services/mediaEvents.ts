import { getInterfaceLocale } from "../i18n/locale";
import { getTelemetryConsent } from "./telemetryConsent";

/**
 * V4.9.2B — Parte W: telemetria da cápsula, ciente de consentimento.
 *
 * O que queremos saber é onde a aula perde o aluno: se ele abre e não começa,
 * se abandona em 25%, se liga legenda, se o vídeo falhou. Nada disso exige
 * saber QUEM é o aluno, então nada disso é coletado.
 *
 * Duas defesas, não uma. O consentimento é verificado a cada emissão — não uma
 * vez na montagem —, porque o aluno pode revogar no meio da aula e a decisão
 * dele vale a partir do próximo evento. E o filtro de PII roda mesmo sobre
 * metadados que nós mesmos escrevemos: quem adicionar um campo novo daqui a
 * seis meses não precisa lembrar da regra para continuar cumprindo-a.
 */
export const MEDIA_EVENT_TYPES = [
  "capsule_impression",
  "capsule_started",
  "media_started",
  "media_paused",
  "media_seek",
  "media_25",
  "media_50",
  "media_75",
  "media_90",
  "caption_enabled",
  "transcript_opened",
  "media_error",
  "media_retry",
  "media_fallback_used",
  "capsule_completed",
  // V4.9.3 — Parte V: o funil da instrução. Mede a AULA, nunca o aluno.
  // Saber que 40% erram um microcheck é como se descobre que a explicação
  // acima dele está ruim; o número não vira nota de ninguém.
  "instruction_started",
  "instruction_completed",
  "microcheck_attempt",
  "microcheck_correct",
  "booster_started_after_instruction",
] as const;

export type MediaEventType = (typeof MEDIA_EVENT_TYPES)[number];

/** Marcos de progresso, em ordem. Cada um dispara uma única vez por sessão. */
export const MEDIA_PROGRESS_MILESTONES = [
  { fraction: 0.25, event: "media_25" },
  { fraction: 0.5, event: "media_50" },
  { fraction: 0.75, event: "media_75" },
  { fraction: 0.9, event: "media_90" },
] as const satisfies ReadonlyArray<{ fraction: number; event: MediaEventType }>;

const PII_KEY = /email|name|phone|password|token|address|user|account|ip\b/i;

export type MediaEventMetadata = Record<string, string | number | boolean | null>;

export function trackMediaEvent(eventType: MediaEventType, metadata: MediaEventMetadata = {}): void {
  // Sem consentimento não há evento — nem enfileirado, nem adiado.
  if (!getTelemetryConsent()) return;

  const safe: MediaEventMetadata = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (PII_KEY.test(key)) continue;
    if (typeof value === "string" && value.length > 120) continue;
    safe[key] = value;
  }
  // Anexado depois do filtro porque a chave contém "locale", não identidade.
  safe.interface_locale = getInterfaceLocale();

  try {
    window.dispatchEvent(new CustomEvent("longyu:media", { detail: { eventType, metadata: safe } }));
  } catch {
    // Telemetria nunca pode derrubar a aula.
  }
  if (typeof console !== "undefined" && import.meta.env.DEV) {
    console.debug("[media]", eventType, safe);
  }
}

/**
 * Marcos ainda não atingidos, dado o progresso atual.
 *
 * Recebe os já emitidos e devolve só os novos, para que reproduzir um trecho
 * duas vezes não conte duas vezes — o funil mediria retenção inflada.
 */
export function pendingMilestones(
  coverage: number,
  alreadySent: ReadonlySet<MediaEventType>
): MediaEventType[] {
  return MEDIA_PROGRESS_MILESTONES.filter(
    (milestone) => coverage >= milestone.fraction && !alreadySent.has(milestone.event)
  ).map((milestone) => milestone.event);
}
