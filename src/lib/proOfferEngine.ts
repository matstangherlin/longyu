import { todayKey } from "./storage";
import { trackAnalytics, ANALYTICS_EVENTS } from "../services/analyticsService";

export type ProOfferKind =
  | "success_accelerate"
  | "weak_spots"
  | "energy_limit"
  | "review_limit"
  | "league_promotion"
  | "story_premium"
  | "detailed_errors";

export type ProOfferStrength = "strong" | "card";

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
}

export interface ProOfferContext {
  isPro: boolean;
  /** Lição com 3 estrelas concluída agora. */
  lessonThreeStars?: boolean;
  /** Sequência de acertos na sessão (>= 5 sugere oferta positiva). */
  correctStreak?: number;
  /** XP faltando para zona de promoção na liga. */
  xpToPromotion?: number;
  /** História (premium ou não) concluída. */
  storyCompleted?: boolean;
  storyPremium?: boolean;
  /** Missão diária resgatada agora. */
  missionClaimed?: boolean;
  /** XP hoje acima da média semanal do usuário. */
  aboveAverageStudy?: boolean;
  /** Erros na lição/sessão. */
  errorCount?: number;
  /** Lição terminou com 2 estrelas. */
  twoStars?: boolean;
  /** Fôlego esgotado. */
  outOfBreath?: boolean;
  /** Erros repetidos de tom. */
  repeatedToneErrors?: boolean;
  /** Erros repetidos de hànzì. */
  repeatedHanziErrors?: boolean;
  /** Bateu limite de revisão grátis. */
  reviewLimitHit?: boolean;
  /** Tentou abrir erros detalhados. */
  triedDetailedErrors?: boolean;
  /** Sem cargas para continuar. */
  energyDepleted?: boolean;
}

interface OfferState {
  sessionStrongShown: boolean;
  lastStrongDay: string;
  lastStrongAt: number;
}

const STATE_KEY = "longyu:pro-offer-state";
const SESSION_KEY = "longyu:pro-offer-session";

function readState(): OfferState {
  try {
    const raw = sessionStorage.getItem(STATE_KEY);
    if (!raw) return { sessionStrongShown: false, lastStrongDay: "", lastStrongAt: 0 };
    return JSON.parse(raw) as OfferState;
  } catch {
    return { sessionStrongShown: false, lastStrongDay: "", lastStrongAt: 0 };
  }
}

function writeState(state: OfferState): void {
  sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function resetSessionIfNeeded(): void {
  const token = sessionStorage.getItem(SESSION_KEY);
  const current = typeof window !== "undefined" ? window.location.pathname : "";
  if (token === current) return;
  sessionStorage.setItem(SESSION_KEY, current);
  const state = readState();
  writeState({ ...state, sessionStrongShown: false });
}

const OFFER_COPY: Record<ProOfferKind, Omit<ProOfferCopy, "kind" | "strength">> = {
  success_accelerate: {
    eyebrow: "Bom ritmo",
    title: "Continue sem interrupção",
    description:
      "Você está em bom ritmo. Com o Longyu Pro, pode continuar sem limite de cargas e transformar esse ritmo em mais progresso hoje.",
    benefit: "Cargas ilimitadas, retry sem Qi e mais Qi por lição.",
    freeContinues: "No grátis você continua estudando amanhã com novas cargas e revisão essencial.",
    paywallKind: "training",
  },
  weak_spots: {
    eyebrow: "Ajuda focada",
    title: "Revisão nos seus pontos fracos",
    description:
      "Você teve dificuldade com tons e hànzì. O Longyu Pro cria uma revisão focada nos seus pontos fracos.",
    benefit: "Treino focado, erros detalhados e fila de revisão completa.",
    freeContinues: "A correção imediata do erro atual continua grátis — sempre.",
    paywallKind: "weak_spots",
  },
  energy_limit: {
    eyebrow: "Cargas do dia",
    title: "Suas cargas acabaram",
    description: "Você usou as cargas de hoje. No Pro, estuda sem esse limite diário.",
    benefit: "Cargas ilimitadas para lições, imersão e labs.",
    freeContinues: "Amanhã você ganha novas cargas. Missões também devolvem cargas.",
    paywallKind: "energy",
  },
  review_limit: {
    eyebrow: "Revisão essencial",
    title: "Há mais itens na fila",
    description: "Você revisou o essencial de hoje. No Pro, a fila inteira fica disponível.",
    benefit: "Revisão ilimitada por sessão.",
    freeContinues: "A revisão básica continua gratuita todos os dias.",
    paywallKind: "review",
  },
  league_promotion: {
    eyebrow: "Liga semanal",
    title: "Você está perto de subir",
    description: "Faltam poucos XP para a zona de promoção. No Pro, estuda mais sem parar por cargas.",
    benefit: "Mais estudo na mesma semana — sem vantagem injusta no ranking.",
    freeContinues: "O ranking usa o mesmo XP de estudo para todos.",
    paywallKind: "leagues",
  },
  story_premium: {
    eyebrow: "Histórias extras",
    title: "Desbloqueie mais histórias",
    description: "Histórias premium aprofundam imersão com mandarim real.",
    benefit: "Histórias extras e imersão ampliada.",
    freeContinues: "As histórias grátis continuam abertas para aprender e confiar no app.",
    paywallKind: "story",
  },
  detailed_errors: {
    eyebrow: "Erros detalhados",
    title: "Veja padrões nos seus erros",
    description: "O Pro mostra histórico e padrões para você corrigir com foco.",
    benefit: "Erros detalhados e treino focado.",
    freeContinues: "Corrigir o erro da lição atual continua grátis.",
    paywallKind: "errors",
  },
};

function canShowStrongOffer(): boolean {
  resetSessionIfNeeded();
  const state = readState();
  const today = todayKey();
  if (state.sessionStrongShown) return false;
  if (state.lastStrongDay === today) return false;
  return true;
}

function markStrongOfferShown(): void {
  writeState({
    sessionStrongShown: true,
    lastStrongDay: todayKey(),
    lastStrongAt: Date.now(),
  });
}

const STRONG_BYPASS_DAILY: ReadonlySet<ProOfferKind> = new Set([
  "energy_limit",
  "detailed_errors",
  "review_limit",
]);

function pickOffer(ctx: ProOfferContext): ProOfferKind | null {
  if (ctx.isPro) return null;

  // Momentos negativos (prioridade — ajuda, não bloqueio).
  if (ctx.energyDepleted) return "energy_limit";
  if (ctx.triedDetailedErrors) return "detailed_errors";
  if (ctx.reviewLimitHit) return "review_limit";
  if (ctx.outOfBreath || (ctx.errorCount ?? 0) >= 3 || ctx.twoStars) return "weak_spots";
  if (ctx.repeatedToneErrors || ctx.repeatedHanziErrors) return "weak_spots";

  // Momentos positivos.
  if (ctx.storyPremium) return "story_premium";
  if (ctx.xpToPromotion != null && ctx.xpToPromotion > 0 && ctx.xpToPromotion <= 40) {
    return "league_promotion";
  }
  if (ctx.missionClaimed || ctx.aboveAverageStudy) return "success_accelerate";
  if (ctx.storyCompleted) return "success_accelerate";
  if (ctx.lessonThreeStars || (ctx.correctStreak ?? 0) >= 5) return "success_accelerate";

  return null;
}

export function evaluateProOffer(
  ctx: ProOfferContext,
  strength: ProOfferStrength = "strong"
): ProOfferCopy | null {
  const kind = pickOffer(ctx);
  if (!kind) return null;

  if (strength === "strong" && !STRONG_BYPASS_DAILY.has(kind) && !canShowStrongOffer()) return null;

  const base = OFFER_COPY[kind];
  let description = base.description;
  let title = base.title;
  if (kind === "weak_spots") {
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
    kind,
    strength,
    ...base,
    title,
    description,
  };
}

export function recordProOfferShown(offer: ProOfferCopy): void {
  if (offer.strength === "strong") markStrongOfferShown();
  trackAnalytics({
    event: ANALYTICS_EVENTS.pro_offer_shown,
    metadata: { offer_kind: offer.kind, paywall_kind: offer.paywallKind, strength: offer.strength },
  });
}

/** Oferta discreta (card) — sem limite diário forte. */
export function evaluateProOfferCard(ctx: ProOfferContext): ProOfferCopy | null {
  return evaluateProOffer(ctx, "card");
}
