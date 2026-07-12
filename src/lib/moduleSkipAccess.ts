import { MODULE_RETRY_QI } from "../data/economy";
import { JOURNEY, FOUNDATION_LESSON_IDS, type JourneyPhase, type Unit } from "../data/journey";
import { EXAM_MIN_QUESTIONS, EXAM_PASS_RATIO } from "../features/challenge/examBuilder";
import { weekKey } from "./storage";

export type ModuleSkipBand = "initial" | "intermediate" | "advanced" | "pro_content";

export interface ModuleSkipUsageWeek {
  weekKey: string;
  attempts: number;
}

export interface ModuleSkipAccessContext {
  isPremium?: boolean;
  moduleSkipUsage?: Record<string, ModuleSkipUsageWeek>;
  inventory?: Record<string, number>;
  points?: number;
}

export interface ModuleSkipAccessInfo {
  band: ModuleSkipBand;
  allowed: boolean;
  blockedReason?: string;
  requiresPro: boolean;
  requiresCharge: boolean;
  requiresAttemptPayment: boolean;
  retryCostQi: number;
  moduleRetryItems: number;
  freeWeeklyAttempts: number;
  weeklyAttemptsUsed: number;
  weeklyFreeRemaining: number;
  passPercent: number;
  essentialsRequired: boolean;
  minQuestions: number;
  labels: {
    title: string;
    cost: string;
    requirement: string;
    pro?: string;
    cta: string;
  };
}

export function findPhaseForUnit(unitId: string): JourneyPhase | undefined {
  for (const phase of JOURNEY) {
    if (phase.units.some((unit) => unit.id === unitId)) return phase;
  }
  return undefined;
}

export function findUnitById(unitId: string): Unit | undefined {
  for (const phase of JOURNEY) {
    const unit = phase.units.find((candidate) => candidate.id === unitId);
    if (unit) return unit;
  }
  return undefined;
}

export function unitHasPremiumContent(unit: Unit): boolean {
  return unit.lessons.some((lesson) => lesson.premium);
}

/** Classifica o módulo para regras de monetização do teste de pular. */
export function getModuleSkipBand(unit: Unit): ModuleSkipBand {
  if (unitHasPremiumContent(unit)) return "pro_content";
  const phase = findPhaseForUnit(unit.id);
  if (!phase) return "initial";
  if (phase.tier === "fundamentos") {
    if (unit.id === "u4-2") return "advanced";
    return "initial";
  }
  if (phase.tier === "avancado" || phase.id === "p7") return "advanced";
  if (phase.tier === "intermediario") return "intermediate";
  return "initial";
}

/** Lições que o teste de pular pode marcar — fundamentos conceituais ficam de fora. */
export function lessonsCompletableViaSkipTest(unit: Unit): string[] {
  return unit.lessons
    .filter((lesson) => !FOUNDATION_LESSON_IDS.includes(lesson.id))
    .map((lesson) => lesson.id);
}

function weeklyAttemptsFor(unitId: string, usage?: Record<string, ModuleSkipUsageWeek>): number {
  const currentWeek = weekKey();
  const entry = usage?.[unitId];
  if (!entry || entry.weekKey !== currentWeek) return 0;
  return Math.max(0, entry.attempts);
}

export function getModuleSkipAccessInfo(unit: Unit, context: ModuleSkipAccessContext = {}): ModuleSkipAccessInfo {
  const band = getModuleSkipBand(unit);
  const pro = Boolean(context.isPremium);
  const weeklyAttemptsUsed = weeklyAttemptsFor(unit.id, context.moduleSkipUsage);
  const moduleRetryItems = context.inventory?.["shop-module-retry"] ?? 0;
  const points = context.points ?? 0;
  const passPercent = Math.round(EXAM_PASS_RATIO * 100);
  const requirementLabel = `${passPercent}% no bloco pontuado · itens essenciais obrigatórios · mín. ${EXAM_MIN_QUESTIONS} perguntas`;

  const base = {
    band,
    passPercent,
    essentialsRequired: true,
    minQuestions: EXAM_MIN_QUESTIONS,
    retryCostQi: MODULE_RETRY_QI,
    moduleRetryItems,
    weeklyAttemptsUsed,
    labels: {
      title: "Já sabe isso? Fazer teste",
      cost: "",
      requirement: requirementLabel,
      cta: "Fazer teste",
    },
  } satisfies Partial<ModuleSkipAccessInfo>;

  if (band === "pro_content") {
    return {
      ...base,
      allowed: pro,
      blockedReason: pro ? undefined : "Este módulo tem conteúdo Pro. Ative o Longyu Pro para fazer o teste.",
      requiresPro: true,
      requiresCharge: false,
      requiresAttemptPayment: false,
      freeWeeklyAttempts: 0,
      weeklyFreeRemaining: 0,
      labels: {
        ...base.labels,
        cost: "Pro obrigatório",
        pro: "Conteúdo Pro",
        requirement: requirementLabel,
        cta: pro ? "Fazer teste" : "Teste Pro",
      },
    };
  }

  if (band === "advanced") {
    return {
      ...base,
      allowed: pro,
      blockedReason: pro ? undefined : "Módulos avançados só podem ser pulados com Longyu Pro.",
      requiresPro: true,
      requiresCharge: false,
      requiresAttemptPayment: false,
      freeWeeklyAttempts: 0,
      weeklyFreeRemaining: 0,
      labels: {
        ...base.labels,
        cost: "Pro obrigatório",
        pro: "Pro: pular módulos avançados",
        requirement: requirementLabel,
        cta: pro ? "Fazer teste" : "Teste Pro",
      },
    };
  }

  if (band === "intermediate") {
    const freeWeeklyAttempts = 1;
    const weeklyFreeRemaining = Math.max(0, freeWeeklyAttempts - weeklyAttemptsUsed);
    const requiresAttemptPayment = !pro && weeklyFreeRemaining <= 0;
    const canPayAttempt = pro || moduleRetryItems > 0 || points >= MODULE_RETRY_QI;
    const skipChargeThisAttempt = weeklyFreeRemaining > 0;
    return {
      ...base,
      allowed: pro || weeklyFreeRemaining > 0 || canPayAttempt,
      blockedReason:
        pro || weeklyFreeRemaining > 0 || canPayAttempt
          ? undefined
          : `Você já usou a tentativa grátis desta semana. Junte ${MODULE_RETRY_QI} Qi ou um Passe de teste.`,
      requiresPro: false,
      requiresCharge: !pro && !skipChargeThisAttempt,
      requiresAttemptPayment,
      freeWeeklyAttempts,
      weeklyFreeRemaining,
      labels: {
        ...base.labels,
        cost:
          pro
            ? "Retentativas inclusas no Pro"
            : weeklyFreeRemaining > 0
            ? "Teste grátis desta semana"
            : moduleRetryItems > 0
            ? "Passe de teste"
            : `${MODULE_RETRY_QI} Qi`,
        requirement: requirementLabel,
        cta: "Fazer teste",
      },
    };
  }

  return {
    ...base,
    allowed: true,
    requiresPro: false,
    requiresCharge: !pro,
    requiresAttemptPayment: false,
    freeWeeklyAttempts: 0,
    weeklyFreeRemaining: 0,
    labels: {
      ...base.labels,
      cost: pro ? "Incluso no Pro" : "Teste grátis deste módulo · 1 Carga",
      requirement: requirementLabel,
      cta: "Fazer teste",
    },
  };
}

export function canPayModuleSkipAttempt(
  info: ModuleSkipAccessInfo,
  points: number
): boolean {
  if (!info.requiresAttemptPayment) return true;
  return info.moduleRetryItems > 0 || points >= info.retryCostQi;
}

/** Exporta a razão de aprovação para validadores. */
export const MODULE_SKIP_PASS_RATIO = EXAM_PASS_RATIO;
