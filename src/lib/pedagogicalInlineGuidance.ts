/**
 * RC2.2.32 — orientação pedagógica INLINE (não popup).
 *
 * Separada do GuidanceOrchestrator global:
 * - NÃO consome orçamento de sessão de popups globais
 * - PODE aparecer durante activeLearning (é parte da tarefa)
 * - Só na primeira exposição de cada interação
 * - Reexibição só via botão `?` discreto
 *
 * Global coachmarks/popups continuam raros e bloqueados durante aprendizagem.
 */
export type PedagogicalInteractionId =
  | "hanzi_builder"
  | "tone_trace"
  | "speech_self_compare"
  | "image_choice"
  | "audio_contrast"
  | "conversation_reply";

export interface PedagogicalInlineDefinition {
  id: string;
  interaction: PedagogicalInteractionId;
  /** Texto curto em português (UI do aluno). */
  bodyPt: string;
  bodyEn: string;
}

export const PEDAGOGICAL_INLINE_DEFINITIONS: readonly PedagogicalInlineDefinition[] = [
  {
    id: "inline_hanzi_builder_v1",
    interaction: "hanzi_builder",
    bodyPt: "Arraste as partes para formar o caractere.",
    bodyEn: "Drag the parts to form the character.",
  },
  {
    id: "inline_tone_trace_v1",
    interaction: "tone_trace",
    bodyPt: "Toque e acompanhe a direção do tom.",
    bodyEn: "Touch and follow the tone contour.",
  },
  {
    id: "inline_speech_self_compare_v1",
    interaction: "speech_self_compare",
    bodyPt: "Ouça primeiro. Depois grave sua voz.",
    bodyEn: "Listen first. Then record your voice.",
  },
  {
    id: "inline_image_choice_v1",
    interaction: "image_choice",
    bodyPt: "Observe a imagem e escolha a palavra correspondente.",
    bodyEn: "Look at the image and choose the matching word.",
  },
  {
    id: "inline_audio_contrast_v1",
    interaction: "audio_contrast",
    bodyPt: "Ouça a curva. Depois escolha o som que muda apenas no tom.",
    bodyEn: "Listen to the contour. Then pick the sound that changes only in tone.",
  },
  {
    id: "inline_conversation_reply_v1",
    interaction: "conversation_reply",
    bodyPt: "Leia a fala. Escolha a resposta que continua a conversa.",
    bodyEn: "Read the line. Choose the reply that continues the conversation.",
  },
] as const;

export const PEDAGOGICAL_INLINE_BY_INTERACTION = new Map(
  PEDAGOGICAL_INLINE_DEFINITIONS.map((d) => [d.interaction, d] as const)
);

export const PEDAGOGICAL_INLINE_STORAGE_KEY = "longyu:pedagogical-inline-seen-v1";

export type PedagogicalInlineSeenMap = Record<string, number>;

export function loadPedagogicalInlineSeen(): PedagogicalInlineSeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PEDAGOGICAL_INLINE_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: PedagogicalInlineSeenMap = {};
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof at === "number") out[id] = at;
    }
    return out;
  } catch {
    return {};
  }
}

export function persistPedagogicalInlineSeen(map: PedagogicalInlineSeenMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PEDAGOGICAL_INLINE_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

export function pedagogicalInlineSeen(id: string, map: PedagogicalInlineSeenMap = loadPedagogicalInlineSeen()): boolean {
  return typeof map[id] === "number";
}

export function markPedagogicalInlineSeen(id: string, at = Date.now()): PedagogicalInlineSeenMap {
  const map = { ...loadPedagogicalInlineSeen(), [id]: at };
  persistPedagogicalInlineSeen(map);
  return map;
}

export function clearPedagogicalInlineSeenForTests(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(PEDAGOGICAL_INLINE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Decide se a microorientação deve aparecer automaticamente.
 * Nunca bloqueia a tarefa; nunca conta no orçamento global de popups.
 */
export function shouldAutoShowPedagogicalInline(
  interaction: PedagogicalInteractionId,
  map: PedagogicalInlineSeenMap = loadPedagogicalInlineSeen()
): PedagogicalInlineDefinition | null {
  const def = PEDAGOGICAL_INLINE_BY_INTERACTION.get(interaction);
  if (!def) return null;
  if (pedagogicalInlineSeen(def.id, map)) return null;
  return def;
}

export function pedagogicalInlineBody(def: PedagogicalInlineDefinition, locale: "pt-BR" | "en"): string {
  return locale === "en" ? def.bodyEn : def.bodyPt;
}
