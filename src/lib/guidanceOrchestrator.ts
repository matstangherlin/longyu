/**
 * RC2.2.18 — GuidanceOrchestrator (parte pura).
 * RC2.2.32 — este módulo cobre só GLOBAL GUIDANCE (coachmarks / unlock reveals
 * / tips de superfície). Microorientações pedagógicas INLINE vivem em
 * `pedagogicalInlineGuidance.ts` e NÃO consomem o orçamento abaixo.
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
 *   liberando normalmente, porque disponibilidade não mora aqui (PART H/CX).
 * - Nada aqui dá XP, medalha, Qi ou mexe em domínio (PART CG).
 * - CRITICAL_UX vence OPTIONAL_DISCOVERY quando o orçamento é 1 (primeira
 *   utilização essencial não é engolida por dica opcional).
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

/**
 * RC2.2.23 — BLOCKING UX > PEDAGÓGICO > DESCOBERTA DE RECURSO > OPCIONAL
 * (monetização nunca entra aqui: oferta Pro não compete com orientação).
 */
export type GuidancePriority = "CRITICAL_UX" | "FEATURE_UNLOCK" | "PEDAGOGICAL_TIP" | "OPTIONAL_DISCOVERY";

export const GUIDANCE_PRIORITY_RANK: Readonly<Record<GuidancePriority, number>> = {
  CRITICAL_UX: 0,
  PEDAGOGICAL_TIP: 1,
  FEATURE_UNLOCK: 2,
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
  // RC2.2.29 — Tone Trace first-use (Part AE).
  {
    id: "tone_trace_first_use_v1",
    kind: "COACHMARK",
    priority: "CRITICAL_UX",
    essential: true,
    surfaces: ["/som", "/treino/tons", "/tons"],
    anchor: "tone-trace",
    titleKey: "guidance.toneTraceFirstUse.title",
    bodyKey: "guidance.toneTraceFirstUse.body",
    primaryKey: "guidance.toneTraceFirstUse.primary",
    secondary: "now_not",
    offerSkipAll: true,
    dragon: true,
  },
  // RC2.2.29 — Tone confusion 2º vs 3º (Part AF).
  {
    id: "tone_confusion_2_3_v1",
    kind: "INLINE_TIP",
    priority: "PEDAGOGICAL_TIP",
    essential: false,
    surfaces: ["/som", "/treino/tons", "/tons"],
    bodyKey: "guidance.toneConfusion23.body",
    primaryKey: "guidance.toneConfusion23.primary",
    secondary: "now_not",
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
    // RC2.3.7 — Seu Domínio: uma frase, na primeira visita. Sem algoritmo, sem números.
    id: "mastery_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/dominio"],
    anchor: "dominio-header",
    bodyKey: "guidance.masteryFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    // RC2.3.7 — "Praticar o que preciso": V0 é determinística (nunca "IA escolheu").
    id: "practice_need_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/dominio"],
    anchor: "practice-what-i-need",
    bodyKey: "guidance.practiceNeedFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    // RC2.2.19 — primeira revisão: rodadas curtas, erro volta de outro jeito.
    id: "review_session_intro_v1",
    kind: "INLINE_TIP",
    priority: "PEDAGOGICAL_TIP",
    essential: false,
    surfaces: ["/revisao"],
    bodyKey: "guidance.reviewSessionIntro.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    // RC2.2.19 — onde fica o perfil (avatar do topo → /perfil).
    id: "profile_entry_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: JOURNEY,
    anchor: "topbar-profile",
    titleKey: "guidance.profileEntry.title",
    bodyKey: "guidance.profileEntry.body",
    primaryKey: "guidance.profileEntry.primary",
    primaryTo: "/perfil",
    secondary: "now_not",
    offerSkipAll: true,
    dragon: true,
  },
  {
    id: "immersion_first_use_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/imersao"],
    anchor: "immersion-first-scene",
    bodyKey: "guidance.immersionFirstUse.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "skip",
    offerSkipAll: false,
    dragon: false,
  },
  {
    // RC2.2.23 — Mais → Você: Perfil, Conta e Aparência ficam juntos.
    id: "account_appearance_v1",
    kind: "COACHMARK",
    priority: "OPTIONAL_DISCOVERY",
    essential: false,
    surfaces: ["/mais"],
    anchor: "more-you",
    titleKey: "guidance.accountAppearance.title",
    bodyKey: "guidance.accountAppearance.body",
    primaryKey: "guidance.common.gotIt",
    secondary: "now_not",
    offerSkipAll: true,
    dragon: false,
  },
  {
    // RC2.2.23 — o percurso de estudo: Jornada → Cultura → volta à Jornada.
    id: "journey_culture_bridge_v1",
    kind: "UNLOCK_REVEAL",
    priority: "PEDAGOGICAL_TIP",
    essential: false,
    surfaces: JOURNEY,
    titleKey: "guidance.journeyCultureBridge.title",
    bodyKey: "guidance.journeyCultureBridge.body",
    primaryKey: "guidance.journeyCultureBridge.primary",
    primaryTo: "/cultura?from=jornada",
    secondary: "now_not",
    offerSkipAll: true,
    dragon: true,
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

/**
 * RC2.2.19 — estados EXPLÍCITOS. Disponível ≠ mostrado:
 * - AUTO_SEEDED: registrada pela semente/migração, NUNCA vista. Continua
 *   elegível (1 por sessão em conta madura) — não é "vista".
 * - SHOWN: a superfície ficou visível na tela por GUIDANCE_RENDER_EVIDENCE_MS
 *   (evidência de render). Só o host grava, e só com essa evidência.
 * - DISMISSED: "Entendi"/CTA — o próprio toque prova que estava na tela.
 * - SNOOZED: "Agora não" (volta depois do cooldown).
 * - SKIPPED: "Pular dica" (nunca mais esta).
 * O RC2.2.18 gravava "SEEN" na semente e ao sair da tela sem evidência — por
 * isso todo SEEN antigo migra para AUTO_SEEDED (ver normalizeGuidanceState).
 */
export type GuidanceRecordStatus = "AUTO_SEEDED" | "SHOWN" | "DISMISSED" | "SNOOZED" | "SKIPPED";

/** De onde veio o registro (auditoria; nunca PII). */
export type GuidanceEvidence = "seed" | "migration" | "render" | "action";

export interface GuidanceRecord {
  status: GuidanceRecordStatus;
  at: number;
  /** "Agora não": volta só depois disto (e nunca na mesma sessão). */
  snoozedUntil?: number;
  evidence?: GuidanceEvidence;
}

export const GUIDANCE_STATE_VERSION = 2;

export interface GuidanceState {
  version: typeof GUIDANCE_STATE_VERSION;
  /** "Dicas guiadas" em Ajustes › Aprendizagem. */
  enabled: boolean;
  records: Record<string, GuidanceRecord>;
  /** Semente de migração já aplicada. */
  initialized: boolean;
  /**
   * RC2.2.19 — nunca re-trancar: áreas que já estiveram disponíveis para esta
   * conta. Só cresce. A 1ª liberação continua derivada do progresso; isto só
   * impede que uma regra nova, um sync incompleto ou uma migração tranque de
   * novo o que o aluno já usava.
   */
  availabilityMemory: DiscoveryFeatureId[];
}

export const DEFAULT_GUIDANCE_STATE: GuidanceState = {
  version: GUIDANCE_STATE_VERSION,
  enabled: true,
  records: {},
  initialized: false,
  availabilityMemory: [],
};

/** Tempo mínimo visível para contar como SHOWN (evidência de render). */
export const GUIDANCE_RENDER_EVIDENCE_MS = 1200;
/** Se a superfície não ficar visível neste prazo, desiste sem gastar a sessão. */
export const GUIDANCE_RENDER_TIMEOUT_MS = 4000;

const RECORD_STATUSES: readonly GuidanceRecordStatus[] = ["AUTO_SEEDED", "SHOWN", "DISMISSED", "SNOOZED", "SKIPPED"];

/** PART BB — "Agora não" volta no mínimo 24h depois. */
export const GUIDANCE_SNOOZE_MS = 24 * 60 * 60 * 1000;

export function normalizeGuidanceState(raw: unknown): GuidanceState {
  const value = raw as (Partial<Omit<GuidanceState, "version">> & { version?: number }) | null | undefined;
  if (!value || typeof value !== "object") return { ...DEFAULT_GUIDANCE_STATE, records: {}, availabilityMemory: [] };
  const legacy = value.version !== GUIDANCE_STATE_VERSION;
  const records: Record<string, GuidanceRecord> = {};
  if (value.records && typeof value.records === "object") {
    for (const [id, record] of Object.entries(value.records)) {
      const r = record as (Partial<Omit<GuidanceRecord, "status">> & { status?: string }) | null;
      if (!r || typeof r.status !== "string") continue;
      const at = typeof r.at === "number" ? r.at : 0;
      // P1 GUIDANCE_UNLOCK_AUTO_MARKED_AS_SEEN — o SEEN do RC2.2.18 nunca teve
      // evidência de render (vinha da semente ou de sair da tela): volta a ser
      // elegível como AUTO_SEEDED. Pular/Agora não foram toques reais: ficam.
      if (legacy && r.status === "SEEN") {
        records[id] = { status: "AUTO_SEEDED", at, evidence: "migration" };
        continue;
      }
      if (!RECORD_STATUSES.includes(r.status as GuidanceRecordStatus)) continue;
      records[id] = {
        status: r.status as GuidanceRecordStatus,
        at,
        ...(typeof r.snoozedUntil === "number" ? { snoozedUntil: r.snoozedUntil } : {}),
        ...(typeof r.evidence === "string" ? { evidence: r.evidence } : {}),
      };
    }
  }
  const memory = Array.isArray(value.availabilityMemory)
    ? DISCOVERY_FEATURE_ORDER.filter((id) => (value.availabilityMemory as unknown[]).includes(id))
    : [];
  return {
    version: GUIDANCE_STATE_VERSION,
    enabled: value.enabled !== false,
    records,
    initialized: value.initialized === true,
    availabilityMemory: memory,
  };
}

/** Só estes contam como "a pessoa viu" (evidência de render ou de toque). */
export function guidanceRecordProvesRender(record: GuidanceRecord | undefined): boolean {
  return record?.status === "SHOWN" || record?.status === "DISMISSED" || record?.status === "SKIPPED" || record?.status === "SNOOZED";
}

// ─────────────────────────────────────────────────────────────────────────
// Sessão (RAM): orçamento e "Agora não" da mesma sessão (PART BC/CY/DH).
// ─────────────────────────────────────────────────────────────────────────

export interface GuidanceSession {
  /** Orientações automáticas já mostradas nesta sessão. */
  shownIds: readonly string[];
  /** Dispensadas com "Agora não" nesta sessão — não voltam antes da próxima. */
  snoozedIds: readonly string[];
  /**
   * RC2.2.23 — coachmarks cuja âncora não apareceu depois de uma tentativa
   * segura: na próxima avaliação viram card inferior não ancorado (a
   * informação aparece; nunca é abandonada em silêncio).
   */
  anchorMisses?: readonly string[];
}

export const EMPTY_GUIDANCE_SESSION: GuidanceSession = { shownIds: [], snoozedIds: [], anchorMisses: [] };

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
  /** As âncoras de coachmark presentes na tela agora. */
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
  /** RC2.2.23 — âncora indisponível: mostrar como card inferior não ancorado. */
  anchorFallback?: boolean;
}

export const TONE_CONFUSION_TIP_THRESHOLD = 3;

function isBlockedByRecord(id: string, ctx: GuidanceContext): boolean {
  if (ctx.session.snoozedIds.includes(id)) return true;
  const record = ctx.state.records[id];
  if (!record) return false;
  // AVAILABLE ≠ SHOWN: semeada/migrada continua elegível.
  if (record.status === "AUTO_SEEDED") return false;
  if (record.status === "SNOOZED") return (record.snoozedUntil ?? 0) > ctx.now;
  return true;
}

/** Nunca vista, mas registrada pela semente/migração (conta madura). */
function isAutoSeeded(id: string, ctx: GuidanceContext): boolean {
  return ctx.state.records[id]?.status === "AUTO_SEEDED";
}

function sessionBudget(ctx: GuidanceContext): number {
  const firstSession = ctx.session.shownIds.includes("welcome_journey_v1");
  if (!firstSession) return GUIDANCE_SESSION_BUDGET;
  // A segunda orientação da primeira sessão só depois da primeira atividade.
  return ctx.learner.completedLessons.length > 0 ? GUIDANCE_FIRST_SESSION_BUDGET : GUIDANCE_SESSION_BUDGET;
}

/** A âncora está presente, ou já houve uma tentativa segura (→ card não ancorado). */
function anchorReady(definition: GuidanceDefinition, ctx: GuidanceContext): boolean {
  if (definition.kind !== "COACHMARK" || !definition.anchor) return true;
  return ctx.anchorsPresent.has(definition.anchor) || (ctx.session.anchorMisses ?? []).includes(definition.id);
}

function candidateEligible(definition: GuidanceDefinition, ctx: GuidanceContext): boolean {
  if (!definition.surfaces.includes(ctx.pathname)) return false;
  if (definition.nativeOnly && !ctx.isNative) return false;
  if (isBlockedByRecord(definition.id, ctx)) return false;
  if (!anchorReady(definition, ctx)) return false;
  return featureConditionMet(definition, ctx);
}

/** A condição própria de cada orientação (o recurso já faz sentido para o aluno?). */
function featureConditionMet(definition: GuidanceDefinition, ctx: GuidanceContext): boolean {
  switch (definition.id) {
    case "welcome_journey_v1":
      // Boas-vindas são para quem ainda não começou; conta madura não precisa.
      return ctx.learner.completedLessons.length === 0;
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
    case "mastery_first_use_v1":
      return true;
    case "practice_need_first_use_v1":
      // Só depois de entender a tela (a frase de Seu Domínio já resolvida).
      return guidanceResolved(ctx.state.records["mastery_first_use_v1"]);
    case "review_session_intro_v1":
      return ctx.visibility.review === "AVAILABLE";
    case "profile_entry_v1":
      // Depois da primeira atividade: nunca disputa com as boas-vindas.
      return ctx.learner.completedLessons.length > 0;
    case "immersion_first_use_v1":
      return ctx.visibility.immersion === "AVAILABLE";
    case "account_appearance_v1":
      return ctx.learner.completedLessons.length > 0;
    case "journey_culture_bridge_v1": {
      // Depois do anúncio da Cultura (resolvido), se o aluno ainda não a tocou.
      const reveal = ctx.state.records["culture_unlocked_v1"]?.status;
      return ctx.visibility.culture === "AVAILABLE" && !ctx.learner.cultureTouched && (reveal === "SHOWN" || reveal === "DISMISSED");
    }
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

  // Só liberações NOVAS (sem registro) entram no lote "Novos recursos": uma
  // área que a conta madura já usa nunca é anunciada como "nova".
  const reveals = eligible
    .filter((definition) => definition.kind === "UNLOCK_REVEAL" && definition.feature && !isAutoSeeded(definition.id, ctx))
    .sort(
      (a, b) => DISCOVERY_FEATURE_ORDER.indexOf(a.feature!) - DISCOVERY_FEATURE_ORDER.indexOf(b.feature!)
    );

  // Novas antes de semeadas; depois prioridade e ordem do registro.
  const ranked = [...eligible].sort(
    (a, b) =>
      Number(isAutoSeeded(a.id, ctx)) - Number(isAutoSeeded(b.id, ctx)) ||
      GUIDANCE_PRIORITY_RANK[a.priority] - GUIDANCE_PRIORITY_RANK[b.priority] ||
      GUIDANCE_DEFINITIONS.indexOf(a) - GUIDANCE_DEFINITIONS.indexOf(b)
  );
  const top = ranked[0];

  if (top.kind === "UNLOCK_REVEAL" && top.feature && !isAutoSeeded(top.id, ctx) && reveals.length > 1) {
    // O lote não tem registro próprio: "Agora não"/"Entendi" caem sobre cada
    // anúncio coberto, então o lote nunca "fura" o cooldown deles.
    // RC2.2.19 — o lote cobre SÓ o que ele lista: um anúncio que não
    // apareceu na tela não pode virar "visto" (o resto continua elegível).
    const listed = reveals.slice(0, PROGRESSIVE_DISCOVERY_RULES.unlockBatchMaxListed);
    return {
      definition: GUIDANCE_BY_ID.get("new_features_v1")!,
      coveredIds: listed.map((definition) => definition.id),
      listedFeatures: listed.map((d) => d.feature!),
    };
  }
  const anchorFallback = top.kind === "COACHMARK" && Boolean(top.anchor) && !ctx.anchorsPresent.has(top.anchor!);
  return { definition: top, coveredIds: [top.id], listedFeatures: top.feature ? [top.feature] : [], ...(anchorFallback ? { anchorFallback: true } : {}) };
}

// ─────────────────────────────────────────────────────────────────────────
// RC2.2.23 — por que uma orientação não apareceu (QA / /qa/device)
// ─────────────────────────────────────────────────────────────────────────

export const GUIDANCE_REASON_CODES = [
  "DISABLED",
  "ALREADY_RESOLVED",
  "SESSION_BUDGET",
  "WRONG_SURFACE",
  "ANCHOR_MISSING",
  "INPUT_FOCUSED",
  "ACTIVE_LEARNING",
  "OTHER_CEREMONY",
  "FEATURE_NOT_AVAILABLE",
  "SNOOZED",
  "RENDER_TIMEOUT",
  "SUPPRESSED_TEST_BUILD",
  "NOT_INITIALIZED",
] as const;
export type GuidanceReasonCode = (typeof GUIDANCE_REASON_CODES)[number];

export interface GuidanceExplanation {
  guidanceId: string;
  surface: string;
  status: GuidanceRecordStatus | "NEW";
  /** Desbloqueada/relevante e ainda não resolvida (SHOWN/DISMISSED/SKIPPED). */
  pendingDelivery: boolean;
  eligible: boolean;
  selected: boolean;
  anchorPresent: boolean | null;
  reasonCode: GuidanceReasonCode | null;
}

/** Resolvida = o aluno viu (SHOWN) ou decidiu (DISMISSED/SKIPPED). AUTO_SEEDED = pendente. */
export function guidanceResolved(record: GuidanceRecord | undefined): boolean {
  return record?.status === "SHOWN" || record?.status === "DISMISSED" || record?.status === "SKIPPED";
}

/**
 * Explica, para cada orientação, se ela sairia AGORA nesta superfície e,
 * se não, o código do motivo. Nunca decide nada: só diagnostica.
 */
export function explainGuidance(
  ctx: GuidanceContext,
  extras: { initialized?: boolean; suppressedTestBuild?: boolean } = {}
): GuidanceExplanation[] {
  const selected = extras.initialized === false || extras.suppressedTestBuild ? null : selectGuidance(ctx);
  const selectedIds = new Set(selected?.coveredIds ?? []);
  const budgetFull = ctx.session.shownIds.length >= sessionBudget(ctx);
  return GUIDANCE_DEFINITIONS.filter((definition) => definition.id !== "new_features_v1").map((definition) => {
    const record = ctx.state.records[definition.id];
    const onSurface = definition.surfaces.includes(ctx.pathname);
    const anchorPresent = definition.kind === "COACHMARK" && definition.anchor ? ctx.anchorsPresent.has(definition.anchor) : null;
    const featureOk = featureConditionMet(definition, ctx);
    let reasonCode: GuidanceReasonCode | null = null;
    if (extras.initialized === false) reasonCode = "NOT_INITIALIZED";
    else if (extras.suppressedTestBuild) reasonCode = "SUPPRESSED_TEST_BUILD";
    else if (!ctx.state.enabled && !definition.essential) reasonCode = "DISABLED";
    else if (guidanceResolved(record)) reasonCode = "ALREADY_RESOLVED";
    else if (ctx.session.snoozedIds.includes(definition.id) || (record?.status === "SNOOZED" && (record.snoozedUntil ?? 0) > ctx.now)) reasonCode = "SNOOZED";
    else if (!featureOk || (definition.nativeOnly && !ctx.isNative)) reasonCode = "FEATURE_NOT_AVAILABLE";
    else if (!onSurface) reasonCode = "WRONG_SURFACE";
    else if (!anchorReady(definition, ctx)) reasonCode = "ANCHOR_MISSING";
    else if (ctx.activeLearning) reasonCode = "ACTIVE_LEARNING";
    else if (ctx.inputFocused) reasonCode = "INPUT_FOCUSED";
    else if (ctx.otherCeremonyActive) reasonCode = "OTHER_CEREMONY";
    else if (!selectedIds.has(definition.id) && budgetFull) reasonCode = "SESSION_BUDGET";
    const eligible = reasonCode === null;
    return {
      guidanceId: definition.id,
      surface: definition.surfaces[0] ?? "",
      status: record?.status ?? "NEW",
      pendingDelivery: !guidanceResolved(record) && featureOk,
      eligible,
      selected: selectedIds.has(definition.id),
      anchorPresent,
      reasonCode,
    };
  });
}

/** Pendentes (desbloqueadas e nunca resolvidas), na ordem em que sairiam. */
export function pendingGuidance(ctx: GuidanceContext): GuidanceExplanation[] {
  const rank = (id: string) => {
    const definition = GUIDANCE_BY_ID.get(id)!;
    return GUIDANCE_PRIORITY_RANK[definition.priority] * 100 + GUIDANCE_DEFINITIONS.indexOf(definition);
  };
  return GUIDANCE_DEFINITIONS.filter((definition) => definition.id !== "new_features_v1")
    .map((definition) => explainGuidance({ ...ctx, pathname: definition.surfaces[0] ?? ctx.pathname, anchorsPresent: new Set([definition.anchor ?? ""]), session: { ...ctx.session, shownIds: [] } }).find((item) => item.guidanceId === definition.id)!)
    .filter((item) => item.pendingDelivery && item.reasonCode !== "ALREADY_RESOLVED" && item.reasonCode !== "DISABLED")
    .sort((a, b) => rank(a.guidanceId) - rank(b.guidanceId));
}

// ─────────────────────────────────────────────────────────────────────────
// Ações (PART AZ/BA): Entendi · Agora não · Pular dica · Pular dicas
// ─────────────────────────────────────────────────────────────────────────

export type GuidanceAction = "primary" | "now_not" | "skip" | "skip_all";

/** Todas as saídas, em toda orientação (RC2.2.19). */
export const GUIDANCE_ACTIONS: readonly GuidanceAction[] = ["primary", "now_not", "skip", "skip_all"];

export function applyGuidanceAction(
  state: GuidanceState,
  presentation: Pick<GuidancePresentation, "coveredIds">,
  action: GuidanceAction,
  now: number
): GuidanceState {
  const records = { ...state.records };
  for (const id of presentation.coveredIds) {
    if (action === "now_not") records[id] = { status: "SNOOZED", at: now, snoozedUntil: now + GUIDANCE_SNOOZE_MS, evidence: "action" };
    else if (action === "skip") records[id] = { status: "SKIPPED", at: now, evidence: "action" };
    else records[id] = { status: "DISMISSED", at: now, evidence: "action" };
  }
  return { ...state, records, enabled: action === "skip_all" ? false : state.enabled };
}

/**
 * Evidência de render: a superfície ficou visível ≥ GUIDANCE_RENDER_EVIDENCE_MS.
 * Promove para SHOWN só o que ainda não tem toque registrado — nunca rebaixa
 * DISMISSED/SKIPPED, nunca apaga um "Agora não" ainda válido.
 */
export function recordGuidanceRendered(
  state: GuidanceState,
  presentation: Pick<GuidancePresentation, "coveredIds">,
  now: number
): GuidanceState {
  const records = { ...state.records };
  for (const id of presentation.coveredIds) {
    const previous = records[id];
    if (previous && previous.status !== "AUTO_SEEDED" && previous.status !== "SNOOZED") continue;
    if (previous?.status === "SNOOZED" && (previous.snoozedUntil ?? 0) > now) continue;
    records[id] = { status: "SHOWN", at: now, evidence: "render" };
  }
  return { ...state, records };
}

/** Nunca re-trancar: memoriza (só cresce) o que já esteve disponível. */
export function rememberAvailability(state: GuidanceState, visibility: FeatureVisibilityMap): GuidanceState {
  const add = DISCOVERY_FEATURE_ORDER.filter((id) => visibility[id] === "AVAILABLE" && !state.availabilityMemory.includes(id));
  if (add.length === 0) return state;
  const merged = new Set([...state.availabilityMemory, ...add]);
  return { ...state, availabilityMemory: DISCOVERY_FEATURE_ORDER.filter((id) => merged.has(id)) };
}

/** Sessão: conta só o que teve evidência de render (ou toque). */
export function recordShownInSession(session: GuidanceSession, presentation: GuidancePresentation): GuidanceSession {
  const id = presentation.definition.id;
  return session.shownIds.includes(id) ? session : { ...session, shownIds: [...session.shownIds, id] };
}

export function recordSnoozedInSession(session: GuidanceSession, presentation: GuidancePresentation): GuidanceSession {
  return { ...session, snoozedIds: [...new Set([...session.snoozedIds, ...presentation.coveredIds])] };
}

/**
 * Semente única por conta. RC2.2.19: o que a conta madura JÁ tem liberado é
 * registrado como AUTO_SEEDED — nunca como visto. Continua elegível, uma por
 * sessão e nunca no lote "Novos recursos" (não é novidade para ela). Conta
 * nova (zero lições) recebe as boas-vindas. A disponibilidade atual entra na
 * memória de "nunca re-trancar".
 */
export function initializeGuidanceState(
  state: GuidanceState,
  visibility: FeatureVisibilityMap,
  learner: DiscoveryLearnerState,
  now: number
): GuidanceState {
  if (state.initialized) return rememberAvailability(state, visibility);
  const records = { ...state.records };
  const seed = (id: string) => {
    if (!records[id]) records[id] = { status: "AUTO_SEEDED", at: now, evidence: "seed" };
  };
  for (const definition of GUIDANCE_DEFINITIONS) {
    if (definition.feature && unlockRevealTriggered(definition.feature, visibility, learner)) seed(definition.id);
  }
  return rememberAvailability({ ...state, records, initialized: true }, visibility);
}

/** PART I — "Rever dicas do aplicativo": zera o visto, nunca o progresso nem o acesso. */
export function resetGuidanceState(state: GuidanceState): GuidanceState {
  return { ...state, enabled: true, records: {}, initialized: true };
}

/** Rota de uma área (para CTAs de listas de desbloqueio). */
export function routeForFeature(feature: DiscoveryFeatureId): string {
  return FEATURE_AVAILABILITY[feature].route;
}
