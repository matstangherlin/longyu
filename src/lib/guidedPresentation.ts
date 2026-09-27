/**
 * RC2.2.17B · PARTS A–CI — contrato de apresentação da Jornada no formato do
 * Teste guiado.
 *
 * Não é motor: StepRenderer, SRS, domínio, XP, erros, conversa, tons, áudio e
 * fala seguem os mesmos. Este módulo só decide COMO um passo aparece dentro do
 * GuidedLessonShell (tela cheia, cabeçalho simples, viewport, dock inferior):
 *
 *   layout             GUIDED_NATIVE | GUIDED_ADAPTER | COMPLEX_INLINE
 *   actionPlacement    DOCK (CTA no dock) | INLINE (exceção explícita) | NONE
 *   verticalAlignment  CENTER | TOP_CENTER | CONTENT_SCROLL | CONVERSATION
 *   scrollPolicy       NONE (cabe em 390×844) | INTERNAL (rola por dentro)
 *   feedbackPolicy     INLINE (mesma tela) | AUTO_ADVANCE (pares)
 *
 * GUIDANCE LEVEL (quanto ajuda) ≠ SHELL (como a aula aparece). TODAS as
 * lições da Jornada usam o shell; só a densidade de ajuda muda.
 *
 * Puro: sem React, sem store — o gate executa este arquivo.
 */
import type { StepKind } from "../data/journey";
import type { GuidanceLevel } from "./guidedLesson";

export type StepLayoutClass = "GUIDED_NATIVE" | "GUIDED_ADAPTER" | "COMPLEX_INLINE";
export type ActionPlacement = "DOCK" | "INLINE" | "NONE";
export type VerticalAlignment = "CENTER" | "TOP_CENTER" | "CONTENT_SCROLL" | "CONVERSATION";
export type ScrollPolicy = "NONE" | "INTERNAL";
export type FeedbackPolicy = "INLINE" | "AUTO_ADVANCE";
/**
 * PART W — como a ação principal nasce, consistente por família:
 *   SELECT_VERIFY  tocar opção → [ Verificar ] no dock
 *   AUTO_CHECK     tocar a opção já corrige → [ Continuar ] no dock
 *   TYPE_VERIFY    digitar/montar → [ Verificar ] no dock
 *   LISTEN_FIRST   ouvir (evento real de áudio) → [ Continuar ] no dock
 *   READ_CONTINUE  ler → [ Entendi/Continuar ] no dock desde o início
 */
export type InteractionMode = "SELECT_VERIFY" | "AUTO_CHECK" | "TYPE_VERIFY" | "LISTEN_FIRST" | "READ_CONTINUE";

export interface StepPresentationContract {
  layout: StepLayoutClass;
  actionPlacement: ActionPlacement;
  verticalAlignment: VerticalAlignment;
  scrollPolicy: ScrollPolicy;
  feedbackPolicy: FeedbackPolicy;
  interaction: InteractionMode;
  /** Por que o passo não usa o dock (só para INLINE/NONE). */
  exception?: string;
}

const native = (
  verticalAlignment: VerticalAlignment = "CENTER",
  interaction: InteractionMode = "SELECT_VERIFY"
): StepPresentationContract => ({
  layout: "GUIDED_NATIVE",
  actionPlacement: "DOCK",
  verticalAlignment,
  scrollPolicy: "NONE",
  feedbackPolicy: "INLINE",
  interaction,
});

const adapter = (
  verticalAlignment: VerticalAlignment = "TOP_CENTER",
  interaction: InteractionMode = "TYPE_VERIFY"
): StepPresentationContract => ({
  layout: "GUIDED_ADAPTER",
  actionPlacement: "DOCK",
  verticalAlignment,
  scrollPolicy: "INTERNAL",
  feedbackPolicy: "INLINE",
  interaction,
});

/**
 * PART CH — registro central. Cada StepKind tem UM contrato; nada de CSS
 * adivinhado por passo (PART CI).
 */
export const STEP_PRESENTATION_CONTRACTS: Readonly<Record<StepKind, StepPresentationContract>> = {
  // GUIDED_NATIVE — uma ideia, uma ação, centralizado (PART CE/H).
  intro: native("CENTER", "READ_CONTINUE"),
  listen: native("CENTER", "LISTEN_FIRST"),
  tone: native("CENTER", "LISTEN_FIRST"),
  flashcard: native("CENTER", "AUTO_CHECK"),
  recognize: native("CENTER", "AUTO_CHECK"),
  comprehend: native("CENTER", "AUTO_CHECK"),
  decompose: native("CENTER", "READ_CONTINUE"),
  hanzi_evolution: native("CENTER", "READ_CONTINUE"),
  compare_with_image: native("CENTER"),
  image_choice: native("CENTER", "AUTO_CHECK"),
  listen_select: native("CENTER"),
  audio_to_action: native("CENTER"),
  audio_discrimination: native("CENTER"),
  dialogue_choice: native("CENTER"),
  contextual_choice: native("CENTER"),
  dialogue_completion: native("CENTER"),
  odd_one_out: native("CENTER"),
  spot_error: native("CENTER"),
  microread: native("TOP_CENTER", "READ_CONTINUE"),
  place_label: native("CENTER"),
  city_context: native("CENTER"),
  sign_reading: native("CENTER"),
  menu_reading: native("TOP_CENTER"),
  price_task: native("CENTER"),
  schedule_reading: native("TOP_CENTER"),
  // GUIDED_ADAPTER — digitação, montagem, fala, Hànzì (PART CF).
  produce: adapter("TOP_CENTER"),
  write: adapter("TOP_CENTER"),
  fill_blank: adapter("TOP_CENTER"),
  sentence_build: adapter("TOP_CENTER"),
  translation_build: adapter("TOP_CENTER"),
  address_build: adapter("TOP_CENTER"),
  route_sequence: adapter("TOP_CENTER"),
  map_direction: adapter("TOP_CENTER"),
  sentence_transform: adapter("TOP_CENTER"),
  substitution_drill: adapter("TOP_CENTER"),
  reverse_recall: adapter("TOP_CENTER"),
  dictation: adapter("TOP_CENTER"),
  free_production: adapter("CONTENT_SCROLL"),
  transfer_task: adapter("CONTENT_SCROLL"),
  conversation_repair: adapter("TOP_CENTER", "AUTO_CHECK"),
  hanzi_build: adapter("CENTER"),
  // Pares: o toque no último par conclui e avança sozinho — não há CTA.
  match_pairs: {
    layout: "GUIDED_ADAPTER",
    actionPlacement: "NONE",
    verticalAlignment: "CENTER",
    scrollPolicy: "NONE",
    feedbackPolicy: "AUTO_ADVANCE",
    interaction: "AUTO_CHECK",
    exception: "o último par certo conclui o passo; não existe botão para docar",
  },
  tone_pair: {
    layout: "GUIDED_ADAPTER",
    actionPlacement: "NONE",
    verticalAlignment: "CENTER",
    scrollPolicy: "NONE",
    feedbackPolicy: "AUTO_ADVANCE",
    interaction: "AUTO_CHECK",
    exception: "o último par certo conclui o passo; não existe botão para docar",
  },
  // COMPLEX_INLINE — cena longa: a resposta/composição vive junto do balão
  // (PART CG), mas SEM moldura externa e com o avanço da fala no dock.
  conversation_scene: {
    layout: "COMPLEX_INLINE",
    actionPlacement: "INLINE",
    verticalAlignment: "CONVERSATION",
    scrollPolicy: "INTERNAL",
    feedbackPolicy: "INLINE",
    interaction: "SELECT_VERIFY",
    exception: "resposta/composição da vez do aluno fica junto do balão; o avanço da fala usa o dock",
  },
};

export function presentationContractFor(kind: string): StepPresentationContract {
  return STEP_PRESENTATION_CONTRACTS[kind as StepKind] ?? native("TOP_CENTER");
}

/** O dock pode nascer vazio e ganhar a ação na primeira interação real. */
export function dockMayStartEmpty(kind: string): boolean {
  const { actionPlacement, interaction } = presentationContractFor(kind);
  return actionPlacement === "DOCK" && interaction !== "READ_CONTINUE";
}

/** PART L — meta: ≥ 80% dos passos da Jornada com a ação no dock. */
export const GUIDED_DOCK_TARGET_SHARE = 0.8;

export interface DockShare {
  total: number;
  dock: number;
  inline: number;
  none: number;
  share: number;
}

/** Fração REAL de passos (autorais) cuja ação principal vai para o dock. */
export function dockShareForKinds(kinds: readonly string[]): DockShare {
  let dock = 0;
  let inline = 0;
  let none = 0;
  for (const kind of kinds) {
    const placement = presentationContractFor(kind).actionPlacement;
    if (placement === "DOCK") dock += 1;
    else if (placement === "INLINE") inline += 1;
    else none += 1;
  }
  const total = kinds.length;
  return { total, dock, inline, none, share: total ? dock / total : 0 };
}

// ── Shell e rollback (PART BY/BZ) ─────────────────────────────────────────

export type LessonShellMode = "GUIDED" | "LEGACY";

export interface ShellFlagInput {
  /** `VITE_GUIDED_JOURNEY_SHELL` do build. */
  flag?: string | null;
  /** Build de produção pública: o alvo é SEMPRE o shell guiado. */
  productionBeta?: boolean;
  /**
   * Override de DEV/QA em tempo de execução (antes/depois nas capturas).
   * Só é considerado quando o chamador já provou que a sessão é de teste.
   */
  runtimeOverride?: string | null;
}

const OFF = new Set(["0", "off", "false", "legacy"]);

/**
 * PART BY — `VITE_GUIDED_JOURNEY_SHELL` é um rollback VISUAL temporário de
 * DEV/QA. Produção: ON. O estado da lição é o mesmo nos dois shells — trocar
 * não perde progresso (PART BZ).
 */
export function resolveLessonShellMode(input: ShellFlagInput): LessonShellMode {
  if (input.productionBeta) return "GUIDED";
  const override = String(input.runtimeOverride ?? "").trim().toLowerCase();
  if (override === "legacy") return "LEGACY";
  if (override === "guided") return "GUIDED";
  const flag = String(input.flag ?? "").trim().toLowerCase();
  return OFF.has(flag) ? "LEGACY" : "GUIDED";
}

// ── Estágio de apresentação (PART N–Q) ────────────────────────────────────

export type PresentationStage = "PREPARE" | "STEP";

export interface PrepareInput {
  guidance: GuidanceLevel;
  /** Índice curricular atual (idx do LessonPlayer). */
  stepIndex: number;
  firstStepKind?: string;
  /** Ponte do Teste guiado (l2). */
  bridge: boolean;
  /** O aluno já tocou em "Começar" nesta montagem. */
  started: boolean;
}

/**
 * PART O/P — PREPARE é um micro-passo VISUAL real (Dragão + balão + Começar),
 * não um passo do currículo. Aparece só na abertura (idx 0), com guia
 * alto/médio, e só quando o 1º passo não é a própria fala do Dragão (intro)
 * — nunca a mesma abertura duas vezes. Não conta como passo, XP, domínio,
 * tarefa nem SRS (PART Q): é estado de UI; `idx` não muda.
 */
export function presentationStageFor(input: PrepareInput): PresentationStage {
  if (input.started || input.stepIndex !== 0) return "STEP";
  if (input.guidance !== "HIGH" && input.guidance !== "MEDIUM") return "STEP";
  if (!input.bridge && input.firstStepKind === "intro") return "STEP";
  return "PREPARE";
}

// ── Micro-páginas de ensino (PART AM–AQ) ──────────────────────────────────

/** PART AM — fala principal ≤ 140 caracteres no celular. */
export const GUIDED_HELPER_MAX_CHARS = 140;

/**
 * Quebra falas longas em micro-páginas (só apresentação). Parte por frase e,
 * se uma frase sozinha passar do limite, por vírgula/espaço. Nunca perde
 * texto: juntar as páginas devolve o conteúdo original (espaços normalizados).
 */
export function splitTeachPages(messages: readonly string[], max = GUIDED_HELPER_MAX_CHARS): string[] {
  const pages: string[] = [];
  for (const raw of messages) {
    const message = String(raw ?? "").replace(/\s+/g, " ").trim();
    if (!message) continue;
    if (message.length <= max) {
      pages.push(message);
      continue;
    }
    const sentences = message.match(/[^.!?。！？]+[.!?。！？]+["”’)]*\s*|[^.!?。！？]+$/g) ?? [message];
    let current = "";
    for (const sentenceRaw of sentences) {
      const sentence = sentenceRaw.trim();
      if (!sentence) continue;
      for (const piece of splitLong(sentence, max)) {
        if (!current) current = piece;
        else if (`${current} ${piece}`.length <= max) current = `${current} ${piece}`;
        else {
          pages.push(current);
          current = piece;
        }
      }
    }
    if (current) pages.push(current);
  }
  return pages;
}

function splitLong(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  let rest = text;
  while (rest.length > max) {
    const window = rest.slice(0, max + 1);
    const cut = Math.max(window.lastIndexOf(", "), window.lastIndexOf("; "), window.lastIndexOf(": "));
    const at = cut > max * 0.4 ? cut + 1 : window.lastIndexOf(" ") > 0 ? window.lastIndexOf(" ") : max;
    out.push(rest.slice(0, at).trim());
    rest = rest.slice(at).trim();
  }
  if (rest) out.push(rest);
  return out;
}

// ── Dragão (PART AW–AY) ───────────────────────────────────────────────────

export type DragonMoment = "PREPARE" | "EXPLANATION" | "NUANCE" | "ERROR_RECOVERY" | "MILESTONE";

/** Dragão aparece em momentos pedagógicos — nunca em toda pergunta. */
export function dragonMomentForStep(kind: string, index: number): DragonMoment | null {
  if (kind === "intro") return index === 0 ? "PREPARE" : "EXPLANATION";
  return null;
}

/** PART AY — mascote 56–88px no celular. */
export const GUIDED_DRAGON_SIZE = { compact: 56, default: 72, max: 88 } as const;

// ── Cabeçalho (PART C/D) ──────────────────────────────────────────────────

/**
 * Fôlego/vidas só como indicador compacto quando é pedagogicamente relevante:
 * depois de um erro (vidas abaixo do máximo). Pro/ilimitado: nunca.
 */
export function showsBreathIndicator(input: { lives: number; maxLives: number; unlimited: boolean }): boolean {
  return !input.unlimited && input.lives < input.maxLives;
}

// ── Layout (PART BJ/BK) ───────────────────────────────────────────────────

/** Desktop/tablet: conteúdo centralizado, largura limitada (~640–760px). */
export const GUIDED_VIEWPORT_MAX_WIDTH_PX = 680;
/** Transição entre passos (PART AT): 150–220ms. */
export const GUIDED_STEP_TRANSITION_MS = 180;
