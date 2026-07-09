import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ALL_LESSONS, currentLessonId, getLesson, type Skill } from "../../data/journey";
import { canStartLesson, useIsPro } from "../../lib/proAccess";
import { useStore } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { Button, Card, Pill, ProgressBar } from "../../components/ui/primitives";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconChevron,
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
    <div className={["rounded-2xl border p-4 transition", taskTone(status)].join(" ")}>
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            status === "concluida"
              ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]"
              : status === "disponivel"
              ? "bg-accent text-white"
              : "bg-surface text-ink-faint",
          ].join(" ")}
        >
          {status === "concluida" ? <IconCheck width={21} height={21} /> : status === "bloqueada" ? <IconLock width={20} height={20} /> : <Icon width={21} height={21} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            Etapa {index + 1} de {total}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold leading-tight text-ink">{task.name}</h2>
            <Pill tone={status === "concluida" ? "good" : status === "disponivel" ? "accent" : "muted"}>
              {taskStatusLabel(status)}
            </Pill>
          </div>
          <p className="mt-1 text-sm leading-5 text-ink-soft">
            {task.actionLabel ? `${task.actionLabel}. ${task.description}` : task.description}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-semibold text-accent">+{task.rewardQi} Qi</div>
            <Button size="sm" variant={enabled ? "primary" : "outline"} disabled={!enabled} onClick={onStart}>
              {enabled && <IconPlay width={14} height={14} />}
              {buttonLabel(status, progress)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface-2 px-3 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 text-sm font-semibold text-ink">{value}</div>
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

  return (
    <div className="mx-auto max-w-2xl pb-[calc(env(safe-area-inset-bottom)+6rem)] sm:pb-6">
      <button
        onClick={() => navigate("/jornada")}
        className="mb-4 inline-flex h-10 items-center gap-2 rounded-xl px-2 text-sm font-medium text-ink-soft transition hover:bg-surface-2 hover:text-ink"
      >
        <IconChevron width={17} height={17} className="rotate-180" />
        Jornada
      </button>

      <Card className="overflow-hidden p-0">
        <div
          className="border-b border-line bg-[radial-gradient(circle_at_top_left,rgb(var(--accent-soft)),transparent_48%)] px-5 py-6 sm:px-6"
          style={{ borderTop: `5px solid ${lesson.unitColor}` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="accent">Fase {lesson.phaseOrder}</Pill>
            <Pill>{lesson.unitTitle}</Pill>
            <Pill>{mainType}</Pill>
          </div>

          <div className="mt-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-serif text-3xl font-semibold leading-tight text-ink sm:text-4xl">{lesson.title}</h1>
              <p className="mt-2 text-sm font-medium text-ink-soft">
                {lesson.phaseTitle} · {SKILL_LABEL[lesson.skill]} · {estimate} min
              </p>
            </div>
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
              {(() => {
                const SkillIcon = SKILL_ICON[lesson.skill];
                return <SkillIcon width={30} height={30} />;
              })()}
            </div>
          </div>

          <p className="mt-4 max-w-xl text-sm leading-6 text-ink-soft">{lessonDescription(lesson)}</p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <DetailStat label="Tipo" value={mainType} />
            <DetailStat label="Dificuldade" value={difficulty} />
            <DetailStat label="Tempo" value={`${estimate} min`} />
            <DetailStat label="Etapas" value={progressLabel} />
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-faint">
              <span>Ciclo de memorização</span>
              <span>{progressLabel}</span>
            </div>
            <ProgressBar value={progress} max={tasks.length} />
            <p className="mt-2 text-xs font-medium text-ink-soft">{progressCopy}</p>
          </div>
        </div>

        {(isLocked || !hasAccess) && (
          <div className="border-b border-line bg-surface-2 px-5 py-4 text-sm font-medium text-ink-soft sm:px-6">
            {blockedCopy}
          </div>
        )}

        <div className="px-5 py-5 sm:px-6">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">5 exposições</div>
              <h2 className="font-serif text-2xl font-semibold text-ink">Ciclo da lição</h2>
              <p className="mt-1 text-sm leading-5 text-ink-soft">Veja, reconheça, monte, use e fixe o mesmo conteúdo.</p>
            </div>
            <div className="hidden text-right text-xs text-ink-faint sm:block">Qi liberado ao avançar</div>
          </div>

          <div className="grid gap-3">
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
        </div>
      </Card>

      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.25rem)] z-30 bg-gradient-to-t from-bg via-bg to-transparent px-4 pb-2 pt-6 sm:sticky sm:bottom-auto sm:-mx-4 sm:mt-3 sm:pb-0">
        <div className="mx-auto max-w-2xl">
          <Button size="lg" className="w-full shadow-lift" onClick={startLesson}>
            {primaryLabel}
            <IconChevron width={18} height={18} />
          </Button>
        </div>
      </div>
      <ProPaywall open={proPaywallKind !== null} kind={proPaywallKind ?? "content"} onClose={() => setProPaywallKind(null)} />
    </div>
  );
}
