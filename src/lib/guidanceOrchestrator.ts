/**
 * RC2.2.18 — GuidanceOrchestrator (parte pura).
 *
 * Decide QUAL orientação aparece, QUANDO, e o que cada botão faz. Nenhuma
 * página abre dica, coachmark ou anúncio por conta própria: todas pedem a este
 * módulo, que aplica prioridade, orçamento de sessão, cooldown, "Agora não",
 * "Pular" e "Pular dicas" (PART N).
 *
 * Invariantes:
 * - UMA orientação por vez; nunca A → B → C em sequência (PART O).
 * - Máximo normal: 1 por sessão; na primeira sessão da conta, 2 — e a segunda
 *   só depois da primeira atividade concluída (PART J/AS/BC).
 * - Nunca no meio de aprendizagem ativa, com teclado aberto ou por cima de
 *   outra cerimônia (medalha, selo, ofensiva) — PART K/DG/DQ.
 * - Dicas desligadas suprimem tudo que não é essencial; áreas continuam
 *   liberando normalmente, porque disponibilidade NÃO mora aqui (PART H/CX).
 * - Nada aqui dá XP, medalha, Qi ou mexe em domínio (PART CG).
 */
import type { MessageKey } from "../locales/pt-BR";
import {
  DISCOVERY_FEATURE_ORDER,
  FEATURE_AVAILABILITY,
  PROGRESSIVE_DISCOVERY_RULES,
  type DiscoveryFeatureId,
  type DiscoveryLearnerState,
  type FeatureVisibilityMap,
} from "./progressiveDiscovery";

export type GuidanceKind = "INLINE_TIP" | "COACHMARK" | "UNLOCK_REVEAL";

/** PART P — CRITICAL UX > NEW FEATURE UNLOCK > PEDAGOGICAL TIP > OPTIONAL DISCOVERY. */
export type GuidancePriority = "CRITICAL_UX" | "FEATURE_UNLOCK" | "PEDAGOGICAL_TIP" | "OPTIONAL_DISCOVERY";

export const GUIDANCE_PRIORITY_RANK: Readonly<Record<GuidancePriority, number>> = {
  CRITICAL_UX: 0,
  FEATURE_UNLOCK: 1,
  PEDAGOGICAL_TIP: 2,
  OPTIONAL_DISCOVERY: 3,
};

export interface GuidanceDefinition {
  /** Idempotente e versionado (PART AX/AY): `culture_intro_v2` não reseta o resto. */
  id: string;
  kind: GuidanceKind;
  priority: GuidancePriority;
  /**
   * Essencial = erro, segurança ou permissão necessária. Só essas passam com
   * "Dicas guiadas" desligado. Nenhuma orientação desta onda é essencial.
   */
  essential: boolean;
  /** Rotas (exatas) em que pode aparecer. Nunca rotas de lição/prova. */
  surfaces: readonly string[];
  /** Área anunciada (UNLOCK_REVEAL). */
  feature?: DiscoveryFeatureId;
  /** `data-coachmark-target` do controle apontado (COACHMARK). */
  anchor?: string;
  titleKey?: MessageKey;
  bodyKey: MessageKey;
  primaryKey: MessageKey;
  /** CTA primário navega para cá (ex.: "Explorar Atlas"). Sem rota = só fecha. */
  primaryTo?: string;
  /** "Agora não" (cooldown) ou "Pular" (nunca mais esta dica). */
  secondary: "now_not" | "skip";
  /** Oferece também "Pular dicas" (desliga as não essenciais). */
  offerSkipAll: boolean;
  /** Dragão como rosto: só conceito novo, recurso novo, marco (PART AV). */
  dragon: boolean;
  /** Só no Android nativo (ex.: lembrete de notificação). */
  nativeOnly?: boolean;
}

const JOURNEY = ["/jornada"] as const;

export const GUIDANCE_DEFINITIONS: readonly GuidanceDefinition[] = [
  {
    id: "welcome_journey_v1",
    kind: "COACHMARK",
    priority: "CRITICAL_UX",
    essential: false,
    surfaces: JOURNEY,
    anchor: "journey-continue",
    titleKey: "guidance.welcome.title",
    bodyKey: "guidance.welcome.body",
    primaryKey: "guidance.welcome.primary",
    secondary: "now_not",
    offerSkipAll: true,
    dragon: true,
  },
  {
    id: "new_features_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    titleKey: "guidance.newFeatures.title",
    bodyKey: "guidance.newFeatures.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: true,
  },
  {
    id: "practice_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "practice",
    titleKey: "guidance.practiceUnlocked.title",
    bodyKey: "guidance.practiceUnlocked.body",
    primaryKey: "guidance.practiceUnlocked.primary",
    primaryTo: "/treino",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: true,
  },
  {
    id: "missions_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "missions",
    titleKey: "guidance.missionsUnlocked.title",
    bodyKey: "guidance.missionsUnlocked.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "culture_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "culture",
    titleKey: "guidance.cultureUnlocked.title",
    bodyKey: "guidance.cultureUnlocked.body",
    primaryKey: "guidance.cultureUnlocked.primary",
    primaryTo: "/cultura",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: true,
  },
  {
    id: "hanzi_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "hanzi",
    titleKey: "guidance.hanziUnlocked.title",
    bodyKey: "guidance.hanziUnlocked.body",
    primaryKey: "guidance.hanziUnlocked.primary",
    primaryTo: "/ideogramas",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: true,
  },
  {
    id: "atlas_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "atlas",
    titleKey: "guidance.atlasUnlocked.title",
    bodyKey: "guidance.atlasUnlocked.body",
    primaryKey: "guidance.atlasUnlocked.primary",
    primaryTo: "/hanzi/atlas",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: true,
  },
  {
    id: "league_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "league",
    titleKey: "guidance.leagueUnlocked.title",
    bodyKey: "guidance.leagueUnlocked.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "shop_introduction_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "shop",
    titleKey: "guidance.shopIntroduction.title",
    bodyKey: "guidance.shopIntroduction.body",
    // PART AJ — nunca abre a Loja sozinho: o CTA só fecha.
    primaryKey: "guidance.shopIntroduction.primary",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "immersion_unlocked_v1",
    kind: "UNLOCK_REVEAL",
    priority: "FEATURE_UNLOCK",
    essential: false,
    surfaces: JOURNEY,
    feature: "immersion",
    titleKey: "guidance.immersionUnlocked.title",
    bodyKey: "guidance.immersionUnlocked.body",
    primaryKey: "guidance.immersionUnlocked.primary",
    primaryTo: "/imersao",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: true,
  },
  {
    id: "tone_direction_tip_v1",
    kind: "INLINE_TIP",
    priority: "PEDAGOGICAL_TIP",
    essential: false,
    surfaces: JOURNEY,
    bodyKey: "guidance.toneDirectionTip.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "practice_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/treino", "/praticar"],
    anchor: "practice-recommended",
    bodyKey: "guidance.practiceFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "review_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    // Aponta a entrada da Revisão em Praticar — nunca uma pergunta em curso.
    surfaces: ["/treino", "/praticar"],
    anchor: "practice-review",
    bodyKey: "guidance.reviewFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "culture_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/cultura"],
    anchor: "culture-recommended",
    bodyKey: "guidance.cultureFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "atlas_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/hanzi/atlas"],
    anchor: "atlas-first-char",
    bodyKey: "guidance.atlasFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    id: "notifications_offer_v1",
    kind: "UNLOCK_REVEAL",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: JOURNEY,
    titleKey: "guidance.notificationsOffer.title",
    bodyKey: "guidance.notificationsOffer.body",
    primaryKey: "guidance.notificationsOffer.primary",
    secondary: "now_not",
    offerSkipAll: false,
    dragon: false,
    nativeOnly: true,
  },
];

export const GUIDANCE_BY_ID: ReadonlyMap<string, GuidanceDefinition> = new Map(
  GUIDANCE_DEFINITIONS.map((definition) => [definition.id, definition])
);

// ─────────────────────────────────────────────────────────────────────────
// Estado persistido (por conta): só descoberta, nunca progresso (PART C).
// ─────────────────────────────────────────────────────────────────────────

export type GuidanceRecordStatus = "SEEN" | "SKIPPED" | "SNOOZED";

export interface GuidanceRecord {
  status: GuidanceRecordStatus;
  at: number;
  /** "Agora não": volta só depois disto (e nunca na mesma sessão). */
  snoozedUntil?: number;
}

export interface GuidanceState {
  /** "Dicas guiadas" em Ajustes › Aprendizagem. */
  enabled: boolean;
  records: Record<string, GuidanceRecord>;
  /** Semente de migração já aplicada (contas antigas não recebem enxurrada). */
  initialized: boolean;
}

export const DEFAULT_GUIDANCE_STATE: GuidanceState = { enabled: true, records: {}, initialized: false };

/** PART BB — "Agora não" volta no mínimo 24h depois. */
export const GUIDANCE_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function normalizeGuidanceState(raw: unknown): GuidanceState {
  const value = raw as Partial<GuidanceState> | null | undefined;
  if (!value || typeof value !== "object") return { ...DEFAULT_GUIDANCE_STATE, records: {} };
  const records: Record<string, GuidanceRecord> = {};
  if (value.records && typeof value.records === "object") {
    for (const [id, record] of Object.entries(value.records)) {
      const r = record as Partial<GuidanceRecord> | null;
      if (!r || (r.status !== "SEEN" && r.status !== "SKIPPED" && r.status !== "SNOOZED")) continue;
      records[id] = {
        status: r.status,
        at: typeof r.at === "number" ? r.at : 0,
        ...(typeof r.snoozedUntil === "number" ? { snoozedUntil: r.snoozedUntil } : {}),
      };
    }
  }
  return { enabled: value.enabled !== false, records, initialized: value.initialized === true };
}

// ─────────────────────────────────────────────────────────────────────────
// Sessão (RAM): orçamento e "Agora não" da mesma sessão (PART BC/CY/DH).
// ─────────────────────────────────────────────────────────────────────────

export interface GuidanceSession {
  /** Orientações automáticas já mostradas nesta sessão. */
  shownIds: readonly string[];
  /** Dispensadas com "Agora não" nesta sessão — não voltam antes da próxima. */
  snoozedIds: readonly string[];
}

export const EMPTY_GUIDANCE_SESSION: GuidanceSession = { shownIds: [], snoozedIds: [] };

/** PART J/AS — 1 normal; 2 na primeira sessão (boas-vindas + 1 depois da 1ª atividade). */
export const GUIDANCE_SESSION_BUDGET = 1;
export const GUIDANCE_FIRST_SESSION_BUDGET = 2;

// ─────────────────────────────────────────────────────────────────────────
// Elegibilidade
// ─────────────────────────────────────────────────────────────────────────

/** Gatilho de cada anúncio de desbloqueio — derivado, nunca salvo. */
export function unlockRevealTriggered(
  feature: DiscoveryFeatureId,
  visibility: FeatureVisibilityMap,
  learner: DiscoveryLearnerState
): boolean {
  if (feature === "practice") {
    return learner.completedLessons.length >= PROGRESSIVE_DISCOVERY_RULES.practiceRevealMinCompletedLessons;
  }
  return visibility[feature] === "AVAILABLE";
}

export interface GuidanceContext {
  now: number;
  pathname: string;
  visibility: FeatureVisibilityMap;
  learner: DiscoveryLearnerState;
  state: GuidanceState;
  session: GuidanceSession;
  /** Lição, pergunta de revisão, fala, tom, conversa, montagem de Hànzì, prova. */
  activeLearning: boolean;
  /** Campo de texto focado / teclado aberto. */
  inputFocused: boolean;
  /** Outra cerimônia (medalha, selo, ofensiva) está na tela. */
  otherCeremonyActive: boolean;
  /** Âncoras de coachmark presentes na tela agora. */
  anchorsPresent: ReadonlySet<string>;
  isNative: boolean;
  /** Notificações ainda não decididas pelo usuário (nem concedidas, nem negadas). */
  notificationPermissionPromptable: boolean;
  /** Erros recentes de tom parecidos (sinal existente, sem tutor remoto). */
  recentToneConfusions: number;
}

export interface GuidancePresentation {
  definition: GuidanceDefinition;
  /** Registros que as ações desta apresentação resolvem (lote de desbloqueios). */
  coveredIds: readonly string[];
  /** Áreas listadas no lote "Novos recursos disponíveis" (máx. 2). */
  listedFeatures: readonly DiscoveryFeatureId[];
}

export const TONE_CONFUSION_TIP_THRESHOLD = 3;

function isBlockedByRecord(id: string, ctx: GuidanceContext): boolean {
  if (ctx.session.snoozedIds.includes(id)) return true;
  const record = ctx.state.records[id];
  if (!record) return false;
  if (record.status === "SNOOZED") return (record.snoozedUntil ?? 0) > ctx.now;
  return true;
}

function sessionBudget(ctx: GuidanceContext): number {
  const firstSession = ctx.session.shownIds.includes("welcome_journey_v1");
  if (!firstSession) return GUIDANCE_SESSION_BUDGET;
  // A segunda orientação da primeira sessão só depois da primeira atividade.
  return ctx.learner.completedLessons.length > 0 ? GUIDANCE_FIRST_SESSION_BUDGET : GUIDANCE_SESSION_BUDGET;
}

function candidateEligible(definition: GuidanceDefinition, ctx: GuidanceContext): boolean {
  if (!definition.surfaces.includes(ctx.pathname)) return false;
  if (definition.nativeOnly && !ctx.isNative) return false;
  if (isBlockedByRecord(definition.id, ctx)) return false;
  if (definition.kind === "COACHMARK" && definition.anchor && !ctx.anchorsPresent.has(definition.anchor)) return false;
  switch (definition.id) {
    case "welcome_journey_v1":
      return true;
    case "new_features_v1":
      return false; // montado à parte (lote)
    case "tone_direction_tip_v1":
      return ctx.recentToneConfusions >= TONE_CONFUSION_TIP_THRESHOLD;
    case "practice_first_use_v1":
      return true;
    case "review_first_use_v1":
      return ctx.visibility.review === "AVAILABLE";
    case "culture_first_use_v1":
      return ctx.visibility.culture === "AVAILABLE";
    case "atlas_first_use_v1":
      return ctx.visibility.atlas === "AVAILABLE";
    case "notifications_offer_v1":
      // PART BO — depois que o valor ficou claro (1ª sessão concluída), nunca junto do microfone.
      return ctx.notificationPermissionPromptable && ctx.learner.completedLessons.length > 0;
    default:
      return definition.feature ? unlockRevealTriggered(definition.feature, ctx.visibility, ctx.learner) : false;
  }
}

/**
 * Escolhe NO MÁXIMO UMA orientação. Pura: o host React só monta o contexto.
 * Várias áreas liberadas juntas viram um único "Novos recursos disponíveis"
 * listando no máximo 2 (PART BD); o resto é descoberta natural.
 */
export function selectGuidance(ctx: GuidanceContext): GuidancePresentation | null {
  if (ctx.activeLearning || ctx.inputFocused || ctx.otherCeremonyActive) return null;
  if (ctx.session.shownIds.length >= sessionBudget(ctx)) return null;

  const eligible = GUIDANCE_DEFINITIONS.filter(
    (definition) => (ctx.state.enabled || definition.essential) && candidateEligible(definition, ctx)
  );
  if (eligible.length === 0) return null;

  const reveals = eligible
    .filter((definition) => definition.kind === "UNLOCK_REVEAL" && definition.feature)
    .sort(
      (a, b) => DISCOVERY_FEATURE_ORDER.indexOf(a.feature!) - DISCOVERY_FEATURE_ORDER.indexOf(b.feature!)
    );

  const ranked = [...eligible].sort(
    (a, b) =>
      GUIDANCE_PRIORITY_RANK[a.priority] - GUIDANCE_PRIORITY_RANK[b.priority] ||
      GUIDANCE_DEFINITIONS.indexOf(a) - GUIDANCE_DEFINITIONS.indexOf(b)
  );
  const top = ranked[0];

  if (top.kind === "UNLOCK_REVEAL" && top.feature && reveals.length > 1) {
    // O lote não tem registro próprio: "Agora não"/"Entendi" caem sobre cada
    // anúncio coberto, então o lote nunca "fura" o cooldown deles.
    return {
      definition: GUIDANCE_BY_ID.get("new_features_v1")!,
      coveredIds: reveals.map((definition) => definition.id),
      listedFeatures: reveals.slice(0, PROGRESSIVE_DISCOVERY_RULES.unlockBatchMaxListed).map((d) => d.feature!),
    };
  }
  return { definition: top, coveredIds: [top.id], listedFeatures: top.feature ? [top.feature] : [] };
}

// ─────────────────────────────────────────────────────────────────────────
// Ações (PART AZ/BA): Entendi · Agora não · Pular · Pular dicas
// ─────────────────────────────────────────────────────────────────────────

export type GuidanceAction = "primary" | "now_not" | "skip" | "skip_all";

export function applyGuidanceAction(
  state: GuidanceState,
  presentation: Pick<GuidancePresentation, "coveredIds">,
  action: GuidanceAction,
  now: number
): GuidanceState {
  const records = { ...state.records };
  for (const id of presentation.coveredIds) {
    if (action === "now_not") records[id] = { status: "SNOOZED", at: now, snoozedUntil: now + GUIDANCE_SNOOZE_MS };
    else if (action === "skip") records[id] = { status: "SKIPPED", at: now };
    else records[id] = { status: "SEEN", at: now };
  }
  return { ...state, records, enabled: action === "skip_all" ? false : state.enabled };
}

export function recordShownInSession(session: GuidanceSession, presentation: GuidancePresentation): GuidanceSession {
  const id = presentation.definition.id;
  return session.shownIds.includes(id) ? session : { ...session, shownIds: [...session.shownIds, id] };
}

export function recordSnoozedInSession(session: GuidanceSession, presentation: GuidancePresentation): GuidanceSession {
  return { ...session, snoozedIds: [...new Set([...session.snoozedIds, ...presentation.coveredIds])] };
}

/**
 * Semente única por conta (PART DI): contas que já têm progresso não recebem
 * anúncio do que já usam — só o que for liberado DEPOIS. Conta nova (zero
 * lições) recebe as boas-vindas.
 */
export function initializeGuidanceState(
  state: GuidanceState,
  visibility: FeatureVisibilityMap,
  learner: DiscoveryLearnerState,
  now: number
): GuidanceState {
  if (state.initialized) return state;
  const records = { ...state.records };
  const seed = (id: string) => {
    if (!records[id]) records[id] = { status: "SEEN", at: now };
  };
  if (learner.completedLessons.length > 0) seed("welcome_journey_v1");
  for (const definition of GUIDANCE_DEFINITIONS) {
    if (definition.feature && unlockRevealTriggered(definition.feature, visibility, learner)) seed(definition.id);
  }
  return { ...state, records, initialized: true };
}

/** PART I — "Rever dicas do aplicativo": zera o visto, nunca o progresso. */
export function resetGuidanceState(state: GuidanceState): GuidanceState {
  return { ...state, enabled: true, records: {}, initialized: true };
}

/** Rota de uma área (para CTAs de listas de desbloqueio). */
export function routeForFeature(feature: DiscoveryFeatureId): string {
  return FEATURE_AVAILABILITY[feature].route;
}
