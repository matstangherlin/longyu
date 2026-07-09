import { useState, type ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL_LESSONS, currentLessonId, getLesson, type Skill } from "../../data/journey";
import { canStartLesson, useIsPro } from "../../lib/proAccess";
import { useStore } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { LESSON_BASE_XP, LESSON_THREE_STAR_XP_BONUS } from "../../data/economy";
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
  type LessonMotor,
  type LessonTask,
} from "./lessonTasks";
import { ProPaywall, type ProPaywallKind } from "../../components/pro/ProPaywall";
import { requiredToneTrainerPackForLesson, toneTrainerPackCompleted } from "../../data/toneTrainer";

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

function lockedLessonMessage(lessonId: string, completed: string[], lessonStarsById: Record<string, number>): string {
  const index = ALL_LESSONS.findIndex((lesson) => lesson.id === lessonId);
  const missing = ALL_LESSONS.slice(0, Math.max(0, index)).find((lesson) => {
    if (!completed.includes(lesson.id)) return true;
    const requiredStars = lesson.isReview ? 2 : 3;
    const currentStars = lessonStarsById[lesson.id] ?? requiredStars;
    return currentStars < requiredStars;
  });
  if (missing?.premium) return "Esta lição depende de uma etapa do Longyu Pro.";
  if (missing) {
    const missingStars = lessonStarsById[missing.id] ?? 0;
    const requiredStars = missing.isReview ? 2 : 3;
    if (missingStars > 0 && missingStars < requiredStars) {
      return missing.isReview
        ? `Conclua "${missing.title}" com pelo menos 80% de precisão para liberar esta lição.`
        : `Consiga 3 estrelas em "${missing.title}" para liberar esta lição.`;
    }
  }

  if (missing) return `Complete "${missing.title}" para liberar esta lição.`;
  return "Complete a lição atual para liberar esta etapa.";
}

function taskStatusLabel(status: TaskStatus): string {
  if (status === "concluida") return "Concluída";
  if (status === "disponivel") return "Disponível";
  if (status === "premium") return "Premium";
  return "Bloqueada";
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
  const Icon = MOTOR_ICON[task.motor];
  const chip =
    status === "concluida"
      ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
      : status === "disponivel"
      ? "bg-accent text-white ring-2 ring-accent/20"
      : "bg-surface-2 text-ink-faint";
  return (
    <div
      className="flex min-w-0 flex-1 flex-col items-center gap-1 text-center"
      aria-label={`Etapa ${index + 1}: ${task.name} — ${taskStatusLabel(status)}`}
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
      <span className="w-full truncate text-[10px] font-medium leading-tight text-ink-soft">{task.name}</span>
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
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const foundLesson = lessonId ? getLesson(lessonId) : undefined;

  const completed = useStore((state) => state.completedLessons);
  const lessonStarsById = useStore((state) => state.lessonStarsById);
  const isPremium = useIsPro();
  const lessonTaskProgress = useStore((state) => state.lessonTaskProgress);
  const toneTrainer = useStore((state) => state.toneTrainer);
  const consumeCharge = useStore((state) => state.consumeCharge);
  const [proPaywallKind, setProPaywallKind] = useState<ProPaywallKind | null>(null);

  if (!foundLesson) return <Navigate to="/jornada" replace />;

  const lesson = foundLesson;
  const tasks = lessonTasksFor(lesson);

  const startAccess = canStartLesson(lesson.id, { isPremium, completedLessons: completed, lessonStarsById });
  const hasAccess = startAccess.reasonCode !== "premium_required" && startAccess.reasonCode !== "unknown_lesson";
  const currentId = currentLessonId(completed, isPremium);
  const isCompleted = completed.includes(lesson.id);
  const requiredTonePack = requiredToneTrainerPackForLesson(lesson.id);
  const toneLocked = Boolean(
    !isCompleted &&
    hasAccess &&
    requiredTonePack &&
    !toneTrainerPackCompleted(toneTrainer, requiredTonePack.id)
  );
  const isLocked = !isCompleted && hasAccess && (!startAccess.allowed || lesson.id !== currentId || toneLocked);
  const savedProgress = Math.min(tasks.length, lessonTaskProgress[lesson.id] ?? 0);
  const progress = isCompleted ? tasks.length : savedProgress;
  const progressLabel = `${progress}/${tasks.length}`;
  const estimate = estimateLessonMinutes(lesson);
  const mainType = lessonMotorLabel(lesson.skill, lesson.isReview);
  const maxXp = LESSON_BASE_XP + LESSON_THREE_STAR_XP_BONUS;
  const totalQi = tasks.reduce((sum, task) => sum + (task.rewardQi ?? 0), 0);
  const stepLabel = isCompleted ? "Lição concluída" : `Etapa ${Math.min(progress + 1, tasks.length)} de ${tasks.length}`;
  const blockedCopy = !hasAccess
    ? startAccess.reason
    : toneLocked && requiredTonePack
    ? `Conclua "${requiredTonePack.shortTitle}" no Treino de tons com nota mínima ${requiredTonePack.minimumCorrect}/${requiredTonePack.requiredRounds}.`
    : startAccess.reasonCode === "missing_lesson"
    ? startAccess.reason
    : lockedLessonMessage(lesson.id, completed, lessonStarsById);

  function startLesson() {
    if (!hasAccess) {
      setProPaywallKind("content");
      return;
    }
    if (!startAccess.allowed || isLocked) {
      navigate(toneLocked ? "/som" : "/");
      return;
    }
    if (!isCompleted && savedProgress === 0 && !consumeCharge("lesson")) {
      setProPaywallKind("energy");
      return;
    }
    if (!isCompleted && savedProgress === 0) {
      window.sessionStorage.setItem(`longyu-energy:lesson:${lesson.id}:${todayKey()}`, "1");
    }
    navigate(`/licao/${lesson.id}/player`);
  }

  function statusFor(index: number): TaskStatus {
    if (!hasAccess) return "premium";
    if (isCompleted || index < progress) return "concluida";
    if (!isLocked && index === progress) return "disponivel";
    return "bloqueada";
  }

  const primaryLabel = !hasAccess
    ? "Ver Longyu Pro"
    : toneLocked
    ? "Abrir treino de tons"
    : isLocked
    ? "Voltar à jornada"
    : isCompleted
    ? "Rever lição"
    : progress > 0
    ? "Continuar"
    : "Começar lição";

  const skillIcon = SKILL_ICON[lesson.skill];
  const blocked = isLocked || !hasAccess;

  const rail = (
    <RightRail>
      <CompactCard>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
          <IconStar width={12} height={12} /> Dica
        </div>
        <p className="mt-1 text-[13px] leading-5 text-ink-soft">{SKILL_TIP[lesson.skill]}</p>
      </CompactCard>
      {!isPremium && <HubProStrip isPremium={isPremium} />}
    </RightRail>
  );

  return (
    <PageShell width="wide" rail={rail}>
      <PageHeader
        back={{ to: "/jornada", label: "Jornada" }}
        eyebrow={`Fase ${lesson.phaseOrder} · ${lesson.unitTitle}`}
        title={lesson.title}
        subtitle={`${lesson.phaseTitle} · ${mainType} · ${estimate} min`}
        icon={skillIcon}
      />

      {/* Card principal — objetivo, progresso, recompensas e a única ação. */}
      <Card className="p-4 sm:p-5">
        <p className="text-sm leading-6 text-ink sm:text-[15px]">{lessonDescription(lesson)}</p>

        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-ink-faint">
            <span className={isCompleted ? "text-[rgb(var(--good))]" : "text-ink-soft"}>{stepLabel}</span>
            <span className="tabular-nums">{progressLabel}</span>
          </div>
          <ProgressBar value={progress} max={tasks.length} className="h-2" />
        </div>

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

        <ActionButton onClick={startLesson} size="lg" block trailingChevron className="mt-4">
          {primaryLabel}
        </ActionButton>
      </Card>

      {/* Etapas compactas — só ícone, título curto e status. */}
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-faint">Etapas</div>
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
