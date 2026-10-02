/**
 * RC2.2.25 — GUIDED_EXPERIENCE_GOLD_STANDARD.
 *
 * Extraído das primeiras aulas que o owner aprovou (Teste guiado, p1–l2):
 * é a régua para TODA superfície em modo atividade. Não é motor nem tela
 * nova: é o contrato que o gate e o inventário (docs/release/
 * rc2-2-25-surface-inventory.json) medem.
 *
 * Puro: sem React, sem store — o gate executa este arquivo a partir do texto.
 */
import { STEP_PRESENTATION_CONTRACTS } from "./guidedPresentation";

export interface GoldStandardTrait {
  id: string;
  rule: string;
}

/** As 16 características da experiência guiada aprovada. */
export const GUIDED_EXPERIENCE_GOLD_STANDARD: readonly GoldStandardTrait[] = [
  { id: "ONE_IDEA_PER_SCREEN", rule: "uma ideia por tela" },
  { id: "ONE_PRIMARY_ACTION", rule: "uma ação principal por vez" },
  { id: "SIMPLE_PROGRESS", rule: "progresso simples (ETAPA n/N ou barra), nunca painel" },
  { id: "NO_DASHBOARD", rule: "nenhum dashboard/estatística durante a atividade" },
  { id: "NO_CARD_IN_CARD", rule: "sem cartão dentro de cartão" },
  { id: "NO_SCROLL_390", rule: "sem rolagem em 390×844 e 375×667" },
  { id: "ADAPT_360", rule: "360×640 só compacta espaçamento, nada some" },
  { id: "SHORT_FEEDBACK", rule: "feedback curto na mesma tela (uma frase + Ver mais opcional)" },
  { id: "CTA_IS_ACTION", rule: "CTA diz a ação (Continuar/Começar/Ouvir/Responder/Ver resultado/Voltar à Jornada), nunca a recompensa" },
  { id: "NO_SHELL_CHROME", rule: "sem TopBar, TabBar, logo, contadores ou streak durante a atividade" },
  { id: "EXIT_ALWAYS", rule: "X/VOLTAR sempre visível e funcionando" },
  { id: "AUDIO_HONEST", rule: "áudio só conta com evento real; falha tem saída explícita" },
  { id: "NO_ENGINE_TALK", rule: "nada de motor/serviço/modelo/locale fora do QA" },
  { id: "HANZI_LEGIBLE", rule: "hànzì principal ≥64px, opção ≥48px, par ≥44px" },
  { id: "RETURN_TO_CONTEXT", rule: "ao terminar, volta ao ponto pedagógico (âncora da Jornada)" },
  { id: "CALM_REWARD", rule: "recompensa só no resultado, discreta" },
] as const;

// ── StepKind → classe guiada ──────────────────────────────────────────────

export type GuidedStepClass = "GUIDED_NATIVE" | "GUIDED_COMPATIBLE" | "LEGACY_PRESENTATION";

/**
 * GUIDED_NATIVE      nasceu no formato guiado (dock, centralizado, sem rolar)
 * GUIDED_COMPATIBLE  adaptador dentro do shell guiado (digitação, montagem,
 *                    conversa longa) — mesma moldura, rolagem interna
 * LEGACY_PRESENTATION fora do shell guiado. Meta da RC2.2.25: ZERO.
 */
export function guidedStepClass(kind: string): GuidedStepClass {
  const contract = (STEP_PRESENTATION_CONTRACTS as Record<string, { layout: string } | undefined>)[kind];
  if (!contract) return "LEGACY_PRESENTATION";
  if (contract.layout === "GUIDED_NATIVE") return "GUIDED_NATIVE";
  if (contract.layout === "GUIDED_ADAPTER" || contract.layout === "COMPLEX_INLINE") return "GUIDED_COMPATIBLE";
  return "LEGACY_PRESENTATION";
}

// ── Densidade de tela ─────────────────────────────────────────────────────

export type ScreenDensity = "MINIMAL" | "GOOD" | "BUSY" | "OVERLOADED";

export interface ScreenDensityInput {
  /** Blocos visíveis na dobra (cartões, seções, banners). */
  blocks: number;
  /** Botões/links de ação visíveis. */
  actions: number;
  /** Números/estatísticas/pílulas de status visíveis. */
  stats: number;
  /** Profundidade máxima de cartão dentro de cartão (1 = sem aninhar). */
  cardDepth: number;
  /** A tela rola em 390×844? */
  scrolls: boolean;
  /** Chrome do app (TopBar/TabBar) visível. */
  shellChrome: boolean;
}

/**
 * Pontuação simples e explicável. Atividade aceita só MINIMAL/GOOD.
 *   MINIMAL ≤ 3 · GOOD ≤ 6 · BUSY ≤ 10 · OVERLOADED > 10
 */
export function screenDensityPoints(input: ScreenDensityInput): number {
  return (
    Math.max(0, input.blocks - 1) +
    // X + até 4 opções + CTA é a forma natural de uma atividade de escolha.
    Math.max(0, input.actions - 6) +
    input.stats +
    Math.max(0, input.cardDepth - 1) * 3 +
    (input.scrolls ? 3 : 0) +
    (input.shellChrome ? 3 : 0)
  );
}

export function screenDensityScore(input: ScreenDensityInput): ScreenDensity {
  const points = screenDensityPoints(input);
  if (points <= 3) return "MINIMAL";
  if (points <= 6) return "GOOD";
  if (points <= 10) return "BUSY";
  return "OVERLOADED";
}

export function activityDensityAccepted(density: ScreenDensity): boolean {
  return density === "MINIMAL" || density === "GOOD";
}

// ── CTA ────────────────────────────────────────────────────────────────────

export const GUIDED_CTA_LABELS = ["Continuar", "Começar", "Ouvir", "Responder", "Ver resultado", "Voltar à Jornada"] as const;

/** CTA nunca carrega recompensa ("Continuar +20 XP" é proibido). */
export function ctaCarriesReward(label: string): boolean {
  return /\+\s*\d+\s*(XP|Qi)\b|\bXP\b|💎|moedas?/i.test(label);
}

// ── Fala ──────────────────────────────────────────────────────────────────

export const SPEAKING_STAGES = ["OUCA", "GRAVE", "OUCA_VOCE", "COMPARE", "CONTINUE"] as const;
export type SpeakingStage = (typeof SPEAKING_STAGES)[number];
export const SPEAKING_STAGE_LABEL: Readonly<Record<SpeakingStage, string>> = {
  OUCA: "Ouça",
  GRAVE: "Grave",
  OUCA_VOCE: "Ouça você",
  COMPARE: "Compare",
  CONTINUE: "Continue",
};

/** Estágio que o aluno vê, derivado do estado REAL da gravação/reprodução. */
export function speakingStageFor(input: {
  modelHeard: boolean;
  phase: "idle" | "preparing" | "recording" | "recorded" | "failed";
  playState: "idle" | "preparing" | "playing" | "played" | "failed";
}): SpeakingStage {
  if (input.phase === "recorded") {
    if (input.playState === "played") return "CONTINUE";
    if (input.playState === "playing") return "COMPARE";
    return "OUCA_VOCE";
  }
  if (input.phase === "preparing" || input.phase === "recording" || input.phase === "failed") return "GRAVE";
  return input.modelHeard ? "GRAVE" : "OUCA";
}

/** Termos de motor que nunca aparecem para o aluno fora do QA. */
export const ENGINE_TERMS_RE = /\b(engine|motor de voz|SpeechRecognizer|recognizer|zh-CN|locale|modelo offline|serviço de (voz|reconhecimento))\b/i;

// ── Superfícies: HUB × ATIVIDADE ──────────────────────────────────────────

export type SurfaceMode = "HUB" | "ACTIVITY";

export interface LearnerSurface {
  id: string;
  route: string;
  /** Como a atividade entra em focus (sem TopBar/TabBar). */
  focusVia: "ROUTE" | "FOCUS_ACTIVITY" | "FOCUS_FRAME" | "LESSON_PLAYER" | "NONE";
  /** Marcador DOM da atividade em focus. */
  activityMarker: string | null;
}

/** As superfícies de aprendizagem que a RC2.2.25 exige com hub ≠ atividade. */
export const ACTIVITY_SURFACES: readonly LearnerSurface[] = [
  { id: "JORNADA_LICAO", route: "/licao/:id/player", focusVia: "LESSON_PLAYER", activityMarker: "[data-lesson-step-frame]" },
  { id: "PRATICAR", route: "/treino", focusVia: "NONE", activityMarker: null },
  { id: "REVISAO", route: "/revisao", focusVia: "FOCUS_ACTIVITY", activityMarker: "[data-review-round-header]" },
  { id: "TONS_SOM", route: "/som", focusVia: "FOCUS_ACTIVITY", activityMarker: "[data-tone-trainer-focus]" },
  { id: "PINYIN_LAB", route: "/pinyin", focusVia: "FOCUS_FRAME", activityMarker: "[data-focus-activity-frame]" },
  { id: "FALA", route: "/fala", focusVia: "FOCUS_FRAME", activityMarker: "[data-focus-activity-frame]" },
  { id: "HANZI", route: "/hanzi?mode=", focusVia: "ROUTE", activityMarker: null },
  { id: "IDEOGRAMAS", route: "/ideogramas", focusVia: "NONE", activityMarker: null },
  { id: "ATLAS", route: "/hanzi/atlas", focusVia: "NONE", activityMarker: null },
  { id: "CULTURA", route: "/cultura/:id", focusVia: "LESSON_PLAYER", activityMarker: null },
  { id: "IMERSAO", route: "/imersao", focusVia: "FOCUS_ACTIVITY", activityMarker: "[data-immersion-focus]" },
  { id: "LEITURA", route: "/leitura", focusVia: "NONE", activityMarker: null },
  { id: "MISSOES", route: "/missoes", focusVia: "NONE", activityMarker: null },
  { id: "CHALLENGE", route: "/teste/fase/:id", focusVia: "ROUTE", activityMarker: null },
  { id: "PLACEMENT", route: "/comecar", focusVia: "ROUTE", activityMarker: null },
  { id: "PREMIUM", route: "/plano", focusVia: "NONE", activityMarker: null },
] as const;
