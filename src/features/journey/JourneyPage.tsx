import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  JOURNEY, ALL_LESSONS, TIERS, lessonState, currentLessonId, unitProgress,
  type Lesson, type Skill, type LessonState, type Unit,
} from "../../data/journey";
import { buildMissionViews, type MissionView } from "../../data/missions";
import { useStore, type ChestRewardItem, type ChestType } from "../../lib/store";
import { Card, Button, Pill, ProgressBar } from "../../components/ui/primitives";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import {
  IconCheck, IconLock, IconChevron, IconSound, IconChat, IconHanzi, IconBook, IconStar, IconRefresh, IconShield, IconX, IconTarget, IconFlame,
} from "../../components/ui/Icon";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { CHEST_VISUALS } from "../../components/chests/chestMeta";
import { LongyuChest } from "../../components/chests/LongyuChest";
import { RewardReveal } from "../../components/chests/RewardReveal";
import { chestOpenSound, playSoundFx } from "../../lib/soundFx";
import { auditJourneyModuleCoverageInDev, lessonStageProgressCopy, lessonTasksFor } from "../lesson/lessonTasks";
import {
  requiredToneTrainerPackForLesson,
  toneTrainerPackCompleted,
  type ToneTrainerProgress,
} from "../../data/toneTrainer";
import { buildModuleSkipTest } from "../challenge/examBuilder";

const SKILL_ICON: Record<Skill, typeof IconSound> = {
  som: IconSound,
  fala: IconChat,
  hanzi: IconHanzi,
  leitura: IconBook,
  sistema: IconStar,
};

const REVIEW_COLOR = "#B7791F";

const SKILL_TAGLINE: Record<Skill, string> = {
  som: "Ouvir, imitar e falar",
  fala: "Falar com confiança",
  hanzi: "Reconhecer caracteres",
  leitura: "Ler frases curtas",
  sistema: "Entender o sistema",
};

interface ThemeCheckpoint {
  title: string;
  detail: string;
}

interface JourneyChestConfig {
  id: string;
  unitId: string;
  type: ChestType;
  title: string;
  requirement: string;
}

const THEME_CHECKPOINTS: Record<string, ThemeCheckpoint> = {
  "u1-1": { title: "Primeiro contato", detail: "Comece ouvindo, imitando e falando sem pressa." },
  "u1-2": { title: "Saudações", detail: "Cortesia básica para abrir e fechar conversas." },
  "u2-1": { title: "Tons básicos", detail: "Os quatro contornos viram mapa auditivo." },
  "u2-2": { title: "Tons em frases", detail: "Leve a escuta para palavras que você já usa." },
  "u3-1": { title: "Apresentação", detail: "Nome, origem e sobrevivência em frases curtas." },
  "u3-2": { title: "Nacionalidade", detail: "Ler as primeiras linhas com vocabulário conhecido." },
  "u4-1": { title: "Hànzì lógico", detail: "Peças visuais que dão sentido aos caracteres." },
  "u5-1": { title: "Números", detail: "Contar, reconhecer e usar números no caminho." },
  "u6-2": { title: "Compras", detail: "Pedidos, preços e escolhas do dia a dia." },
};

const JOURNEY_CHESTS: Record<string, JourneyChestConfig> = {
  "u1-1": {
    id: "journey:u1-1:first-contact",
    unitId: "u1-1",
    type: "small",
    title: "Baú do primeiro passo",
    requirement: "Complete as primeiras lições.",
  },
  "u2-1": {
    id: "journey:u2-1:tones",
    unitId: "u2-1",
    type: "small",
    title: "Baú dos tons",
    requirement: "Complete o módulo de tons básicos.",
  },
  "u3-1": {
    id: "journey:u3-1:introduction",
    unitId: "u3-1",
    type: "dragon",
    title: "Baú da apresentação",
    requirement: "Complete as frases de apresentação.",
  },
  "u4-1": {
    id: "journey:u4-1:hanzi",
    unitId: "u4-1",
    type: "small",
    title: "Baú dos hànzì",
    requirement: "Complete o reconhecimento do módulo.",
  },
  "u5-1": {
    id: "journey:u5-1:numbers",
    unitId: "u5-1",
    type: "small",
    title: "Baú dos números",
    requirement: "Complete os números de 1 a 10.",
  },
  "u6-2": {
    id: "journey:u6-2:shopping",
    unitId: "u6-2",
    type: "dragon",
    title: "Baú das compras",
    requirement: "Complete o módulo de compras.",
  },
};

function offsetForIndex(i: number): number {
  return Math.round(Math.sin(i * 1.1) * 26);
}

function currentUnitContext(lessonId: string | undefined) {
  if (!lessonId) return null;
  for (const phase of JOURNEY) {
    const unitIndex = phase.units.findIndex((unit) => unit.lessons.some((lesson) => lesson.id === lessonId));
    if (unitIndex >= 0) {
      return {
        phase,
        unit: phase.units[unitIndex],
        unitNumber: unitIndex + 1,
      };
    }
  }
  return null;
}

function lockedLessonMessage(
  lesson: Lesson,
  state: LessonState,
  completed: string[],
  lessonTaskProgress: Record<string, number>,
  lessonStarsById: Record<string, number>,
  toneTrainer: ToneTrainerProgress
): string {
  if (state === "premium" || lesson.premium) {
    return "Esta área é liberada no Longyu Pro.";
  }

  const index = ALL_LESSONS.findIndex((item) => item.id === lesson.id);
  const missing = ALL_LESSONS.slice(0, Math.max(0, index)).find((item) => {
    if (!completed.includes(item.id)) return true;
    const requiredStars = item.isReview ? 2 : 3;
    const currentStars = lessonStarsById[item.id] ?? requiredStars;
    return currentStars < requiredStars;
  });

  if (missing?.premium) {
    return "Esta lição depende de uma etapa do Longyu Pro.";
  }

  if (missing) {
    const missingStars = lessonStarsById[missing.id] ?? 0;
    const requiredStars = missing.isReview ? 2 : 3;
    if (missingStars > 0 && missingStars < requiredStars) {
      return missing.isReview
        ? `Conclua "${missing.title}" com pelo menos 80% de precisão para liberar esta lição.`
        : `Consiga 3 estrelas em "${missing.title}" para liberar esta lição.`;
    }
    const taskCount = lessonTasksFor(missing).length;
    const attempted = taskCount > 0 && Math.min(taskCount, lessonTaskProgress[missing.id] ?? 0) >= taskCount;
    if (attempted) return `Consiga 3 estrelas em "${missing.title}" para liberar esta lição.`;
    return `Complete "${missing.title}" para liberar esta lição.`;
  }

  const requiredTonePack = requiredToneTrainerPackForLesson(lesson.id);
  if (requiredTonePack && !toneTrainerPackCompleted(toneTrainer, requiredTonePack.id)) {
    return `Conclua "${requiredTonePack.shortTitle}" no Treino de tons com nota mínima ${requiredTonePack.minimumCorrect}/${requiredTonePack.requiredRounds}.`;
  }

  return "Complete a lição atual para liberar esta etapa.";
}

export function JourneyPage() {
  const navigate = useNavigate();
  const completed = useStore((s) => s.completedLessons);
  const lessonStarsById = useStore((s) => s.lessonStarsById);
  const lessonTaskProgress = useStore((s) => s.lessonTaskProgress);
  const toneTrainer = useStore((s) => s.toneTrainer);
  const isPremium = useStore((s) => s.isPremium);
  const today = useStore((s) => s.today);
  const journeyChestsOpened = useStore((s) => s.journeyChestsOpened ?? []);
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyMissions = useStore((s) => s.dailyMissions);
  const streak = useStore((s) => s.streak);
  const streakShields = useStore((s) => s.streakShields);

  const currentId = currentLessonId(completed, isPremium);
  const currentLesson = ALL_LESSONS.find((l) => l.id === currentId);
  const doneCount = completed.length;
  const currentContext = currentUnitContext(currentId);
  const currentProgress = currentContext ? unitProgress(currentContext.unit, completed) : null;
  const currentModuleTitle = currentContext
    ? THEME_CHECKPOINTS[currentContext.unit.id]?.title ?? currentContext.unit.title
    : "Jornada concluída";

  const todayMinutes = today.som + today.fala + today.hanzi + today.leitura;
  const primaryMission = useMemo(
    () => {
      const views = buildMissionViews("daily", aggregates, dailyMissions.claimed);
      return views.find((mission) => mission.complete && !mission.claimed)
        ?? views.find((mission) => !mission.claimed)
        ?? views[0];
    },
    [aggregates, dailyMissions.claimed]
  );

  // Aviso ao tocar num nó bloqueado.
  const [lockedHint, setLockedHint] = useState<string | null>(null);
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [activeChest, setActiveChest] = useState<JourneyChestConfig | null>(null);
  const [showFullJourney, setShowFullJourney] = useState(false);
  const lockedTimer = useRef<ReturnType<typeof setTimeout>>();
  function notifyLocked(lesson: Lesson, state: LessonState) {
    if (state === "premium" || lesson.premium) {
      setProPaywallOpen(true);
      return;
    }
    setLockedHint(lockedLessonMessage(lesson, state, completed, lessonTaskProgress, lessonStarsById, toneTrainer));
    clearTimeout(lockedTimer.current);
    lockedTimer.current = setTimeout(() => setLockedHint(null), 3200);
  }

  useEffect(() => () => clearTimeout(lockedTimer.current), []);
  useEffect(() => {
    auditJourneyModuleCoverageInDev();
  }, []);
  // Rola até a lição atual ao abrir (quando já há progresso) — jornada longa.
  const didScroll = useRef(false);
  useEffect(() => {
    if (didScroll.current || doneCount === 0) return;
    didScroll.current = true;
    const el = document.querySelector('[data-current="true"]');
    el?.scrollIntoView({ block: "center" });
  }, [doneCount]);

  // índice global para alternar o offset ao longo de toda a jornada
  let globalIndex = -1;

  return (
    <>
      <div className="mx-auto grid w-full max-w-[1180px] gap-6 xl:grid-cols-[minmax(0,680px)_320px] xl:items-start">
        <div className="min-w-0 space-y-4">
          <JourneyHeroCard
            phaseLabel={
              currentContext
                ? `Fase ${currentContext.phase.order} · Unidade ${currentContext.unitNumber}`
                : "Jornada"
            }
            title={currentModuleTitle}
            done={currentProgress?.done ?? ALL_LESSONS.length}
            total={currentProgress?.total ?? ALL_LESSONS.length}
            currentLessonTitle={currentLesson?.title}
            onContinue={currentId ? () => navigate(`/licao/${currentId}`) : undefined}
          />

          <JourneyMobileChips
            mission={primaryMission}
            streak={streak}
            completedCount={doneCount}
            totalLessons={ALL_LESSONS.length}
          />

          <div className="flex justify-end lg:hidden">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowFullJourney((value) => !value)}
              aria-expanded={showFullJourney}
            >
              {showFullJourney ? "Focar atual" : "Ver tudo"}
            </Button>
          </div>

      {/* Tiers → Fases → Módulos → Lições */}
      {TIERS.map((tier) => {
        const phases = JOURNEY.filter((p) => p.tier === tier.id);
        if (!phases.length) return null;
        return (
          <div key={tier.id} className="space-y-4">
            {/* divisória do nível */}
            <div className="flex items-center gap-3 py-2">
              <div className="h-px flex-1 bg-line" />
              <div className="min-w-0 text-center">
                <div className="font-serif text-sm font-semibold uppercase tracking-[0.18em] text-accent">
                  {tier.label}
                </div>
                <div className="hidden text-[11px] text-ink-faint sm:block">{tier.subtitle}</div>
              </div>
              <div className="h-px flex-1 bg-line" />
            </div>

            {phases.map((phase) => (
              <section key={phase.id} className="space-y-3">
                <div className="lg:sticky lg:top-16 lg:z-10 lg:-mx-2 lg:rounded-2xl lg:bg-bg/85 lg:px-2 lg:py-2 lg:backdrop-blur">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                    Fase {phase.order}
                  </div>
                  <h2 className="font-serif text-lg font-semibold text-ink">{phase.title}</h2>
                  <p className="mt-0.5 hidden text-xs leading-5 text-ink-soft sm:block">{phase.why}</p>
                </div>

                {phase.units.map((unit) => {
                  const checkpoint = THEME_CHECKPOINTS[unit.id];
                  const chest = JOURNEY_CHESTS[unit.id];
                  const progress = unitProgress(unit, completed);
                  const containsCurrent = unit.lessons.some((lesson) => lesson.id === currentId);
                  const showCheckpointOnMobile = showFullJourney || containsCurrent;
                  return (
                    <div key={unit.id}>
                      {checkpoint && (
                        <ThemeCheckpointCard
                          checkpoint={checkpoint}
                          color={unit.color}
                          complete={progress.done >= progress.total}
                          active={containsCurrent}
                          visibleOnMobile={showCheckpointOnMobile}
                        />
                      )}
                      <ModuleBlock
                        unit={unit}
                        completed={completed}
                        lessonStarsById={lessonStarsById}
                        lessonTaskProgress={lessonTaskProgress}
                        toneTrainer={toneTrainer}
                        isPremium={isPremium}
                        currentId={currentId}
                        mobileExpanded={showFullJourney || containsCurrent}
                        nextIndex={() => (globalIndex += 1)}
                        chest={chest}
                        journeyChestsOpened={journeyChestsOpened}
                        onOpen={(id) => navigate(`/licao/${id}`)}
                        onChallenge={(id) => navigate(`/teste/${id}`)}
                        onProChallenge={() => setProPaywallOpen(true)}
                        onLocked={notifyLocked}
                        onChestOpen={setActiveChest}
                        onChestLocked={(message) => {
                          setLockedHint(message);
                          clearTimeout(lockedTimer.current);
                          lockedTimer.current = setTimeout(() => setLockedHint(null), 3200);
                        }}
                      />
                    </div>
                  );
                })}
              </section>
            ))}
          </div>
        );
      })}

        </div>

        <JourneySidePanel
          mission={primaryMission}
          streak={streak}
          streakShields={streakShields}
          todayMinutes={todayMinutes}
          completedCount={doneCount}
          totalLessons={ALL_LESSONS.length}
          onNavigate={navigate}
        />
      </div>

      {lockedHint && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.6rem)] z-40 flex justify-center px-4 lg:bottom-8"
        >
          <div className="animate-pop rounded-full bg-ink px-4 py-2 text-sm font-medium text-bg shadow-lift">
            {lockedHint}
          </div>
        </div>
      )}
      <ProPaywall open={proPaywallOpen} kind="content" onClose={() => setProPaywallOpen(false)} />
      {activeChest && (
        <JourneyChestRewardModal chest={activeChest} onClose={() => setActiveChest(null)} />
      )}
    </>
  );
}

function UnitProgressRing({ done, total }: { done: number; total: number }) {
  const safeTotal = Math.max(1, total);
  const pct = Math.max(0, Math.min(1, done / safeTotal));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative grid h-14 w-14 shrink-0 place-items-center sm:h-[72px] sm:w-[72px]">
      <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r={radius} fill="none" stroke="rgb(var(--line))" strokeWidth="5" strokeOpacity="0.6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="rgb(var(--accent))"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={`${circumference * pct} ${circumference}`}
          className="transition-all duration-700"
        />
      </svg>
      <span className="font-serif text-xs font-semibold tabular-nums text-ink sm:text-sm">
        {done}/{safeTotal}
      </span>
    </div>
  );
}

function JourneyHeroCard({
  phaseLabel,
  title,
  done,
  total,
  currentLessonTitle,
  onContinue,
}: {
  phaseLabel: string;
  title: string;
  done: number;
  total: number;
  currentLessonTitle?: string;
  onContinue?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-surface p-4 shadow-card sm:p-5">
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-40 w-40 rounded-full bg-accent/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            {phaseLabel}
          </div>
          <h1 className="mt-1 truncate font-serif text-[1.6rem] font-semibold leading-tight text-ink">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-ink-soft">
            {done}/{Math.max(1, total)} lições concluídas
          </p>
          {currentLessonTitle && (
            <p className="mt-0.5 truncate text-xs text-ink-faint">
              Agora: <span className="font-medium text-ink-soft">{currentLessonTitle}</span>
            </p>
          )}
        </div>
        <UnitProgressRing done={done} total={total} />
      </div>
      {onContinue && (
        <Button className="relative mt-3.5 w-full sm:w-auto" onClick={onContinue}>
          Continuar <IconChevron width={17} height={17} />
        </Button>
      )}
    </div>
  );
}

function JourneyMobileChips({
  mission,
  streak,
  completedCount,
  totalLessons,
}: {
  mission?: MissionView;
  streak: number;
  completedCount: number;
  totalLessons: number;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto xl:hidden">
      <div className="min-w-[148px] rounded-full border border-line/70 bg-surface px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <IconTarget width={14} height={14} className="text-accent" />
          Missão
        </div>
        <div className="truncate text-sm font-semibold text-ink">{mission?.title ?? "Hoje"}</div>
      </div>
      <div className="min-w-[148px] rounded-full border border-line/70 bg-surface px-3 py-2">
        <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
          <IconFlame width={14} height={14} className="text-accent" />
          Ritmo
        </div>
        <div className="truncate text-sm font-semibold text-ink">
          Seq. {streak} · {completedCount}/{totalLessons}
        </div>
      </div>
    </div>
  );
}

function JourneySidePanel({
  mission,
  streak,
  streakShields,
  todayMinutes,
  completedCount,
  totalLessons,
  onNavigate,
}: {
  mission?: MissionView;
  streak: number;
  streakShields: number;
  todayMinutes: number;
  completedCount: number;
  totalLessons: number;
  onNavigate: (to: string) => void;
}) {
  return (
    <aside className="sticky top-20 hidden space-y-2.5 xl:block">
      <Card className="rounded-xl p-3.5 shadow-none">
        <button
          type="button"
          onClick={() => onNavigate("/missoes")}
          className="group flex w-full items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <IconTarget width={16} height={16} />
          </span>
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Missão do dia
          </span>
          <IconChevron width={14} height={14} className="text-ink-faint transition group-hover:text-ink" />
        </button>
        {mission ? (
          <>
            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="min-w-0 truncate text-sm font-semibold text-ink">{mission.title}</div>
              <Pill tone={mission.complete ? "good" : "muted"}>
                {mission.progress}/{mission.goal}
              </Pill>
            </div>
            <ProgressBar value={mission.progress} max={mission.goal} className="mt-2 h-1" />
          </>
        ) : (
          <p className="mt-2.5 text-sm text-ink-soft">Sem missão ativa agora.</p>
        )}
      </Card>

      <Card className="rounded-xl p-3.5 shadow-none">
        <button
          type="button"
          onClick={() => onNavigate("/perfil")}
          className="group flex w-full items-center gap-2 text-left"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <IconBook width={16} height={16} />
          </span>
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Progresso geral
          </span>
          <IconChevron width={14} height={14} className="text-ink-faint transition group-hover:text-ink" />
        </button>
        <div className="mt-2.5 text-sm font-semibold text-ink">
          {completedCount}/{totalLessons} lições
        </div>
        <ProgressBar value={completedCount} max={totalLessons} className="mt-2 h-1" />
      </Card>

      <Card className="rounded-xl p-3.5 shadow-none">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <IconFlame width={16} height={16} />
          </span>
          <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            Sequência
          </span>
        </div>
        <div className="mt-2.5 flex items-baseline justify-between text-sm">
          <span className="font-serif text-xl font-semibold text-ink">
            {streak} {streak === 1 ? "dia" : "dias"}
          </span>
          <span className="text-xs text-ink-faint">
            {streakShields} esc. · {todayMinutes} min hoje
          </span>
        </div>
      </Card>
    </aside>
  );
}

function ThemeCheckpointCard({
  checkpoint,
  color,
  complete,
  active,
  visibleOnMobile,
}: {
  checkpoint: ThemeCheckpoint;
  color: string;
  complete: boolean;
  active: boolean;
  visibleOnMobile: boolean;
}) {
  return (
    <div className={["mx-auto mb-2 mt-4 max-w-md items-center gap-3 lg:flex lg:max-w-xl", visibleOnMobile ? "flex" : "hidden"].join(" ")}>
      <div className="h-px flex-1 bg-line/60" />
      <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: complete ? color : active ? "rgb(var(--accent))" : "rgb(var(--text-faint))" }}
          aria-hidden
        />
        <span className={["truncate", active ? "text-accent" : complete ? "text-ink-soft" : "text-ink-faint"].join(" ")}>
          {checkpoint.title}
        </span>
        {complete && <IconCheck width={12} height={12} className="shrink-0 text-ink-faint" />}
      </div>
      <div className="h-px flex-1 bg-line/60" />
    </div>
  );
}

function ModuleBlock({
  unit,
  completed,
  lessonStarsById,
  lessonTaskProgress,
  toneTrainer,
  isPremium,
  currentId,
  mobileExpanded,
  nextIndex,
  chest,
  journeyChestsOpened,
  onOpen,
  onChallenge,
  onProChallenge,
  onLocked,
  onChestOpen,
  onChestLocked,
}: {
  unit: Unit;
  completed: string[];
  lessonStarsById: Record<string, number>;
  lessonTaskProgress: Record<string, number>;
  toneTrainer: ToneTrainerProgress;
  isPremium: boolean;
  currentId: string | undefined;
  mobileExpanded: boolean;
  nextIndex: () => number;
  chest?: JourneyChestConfig;
  journeyChestsOpened: string[];
  onOpen: (id: string) => void;
  onChallenge: (id: string) => void;
  onProChallenge: () => void;
  onLocked: (lesson: Lesson, state: LessonState) => void;
  onChestOpen: (chest: JourneyChestConfig) => void;
  onChestLocked: (message: string) => void;
}) {
  const { done, total } = unitProgress(unit, completed);
  const containsCurrent = unit.lessons.some((lesson) => lesson.id === currentId);
  const hasPremium = unit.lessons.some((lesson) => lesson.premium);
  const moduleComplete = done >= total;
  const firstLessonIndex = ALL_LESSONS.findIndex((lesson) => lesson.id === unit.lessons[0]?.id);
  const currentLessonIndex = currentId ? ALL_LESSONS.findIndex((lesson) => lesson.id === currentId) : -1;
  const isFutureModule = currentLessonIndex >= 0 && firstLessonIndex > currentLessonIndex;
  const showSkipTest = !moduleComplete && (isFutureModule || done > 0);
  const proChallenge = showSkipTest && hasPremium && !isPremium;
  const skipExam = useMemo(() => buildModuleSkipTest(unit), [unit]);
  const skipTestReady = skipExam.status === "ok";
  const insufficientSkipTest = showSkipTest && !proChallenge && !skipTestReady;
  const canChallenge = showSkipTest && !proChallenge && skipTestReady;
  const chestOpen = chest ? journeyChestsOpened.includes(chest.id) : false;
  const chestUnlocked = Boolean(chest && moduleComplete && !chestOpen);
  const moduleState = moduleComplete
    ? "concluído"
    : containsCurrent
    ? "agora"
    : isFutureModule
    ? "fechado"
    : "anterior";

  return (
    <div className="mb-2">
      <div
        className={[
          "mx-auto max-w-md rounded-xl border bg-surface px-3 py-2.5 lg:max-w-xl",
          containsCurrent ? "border-accent/50 ring-1 ring-accent/20" : "border-line/70",
          isFutureModule ? "opacity-75" : "",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white"
            style={{ background: isFutureModule ? "rgb(var(--surface-2))" : unit.color }}
          >
            {moduleComplete ? (
              <IconCheck width={17} height={17} />
            ) : isFutureModule ? (
              <IconLock width={16} height={16} className="text-ink-faint" />
            ) : (
              <IconShield width={17} height={17} />
            )}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
                  {moduleState}
                </div>
                <div className="truncate text-base font-semibold leading-tight text-ink">{unit.title}</div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {hasPremium && (
                  <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-gold">
                    Pro
                  </span>
                )}
                <span className="rounded-full bg-surface-2 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-ink-soft">
                  {done}/{total}
                </span>
              </div>
            </div>
            <div className="mt-0.5 line-clamp-1 text-xs text-ink-soft">{unit.subtitle}</div>
            <ProgressBar value={done} max={total} className="mt-2 h-1" />
          </div>
        </div>

        {showSkipTest && (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-lg bg-surface-2 px-3 py-2 text-ink-soft">
            {canChallenge ? (
              <>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Já sabe isso?</div>
                  <div className="truncate text-xs">{containsCurrent ? "Teste o módulo atual." : "Pule com um teste rápido."}</div>
                </div>
                <button
                  onClick={() => onChallenge(unit.id)}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-accent px-3 text-xs font-semibold text-white transition hover:bg-accent-strong"
                >
                  Fazer teste
                </button>
              </>
            ) : insufficientSkipTest ? (
              <>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-faint">Teste indisponível</div>
                  <div className="truncate text-xs">Este módulo ainda não tem perguntas suficientes para teste.</div>
                </div>
                <button
                  disabled
                  title="Este módulo ainda não tem perguntas suficientes para teste."
                  className="inline-flex h-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full bg-surface px-3 text-xs font-semibold text-ink-faint"
                >
                  Fazer teste
                </button>
              </>
            ) : proChallenge ? (
              <>
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  <IconLock width={16} height={16} className="shrink-0" />
                  <span className="truncate">Já sabe isso?</span>
                </div>
                <button
                  onClick={onProChallenge}
                  className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-accent px-3 text-xs font-semibold text-white transition hover:bg-accent-strong"
                >
                  Teste Pro
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 text-xs font-medium">
                <IconLock width={16} height={16} className="shrink-0" />
                Complete o módulo anterior para tentar pular este.
              </div>
            )}
          </div>
        )}
      </div>

      <div className={["relative flex-col items-center gap-3 py-3 lg:flex", mobileExpanded ? "flex" : "hidden"].join(" ")}>
        <div
          className="pointer-events-none absolute inset-y-4 left-1/2 w-px -translate-x-1/2 bg-line/70"
          aria-hidden
        />
        {unit.lessons.map((lesson) => {
          const idx = nextIndex();
          const baseState = lessonState(lesson.id, completed, isPremium);
          const taskCount = lessonTasksFor(lesson).length;
          const savedStageProgress = Math.max(0, Math.min(taskCount, lessonTaskProgress[lesson.id] ?? 0));
          const requiredTonePack = requiredToneTrainerPackForLesson(lesson.id);
          const toneLocked = Boolean(
            baseState === "current" &&
            requiredTonePack &&
            !toneTrainerPackCompleted(toneTrainer, requiredTonePack.id)
          );
          const state: LessonState = toneLocked ? "locked" : baseState;
          const stars = Math.max(0, Math.min(3, lessonStarsById[lesson.id] ?? (state === "done" ? 3 : 0)));
          const stageProgress = state === "done" ? taskCount : savedStageProgress;
          const attempted = state !== "done" && (stars > 0 || (taskCount > 0 && savedStageProgress >= taskCount));
          return (
            <LessonNode
              key={lesson.id}
              title={lesson.isReview ? "Revisão" : lesson.title}
              skill={lesson.skill}
              state={state}
              premium={!!lesson.premium}
              color={unit.color}
              isReview={!!lesson.isReview}
              isCurrent={lesson.id === currentId}
              attempted={attempted}
              stars={stars}
              stageProgress={stageProgress}
              stageTotal={taskCount}
              offset={offsetForIndex(idx)}
              onClick={() => (state === "locked" || state === "premium" ? onLocked(lesson, state) : onOpen(lesson.id))}
            />
          );
        })}
        {chest && (
          <JourneyChestNode
            chest={chest}
            offset={offsetForIndex(nextIndex())}
            state={chestOpen ? "opened" : chestUnlocked ? "unlocked" : "locked"}
            onOpen={() => onChestOpen(chest)}
            onLocked={() => onChestLocked(chest.requirement)}
          />
        )}
      </div>
    </div>
  );
}

function JourneyChestNode({
  chest,
  state,
  offset,
  onOpen,
  onLocked,
}: {
  chest: JourneyChestConfig;
  state: "locked" | "unlocked" | "opened";
  offset: number;
  onOpen: () => void;
  onLocked: () => void;
}) {
  const locked = state === "locked";
  const opened = state === "opened";

  return (
    <div className={["relative z-[1] flex flex-col items-center", opened ? "opacity-75" : ""].join(" ")} style={{ transform: `translateX(${offset}px)` }}>
      {state === "unlocked" && (
        <div className="mb-1 rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lift">
          Baú pronto
        </div>
      )}
      <button
        type="button"
        onClick={() => {
          if (locked) onLocked();
          if (!locked && !opened) onOpen();
        }}
        aria-label={chest.title}
        className={[
          "rounded-[24px] transition active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          locked ? "cursor-help opacity-90" : "hover:brightness-105",
        ].join(" ")}
      >
        <LongyuChest type={chest.type} state={state} size={opened ? "sm" : "md"} animated />
      </button>
      <span className={["mt-1.5 max-w-[128px] text-center text-xs font-medium", locked ? "text-ink-faint" : "text-ink-soft"].join(" ")}>
        {chest.title}
        <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-accent">
          {opened ? "Aberto" : locked ? "Bloqueado" : "Abrir"}
        </span>
      </span>
    </div>
  );
}

type ChestModalPhase = "closed" | "opening" | "revealed";

function JourneyChestRewardModal({
  chest,
  onClose,
}: {
  chest: JourneyChestConfig;
  onClose: () => void;
}) {
  const openJourneyChest = useStore((s) => s.openJourneyChest);
  const soundEffects = useStore((s) => s.soundEffects);
  const [phase, setPhase] = useState<ChestModalPhase>("closed");
  const [rewards, setRewards] = useState<ChestRewardItem[]>([]);
  const visual = CHEST_VISUALS[chest.type];
  const closable = phase !== "opening";

  function handleOpen() {
    if (phase !== "closed") return;
    const result = openJourneyChest(chest.id, chest.type);
    if (!result) {
      onClose();
      return;
    }
    setPhase("opening");
    playSoundFx(chestOpenSound(chest.type), soundEffects);
    window.setTimeout(() => {
      setRewards(result);
      setPhase("revealed");
      playSoundFx("qiGain", soundEffects);
    }, 640);
  }

  return (
    <ModalOverlay className="items-stretch sm:items-center" onBackdropClick={() => closable && onClose()}>
      <div
        className="relative flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden border border-line bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_48%,rgb(var(--bg))_100%)] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-6 text-center shadow-lift sm:min-h-0 sm:rounded-[34px] sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        {closable && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-ink-faint transition hover:bg-surface-2 hover:text-ink"
            aria-label="Fechar"
          >
            <IconX width={18} height={18} />
          </button>
        )}

        <div className="mx-auto mt-6 flex justify-center sm:mt-2">
          <button
            type="button"
            disabled={phase !== "closed"}
            onClick={handleOpen}
            className={[
              "relative rounded-[32px] px-8 py-5 transition active:scale-[0.98] disabled:cursor-default",
              phase === "opening" ? "longyu-chest-shake" : "",
            ].join(" ")}
            aria-label={phase === "closed" ? "Toque para abrir" : chest.title}
          >
            <span className={phase === "opening" || phase === "revealed" ? "longyu-chest-aura" : ""} aria-hidden />
            <LongyuChest
              type={chest.type}
              state={phase === "revealed" || phase === "opening" ? "opened" : "unlocked"}
              size="lg"
              animated
            />
          </button>
        </div>

        {phase !== "revealed" ? (
          <div className="flex flex-1 flex-col">
            <Pill tone="accent" className="mx-auto mt-4">{visual.rarity}</Pill>
            <h2 className="mt-3 font-serif text-3xl font-semibold text-ink">{chest.title}</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-ink-soft">{visual.tagline}</p>
            <p className="mx-auto mt-2 max-w-xs text-xs leading-5 text-ink-faint">
              Pode conter: {visual.contains}
            </p>
            <p className="mt-5 text-sm font-semibold text-accent">
              {phase === "opening" ? "Abrindo..." : "Toque para abrir"}
            </p>
            <Button
              size="lg"
              className="mt-auto w-full shadow-lift sm:mt-6"
              disabled={phase === "opening"}
              onClick={handleOpen}
            >
              {phase === "opening" ? "Abrindo..." : "Toque para abrir"}
            </Button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col">
            <Pill tone="accent" className="mx-auto mt-3">Recompensas</Pill>
            <h2 className="mt-4 font-serif text-3xl font-semibold text-ink">Você recebeu</h2>
            <p className="mx-auto mt-1 max-w-xs text-sm text-ink-soft">
              As recompensas já entraram no seu progresso.
            </p>
            <div className="mt-5">
              <RewardReveal rewards={rewards} large />
            </div>
            <Button size="lg" className="mt-auto w-full shadow-lift sm:mt-6" onClick={onClose}>
              Receber recompensas
            </Button>
          </div>
        )}
      </div>
    </ModalOverlay>
  );
}

function LessonStageRing({
  value,
  total,
  color,
  locked,
}: {
  value: number;
  total: number;
  color: string;
  locked: boolean;
}) {
  const safeTotal = Math.max(1, total);
  const safeValue = Math.max(0, Math.min(safeTotal, value));
  const radius = 35;
  const circumference = 2 * Math.PI * radius;
  const step = circumference / safeTotal;
  const gap = 8;
  const dash = Math.max(1, step - gap);
  const inactive = locked ? "rgb(var(--text-faint))" : "rgb(var(--line))";

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full -rotate-90 overflow-visible" viewBox="0 0 80 80" aria-hidden="true">
      {Array.from({ length: safeTotal }, (_, index) => {
        const active = index < safeValue;
        return (
          <circle
            key={index}
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={active ? color : inactive}
            strokeLinecap="round"
            strokeOpacity={active ? 0.92 : 0.72}
            strokeWidth="4"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-index * step}
          />
        );
      })}
    </svg>
  );
}

function LessonNode({
  title,
  skill,
  state,
  premium,
  color,
  isReview,
  isCurrent,
  attempted,
  stars,
  stageProgress,
  stageTotal,
  offset,
  onClick,
}: {
  title: string;
  skill: Skill;
  state: LessonState;
  premium: boolean;
  color: string;
  isReview: boolean;
  isCurrent: boolean;
  attempted: boolean;
  stars: number;
  stageProgress: number;
  stageTotal: number;
  offset: number;
  onClick: () => void;
}) {
  const Icon = SKILL_ICON[skill];
  const isDone = state === "done";
  const locked = state === "locked" || state === "premium";
  const isPaywall = state === "premium";

  const bg = locked
    ? undefined
    : isDone
    ? color
    : isReview
    ? REVIEW_COLOR
    : "rgb(var(--accent))";
  const nodeSizeClass = isCurrent ? "h-[72px] w-[72px]" : isDone ? "h-[52px] w-[52px]" : "h-[58px] w-[58px]";
  const ringSizeClass = isCurrent ? "h-[84px] w-[84px]" : isDone ? "h-[64px] w-[64px]" : "h-[70px] w-[70px]";
  const iconSize = isCurrent ? 30 : isDone ? 22 : 25;
  const safeStageTotal = Math.max(1, stageTotal);
  const safeStageProgress = Math.max(0, Math.min(safeStageTotal, stageProgress));
  const hasPartialProgress = !isDone && !locked && safeStageProgress > 0 && safeStageProgress < safeStageTotal;
  const stageCopy = lessonStageProgressCopy(safeStageProgress, safeStageTotal);
  const compactStageCopy = stageCopy === "Falta fixar este conteúdo" ? "Falta fixar" : stageCopy.replace(" concluídas", "");

  return (
    <div className="relative z-[1] flex flex-col items-center" style={{ transform: `translateX(${offset}px)` }}>
      {isCurrent && (
        <div className="mb-1 animate-bounce rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lift">
          {isPaywall ? "Pro" : attempted ? "Quase" : hasPartialProgress ? `${safeStageProgress}/${safeStageTotal}` : isReview ? "Revisar" : "Começar"}
        </div>
      )}
      <div className={["relative grid place-items-center", ringSizeClass].join(" ")}>
        <LessonStageRing value={safeStageProgress} total={safeStageTotal} color={bg ?? "rgb(var(--accent))"} locked={locked} />
        <button
          onClick={onClick}
          aria-label={title}
          aria-disabled={locked}
          data-current={isCurrent ? "true" : undefined}
          className={[
            "relative flex items-center justify-center rounded-full transition active:scale-95",
            nodeSizeClass,
            isReview && !locked ? "rounded-2xl" : "",
            isCurrent && "ring-4 ring-accent/30",
            locked ? "cursor-help bg-surface-2 text-ink-faint shadow-inner" : "text-white shadow-card hover:brightness-105",
          ].filter(Boolean).join(" ")}
          style={bg ? { background: bg } : undefined}
        >
          {isDone ? (
            <IconCheck width={iconSize} height={iconSize} />
          ) : attempted && !locked ? (
            <IconRefresh width={iconSize} height={iconSize} />
          ) : locked ? (
            <IconLock width={iconSize} height={iconSize} />
          ) : isReview ? (
            <IconStar width={iconSize} height={iconSize} fill="currentColor" />
          ) : (
            <Icon width={iconSize} height={iconSize} />
          )}
        </button>
      </div>
      {stars > 0 && (
        <div className="mt-1 flex h-3 items-center gap-0.5 text-accent" aria-label={`${stars} estrelas`}>
          {[1, 2, 3].map((star) => (
            <IconStar
              key={star}
              width={10}
              height={10}
              className={star <= stars ? "text-accent" : "text-line"}
              fill={star <= stars ? "currentColor" : "none"}
            />
          ))}
        </div>
      )}
      <span className={["mt-1.5 max-w-[128px] text-center text-xs font-medium leading-tight", locked ? "text-ink-faint" : "text-ink-soft"].join(" ")}>
        {title}
        {isCurrent && !locked && (
          <span className="mt-0.5 block text-[10px] font-normal text-ink-faint">{SKILL_TAGLINE[skill]}</span>
        )}
        {attempted && !isDone && !locked && <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-accent">Quase</span>}
        {hasPartialProgress && <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-accent">{compactStageCopy}</span>}
        {isCurrent && !attempted && !hasPartialProgress && !isDone && !locked && (
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-wide text-accent">Etapa 1/{safeStageTotal}</span>
        )}
        {premium && !isDone && <span className="mt-0.5 block text-[10px] uppercase tracking-wide text-accent">Pro</span>}
      </span>
    </div>
  );
}
