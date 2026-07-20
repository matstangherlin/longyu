import { todayKey } from "./storage";

// ============================================================================
// ProOfferEngine — decide QUANDO e COMO oferecer o Longyu Pro, de forma
// relevante e ética, sem transformar o app numa sequência de anúncios.
//
// Princípios:
//  - Nunca interromper aprendizagem ativa (exercício, fala, feedback, builder,
//    cena de conversa, correção imediata), o primeiro minuto de uso, nem quem
//    acabou de fechar uma oferta.
//  - Frequência limitada: no máximo 1 modal por sessão e 2 por dia; banners
//    discretos podem aparecer, mas nunca dentro do player; 24h de cooldown para
//    a MESMA oferta depois de fechada.
//  - Ofertas SOLICITADAS (o usuário tentou um recurso Pro / bateu numa parede)
//    respondem à ação do usuário e não contam contra os limites de modal — mas
//    ainda respeitam o cooldown de 24h por oferta.
//  - Copy sem gatilhos antiéticos (cronômetro/preço falso, culpa, medo, etc.).
// ============================================================================

export type ProOfferKind =
  | "success_accelerate"
  | "weak_spots"
  | "energy_limit"
  | "review_limit"
  | "league_promotion"
  | "story_premium"
  | "detailed_errors";

export type ProOfferStrength = "strong" | "card";

/** Variantes de mensagem por contexto (as 4 principais vêm da especificação). */
export const OFFER_MESSAGES = {
  good_performance:
    "Você está avançando rápido. Com o Pro, pode praticar sem limite e acessar revisões completas.",
  difficulty:
    "Alguns pontos ainda precisam de prática. O Pro libera revisão inteligente e análise dos seus erros.",
  out_of_energy:
    "Suas cargas terminaram. Continue gratuitamente quando elas voltarem ou pratique sem limite com o Pro.",
  story:
    "Continue esta história e desbloqueie mais situações reais com o Longyu Pro.",
  review_more:
    "Você revisou o essencial. No Pro, a fila inteira de revisão fica disponível.",
  league:
    "Você está perto de subir na liga. No Pro, estuda mais sem parar por cargas — sem vantagem injusta no ranking.",
} as const;

export type ProOfferMessageVariant = keyof typeof OFFER_MESSAGES;

export interface ProOfferCopy {
  kind: ProOfferKind;
  strength: ProOfferStrength;
  eyebrow: string;
  title: string;
  description: string;
  benefit: string;
  freeContinues: string;
  paywallKind:
    | "training"
    | "weak_spots"
    | "energy"
    | "review"
    | "leagues"
    | "story"
    | "errors";
  // Metadados de decisão (para métricas e regras de frequência).
  placement: string;
  messageVariant: string;
  solicited: boolean;
  reason: string;
}

// ── Momentos da sessão ──────────────────────────────────────────────────────
export type SessionMoment =
  // PROTEGIDOS — nunca interromper:
  | "active_exercise"
  | "character_speech"
  | "answer_feedback"
  | "hanzi_builder"
  | "conversation_scene"
  | "immediate_correction"
  // Permitidos (bons momentos):
  | "lesson_complete"
  | "review_complete"
  | "module_challenge_complete"
  | "streak_complete"
  | "energy_depleted"
  | "errors_corrected"
  | "story_end"
  | "hub"
  | "unknown";

const PROTECTED_MOMENTS: ReadonlySet<SessionMoment> = new Set<SessionMoment>([
  "active_exercise",
  "character_speech",
  "answer_feedback",
  "hanzi_builder",
  "conversation_scene",
  "immediate_correction",
]);

/** Tentativa direta de usar um recurso Pro (oferta "solicitada"). */
export type ProFeatureAttempt =
  | "detailed_report"
  | "premium_story"
  | "unlimited_review"
  | "continue_without_energy"
  | null;

// Entradas da especificação (§1). Mantém também os sinais legados usados pelos
// call sites atuais, para não quebrar a integração.
export interface ProOfferInput {
  /** Plano atual. */
  isPro: boolean;
  /** Momento da sessão. */
  sessionMoment: SessionMoment;
  /** Canal: modal (strong) ou banner discreto (card). */
  channel?: "modal" | "banner";
  /** Energia restante. */
  energyRemaining?: number;
  /** Sequência (acertos seguidos / dias). */
  streak?: number;
  /** Desempenho geral do momento. */
  performance?: "good" | "struggling" | "neutral";
  /** Erro recente. */
  recentError?: boolean;
  /** Conclusão de lição. */
  lessonCompleted?: boolean;
  /** Tentativa de recurso Pro. */
  proFeatureAttempt?: ProFeatureAttempt;
  /** Origem (rota/tela) — usada para atribuição de conversão. */
  origin?: string;
  /** Relógio injetável (testes). */
  now?: number;

  // Sinais adicionais (compat com os call sites atuais).
  lessonThreeStars?: boolean;
  twoStars?: boolean;
  correctStreak?: number;
  errorCount?: number;
  outOfBreath?: boolean;
  repeatedToneErrors?: boolean;
  repeatedHanziErrors?: boolean;
  reviewLimitHit?: boolean;
  triedDetailedErrors?: boolean;
  energyDepleted?: boolean;
  storyPremium?: boolean;
  storyCompleted?: boolean;
  xpToPromotion?: number;
  missionClaimed?: boolean;
  aboveAverageStudy?: boolean;
  reviewCompleted?: boolean;
  moduleChallengeCompleted?: boolean;
  errorsCorrected?: boolean;
}

/** Contexto legado do hook: sessionMoment é inferido quando ausente. */
export type ProOfferContext = Omit<ProOfferInput, "channel" | "sessionMoment"> & {
  sessionMoment?: SessionMoment;
};

/** Saída da especificação (§1). */
export interface ProOfferDecision {
  shouldShow: boolean;
  placement: string;
  messageVariant: string;
  reason: string;
}

// ── Limites de frequência ───────────────────────────────────────────────────
export const MAX_SESSION_MODALS = 1;
export const MAX_DAILY_MODALS = 2;
export const OFFER_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24h após fechar
export const FIRST_MINUTE_MS = 60 * 1000;
export const JUST_DISMISSED_MS = 5 * 60 * 1000; // "acabou de fechar" (não solicitados)

const SESSION_KEY = "longyu:pro-offer-session";
const FREQ_KEY = "longyu:pro-offer-freq";
const METRICS_KEY = "longyu:pro-offer-metrics";
const ORIGIN_KEY = "longyu:pro-offer-origin";
const METRICS_CAP = 100;

interface SessionState {
  sessionModalShown: boolean;
  sessionStartAt: number;
  lastDismissAt: number;
}
interface FreqState {
  day: string;
  dailyModalCount: number;
  dismissAtByKind: Record<string, number>;
}

// Acesso a storage sempre tolerante a falhas (modo offline/privado não quebra).
function readJson<T>(store: Storage | undefined, key: string, fallback: T): T {
  try {
    const raw = store?.getItem(key);
    return raw ? ({ ...fallback, ...(JSON.parse(raw) as object) } as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeJson(store: Storage | undefined, key: string, value: unknown): void {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    /* offline/privado: ignora, nunca quebra o app */
  }
}
function sessionStore(): Storage | undefined {
  return typeof window !== "undefined" ? window.sessionStorage : undefined;
}
function localStore(): Storage | undefined {
  return typeof window !== "undefined" ? window.localStorage : undefined;
}

function readSession(): SessionState {
  return readJson<SessionState>(sessionStore(), SESSION_KEY, {
    sessionModalShown: false,
    sessionStartAt: 0,
    lastDismissAt: 0,
  });
}
function writeSession(state: SessionState): void {
  writeJson(sessionStore(), SESSION_KEY, state);
}
function readFreq(): FreqState {
  return readJson<FreqState>(localStore(), FREQ_KEY, {
    day: "",
    dailyModalCount: 0,
    dismissAtByKind: {},
  });
}
function writeFreq(state: FreqState): void {
  writeJson(localStore(), FREQ_KEY, state);
}

/** Marca o início da sessão de uso (para proteger o primeiro minuto). */
export function markSessionStart(now = Date.now()): void {
  const session = readSession();
  if (session.sessionStartAt > 0) return;
  writeSession({ ...session, sessionStartAt: now });
}

// ── Copy por oferta ─────────────────────────────────────────────────────────
const OFFER_COPY: Record<ProOfferKind, Omit<ProOfferCopy, "kind" | "strength" | "placement" | "messageVariant" | "solicited" | "reason">> = {
  success_accelerate: {
    eyebrow: "Bom ritmo",
    title: "Continue sem interrupção",
    description: OFFER_MESSAGES.good_performance,
    benefit: "Cargas ilimitadas, retry sem Qi e mais Qi por lição.",
    freeContinues: "No grátis você continua estudando amanhã com novas cargas e revisão essencial.",
    paywallKind: "training",
  },
  weak_spots: {
    eyebrow: "Ajuda focada",
    title: "Revisão nos seus pontos fracos",
    description: OFFER_MESSAGES.difficulty,
    benefit: "Treino focado, erros detalhados e fila de revisão completa.",
    freeContinues: "A correção imediata do erro atual continua grátis — sempre.",
    paywallKind: "weak_spots",
  },
  energy_limit: {
    eyebrow: "Cargas do dia",
    title: "Suas cargas acabaram",
    description: OFFER_MESSAGES.out_of_energy,
    benefit: "Cargas ilimitadas para lições, imersão e labs.",
    freeContinues: "Amanhã você ganha novas cargas. Missões também devolvem cargas.",
    paywallKind: "energy",
  },
  review_limit: {
    eyebrow: "Revisão essencial",
    title: "Há mais itens na fila",
    description: OFFER_MESSAGES.review_more,
    benefit: "Revisão ilimitada por sessão.",
    freeContinues: "A revisão básica continua gratuita todos os dias.",
    paywallKind: "review",
  },
  league_promotion: {
    eyebrow: "Liga semanal",
    title: "Você está perto de subir",
    description: OFFER_MESSAGES.league,
    benefit: "Mais estudo na mesma semana — sem vantagem injusta no ranking.",
    freeContinues: "O ranking usa o mesmo XP de estudo para todos.",
    paywallKind: "leagues",
  },
  story_premium: {
    eyebrow: "Histórias extras",
    title: "Desbloqueie mais histórias",
    description: OFFER_MESSAGES.story,
    benefit: "Histórias extras e imersão ampliada.",
    freeContinues: "As histórias grátis continuam abertas para aprender e confiar no app.",
    paywallKind: "story",
  },
  detailed_errors: {
    eyebrow: "Erros detalhados",
    title: "Veja padrões nos seus erros",
    description: OFFER_MESSAGES.difficulty,
    benefit: "Erros detalhados e treino focado.",
    freeContinues: "Corrigir o erro da lição atual continua grátis.",
    paywallKind: "errors",
  },
};

interface Classification {
  kind: ProOfferKind;
  placement: string;
  variant: ProOfferMessageVariant;
  solicited: boolean;
}

function placementForMoment(moment: SessionMoment): string {
  switch (moment) {
    case "review_complete":
      return "review_complete_modal";
    case "module_challenge_complete":
      return "module_challenge_modal";
    case "streak_complete":
      return "streak_complete_modal";
    case "errors_corrected":
      return "errors_corrected_modal";
    case "story_end":
      return "story_complete_modal";
    case "lesson_complete":
      return "lesson_complete_modal";
    default:
      return "modal";
  }
}

/** Escolhe a oferta (e se é solicitada) a partir dos sinais do momento. */
function classify(input: ProOfferInput): Classification | null {
  // Solicitadas: o usuário tentou um recurso Pro ou bateu numa parede.
  const attempt = input.proFeatureAttempt ?? null;
  if (attempt === "continue_without_energy" || input.energyDepleted) {
    return { kind: "energy_limit", placement: "energy_modal", variant: "out_of_energy", solicited: true };
  }
  if (attempt === "detailed_report" || input.triedDetailedErrors) {
    return { kind: "detailed_errors", placement: "detailed_errors_modal", variant: "difficulty", solicited: true };
  }
  if (attempt === "unlimited_review" || input.reviewLimitHit) {
    return { kind: "review_limit", placement: "review_limit_modal", variant: "review_more", solicited: true };
  }
  if (attempt === "premium_story" || input.storyPremium) {
    return { kind: "story_premium", placement: "story_modal", variant: "story", solicited: true };
  }

  // Não solicitadas (pós-conclusão): dificuldade primeiro (ajuda antes de vender).
  if (
    input.outOfBreath ||
    (input.errorCount ?? 0) >= 3 ||
    input.twoStars ||
    input.repeatedToneErrors ||
    input.repeatedHanziErrors ||
    input.performance === "struggling"
  ) {
    return { kind: "weak_spots", placement: placementForMoment(input.sessionMoment), variant: "difficulty", solicited: false };
  }
  if (input.xpToPromotion != null && input.xpToPromotion > 0 && input.xpToPromotion <= 40) {
    return { kind: "league_promotion", placement: "league_banner", variant: "league", solicited: false };
  }
  if (input.storyCompleted) {
    return { kind: "story_premium", placement: "story_complete_modal", variant: "story", solicited: false };
  }
  if (
    input.lessonThreeStars ||
    (input.correctStreak ?? 0) >= 5 ||
    input.missionClaimed ||
    input.aboveAverageStudy ||
    input.performance === "good" ||
    input.reviewCompleted ||
    input.moduleChallengeCompleted ||
    input.errorsCorrected
  ) {
    return { kind: "success_accelerate", placement: placementForMoment(input.sessionMoment), variant: "good_performance", solicited: false };
  }
  return null;
}

function deny(reason: string, cls?: Classification): ProOfferDecision {
  return {
    shouldShow: false,
    placement: cls?.placement ?? "none",
    messageVariant: cls?.variant ?? "none",
    reason,
  };
}

/**
 * Decisão central (§1). Lê o estado de frequência do storage e aplica todas as
 * regras. `input.now` permite injeção de relógio em teste.
 */
export function decideProOffer(input: ProOfferInput): ProOfferDecision {
  const now = input.now ?? Date.now();

  // 1) Pro nunca vê oferta.
  if (input.isPro) return deny("already_pro");

  // 2) Nunca interromper momentos protegidos.
  if (PROTECTED_MOMENTS.has(input.sessionMoment)) return deny(`protected_moment:${input.sessionMoment}`);

  const cls = classify(input);
  if (!cls) return deny("no_trigger");

  const isBanner = input.channel === "banner" || cls.placement.endsWith("_banner");

  // 3) Banners podem aparecer, mas nunca dentro do player (momentos protegidos
  // já barrados acima; aqui reforçamos que banner não vai a player nenhum).
  if (isBanner && PROTECTED_MOMENTS.has(input.sessionMoment)) return deny("banner_in_player", cls);

  const session = readSession();
  const freq = readFreq();
  const today = todayKey();

  // 4) Primeiro minuto de uso: não oferecer.
  if (session.sessionStartAt > 0 && now - session.sessionStartAt < FIRST_MINUTE_MS) {
    return deny("first_minute", cls);
  }

  // 5) Cooldown de 24h para a MESMA oferta depois de fechada (vale p/ todas).
  const dismissedAt = freq.dismissAtByKind?.[cls.kind] ?? 0;
  if (dismissedAt > 0 && now - dismissedAt < OFFER_COOLDOWN_MS) {
    return deny("cooldown_24h", cls);
  }

  // 6) Regras específicas das ofertas não solicitadas (não modais banidos).
  if (!cls.solicited) {
    // Acabou de fechar uma oferta: não reoferecer logo em seguida.
    if (session.lastDismissAt > 0 && now - session.lastDismissAt < JUST_DISMISSED_MS) {
      return deny("recently_dismissed", cls);
    }
    if (!isBanner) {
      // Máx. 1 modal por sessão.
      if (session.sessionModalShown) return deny("frequency_session", cls);
      // Máx. 2 modais por dia.
      const dailyCount = freq.day === today ? freq.dailyModalCount : 0;
      if (dailyCount >= MAX_DAILY_MODALS) return deny("frequency_daily", cls);
    }
  }

  return {
    shouldShow: true,
    placement: cls.placement,
    messageVariant: cls.variant,
    reason: cls.solicited ? "solicited" : "eligible",
  };
}

function inferMoment(ctx: ProOfferContext): SessionMoment {
  if (ctx.sessionMoment) return ctx.sessionMoment;
  if (ctx.reviewLimitHit || ctx.triedDetailedErrors) return "review_complete";
  if (ctx.energyDepleted) return "energy_depleted";
  if (ctx.storyPremium || ctx.storyCompleted) return "story_end";
  if (ctx.moduleChallengeCompleted) return "module_challenge_complete";
  if (ctx.lessonThreeStars || ctx.twoStars || ctx.errorCount != null || ctx.outOfBreath) return "lesson_complete";
  return "unknown";
}

/**
 * Camada de copy usada pelos call sites atuais. Aplica todas as regras via
 * decideProOffer e devolve o texto pronto (ou null).
 */
export function evaluateProOffer(
  ctx: ProOfferContext,
  strength: ProOfferStrength = "strong"
): ProOfferCopy | null {
  const input: ProOfferInput = {
    ...ctx,
    isPro: ctx.isPro,
    sessionMoment: inferMoment(ctx),
    channel: strength === "card" ? "banner" : "modal",
    origin: ctx.origin ?? "unknown",
  };

  const decision = decideProOffer(input);
  if (!decision.shouldShow) return null;

  const cls = classify(input);
  if (!cls) return null;

  const base = OFFER_COPY[cls.kind];
  let title = base.title;
  let description = base.description;
  if (cls.kind === "weak_spots") {
    title = "Vamos focar no que travou hoje";
    if (ctx.twoStars && (ctx.errorCount ?? 0) < 4) {
      description =
        "Você passou, mas ainda há pontos para reforçar. O Longyu Pro monta uma revisão focada nos seus erros recentes.";
    } else if (ctx.repeatedToneErrors && !ctx.repeatedHanziErrors) {
      description = "Você teve dificuldade com tons. O Longyu Pro cria uma revisão focada nos seus pontos fracos.";
    } else if (ctx.repeatedHanziErrors && !ctx.repeatedToneErrors) {
      description = "Você teve dificuldade com hànzì. O Longyu Pro cria uma revisão focada nos seus pontos fracos.";
    }
  }

  return {
    kind: cls.kind,
    strength,
    ...base,
    title,
    description,
    placement: decision.placement,
    messageVariant: decision.messageVariant,
    solicited: cls.solicited,
    reason: decision.reason,
  };
}

/** Oferta discreta (banner/card). */
export function evaluateProOfferCard(ctx: ProOfferContext): ProOfferCopy | null {
  return evaluateProOffer(ctx, "card");
}

// ── Métricas (locais, sem informação sensível) ──────────────────────────────
export type ProOfferEventType =
  | "shown"
  | "dismissed"
  | "clicked"
  | "checkout_started"
  | "subscription_started";

export interface ProOfferMetricEvent {
  type: ProOfferEventType;
  placement: string;
  variant: string;
  reason: string;
  origin?: string;
}

interface StoredMetric extends ProOfferMetricEvent {
  at: number;
}

/**
 * Registra um evento de oferta. Só placement/variant/reason/origin/tipo +
 * timestamp — nenhum dado sensível (sem e-mail, sem texto do usuário). Guardado
 * localmente (offline-safe); um sink de servidor pode ler depois sob consentimento.
 */
export function recordProOfferEvent(event: ProOfferMetricEvent): void {
  try {
    const store = localStore();
    const raw = store?.getItem(METRICS_KEY);
    const list: StoredMetric[] = raw ? (JSON.parse(raw) as StoredMetric[]) : [];
    list.push({
      type: event.type,
      placement: event.placement,
      variant: event.variant,
      reason: event.reason,
      origin: event.origin,
      at: Date.now(),
    });
    writeJson(store, METRICS_KEY, list.slice(-METRICS_CAP));
  } catch {
    /* nunca quebra por causa de métrica */
  }
}

export function getProOfferMetrics(): StoredMetric[] {
  return (() => {
    try {
      const raw = localStore()?.getItem(METRICS_KEY);
      return raw ? (JSON.parse(raw) as StoredMetric[]) : [];
    } catch {
      return [];
    }
  })();
}

/** Marca uma oferta como exibida: atualiza contadores e registra métrica. */
export function recordProOfferShown(offer: ProOfferCopy): void {
  recordProOfferEvent({
    type: "shown",
    placement: offer.placement,
    variant: offer.messageVariant,
    reason: offer.reason,
  });
  // Só modais não solicitados contam contra os limites de frequência.
  const isBanner = offer.strength === "card" || offer.placement.endsWith("_banner");
  if (offer.solicited || isBanner) return;
  const today = todayKey();
  const freq = readFreq();
  const dailyCount = freq.day === today ? freq.dailyModalCount : 0;
  writeFreq({ ...freq, day: today, dailyModalCount: dailyCount + 1 });
  writeSession({ ...readSession(), sessionModalShown: true });
}

/** Fechou a oferta: cooldown de 24h para a mesma oferta + registro. */
export function recordProOfferDismissed(offer: ProOfferCopy, now = Date.now()): void {
  recordProOfferEvent({
    type: "dismissed",
    placement: offer.placement,
    variant: offer.messageVariant,
    reason: offer.reason,
  });
  const freq = readFreq();
  writeFreq({
    ...freq,
    dismissAtByKind: { ...freq.dismissAtByKind, [offer.kind]: now },
  });
  writeSession({ ...readSession(), lastDismissAt: now });
}

export function recordProOfferClicked(offer: ProOfferCopy): void {
  setPendingOfferOrigin(offer.placement);
  recordProOfferEvent({
    type: "clicked",
    placement: offer.placement,
    variant: offer.messageVariant,
    reason: offer.reason,
    origin: offer.placement,
  });
}

// ── Atribuição de conversão (origem) ────────────────────────────────────────
export function setPendingOfferOrigin(origin: string): void {
  writeJson(sessionStore(), ORIGIN_KEY, { origin });
}
export function getPendingOfferOrigin(): string | null {
  return readJson<{ origin: string | null }>(sessionStore(), ORIGIN_KEY, { origin: null }).origin;
}
export function clearPendingOfferOrigin(): void {
  try {
    sessionStore()?.removeItem(ORIGIN_KEY);
  } catch {
    /* ignora */
  }
}

export function recordProOfferCheckoutStarted(origin = getPendingOfferOrigin() ?? "direct"): void {
  recordProOfferEvent({ type: "checkout_started", placement: origin, variant: "n/a", reason: "checkout", origin });
}

export function recordProOfferSubscriptionStarted(origin = getPendingOfferOrigin() ?? "direct"): void {
  recordProOfferEvent({ type: "subscription_started", placement: origin, variant: "n/a", reason: "converted", origin });
  clearPendingOfferOrigin();
}

/** Somente para testes: zera o estado de frequência/métricas. */
export function resetProOfferStateForTests(): void {
  try {
    sessionStore()?.removeItem(SESSION_KEY);
    sessionStore()?.removeItem(ORIGIN_KEY);
    localStore()?.removeItem(FREQ_KEY);
    localStore()?.removeItem(METRICS_KEY);
  } catch {
    /* ignora */
  }
}
