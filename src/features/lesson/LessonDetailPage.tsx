import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL_LESSONS, currentLessonId, getLesson, type Skill } from "../../data/journey";
import {
  energySessionFlagForPass,
  isJourneyTopicComplete,
  isTopicMasteryLesson,
  topicPassForLevel,
  type TopicMasteryProgressContext,
} from "../../data/topicMastery";
import { topicMasterySpecFor, passObjective } from "../../data/topicMasterySpecs";
import { LESSON_BASE_XP, LESSON_PASS_XP, LESSON_TOPIC_MASTERED_XP_BONUS, LESSON_THREE_STAR_XP_BONUS } from "../../data/economy";
import { canStartLesson, useIsPro } from "../../lib/proAccess";
import { useStore } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { Card, ProgressBar } from "../../components/ui/primitives";
import { PageShell, PageHeader, CompactCard, RightRail, ActionButton } from "../../components/ui/page";
import { HubProStrip } from "../../components/layout/HubLayout";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconHanzi,
  IconLock,
  IconSound,
  IconStar,
} from "../../components/ui/Icon";
import {
  estimateLessonMinutes,
  lessonDescription,
  lessonMotorLabel,
  lessonTasksFor,
  prewarmLessonPlanner,
  type LessonMotor,
  type LessonTask,
} from "./lessonTasks";
import { ProPaywall, type ProPaywallKind } from "../../components/pro/ProPaywall";
import { requiredToneTrainerPackForLesson, toneTrainerPackCompleted } from "../../data/toneTrainer";
import { LESSON_PERF_MARKS, markLessonPerf } from "../../lib/lessonPerf";
import type { MasteryLevel } from "../../data/masteryLoop";
import { useTranslation } from "../../i18n/useTranslation";
import type { TranslateVars } from "../../i18n/catalog";
import type { SupportedLocale } from "../../i18n/config";
import { displayInstruction, displayLessonTitle, localizedPassLabel, localizedTopicCta, localizeUnlockReason } from "../../i18n/overlays/journeyChrome";

type TaskStatus = "bloqueada" | "disponivel" | "concluida" | "premium";

const MOTOR_ICON: Record<LessonMotor, typeof IconSound> = {
  som: IconSound,
  fala: IconChat,
  hanzi: IconHanzi,
  leitura: IconBook,
  revisao: IconStar,
};

// Ícone da competência para o selo da lição — evita usar o ideograma 龙 solto
// como decoração (identidade do Longyu = mascote/ícones, não hànzì decorativo).
const SKILL_ICON: Record<Skill, typeof IconSound> = {
  som: IconSound,
  fala: IconChat,
  hanzi: IconHanzi,
  leitura: IconBook,
  sistema: IconStar,
};

type TranslateFn = (key: string, vars?: TranslateVars) => string;

function lockedLessonMessage(
  lessonId: string,
  completed: string[],
  _lessonStarsById: Record<string, number>,
  lessonMasteryById: Record<string, { level?: number } | undefined>,
  t: TranslateFn,
  locale: SupportedLocale
): string {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const target = ALL_LESSONS[index];
  const pathCtx: TopicMasteryProgressContext = { completedLessons: completed, lessonMasteryById };
  const missing = ALL_LESSONS.slice(0, Math.max(0, index)).find((lesson) => !isJourneyTopicComplete(lesson, pathCtx));
  if (missing?.premium) return t("journey.dependsOnPro");
  if (missing) {
    const level = lessonMasteryById[missing.id]?.level ?? 0;
    const title = displayLessonTitle(missing.title, locale);
    if (isTopicMasteryLesson(missing) && level < 4) {
      return t("journey.completeFourLessons", { title, n: level });
    }
    return t("journey.completeTitleAlt", { title });
  }

  const previous = index > 0 ? ALL_LESSONS[index - 1] : undefined;
  if (target && previous && previous.phaseId !== target.phaseId) {
    const phaseLessons = ALL_LESSONS.filter((lesson) => lesson.phaseId === previous.phaseId);
    const weak = phaseLessons.find((lesson) => !isJourneyTopicComplete(lesson, pathCtx));
    if (weak) {
      return t("journey.completePhase", {
        title: displayLessonTitle(weak.title, locale),
        phase: displayInstruction(previous.phaseTitle, locale),
      });
    }
  }

  return t("journey.completeCurrentTopic");
}

function taskStatusLabel(status: TaskStatus, locale: "pt-BR" | "en"): string {
  if (status === "concluida") return displayInstruction("Concluída", locale);
  if (status === "disponivel") return displayInstruction("Disponível", locale);
  if (status === "premium") return "Premium";
  return displayInstruction("Bloqueada", locale);
}

const SKILL_TIP: Record<Skill, string> = {
  som: "Ouça antes de ler — no Longyu, o som vem primeiro.",
  fala: "Repita cada bloco em voz alta para fixar a fala.",
  hanzi: "Observe as peças do caractere antes de montar.",
  leitura: "Leia buscando o sentido geral, não palavra por palavra.",
  sistema: "Revisar no tempo certo é o que fixa de vez.",
};

// Passo compacto do ciclo: só ícone + título curto + cor de status.
// Sem descrição, sem badge grande, sem botão por etapa.
function StepNode({ task, status, index }: { task: LessonTask; status: TaskStatus; index: number }) {
  const { t, instructionLocale: locale } = useTranslation();
  const Icon = MOTOR_ICON[task.motor];
  const chip =
    status === "concluida"
      ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
      : status === "disponivel"
      ? "bg-accent text-white ring-2 ring-accent/20"
      : "bg-surface-2 text-ink-faint";
  const name = displayInstruction(task.name, locale);
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
      aria-label={`${t("player.stageN", { n: index + 1 })}: ${name} — ${taskStatusLabel(status, locale)}`}
    >
      <span className={["grid h-9 w-9 shrink-0 place-items-center rounded-full transition", chip].join(" ")}>
        {status === "concluida" ? (
          <IconCheck width={17} height={17} />
        ) : status === "bloqueada" ? (
          <IconLock width={15} height={15} />
        ) : (
          <Icon width={17} height={17} />
        )}
      </span>
      <span className="w-full truncate text-[10px] font-medium leading-tight text-ink-soft">{name}</span>
    </div>
  );
}

function RewardChip({ icon, children, tone = "muted" }: { icon: ReactNode; children: ReactNode; tone?: "muted" | "accent" }) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
        tone === "accent" ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink",
      ].join(" ")}
    >
      {icon}
      {children}
    </span>
  );
}

export function LessonDetailPage() {
  const { t, instructionLocale: locale } = useTranslation();
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const foundLesson = lessonId ? getLesson(lessonId) : undefined;

  const completed = useStore((state) => state.completedLessons);
  const lessonStarsById = useStore((state) => state.lessonStarsById);
  const lessonMasteryById = useStore((state) => state.lessonMasteryById);
  const isPremium = useIsPro();
  const lessonTaskProgress = useStore((state) => state.lessonTaskProgress);
  const lessonSessionStepById = useStore((state) => state.lessonSessionStepById);
  const toneTrainer = useStore((state) => state.toneTrainer);
  const canStartActivity = useStore((state) => state.canStartActivity);
  const [proPaywallKind, setProPaywallKind] = useState<ProPaywallKind | null>(null);

  // PERF-011 — preaquece o planner em idle para o player não cold-startar o índice.
  useEffect(() => {
    if (!foundLesson) return undefined;
    const lessonId = foundLesson.id;
    const ric = typeof window !== "undefined" ? window.requestIdleCallback?.bind(window) : undefined;
    if (ric) {
      const handle = ric(() => prewarmLessonPlanner(lessonId));
      return () => window.cancelIdleCallback?.(handle);
    }
    const timeout = window.setTimeout(() => prewarmLessonPlanner(lessonId), 0);
    return () => window.clearTimeout(timeout);
  }, [foundLesson]);

  if (!foundLesson) return <Navigate to="/jornada" replace />;

  const lesson = foundLesson;
  const tasks = lessonTasksFor(lesson);
  const topicNode = isTopicMasteryLesson(lesson);
  const masteryRecord = lessonMasteryById?.[lesson.id];
  const masteryLevel = (masteryRecord?.level ?? 0) as MasteryLevel;
  const topicPass = topicPassForLevel(masteryLevel, { recoveryPending: masteryRecord?.recoveryPending });
  const spec = topicNode ? topicMasterySpecFor(lesson) : null;
  const passName = localizedPassLabel(topicPass, t);
  const passGoal = spec ? displayInstruction(passObjective(spec, topicPass), locale) : null;
  const pathComplete = isJourneyTopicComplete(lesson, {
    completedLessons: completed,
    lessonMasteryById,
  });

  const startAccess = canStartLesson(lesson.id, {
    isPremium,
    completedLessons: completed,
    lessonStarsById,
    lessonMasteryById,
  });
  const hasAccess = startAccess.reasonCode !== "premium_required" && startAccess.reasonCode !== "unknown_lesson";
  const currentId = currentLessonId(completed, isPremium, lessonMasteryById);
  const isAcquired = completed.includes(lesson.id);
  const requiredTonePack = requiredToneTrainerPackForLesson(lesson.id);
  const toneLocked = Boolean(
    !pathComplete &&
    hasAccess &&
    requiredTonePack &&
    !toneTrainerPackCompleted(toneTrainer, requiredTonePack.id)
  );
  const isLocked = !pathComplete && hasAccess && (!startAccess.allowed || lesson.id !== currentId || toneLocked);
  const sessionCursor = lessonSessionStepById?.[lesson.id];
  const savedProgress = Math.min(tasks.length, lessonTaskProgress[lesson.id] ?? 0);
  const activityIndex =
    sessionCursor && sessionCursor.pass === topicPass ? sessionCursor.stepIndex : savedProgress;
  const activityTotal = Math.max(tasks.length, 1);
  const progress = pathComplete && topicPass === 4 && activityIndex === 0 ? 0 : activityIndex;
  const progressLabel = t("player.ofTotal", {
    index: Math.min(progress + 1, activityTotal),
    total: activityTotal,
  });
  const estimate = estimateLessonMinutes(lesson);
  const mainType = lessonMotorLabel(lesson.skill, lesson.isReview);
  const maxXp = topicNode
    ? LESSON_PASS_XP + (masteryLevel >= 3 ? LESSON_TOPIC_MASTERED_XP_BONUS : 0)
    : LESSON_BASE_XP + LESSON_THREE_STAR_XP_BONUS;
  const totalQi = tasks.reduce((sum, task) => sum + (task.rewardQi ?? 0), 0);
  const stepLabel = topicNode
    ? pathComplete
      ? t("journey.ctaMastered")
      : `${t("journey.ctaLessonOf", { n: topicPass })} · ${passName}`
    : isAcquired
      ? t("journey.lessonComplete")
      : t("player.ofTotal", { index: Math.min(progress + 1, tasks.length), total: tasks.length });
  const blockedCopy = !hasAccess
    ? localizeUnlockReason(startAccess.reason, locale, t)
    : toneLocked && requiredTonePack
    ? t("journey.completeTonePack", {
        title: displayInstruction(requiredTonePack.shortTitle, locale),
        min: requiredTonePack.minimumCorrect,
        total: requiredTonePack.requiredRounds,
      })
    : startAccess.reasonCode === "missing_lesson"
    ? localizeUnlockReason(startAccess.reason, locale, t)
    : lockedLessonMessage(lesson.id, completed, lessonStarsById, lessonMasteryById, t, locale);

  function startLesson() {
    if (!hasAccess) {
      setProPaywallKind("content");
      return;
    }
    if (!startAccess.allowed || isLocked) {
      navigate(toneLocked ? "/som" : "/");
      return;
    }
    const energyFlag = energySessionFlagForPass(lesson.id, topicPass, todayKey());
    const alreadyInSession = window.sessionStorage.getItem(energyFlag) === "1";
    const continuingSamePass = activityIndex > 0 && sessionCursor?.pass === topicPass;
    // TM-018: a Detail não cobra. O player cobra uma vez por pass com chave
    // idempotente. Recarregar / voltar / continuar a mesma pass não gera 2ª cobrança.
    if (!alreadyInSession && !continuingSamePass && !canStartActivity("lesson")) {
      setProPaywallKind("energy");
      return;
    }
    markLessonPerf(LESSON_PERF_MARKS.startClick);
    navigate(`/licao/${lesson.id}/player`);
  }

  function statusFor(index: number): TaskStatus {
    if (!hasAccess) return "premium";
    if (pathComplete || index < progress) return "concluida";
    if (!isLocked && index === progress) return "disponivel";
    return "bloqueada";
  }

  const topicCta = localizedTopicCta(masteryLevel, activityIndex > 0, t);
  const primaryLabel = !hasAccess
    ? t("player.seeLongyuPro")
    : toneLocked
    ? t("player.openToneTrainer")
    : isLocked
    ? t("journey.backToJourney")
    : topicNode
    ? topicCta.primary
    : isAcquired
    ? t("player.reviewLesson")
    : progress > 0
    ? t("common.continue")
    : t("player.startLesson");

  const skillIcon = SKILL_ICON[lesson.skill];
  const blocked = isLocked || !hasAccess;

  const rail = (
    <RightRail>
      <CompactCard>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
          <IconStar width={12} height={12} /> {t("player.tip")}
        </div>
        <p className="mt-1 text-[13px] leading-5 text-ink-soft">{displayInstruction(SKILL_TIP[lesson.skill], locale)}</p>
      </CompactCard>
      {!isPremium && <HubProStrip isPremium={isPremium} />}
    </RightRail>
  );

  return (
    <PageShell width="wide" rail={rail}>
      <PageHeader
        back={{ to: "/jornada", label: t("journey.title") }}
        eyebrow={`${t("journey.phaseN", { n: lesson.phaseOrder })} · ${displayInstruction(lesson.unitTitle, locale)}`}
        title={displayLessonTitle(lesson.title, locale)}
        subtitle={`${displayInstruction(lesson.phaseTitle, locale)} · ${displayInstruction(mainType, locale)} · ${estimate} min`}
        icon={skillIcon}
      />

      {/* Card principal — objetivo, progresso, recompensas e a única ação. */}
      <Card className="min-w-0 p-4 sm:p-5">
        {topicNode ? (
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent" data-testid="topic-pass-label">
              {pathComplete ? t("journey.ctaMastered") : t("journey.ctaLessonOf", { n: topicPass }) + ` · ${passName}`}
            </p>
            <p className="mt-2 break-words text-sm leading-6 text-ink sm:text-[15px]">
              {passGoal ? (
                <>
                  <span className="font-semibold text-ink-soft">{t("journey.objective")}: </span>
                  {passGoal}
                </>
              ) : (
                spec ? displayInstruction(spec.promise, locale) : displayInstruction(lessonDescription(lesson), locale)
              )}
            </p>
            {pathComplete && (
              <p className="mt-2 text-[13px] font-semibold text-[rgb(var(--good))]">{t("journey.ctaMastered")} ✓</p>
            )}
          </div>
        ) : (
          <p className="break-words text-sm leading-6 text-ink sm:text-[15px]">{displayInstruction(lessonDescription(lesson), locale)}</p>
        )}

        <div className="mt-3.5">
          <div className="mb-1 flex min-w-0 items-center justify-between gap-2 text-[11px] font-semibold text-ink-faint">
            <span className={pathComplete ? "text-[rgb(var(--good))]" : "text-ink-soft"}>{stepLabel}</span>
            <span className="shrink-0 tabular-nums">{progressLabel}</span>
          </div>
          <ProgressBar value={Math.min(progress, activityTotal)} max={activityTotal} className="h-2" />
        </div>

        {topicNode && (
          <div className="mt-3 rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-ink-soft">{t("journey.topicProgress")}</span>
              <span className="text-[11px] font-medium text-ink-faint">{masteryLevel}/4</span>
            </div>
            <div className="mt-1.5 flex items-center gap-1.5" aria-label={t("journey.topicOf", { n: masteryLevel })}>
              {[1, 2, 3, 4].map((level) => (
                <span
                  key={level}
                  className={[
                    "h-1.5 flex-1 rounded-full",
                    level <= masteryLevel ? "bg-accent" : "bg-line",
                  ].join(" ")}
                />
              ))}
            </div>
          </div>
        )}

        <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
          <RewardChip icon={<IconStar width={12} height={12} className="text-accent" />} tone="accent">
            +{maxXp} XP
          </RewardChip>
          <RewardChip icon={<span className="hanzi text-[13px] leading-none">气</span>}>+{totalQi} Qi</RewardChip>
          <span className="inline-flex items-center gap-0.5 rounded-full bg-surface-2 px-2.5 py-1">
            {[0, 1, 2].map((n) => (
              <IconStar key={n} width={13} height={13} className="text-gold" fill="currentColor" />
            ))}
          </span>
        </div>

        {blocked && (
          <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-soft/30 px-3 py-2 text-[13px] font-medium text-ink-soft">
            <IconLock width={15} height={15} className="mt-0.5 shrink-0 text-accent" />
            <span>{blockedCopy}</span>
          </div>
        )}

        <ActionButton
          onClick={startLesson}
          size="lg"
          trailingChevron
          className="mt-4 w-full min-w-0 border-b-[3px] border-b-[rgb(var(--accent-strong))] shadow-none active:translate-y-px active:border-b-[1px] sm:w-auto sm:min-w-[11rem] sm:max-w-full sm:px-6"
        >
          <span className="block min-w-0 break-words text-center leading-snug">
            {topicNode && !blocked ? `${primaryLabel} +${maxXp} XP` : primaryLabel}
            {topicNode && topicCta.secondary ? (
              <span className="mt-0.5 block text-[11px] font-medium opacity-90">{topicCta.secondary}</span>
            ) : null}
          </span>
        </ActionButton>
      </Card>

      {/* Etapas compactas — só ícone, título curto e status. */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">{t("player.stages")}</div>
        <div className="flex items-start justify-between gap-1 rounded-xl border border-line/50 bg-surface px-2 py-3 shadow-card sm:gap-2 sm:px-4">
          {tasks.map((task, index) => (
            <StepNode key={task.id} task={task} status={statusFor(index)} index={index} />
          ))}
        </div>
      </div>

      <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
    </PageShell>
  );
}
