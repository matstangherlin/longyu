/**
 * RC2.2.18 — Progressive Discovery: o registro canônico de QUANDO cada área do
 * app aparece.
 *
 * Três regras que este arquivo materializa:
 *
 * 1. DERIVADO, NUNCA SALVO. A disponibilidade é calculada do progresso que já
 *    existe (lições, SRS, Hànzì aprendidos, Cultura, medalhas, economia). Não
 *    há `cultureUnlocked = true` em lugar nenhum: quem salvasse isso teria duas
 *    verdades para o mesmo progresso.
 * 2. PURO. `featureVisibility(id, state)` não lê relógio, sorteio, dia da
 *    semana nem plano Pro: mesma entrada, mesma saída (PART BY/BZ/CN).
 * 3. UM LUGAR SÓ. Números moram em `PROGRESSIVE_DISCOVERY_RULES`; a TabBar, o
 *    menu Mais, as rotas e o orquestrador de dicas leem daqui.
 *
 * Direitos do usuário (conta, ajustes, idioma, aparência, privacidade,
 * excluir conta, ajuda, acessibilidade, sair) NUNCA passam por aqui: não são
 * features progressivas, são controles (PART D).
 */
import { ALL_LESSONS } from "../data/journey";
import { CULTURE_JOURNEY_PLACEMENT } from "../data/cultureNative";
import { IMMERSION_READINESS_NODE } from "../data/journeyOrchestrator";

export type DiscoveryFeatureId =
  | "journey"
  | "practice"
  | "review"
  | "hanzi"
  | "atlas"
  | "culture"
  | "missions"
  | "achievements"
  | "league"
  | "shop"
  | "immersion"
  | "phaseChallenge";

/** HIDDEN = longe do desbloqueio · PREVIEW = perto (discreto em Mais) · AVAILABLE. */
export type FeatureVisibility = "HIDDEN" | "PREVIEW" | "AVAILABLE";

/**
 * O que acontece ao abrir a rota antes do desbloqueio.
 * - HARD: a área depende de progressão pedagógica → FeatureUnavailablePage.
 * - SOFT: some da navegação, mas a rota abre com o estado vazio da própria página.
 */
export type LockedBehavior = "NEVER_LOCKED" | "HARD" | "SOFT";

export type NavigationPlacement = "tab" | "practice" | "more" | "journey";

export interface FeatureDefinition {
  id: DiscoveryFeatureId;
  route: string;
  /** Rotas (prefixos) que pertencem à área — usadas no portão de rota. */
  routes: readonly string[];
  navigationPlacement: NavigationPlacement;
  lockedBehavior: LockedBehavior;
  /** Guidance de desbloqueio (UNLOCK REVEAL) — `null` = sem anúncio. */
  unlockGuidanceId: string | null;
  /** Coachmark de primeiro uso da área — `null` = sem dica. */
  firstUseGuidanceId: string | null;
  /** Texto curto (i18n) da evidência pedagógica, para a matriz e a página trancada. */
  unlockEvidence: string;
}

/**
 * Limiares ajustáveis pelo owner (PART CR). Tudo que é número está aqui; os
 * marcos semânticos (primeiro nó de Cultura, prontidão de Imersão) são
 * derivados dos dados da Jornada logo abaixo — nunca "lição 10".
 */
export const PROGRESSIVE_DISCOVERY_RULES = {
  /** Missões e o anúncio de Praticar: o primeiro ciclo real de estudo. */
  missionsMinCompletedLessons: 1,
  practiceRevealMinCompletedLessons: 1,
  /** Treino de Hànzì: mínimo real de caracteres aprendidos. */
  hanziMinLearnedChars: 3,
  /** Atlas: corpus mínimo para explorar (primeiro marco estrutural). */
  atlasMinLearnedChars: 8,
  /** Liga: progresso de estudo significativo, nunca "idade da conta". */
  leagueMinCompletedLessons: 3,
  /** Imersão: mesmo corte de repertório do nó de prontidão da Jornada. */
  immersionMinKnownChunks: IMMERSION_READINESS_NODE.minimumKnownChunks ?? 8,
  /** "Perto do desbloqueio" = o marco está entre as próximas N lições. */
  previewWithinLessons: 2,
  /** Máximo de áreas listadas num único "Novos recursos disponíveis". */
  unlockBatchMaxListed: 2,
} as const;

const LESSON_ORDER: readonly string[] = ALL_LESSONS.map((lesson) => lesson.id);

/**
 * PART BX — `firstCultureEligibleJourneyNode`: o primeiro nó CORE de Cultura
 * na ordem da Jornada. Cultura é descoberta quando a Jornada chega nele
 * (hoje: o nó de 你好 depois de l2), não num número de lição.
 */
export const FIRST_CULTURE_JOURNEY_TOPIC_ID: string = (() => {
  const core = CULTURE_JOURNEY_PLACEMENT.filter((row) => row.track === "core")
    .map((row) => ({ topic: row.afterTopicId, index: LESSON_ORDER.indexOf(row.afterTopicId) }))
    .filter((row) => row.index >= 0)
    .sort((a, b) => a.index - b.index);
  return core[0]?.topic ?? LESSON_ORDER[0];
})();

export const FEATURE_AVAILABILITY: Readonly<Record<DiscoveryFeatureId, FeatureDefinition>> = {
  journey: {
    id: "journey",
    route: "/jornada",
    routes: ["/jornada", "/licao"],
    navigationPlacement: "tab",
    lockedBehavior: "NEVER_LOCKED",
    unlockGuidanceId: null,
    firstUseGuidanceId: "welcome_journey_v1",
    unlockEvidence: "always",
  },
  practice: {
    id: "practice",
    route: "/treino",
    routes: ["/treino", "/praticar"],
    navigationPlacement: "tab",
    lockedBehavior: "NEVER_LOCKED",
    unlockGuidanceId: "practice_unlocked_v1",
    firstUseGuidanceId: "practice_first_use_v1",
    unlockEvidence: "first completed lesson (content grows with progress)",
  },
  review: {
    id: "review",
    route: "/revisao",
    routes: ["/revisao"],
    navigationPlacement: "practice",
    lockedBehavior: "SOFT",
    unlockGuidanceId: null,
    firstUseGuidanceId: "review_first_use_v1",
    unlockEvidence: "first reviewable SRS item",
  },
  hanzi: {
    id: "hanzi",
    route: "/ideogramas",
    routes: ["/ideogramas"],
    navigationPlacement: "practice",
    lockedBehavior: "SOFT",
    unlockGuidanceId: "hanzi_unlocked_v1",
    firstUseGuidanceId: null,
    unlockEvidence: `${PROGRESSIVE_DISCOVERY_RULES.hanziMinLearnedChars}+ learned hànzì`,
  },
  atlas: {
    id: "atlas",
    route: "/hanzi/atlas",
    routes: ["/hanzi/atlas"],
    navigationPlacement: "practice",
    lockedBehavior: "SOFT",
    unlockGuidanceId: "atlas_unlocked_v1",
    firstUseGuidanceId: "atlas_first_use_v1",
    unlockEvidence: `${PROGRESSIVE_DISCOVERY_RULES.atlasMinLearnedChars}+ learned hànzì (first structural corpus)`,
  },
  culture: {
    id: "culture",
    route: "/cultura",
    routes: ["/cultura"],
    navigationPlacement: "tab",
    lockedBehavior: "HARD",
    unlockGuidanceId: "culture_unlocked_v1",
    firstUseGuidanceId: "culture_first_use_v1",
    unlockEvidence: `first Culture-eligible Journey node (after ${FIRST_CULTURE_JOURNEY_TOPIC_ID}) or any Culture progress`,
  },
  missions: {
    id: "missions",
    route: "/missoes",
    routes: ["/missoes"],
    navigationPlacement: "tab",
    lockedBehavior: "SOFT",
    unlockGuidanceId: "missions_unlocked_v1",
    firstUseGuidanceId: null,
    unlockEvidence: "first completed lesson",
  },
  achievements: {
    id: "achievements",
    route: "/conquistas",
    routes: ["/conquistas"],
    navigationPlacement: "more",
    lockedBehavior: "SOFT",
    unlockGuidanceId: null,
    firstUseGuidanceId: null,
    unlockEvidence: "first real achievement (its own medal reveal)",
  },
  league: {
    id: "league",
    route: "/ligas",
    routes: ["/ligas"],
    navigationPlacement: "more",
    lockedBehavior: "SOFT",
    unlockGuidanceId: "league_unlocked_v1",
    firstUseGuidanceId: null,
    unlockEvidence: `${PROGRESSIVE_DISCOVERY_RULES.leagueMinCompletedLessons} completed lessons or league already joined`,
  },
  shop: {
    id: "shop",
    route: "/loja",
    routes: ["/loja"],
    navigationPlacement: "more",
    lockedBehavior: "SOFT",
    unlockGuidanceId: "shop_introduction_v1",
    firstUseGuidanceId: null,
    unlockEvidence: "first Qi / Pearls received (economy introduction)",
  },
  immersion: {
    id: "immersion",
    route: "/imersao",
    routes: ["/imersao"],
    navigationPlacement: "practice",
    lockedBehavior: "HARD",
    unlockGuidanceId: "immersion_unlocked_v1",
    firstUseGuidanceId: null,
    unlockEvidence: `first guided conversation + ${PROGRESSIVE_DISCOVERY_RULES.immersionMinKnownChunks}+ known chunks`,
  },
  phaseChallenge: {
    id: "phaseChallenge",
    route: "/teste/fase",
    routes: ["/teste/fase"],
    navigationPlacement: "journey",
    // A própria página do desafio é o portão (alvo válido, marco cultural,
    // cooldown, custo) — um segundo portão aqui só duplicaria a regra.
    lockedBehavior: "SOFT",
    unlockGuidanceId: null,
    firstUseGuidanceId: null,
    unlockEvidence: "a next phase that is valid to challenge",
  },
};

/** Ordem canônica (e estável) de todas as áreas. */
export const DISCOVERY_FEATURE_ORDER: readonly DiscoveryFeatureId[] = [
  "journey",
  "practice",
  "review",
  "hanzi",
  "atlas",
  "culture",
  "missions",
  "achievements",
  "league",
  "shop",
  "immersion",
  "phaseChallenge",
];

/**
 * PART D — controles do usuário. Nunca entram no registro acima, nunca têm
 * regra de disponibilidade: estão sempre acessíveis.
 */
export const ESSENTIAL_ALWAYS_AVAILABLE = [
  "account",
  "settings",
  "language",
  "appearance",
  "privacy",
  "deleteAccount",
  "help",
  "accessibility",
  "logout",
] as const;
export const ESSENTIAL_ROUTES: readonly string[] = ["/conta", "/config", "/ajustes", "/privacidade", "/sobre", "/mais", "/perfil", "/termos", "/dados-locais"];

/**
 * Estado mínimo que as regras leem. Tudo já existe no store; o hook
 * `useDiscoveryLearnerState` só monta este objeto. NÃO inclui plano Pro de
 * propósito: pagar não antecipa progressão pedagógica (PART CN).
 */
export interface DiscoveryLearnerState {
  completedLessons: readonly string[];
  /** Itens no SRS (revisáveis). */
  srsItemCount: number;
  learnedChars: readonly string[];
  learnedChunks: readonly string[];
  /** Qualquer progresso de Cultura (concluído, iniciado, domínio ou selo). */
  cultureTouched: boolean;
  /** Conquistas/medalhas reais já recebidas. */
  achievementsCount: number;
  leagueJoined: boolean;
  /** Qi/Pérolas já recebidos ou gastos — a economia já foi apresentada. */
  economyIntroduced: boolean;
  /** O aluno já teve ao menos uma conversa guiada. */
  conversationsDone: number;
  /** Existe uma próxima fase válida para desafiar (lista de alvos da Jornada). */
  phaseChallengeEligible: boolean;
}

export const EMPTY_DISCOVERY_STATE: DiscoveryLearnerState = {
  completedLessons: [],
  srsItemCount: 0,
  learnedChars: [],
  learnedChunks: [],
  cultureTouched: false,
  achievementsCount: 0,
  leagueJoined: false,
  economyIntroduced: false,
  conversationsDone: 0,
  phaseChallengeEligible: false,
};

function completedCount(state: DiscoveryLearnerState): number {
  return state.completedLessons.length;
}

/** A lição-marco está entre as próximas N ainda não concluídas? */
function isWithinNextLessons(state: DiscoveryLearnerState, topicId: string, window: number): boolean {
  const done = new Set(state.completedLessons);
  const pending = LESSON_ORDER.filter((id) => !done.has(id)).slice(0, window);
  return pending.includes(topicId);
}

/** PART BY — função pura: mesma entrada, mesma saída. */
export function featureVisibility(id: DiscoveryFeatureId, state: DiscoveryLearnerState): FeatureVisibility {
  const rules = PROGRESSIVE_DISCOVERY_RULES;
  const lessons = completedCount(state);
  switch (id) {
    case "journey":
    case "practice":
      return "AVAILABLE";
    case "review":
      // PART T — sem "0 itens para revisar": só aparece quando há o que revisar.
      return state.srsItemCount > 0 ? "AVAILABLE" : "HIDDEN";
    case "hanzi": {
      const chars = state.learnedChars.length;
      if (chars >= rules.hanziMinLearnedChars) return "AVAILABLE";
      return chars > 0 ? "PREVIEW" : "HIDDEN";
    }
    case "atlas": {
      const chars = state.learnedChars.length;
      if (chars >= rules.atlasMinLearnedChars) return "AVAILABLE";
      return chars >= rules.hanziMinLearnedChars ? "PREVIEW" : "HIDDEN";
    }
    case "culture": {
      if (state.cultureTouched || state.completedLessons.includes(FIRST_CULTURE_JOURNEY_TOPIC_ID)) return "AVAILABLE";
      if (lessons > 0 && isWithinNextLessons(state, FIRST_CULTURE_JOURNEY_TOPIC_ID, rules.previewWithinLessons)) {
        return "PREVIEW";
      }
      return "HIDDEN";
    }
    case "missions":
      return lessons >= rules.missionsMinCompletedLessons ? "AVAILABLE" : "HIDDEN";
    case "achievements":
      return state.achievementsCount > 0 ? "AVAILABLE" : "HIDDEN";
    case "league":
      if (state.leagueJoined || lessons >= rules.leagueMinCompletedLessons) return "AVAILABLE";
      return lessons === rules.leagueMinCompletedLessons - 1 ? "PREVIEW" : "HIDDEN";
    case "shop":
      return state.economyIntroduced ? "AVAILABLE" : "HIDDEN";
    case "immersion": {
      if (state.conversationsDone <= 0) return "HIDDEN";
      return state.learnedChunks.length >= rules.immersionMinKnownChunks ? "AVAILABLE" : "PREVIEW";
    }
    case "phaseChallenge":
      // PART AM — sem botão trancado desde o onboarding.
      return lessons > 0 && state.phaseChallengeEligible ? "AVAILABLE" : "HIDDEN";
    default:
      return "HIDDEN";
  }
}

export function isFeatureAvailable(id: DiscoveryFeatureId, state: DiscoveryLearnerState): boolean {
  return featureVisibility(id, state) === "AVAILABLE";
}

export type FeatureVisibilityMap = Readonly<Record<DiscoveryFeatureId, FeatureVisibility>>;

export function featureVisibilityMap(state: DiscoveryLearnerState): FeatureVisibilityMap {
  const out = {} as Record<DiscoveryFeatureId, FeatureVisibility>;
  for (const id of DISCOVERY_FEATURE_ORDER) out[id] = featureVisibility(id, state);
  return out;
}

/**
 * PART DJ — uma área já liberada nesta sessão não "re-tranca" na tela porque um
 * estado derivado ficou momentaneamente incompleto (ex.: sync carregando). A
 * memória é da SESSÃO (em RAM), não persistida: a fonte de verdade continua
 * sendo o progresso.
 */
export function mergeStickyVisibility(
  current: FeatureVisibilityMap,
  confirmed: ReadonlySet<DiscoveryFeatureId>
): FeatureVisibilityMap {
  const out = { ...current } as Record<DiscoveryFeatureId, FeatureVisibility>;
  for (const id of confirmed) out[id] = "AVAILABLE";
  return out;
}

/** Rota → área progressiva que a controla (prefixo mais longo vence). */
export function featureForPath(pathname: string): DiscoveryFeatureId | null {
  let best: { id: DiscoveryFeatureId; length: number } | null = null;
  for (const id of DISCOVERY_FEATURE_ORDER) {
    for (const prefix of FEATURE_AVAILABILITY[id].routes) {
      if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
        if (!best || prefix.length > best.length) best = { id, length: prefix.length };
      }
    }
  }
  return best?.id ?? null;
}

/**
 * Portão de rota (PART AP/AQ): só áreas HARD bloqueiam a URL direta; SOFT
 * abre a própria página; essenciais nunca passam por aqui.
 */
export function routeAccess(
  pathname: string,
  visibility: FeatureVisibilityMap
): { blocked: false } | { blocked: true; feature: DiscoveryFeatureId } {
  if (ESSENTIAL_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return { blocked: false };
  const feature = featureForPath(pathname);
  if (!feature) return { blocked: false };
  if (FEATURE_AVAILABILITY[feature].lockedBehavior !== "HARD") return { blocked: false };
  return visibility[feature] === "AVAILABLE" ? { blocked: false } : { blocked: true, feature };
}

/** Áreas que passaram a AVAILABLE entre dois mapas (para o anúncio de desbloqueio). */
export function newlyAvailableFeatures(
  before: FeatureVisibilityMap,
  after: FeatureVisibilityMap
): DiscoveryFeatureId[] {
  return DISCOVERY_FEATURE_ORDER.filter((id) => before[id] !== "AVAILABLE" && after[id] === "AVAILABLE");
}
