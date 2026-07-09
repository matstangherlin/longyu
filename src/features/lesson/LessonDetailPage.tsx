import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL_LESSONS, currentLessonId, getLesson, type Skill } from "../../data/journey";
import { canStartLesson, useIsPro } from "../../lib/proAccess";
import { useStore } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { Button, Pill } from "../../components/ui/primitives";
import { PageShell, PageHeader, CompactCard, StatTile, RightRail, ActionButton } from "../../components/ui/page";
import { HubProStrip } from "../../components/layout/HubLayout";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconHanzi,
  IconLock,
  IconPlay,
  IconSound,
  IconStar,
} from "../../components/ui/Icon";
import {
  estimateLessonMinutes,
  lessonDescription,
  lessonDifficulty,
  lessonMotorLabel,
  lessonStageProgressCopy,
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

const SKILL_LABEL: Record<Skill, string> = {
  som: "Som",
  fala: "Fala",
  hanzi: "Hànzì",
  leitura: "Leitura",
  sistema: "Revisão",
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

function buttonLabel(status: TaskStatus, progress: number): string {
  if (status === "concluida") return "Concluída";
  if (status === "premium") return "Premium";
  if (status === "bloqueada") return "Bloqueada";
  return progress > 0 ? "Continuar" : "Começar";
}

function taskTone(status: TaskStatus): string {
  if (status === "concluida") return "border-[rgb(var(--good)/0.28)] bg-[rgb(var(--good)/0.08)]";
  if (status === "disponivel") return "border-accent-soft bg-surface shadow-lift";
  if (status === "premium") return "border-accent-soft bg-accent-soft/40";
  return "border-line bg-surface-2/70";
}

function TaskCard({
  task,
  status,
  progress,
  index,
  total,
  onStart,
}: {
  task: LessonTask;
  status: TaskStatus;
  progress: number;
  index: number;
  total: number;
  onStart: () => void;
}) {
  const Icon = MOTOR_ICON[task.motor];
  const enabled = status === "disponivel";

  return (
    <div className={["rounded-xl border p-3 transition", taskTone(status)].join(" ")}>
      <div className="flex items-center gap-3">
        <div
          className={[
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
            status === "concluida"
              ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
              : status === "disponivel"
              ? "bg-accent text-white"
              : "bg-surface text-ink-faint",
          ].join(" ")}
        >
          {status === "concluida" ? <IconCheck width={19} height={19} /> : status === "bloqueada" ? <IconLock width={18} height={18} /> : <Icon width={19} height={19} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Etapa {index + 1}/{total}</span>
            <Pill tone={status === "concluida" ? "good" : status === "disponivel" ? "accent" : "muted"}>
              {taskStatusLabel(status)}
            </Pill>
          </div>
          <h3 className="mt-0.5 text-sm font-semibold leading-tight text-ink">{task.name}</h3>
          <p className="mt-0.5 line-clamp-1 text-[12px] leading-4 text-ink-faint">{task.description}</p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="text-[11px] font-semibold text-accent">+{task.rewardQi} Qi</div>
          <Button size="sm" variant={enabled ? "primary" : "outline"} disabled={!enabled} onClick={onStart}>
            {enabled && <IconPlay width={13} height={13} />}
            {buttonLabel(status, progress)}
          </Button>
        </div>
      </div>
    </div>
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
  const progressCopy = lessonStageProgressCopy(progress, tasks.length);
  const estimate = estimateLessonMinutes(lesson);
  const difficulty = lessonDifficulty(lesson);
  const mainType = lessonMotorLabel(lesson.skill, lesson.isReview);
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
  const primaryCta = (
    <ActionButton onClick={startLesson} size="lg" block trailingChevron>
      {primaryLabel}
    </ActionButton>
  );

  const rail = (
    <RightRail>
      <CompactCard>
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Resumo</div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <StatTile icon={skillIcon} value={mainType} label="Tipo" />
          <StatTile icon={IconStar} value={difficulty} label="Nível" />
          <StatTile icon={IconPlay} value={`${estimate} min`} label="Tempo" />
          <StatTile icon={IconCheck} value={progressLabel} label="Etapas" tone={isCompleted ? "good" : "default"} />
        </div>
        <div className="mt-3 hidden lg:block">{primaryCta}</div>
      </CompactCard>
      {!isPremium && <HubProStrip isPremium={isPremium} />}
    </RightRail>
  );

  return (
    <>
      <PageShell width="wide" rail={rail} className="pb-[calc(env(safe-area-inset-bottom)+6rem)] lg:pb-6">
        <PageHeader
          back={{ to: "/jornada", label: "Jornada" }}
          eyebrow={`Fase ${lesson.phaseOrder} · ${lesson.unitTitle}`}
          title={lesson.title}
          subtitle={`${lesson.phaseTitle} · ${SKILL_LABEL[lesson.skill]} · ${estimate} min`}
          icon={skillIcon}
          progress={{ value: progress, max: tasks.length, label: progressCopy }}
        />

        <CompactCard>
          <p className="text-[13px] leading-6 text-ink-soft">{lessonDescription(lesson)}</p>
        </CompactCard>

        {(isLocked || !hasAccess) && (
          <CompactCard className="border-accent-soft bg-accent-soft/30">
            <div className="flex items-start gap-2 text-[13px] font-medium text-ink-soft">
              <IconLock width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
              <span>{blockedCopy}</span>
            </div>
          </CompactCard>
        )}

        <section>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">5 exposições</div>
              <h2 className="font-serif text-lg font-semibold text-ink sm:text-xl">Ciclo da lição</h2>
            </div>
            <span className="hidden text-[11px] text-ink-faint sm:block">Veja · reconheça · monte · use · fixe</span>
          </div>
          <div className="grid gap-2">
            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                status={statusFor(index)}
                progress={progress}
                index={index}
                total={tasks.length}
                onStart={startLesson}
              />
            ))}
          </div>
        </section>
      </PageShell>

      {/* Mobile: CTA fixo no rodapé (no desktop, o CTA vive no rail). */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-2 pt-6 lg:hidden">
        <div className="mx-auto max-w-2xl">{primaryCta}</div>
      </div>
      <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
    </>
  );
}
