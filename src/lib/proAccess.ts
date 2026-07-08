import type { DomainTrack } from "../data/domains";
import { FREE_REVIEW_SESSION_LIMIT } from "../data/economy";
import { ALL_LESSONS, JOURNEY, getLesson } from "../data/journey";
import { effectivePremium } from "./entitlements";
import { useStore } from "./store";

export const TOOL_UNLOCK_LESSONS = {
  fala: "l1",
  som: "l2-rev",
  treino: "l1-rev",
  hanzi: "l5-rev",
  leitura: "l13",
} as const;

export type PracticeToolId =
  | DomainTrack
  | "treino"
  | "treino_focado"
  | "revisao"
  | "erros"
  | "imersao"
  | "pinyin_lab"
  | "hanzi_lab"
  | "hanzi_puzzle"
  | "biblioteca"
  | "tons"
  | "som_tons";

export type AccessReasonCode =
  | "allowed"
  | "pro_unlocked"
  | "free_limited"
  | "missing_lesson"
  | "premium_required"
  | "unknown_lesson"
  | "unknown_module";

export interface ProAccessContext {
  isPremium?: boolean;
  completedLessons?: string[];
  lessonStarsById?: Record<string, number>;
}

export interface AccessDecision {
  allowed: boolean;
  pro: boolean;
  limited?: boolean;
  reasonCode: AccessReasonCode;
  reason: string;
  cta?: string;
}

export const PRO_UNLOCKED_TOOLS: readonly PracticeToolId[] = [
  "leitura",
  "hanzi",
  "fala",
  "pinyin_lab",
  "imersao",
  "treino_focado",
  "erros",
  "revisao",
  "biblioteca",
];

const PRO_TOOL_REASON =
  "Com o Longyu Pro, estas ferramentas ficam abertas para você explorar. A Jornada ainda guia a ordem das lições.";

const PRO_DETAILED_ERRORS_REASON =
  "O Longyu Pro mostra seu histórico de erros, padrões de repetição e uma revisão focada nos pontos fracos.";

export const FREE_TIER_REVIEW_HINT =
  `No plano grátis, você revisa até ${FREE_REVIEW_SESSION_LIMIT} itens por sessão na fila básica.`;

function completedFrom(context?: ProAccessContext): string[] {
  return context?.completedLessons ?? useStore.getState().completedLessons;
}

function lessonStarsFrom(context?: ProAccessContext): Record<string, number> {
  return context?.lessonStarsById ?? useStore.getState().lessonStarsById;
}

export function isProUser(context?: ProAccessContext | boolean): boolean {
  const state = useStore.getState();
  if (typeof context === "boolean") {
    return effectivePremium(context, state.serverIsPro);
  }
  const preview = context?.isPremium ?? state.isPremium;
  return effectivePremium(preview, state.serverIsPro);
}

/**
 * Pro efetivo para as telas: assinatura real do servidor OU preview local.
 * Use este hook em vez de ler `s.isPremium` direto — ler só o preview faz um
 * assinante real (serverIsPro) ver a UI do plano grátis.
 */
export function useIsPro(): boolean {
  return useStore((s) => effectivePremium(s.isPremium, s.serverIsPro));
}

function hasCompleted(completed: string[], lessonId: string): boolean {
  return completed.includes(lessonId);
}

function requiredStarsForJourney(lesson: { isReview?: boolean }): number {
  return lesson.isReview ? 2 : 3;
}

function lessonMeetsJourneyRequirement(
  lesson: { id: string; isReview?: boolean },
  completed: string[],
  lessonStarsById: Record<string, number>
): boolean {
  if (!completed.includes(lesson.id)) return false;
  const requiredStars = requiredStarsForJourney(lesson);
  const currentStars = lessonStarsById[lesson.id] ?? requiredStars;
  return currentStars >= requiredStars;
}

function missingLessonBefore(
  lessonId: string,
  completed: string[],
  lessonStarsById: Record<string, number>
) {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return undefined;
  return ALL_LESSONS.slice(0, index).find(
    (lesson) => !lessonMeetsJourneyRequirement(lesson, completed, lessonStarsById)
  );
}

function firstLessonInModule(moduleId: string) {
  for (const phase of JOURNEY) {
    const unit = phase.units.find((item) => item.id === moduleId);
    if (unit) return unit.lessons[0];
  }
  return undefined;
}

function currentModuleId(completed: string[]): string | undefined {
  const next = ALL_LESSONS.find((lesson) => !completed.includes(lesson.id));
  return next?.unitId;
}

function freePracticeToolDecision(toolId: PracticeToolId, completed: string[], pro: boolean): AccessDecision {
  const unlocked = (reason: string, limited = false): AccessDecision => ({
    allowed: true,
    pro,
    limited,
    reasonCode: limited ? "free_limited" : "allowed",
    reason,
  });
  const locked = (afterLessonId: string, label: string): AccessDecision => ({
    allowed: false,
    pro,
    reasonCode: "missing_lesson",
    reason: `${label} libera depois de uma base mínima na Jornada.`,
    cta: `Conclua ${getLesson(afterLessonId)?.title ?? afterLessonId}.`,
  });

  if (toolId === "biblioteca") return unlocked("Biblioteca básica fica aberta no plano grátis.", true);
  if (toolId === "revisao") {
    return unlocked(
      `Revisão básica gratuita (até ${FREE_REVIEW_SESSION_LIMIT} itens/sessão). Filtros, histórico e erros detalhados ficam no Longyu Pro.`,
      true
    );
  }
  if (toolId === "erros") {
    return {
      allowed: false,
      pro,
      reasonCode: "premium_required",
      reason: "Erros detalhados fazem parte do Longyu Pro. Você ainda pode fazer revisões básicas pela Jornada.",
      cta: "Ver Longyu Pro",
    };
  }
  if (toolId === "imersao") return unlocked("No plano grátis, a Imersão usa Cargas. No Pro, você pratica sem esse limite.", true);

  if (toolId === "treino" || toolId === "treino_focado") {
    const open = completed.length >= 3 || hasCompleted(completed, TOOL_UNLOCK_LESSONS.treino);
    return open
      ? unlocked("Treino livre grátis liberado após as primeiras lições.", true)
      : locked(TOOL_UNLOCK_LESSONS.treino, "Treino livre");
  }

  if (toolId === "tons" || toolId === "som_tons" || toolId === "pinyin_lab") {
    const open = hasCompleted(completed, TOOL_UNLOCK_LESSONS.som);
    return open
      ? unlocked("Som e pinyin ficam disponíveis com limite de Cargas no grátis.", true)
      : locked(TOOL_UNLOCK_LESSONS.som, toolId === "pinyin_lab" ? "Pinyin Lab" : "Treino de tons");
  }

  if (toolId === "hanzi_lab" || toolId === "hanzi_puzzle") {
    const open = hasCompleted(completed, TOOL_UNLOCK_LESSONS.hanzi);
    return open
      ? unlocked("Hànzì básico fica disponível; laboratório profundo é Pro.", true)
      : locked(TOOL_UNLOCK_LESSONS.hanzi, toolId === "hanzi_puzzle" ? "Hànzì Puzzle" : "Hànzì Lab");
  }

  const track = toolId as DomainTrack;
  const unlockLessonId = TOOL_UNLOCK_LESSONS[track];
  if (!unlockLessonId) return unlocked("Ferramenta disponível.");
  return hasCompleted(completed, unlockLessonId)
    ? unlocked("Ferramenta liberada pela Jornada.", true)
    : locked(unlockLessonId, getToolLabel(toolId));
}

export function canUsePracticeTool(toolId: PracticeToolId, context?: ProAccessContext): AccessDecision {
  const pro = isProUser(context);
  if (toolId === "erros") {
    if (pro) {
      return {
        allowed: true,
        pro: true,
        reasonCode: "pro_unlocked",
        reason: PRO_DETAILED_ERRORS_REASON,
      };
    }
    return freePracticeToolDecision(toolId, completedFrom(context), pro);
  }
  if (pro) {
    return {
      allowed: true,
      pro: true,
      reasonCode: "pro_unlocked",
      reason: PRO_TOOL_REASON,
    };
  }
  return freePracticeToolDecision(toolId, completedFrom(context), pro);
}

export function canStartLesson(lessonId: string, context?: ProAccessContext): AccessDecision {
  const completed = completedFrom(context);
  const lessonStarsById = lessonStarsFrom(context);
  const pro = isProUser(context);
  const lesson = getLesson(lessonId);

  if (!lesson) {
    return {
      allowed: false,
      pro,
      reasonCode: "unknown_lesson",
      reason: "Lição não encontrada.",
    };
  }

  if (lesson.premium && !pro) {
    return {
      allowed: false,
      pro,
      reasonCode: "premium_required",
      reason: "Este conteúdo faz parte do Longyu Pro. A assinatura real será ativada no lançamento.",
      cta: "Ver Longyu Pro",
    };
  }

  if (completed.includes(lessonId)) {
    return {
      allowed: true,
      pro,
      reasonCode: "allowed",
      reason: "Lição já concluída; revisão liberada.",
    };
  }

  const missing = missingLessonBefore(lessonId, completed, lessonStarsById);
  if (!missing) {
    return {
      allowed: true,
      pro,
      reasonCode: "allowed",
      reason: "Próxima lição da Jornada.",
    };
  }

  if (missing.premium && !pro) {
    return {
      allowed: false,
      pro,
      reasonCode: "premium_required",
      reason: "Esta área é liberada no Longyu Pro.",
      cta: "Ver Longyu Pro",
    };
  }

  const missingStars = lessonStarsById[missing.id] ?? 0;
  const requiredStars = requiredStarsForJourney(missing);
  if (missingStars > 0 && missingStars < requiredStars) {
    return {
      allowed: false,
      pro,
      reasonCode: "missing_lesson",
      reason: missing.isReview
        ? `Conclua "${missing.title}" com pelo menos 80% de precisão para liberar esta lição.`
        : `Consiga 3 estrelas em "${missing.title}" para liberar esta lição.`,
      cta: missing.isReview ? "Refazer revisão" : "Revisar erros agora",
    };
  }

  return {
    allowed: false,
    pro,
    reasonCode: "missing_lesson",
    reason: `Complete "${missing.title}" para manter a ordem pedagógica da Jornada. O Pro abre ferramentas extras, mas a sequência das aulas continua guiada.`,
    cta: "Continuar na Jornada",
  };
}

export function canStartModule(moduleId: string, context?: ProAccessContext): AccessDecision {
  const completed = completedFrom(context);
  const pro = isProUser(context);
  const firstLesson = firstLessonInModule(moduleId);

  if (!firstLesson) {
    return {
      allowed: false,
      pro,
      reasonCode: "unknown_module",
      reason: "Módulo não encontrado.",
    };
  }

  if (moduleId === currentModuleId(completed)) {
    return canStartLesson(firstLesson.id, context);
  }

  const moduleLessons = ALL_LESSONS.filter((lesson) => lesson.unitId === moduleId);
  if (moduleLessons.some((lesson) => completed.includes(lesson.id))) {
    return {
      allowed: true,
      pro,
      reasonCode: "allowed",
      reason: "Módulo já iniciado.",
    };
  }

  return canStartLesson(firstLesson.id, context);
}

export function canUseUnlimitedRetry(context?: ProAccessContext): boolean {
  return isProUser(context);
}

export function canAccessAdvancedReview(context?: ProAccessContext): AccessDecision {
  if (isProUser(context)) return canUsePracticeTool("revisao", context);
  return {
    allowed: true,
    pro: false,
    limited: true,
    reasonCode: "free_limited",
    reason: `${FREE_TIER_REVIEW_HINT} Filtros por modo, histórico de erros e análise detalhada ficam no Longyu Pro.`,
    cta: "Ver Longyu Pro",
  };
}

export function canAccessDetailedErrors(context?: ProAccessContext): AccessDecision {
  return canUsePracticeTool("erros", context);
}

export function canAccessPinyinLab(context?: ProAccessContext): AccessDecision {
  return canUsePracticeTool("pinyin_lab", context);
}

export function canAccessHanziLab(context?: ProAccessContext): AccessDecision {
  return canUsePracticeTool("hanzi_lab", context);
}

function getToolLabel(toolId: PracticeToolId): string {
  const labels: Record<PracticeToolId, string> = {
    som: "Som",
    fala: "Fala",
    hanzi: "Hànzì",
    leitura: "Leitura",
    treino: "Treino livre",
    treino_focado: "Treino focado",
    revisao: "Revisão",
    erros: "Erros detalhados",
    imersao: "Imersão",
    pinyin_lab: "Pinyin Lab",
    hanzi_lab: "Hànzì Lab",
    hanzi_puzzle: "Hànzì Puzzle",
    biblioteca: "Biblioteca",
    tons: "Treino de tons",
    som_tons: "Treino de tons",
  };
  return labels[toolId];
}
