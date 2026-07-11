import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GlossText } from "../../components/hanzi/GlossText";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { Mascot } from "../../components/brand/Mascot";
import { SpeakButton } from "../../components/ui/SpeakButton";
import { Button, Card, HubCard, Pill, ProgressBar } from "../../components/ui/primitives";
import { HubEmptyState, HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconChevron,
  IconHeadphones,
  IconLock,
  IconPath,
  IconPause,
  IconPlay,
  IconRefresh,
  IconSound,
  IconStar,
  IconTarget,
} from "../../components/ui/Icon";
import { storyStepCountsAsPhrasePractice } from "../../lib/missionHelpers";
import { buildMissionViews, isMissionActionable } from "../../data/missions";
import {
  IMMERSION_SESSIONS,
  type ImmersionMode,
  type ImmersionSession,
} from "../../data/immersion";
import {
  INTERACTIVE_STORIES,
  type InteractiveStory,
  type StoryStep,
} from "../../data/interactiveStories";
import { playSoundFx } from "../../lib/soundFx";
import { useStore, STORY_ENERGY_DAILY_CAP, type ActivityErrorRecord, type ActivityErrorSkill, type StoryEnergyResult } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { speak, stopSpeaking } from "../../lib/tts";
import { KeyboardShortcutHint, ShortcutBadge, shortcutKeyForIndex, useExerciseHotkeys } from "../../lib/useExerciseHotkeys";
import { ProPaywall, type ProPaywallKind } from "../../components/pro/ProPaywall";
import { useProOffer } from "../../hooks/useProOffer";
import { useIsPro } from "../../lib/proAccess";

const MODE_META: Record<ImmersionMode, { label: string; instruction: string; icon: typeof IconSound }> = {
  listen_repeat: {
    label: "Ouvir e repetir",
    instruction: "Escute primeiro. Quando a frase aparecer, repita em voz alta.",
    icon: IconHeadphones,
  },
  auditory_review: {
    label: "Revisão auditiva",
    instruction: "Tente reconhecer o tom antes de olhar a resposta.",
    icon: IconSound,
  },
  guided_reading: {
    label: "Leitura guiada",
    instruction: "Acompanhe a frase com os olhos e toque para revelar a tradução.",
    icon: IconBook,
  },
};

type PlaybackPhase = "ready" | "speaking" | "repeat" | "recall" | "answer" | "following" | "paused";

const PHASE_LABEL: Record<PlaybackPhase, string> = {
  ready: "Pronto para começar",
  speaking: "Escute",
  repeat: "Agora repita",
  recall: "O que você ouviu?",
  answer: "Confira a resposta",
  following: "Leia junto",
  paused: "Pausado",
};

type ImmersionCategory = "all" | ImmersionMode | "dialogues" | "stories" | "pro";

interface UpcomingSession {
  id: string;
  title: string;
  description: string;
  category: Exclude<ImmersionCategory, "all">;
  estimatedMinutes: number;
  itemCount: number;
  rewardQi: number;
  pro?: boolean;
}

// Cards do hub Imersão: cada card filtra as sessões pela categoria.
const CATEGORY_CARDS: {
  id: ImmersionCategory;
  title: string;
  desc: string;
  icon: typeof IconSound;
}[] = [
  { id: "stories", title: "Histórias", desc: "Escolhas em contexto.", icon: IconPath },
  { id: "dialogues", title: "Diálogos", desc: "Situações reais.", icon: IconChat },
  { id: "listen_repeat", title: "Escuta guiada", desc: "Ouça e repita.", icon: IconHeadphones },
  { id: "guided_reading", title: "Frases reais", desc: "Leia com áudio.", icon: IconBook },
  { id: "auditory_review", title: "Tons no ouvido", desc: "Reconheça contornos.", icon: IconSound },
  { id: "all", title: "Tudo", desc: "Todas as práticas.", icon: IconPlay },
];

/** Roadmap visível — mantemos poucos cards para não competir com histórias jogáveis. */
const UPCOMING_SESSIONS: UpcomingSession[] = [
  {
    id: "dialogos-viagem",
    title: "Diálogos de viagem",
    description: "Perguntas e respostas para chegada, hotel e deslocamento.",
    category: "dialogues",
    estimatedMinutes: 7,
    itemCount: 9,
    rewardQi: 10,
  },
  {
    id: "shadowing-avancado",
    title: "Shadowing avançado",
    description: "Repita junto com falas mais longas, mantendo ritmo e entonação.",
    category: "pro",
    estimatedMinutes: 8,
    itemCount: 10,
    rewardQi: 12,
    pro: true,
  },
];

const UPCOMING_CATEGORY_LABELS: Record<Exclude<ImmersionCategory, "all">, string> = {
  listen_repeat: "Ouvir e repetir",
  auditory_review: "Revisão auditiva",
  guided_reading: "Leitura guiada",
  dialogues: "Diálogos",
  stories: "Histórias",
  pro: "Pro",
};

const STORY_PROGRESS_KEY = "longyu-interactive-story-progress-v1";

interface StoredStoryProgress {
  completedStepIds: string[];
  completed: boolean;
  bestScore: number;
  attempts: number;
  updatedAt: number;
}

type StoryProgressMap = Record<string, StoredStoryProgress>;
type StoryStatus = "novo" | "em progresso" | "concluido";

function readStoryProgress(): StoryProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORY_PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const progress: StoryProgressMap = {};
    Object.entries(parsed as Record<string, Partial<StoredStoryProgress>>).forEach(([storyId, value]) => {
      if (!value || typeof value !== "object") return;
      progress[storyId] = {
        completedStepIds: Array.isArray(value.completedStepIds)
          ? value.completedStepIds.filter((stepId): stepId is string => typeof stepId === "string")
          : [],
        completed: Boolean(value.completed),
        bestScore: typeof value.bestScore === "number" ? value.bestScore : 0,
        attempts: typeof value.attempts === "number" ? value.attempts : 0,
        updatedAt: typeof value.updatedAt === "number" ? value.updatedAt : 0,
      };
    });
    return progress;
  } catch {
    return {};
  }
}

function writeStoryProgress(progress: StoryProgressMap) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORY_PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    // Local progress is helpful, but the story should remain playable without it.
  }
}

function updateStoredStoryProgress(
  storyId: string,
  update: (previous: StoredStoryProgress | undefined) => StoredStoryProgress
) {
  const progress = readStoryProgress();
  progress[storyId] = update(progress[storyId]);
  writeStoryProgress(progress);
  return progress[storyId];
}

function storyStepIsInteractive(step: StoryStep): boolean {
  return step.type !== "dialogue";
}

function storyAnswerText(step: StoryStep): string {
  if (Array.isArray(step.answer)) return step.answer[0] ?? "";
  return step.answer ?? step.hanzi ?? "";
}

function normalizeStoryAnswer(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s.,!?。！？、，;；:：'"“”‘’()（）-]/g, "");
}

function storyAnswerMatches(step: StoryStep, value: string): boolean {
  const accepted = Array.isArray(step.answer) ? step.answer : [step.answer ?? ""];
  const normalized = normalizeStoryAnswer(value);
  return accepted.some((answer) => normalizeStoryAnswer(answer) === normalized);
}

function storyStatus(progress?: StoredStoryProgress): StoryStatus {
  if (progress?.completed) return "concluido";
  if ((progress?.completedStepIds.length ?? 0) > 0) return "em progresso";
  return "novo";
}

function storyCompletedCount(story: InteractiveStory, progress?: StoredStoryProgress): number {
  if (progress?.completed) return story.steps.length;
  return Math.min(story.steps.length, progress?.completedStepIds.length ?? 0);
}

function initialStoryStepIndex(story: InteractiveStory, progress?: StoredStoryProgress): number {
  if (!progress || progress.completed) return 0;
  const completedIds = new Set(progress.completedStepIds);
  const nextIndex = story.steps.findIndex((step) => !completedIds.has(step.id));
  return nextIndex >= 0 ? nextIndex : 0;
}

function storySkill(step: StoryStep): ActivityErrorSkill {
  const domain = step.reviewTarget?.domain;
  if (domain === "forma") return "hanzi";
  return domain ?? "uso";
}

export function ImmersionPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<ImmersionCategory>("all");
  const [paywallKind, setPaywallKind] = useState<ProPaywallKind | null>(null);
  const contextualOffer = useProOffer();
  const [storyProgress, setStoryProgress] = useState<StoryProgressMap>(() => readStoryProgress());
  const sessionsRef = useRef<HTMLDivElement>(null);
  const immersionDaily = useStore((state) => state.immersionDaily);
  const isPremium = useIsPro();
  const missionAggregates = useStore((state) => state.getMissionAggregates());
  const dailyMissions = useStore((state) => state.dailyMissions);
  const weeklyMissions = useStore((state) => state.weeklyMissions);
  const dailyEnergy = useStore((state) => state.getActiveDailyEnergy());
  const canStartActivity = useStore((state) => state.canStartActivity);
  const consumeCharge = useStore((state) => state.consumeCharge);
  const activeDaily = immersionDaily.date === todayKey()
    ? immersionDaily
    : { date: todayKey(), completedSessionIds: [] };
  const selectedSession = selectedSessionId
    ? IMMERSION_SESSIONS.find((session) => session.id === selectedSessionId)
    : undefined;
  const selectedStory = selectedStoryId
    ? INTERACTIVE_STORIES.find((story) => story.id === selectedStoryId)
    : undefined;
  const outOfCharges = !isPremium && dailyEnergy.charges <= 0;
  const refreshStoryProgress = useCallback(() => setStoryProgress(readStoryProgress()), []);
  const missionFocus = useMemo(() => {
    const dailyViews = buildMissionViews("daily", missionAggregates, dailyMissions.claimed)
      .filter((mission) => isMissionActionable(mission, isPremium));
    const weeklyViews = buildMissionViews("weekly", missionAggregates, weeklyMissions.claimed)
      .filter((mission) => isMissionActionable(mission, isPremium));
    return [...dailyViews, ...weeklyViews].find((mission) => !mission.claimed && mission.progress > 0)
      ?? dailyViews.find((mission) => !mission.claimed)
      ?? null;
  }, [dailyMissions.claimed, isPremium, missionAggregates, weeklyMissions.claimed]);

  // Quantas cargas por histórias ainda cabem hoje (grátis), para o card destaque.
  const storyEnergyRemaining = useMemo(() => {
    const prefix = `story-energy:${todayKey()}:`;
    const grantedToday = Object.keys(dailyEnergy.bonusChargesClaimed).filter((key) => key.startsWith(prefix)).length;
    return Math.max(0, STORY_ENERGY_DAILY_CAP - grantedToday);
  }, [dailyEnergy.bonusChargesClaimed]);

  // História recomendada: prioriza a que ainda paga recompensa hoje, em
  // progresso antes de nova, e cai para qualquer uma como revisão.
  const recommendedStory = useMemo(() => {
    const playable = INTERACTIVE_STORIES.filter((story) => !story.premium || isPremium);
    const notDoneToday = playable.filter((story) => !activeDaily.completedSessionIds.includes(`story:${story.id}`));
    const pool = notDoneToday.length > 0 ? notDoneToday : playable;
    return (
      pool.find((story) => storyStatus(storyProgress[story.id]) === "em progresso") ??
      pool.find((story) => storyStatus(storyProgress[story.id]) === "novo") ??
      pool[0] ??
      INTERACTIVE_STORIES[0]
    );
  }, [activeDaily.completedSessionIds, isPremium, storyProgress]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [selectedSessionId, selectedStoryId]);

  if (selectedSession) {
    return (
      <ImmersionPlayer
        session={selectedSession}
        completedToday={activeDaily.completedSessionIds.includes(selectedSession.id)}
        onClose={() => setSelectedSessionId(null)}
      />
    );
  }

  if (selectedStory) {
    return (
      <InteractiveStoryPlayer
        story={selectedStory}
        progress={storyProgress[selectedStory.id]}
        onClose={() => {
          refreshStoryProgress();
          setSelectedStoryId(null);
        }}
        onProgressChange={refreshStoryProgress}
      />
    );
  }

  const visibleSessions = IMMERSION_SESSIONS.filter((session) =>
    activeCategory === "all" ? true : session.mode === activeCategory
  );
  const visibleStories = INTERACTIVE_STORIES.filter(() =>
    activeCategory === "all" || activeCategory === "stories" || activeCategory === "dialogues"
  );
  const visibleUpcoming = UPCOMING_SESSIONS.filter((session) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "pro") return session.pro;
    return session.category === activeCategory;
  });
  const showAudioSessions =
    activeCategory === "all" ||
    activeCategory === "listen_repeat" ||
    activeCategory === "auditory_review" ||
    activeCategory === "guided_reading";

  function openSession(session: ImmersionSession) {
    const completed = activeDaily.completedSessionIds.includes(session.id);
    if (completed) {
      setSelectedSessionId(session.id);
      return;
    }
    const sessionKey = `longyu-energy:immersion:${session.id}:${todayKey()}`;
    if (window.sessionStorage.getItem(sessionKey) === "1") {
      setSelectedSessionId(session.id);
      return;
    }
    if (!consumeCharge("immersion_session", sessionKey)) {
      setPaywallKind("energy");
      return;
    }
    window.sessionStorage.setItem(sessionKey, "1");
    setSelectedSessionId(session.id);
  }

  // Histórias são o modo especial que DÁ energia: no grátis não consomem Carga
  // para começar (senão um aluno sem Cargas nunca poderia jogar uma história
  // para reganhar energia). Extras continuam sendo Pro.
  function openStory(story: InteractiveStory) {
    if (story.premium && !isPremium) {
      contextualOffer.consider({ storyPremium: true });
      setPaywallKind("story");
      return;
    }
    setSelectedStoryId(story.id);
  }

  return (
    <HubPage>
      <HubHeader
        eyebrow="Hub"
        title="Imersão"
        desc="Histórias, diálogos e escuta curta em contexto."
        aside={
          <div className="flex items-center gap-2 rounded-full border border-line/70 bg-surface px-3 py-1.5 text-xs font-semibold text-ink-soft">
            <IconHeadphones width={14} height={14} className="text-accent" />
            {isPremium ? "Cargas ilimitadas" : `${dailyEnergy.charges}/${dailyEnergy.maxCharges} cargas`}
          </div>
        }
      />

      {recommendedStory && (
        <RecommendedStoryCard
          story={recommendedStory}
          progress={storyProgress[recommendedStory.id]}
          isPremium={isPremium}
          completedToday={activeDaily.completedSessionIds.includes(`story:${recommendedStory.id}`)}
          energyRemaining={storyEnergyRemaining}
          onOpen={() => openStory(recommendedStory)}
        />
      )}

      <Card className="rounded-xl border-line/70 p-3 shadow-none">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
              <IconHeadphones width={16} height={16} />
            </span>
            <div>
              <div className="text-sm font-semibold text-ink">Sessões de hoje</div>
              <div className="text-xs text-ink-faint">Repetir não consome carga.</div>
            </div>
          </div>
          <div className="min-w-36 sm:w-40">
            <ProgressBar value={isPremium ? 1 : dailyEnergy.charges} max={isPremium ? 1 : dailyEnergy.maxCharges} className="h-1" />
          </div>
        </div>
      </Card>

      {missionFocus && (
        <Card className="rounded-xl border-line/70 p-4 shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Missão em andamento</div>
              <div className="mt-1 text-sm font-semibold text-ink">{missionFocus.title}</div>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {missionFocus.desc} Progresso: {missionFocus.progress}/{missionFocus.goal}.
              </p>
            </div>
            <Link to="/missoes" className="shrink-0">
              <Button variant="outline" className="w-full sm:w-auto">
                Ver missões <IconChevron width={18} height={18} />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {outOfCharges && (
        <Card className="rounded-xl border-line/70 p-3.5 shadow-none">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Sem cargas</div>
              <h2 className="mt-1 text-sm font-semibold text-ink">Imersão pausada no plano grátis</h2>
              <p className="mt-0.5 text-xs text-ink-soft">Complete uma missão ou libere com Pro.</p>
            </div>
            <div className="flex gap-2">
              <Link to="/missoes">
                <Button size="sm">Missões</Button>
              </Link>
              <Link to="/pro">
                <Button size="sm" variant="outline">Ver Pro</Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      <HubSection title="Explorar" desc="Filtre por tipo de prática.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {CATEGORY_CARDS.map((category) => (
            <HubCard
              key={category.id}
              title={category.title}
              desc={category.desc}
              icon={category.icon}
              active={activeCategory === category.id}
              onClick={() => {
                setActiveCategory(category.id);
                sessionsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
          ))}
        </div>
      </HubSection>

      <div ref={sessionsRef} className="scroll-mt-4" />

      {visibleStories.length > 0 && (
        <HubSection
          title="Histórias interativas"
          desc="Áudio, diálogo e escolhas curtas."
          count={<Pill tone="accent">{visibleStories.length}</Pill>}
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibleStories.map((story) => (
              <InteractiveStoryCard
                key={story.id}
                story={story}
                progress={storyProgress[story.id]}
                locked={Boolean(story.premium) && !isPremium}
                onOpen={() => openStory(story)}
              />
            ))}
          </div>
        </HubSection>
      )}

      {showAudioSessions && (
        <HubSection
          title="Escuta e frases"
          desc="Ouça, repita e leia junto."
          count={<Pill tone="muted">{visibleSessions.length}</Pill>}
        >
          {visibleSessions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleSessions.map((session) => {
                const completed = activeDaily.completedSessionIds.includes(session.id);
                const startedToday =
                  window.sessionStorage.getItem(`longyu-energy:immersion:${session.id}:${todayKey()}`) === "1";
                const blocked = !completed && !startedToday && !canStartActivity("immersion_session");
                return (
                  <ImmersionSessionCard
                    key={session.id}
                    session={session}
                    completed={completed}
                    startedToday={startedToday}
                    blocked={blocked}
                    isPremium={isPremium}
                    onOpen={() => openSession(session)}
                    onBlocked={() => setPaywallKind("energy")}
                  />
                );
              })}
            </div>
          ) : (
            <HubEmptyState title="Nenhuma sessão aqui" desc="Escolha outro filtro ou volte mais tarde." />
          )}
        </HubSection>
      )}

      {visibleUpcoming.length > 0 && (
        <HubSection title="Em breve" desc="Trilhas maiores no roadmap." count={<Pill tone="muted">{visibleUpcoming.length}</Pill>}>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {visibleUpcoming.map((session) => (
              <ComingSoonCard key={session.id} session={session} onPro={() => setPaywallKind("immersion")} />
            ))}
          </div>
        </HubSection>
      )}

      <ProPaywall open={paywallKind !== null} kind={paywallKind ?? "immersion"} offer={contextualOffer.offer} onClose={() => setPaywallKind(null)} />
    </HubPage>
  );
}

// Card destaque: a história recomendada com progresso, recompensa e CTA.
// Deixa as histórias parecerem importantes (contexto + energia extra).
function RecommendedStoryCard({
  story,
  progress,
  isPremium,
  completedToday,
  energyRemaining,
  onOpen,
}: {
  story: InteractiveStory;
  progress?: StoredStoryProgress;
  isPremium: boolean;
  completedToday: boolean;
  energyRemaining: number;
  onOpen: () => void;
}) {
  const status = storyStatus(progress);
  const completedSteps = storyCompletedCount(story, progress);
  const rewardXp = story.rewards?.xp ?? 0;
  const rewardQi = story.rewards?.qi ?? 0;
  const rewardAvailable = !completedToday;
  const givesEnergy = !isPremium && !completedToday && energyRemaining > 0;
  const actionLabel =
    status === "novo" ? "Começar história" : status === "em progresso" ? "Continuar história" : "Rever história";
  return (
    <Card
      data-testid="recommended-story"
      className="relative overflow-hidden rounded-2xl border-accent/25 bg-gradient-to-br from-accent-soft/60 via-surface to-surface p-4 shadow-card sm:p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <IconPath width={18} height={18} />
            </span>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">História recomendada</div>
          </div>
          <h2 className="mt-2 font-serif text-lg font-semibold leading-tight text-ink sm:text-xl">{story.title}</h2>
          <p className="mt-1 line-clamp-2 max-w-lg text-sm leading-6 text-ink-soft">{story.descriptionPt}</p>
        </div>
        <Pill tone={story.premium ? "gold" : "accent"}>{story.premium ? "Pro" : story.level}</Pill>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-ink-faint">
          <span>{completedSteps}/{story.steps.length} passos</span>
          <span>{story.estimatedMinutes ?? 4} min</span>
        </div>
        <ProgressBar value={completedSteps} max={story.steps.length} className="h-1.5" />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {rewardAvailable ? (
          <>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft">
              <IconStar width={13} height={13} className="text-accent" /> +{rewardXp} XP
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-gold">
              +{rewardQi} Qi
            </span>
            {givesEnergy && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[rgb(var(--good)/0.12)] px-2.5 py-1 text-xs font-semibold text-[rgb(var(--good))]">
                <IconHeadphones width={13} height={13} /> +1 carga extra
              </span>
            )}
          </>
        ) : (
          <span className="text-xs font-medium text-ink-faint">Recompensa recebida hoje — volte amanhã por mais.</span>
        )}
      </div>

      <Button data-testid="recommended-story-start" className="mt-4 w-full sm:w-auto" onClick={onOpen}>
        {status === "concluido" ? <IconRefresh width={16} height={16} /> : <IconPlay width={16} height={16} />}
        {actionLabel}
      </Button>
    </Card>
  );
}

function InteractiveStoryCard({
  story,
  progress,
  locked = false,
  onOpen,
}: {
  story: InteractiveStory;
  progress?: StoredStoryProgress;
  /** História premium vista por quem não é Pro: abre o paywall honesto. */
  locked?: boolean;
  onOpen: () => void;
}) {
  const status = storyStatus(progress);
  const completedSteps = storyCompletedCount(story, progress);
  const interactionCount = story.steps.filter(storyStepIsInteractive).length;
  const statusLabel: Record<StoryStatus, string> = {
    novo: "Novo",
    "em progresso": "Em progresso",
    concluido: "Concluído",
  };
  const actionLabel: Record<StoryStatus, string> = {
    novo: "Começar",
    "em progresso": "Continuar",
    concluido: "Rever",
  };

  return (
    <Card data-testid={`interactive-story-card-${story.id}`} className="rounded-xl border-line/70 p-3.5 shadow-none transition hover:shadow-card">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {locked ? <IconLock width={18} height={18} /> : status === "concluido" ? <IconCheck width={18} height={18} /> : <IconPath width={18} height={18} />}
        </span>
        <Pill tone={locked ? "gold" : status === "concluido" ? "good" : status === "novo" ? "accent" : "gold"}>
          {locked ? "Pro" : statusLabel[status]}
        </Pill>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-tight text-ink">{story.title}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{story.descriptionPt}</p>
      <div className="mt-2.5">
        <div className="mb-1 flex justify-between text-[10px] text-ink-faint">
          <span>{completedSteps}/{story.steps.length} passos</span>
          <span>{story.level} · {story.estimatedMinutes ?? 4} min</span>
        </div>
        <ProgressBar value={completedSteps} max={story.steps.length} className="h-1" />
      </div>
      <div className="mt-2 text-[10px] text-ink-faint">
        {interactionCount} escolhas · {locked ? "história extra do Pro" : "história interativa"}
      </div>
      <Button
        data-testid={`interactive-story-start-${story.id}`}
        size="sm"
        variant={locked ? "outline" : "primary"}
        className="mt-3 w-full"
        onClick={onOpen}
      >
        {locked ? <IconLock width={16} height={16} /> : status === "concluido" ? <IconRefresh width={16} height={16} /> : <IconPlay width={16} height={16} />}
        {locked ? "Ver no Pro" : actionLabel[status]}
      </Button>
    </Card>
  );
}

function ImmersionSessionCard({
  session,
  completed,
  startedToday,
  blocked,
  isPremium,
  onOpen,
  onBlocked,
}: {
  session: ImmersionSession;
  completed: boolean;
  startedToday: boolean;
  blocked: boolean;
  isPremium: boolean;
  onOpen: () => void;
  onBlocked: () => void;
}) {
  const meta = MODE_META[session.mode];
  const SessionIcon = meta.icon;
  const chargeLabel = isPremium
    ? "∞ Cargas"
    : completed
      ? "Repetir grátis"
      : startedToday
        ? "Já iniciada hoje"
        : "Consome 1 carga";
  const actionLabel = blocked ? "Sem cargas hoje" : completed ? "Reouvir grátis" : startedToday ? "Continuar" : "Começar";
  return (
    <Card
      data-testid={`immersion-card-${session.id}`}
      className={["rounded-xl border-line/70 p-3.5 shadow-none transition", blocked ? "opacity-80" : "hover:shadow-card"].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
          {completed ? <IconCheck width={18} height={18} /> : <SessionIcon width={18} height={18} />}
        </span>
        <Pill tone={completed ? "good" : "muted"}>{meta.label}</Pill>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-tight text-ink">{session.title}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{session.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] text-ink-faint">
        <span>{session.estimatedMinutes} min</span>
        <span>·</span>
        <span>{session.items.length} itens</span>
        <span>·</span>
        <span>{chargeLabel}</span>
      </div>
      <Button
        data-testid={`immersion-start-${session.id}`}
        size="sm"
        className="mt-3 w-full"
        variant={completed || blocked ? "outline" : "primary"}
        onClick={() => (blocked ? onBlocked() : onOpen())}
      >
        {completed ? <IconRefresh width={16} height={16} /> : <IconPlay width={16} height={16} />}
        {actionLabel}
      </Button>
    </Card>
  );
}

function ComingSoonCard({ session, onPro }: { session: UpcomingSession; onPro: () => void }) {
  const categoryLabel = UPCOMING_CATEGORY_LABELS[session.category];

  return (
    <Card className="rounded-xl border border-dashed border-line/70 p-3.5 opacity-80 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-faint">
          <IconLock width={18} height={18} />
        </span>
        <Pill tone={session.pro ? "gold" : "muted"}>{session.pro ? "Pro" : "Em breve"}</Pill>
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-tight text-ink">{session.title}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{session.description}</p>
      <div className="mt-2 text-[10px] text-ink-faint">
        {categoryLabel} · {session.estimatedMinutes} min · {session.itemCount} itens
      </div>
      <Button className="mt-3 w-full" size="sm" variant="outline" disabled={!session.pro} onClick={session.pro ? onPro : undefined}>
        {session.pro ? "Conhecer Pro" : "Em breve"}
      </Button>
    </Card>
  );
}

function InteractiveStoryPlayer({
  story,
  progress,
  onClose,
  onProgressChange,
}: {
  story: InteractiveStory;
  progress?: StoredStoryProgress;
  onClose: () => void;
  onProgressChange: () => void;
}) {
  const navigate = useNavigate();
  const soundEffects = useStore((state) => state.soundEffects);
  const gradeSrs = useStore((state) => state.gradeSrs);
  const recordActivityError = useStore((state) => state.recordActivityError);
  const completeImmersionSession = useStore((state) => state.completeImmersionSession);
  const grantStoryEnergy = useStore((state) => state.grantStoryEnergy);
  const recordDailyTask = useStore((state) => state.recordDailyTask);
  const contextualOffer = useProOffer();
  const [currentIndex, setCurrentIndex] = useState(() => initialStoryStepIndex(story, progress));
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [shortAnswer, setShortAnswer] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [answerResults, setAnswerResults] = useState<Record<string, boolean>>({});
  const [victory, setVictory] = useState<{
    score: number;
    total: number;
    awarded: boolean;
    xp: number;
    qi: number;
    energy: StoryEnergyResult | null;
  } | null>(null);

  const step = story.steps[currentIndex];
  const interactiveTotal = story.steps.filter(storyStepIsInteractive).length;

  useEffect(() => () => stopSpeaking(), []);

  if (!step) return null;

  const interactive = storyStepIsInteractive(step);
  const completedValue = victory ? story.steps.length : Math.min(story.steps.length, currentIndex + (revealed || !interactive ? 1 : 0));
  const supportVisible = !step.noHint || revealed || !interactive;
  const showHanzi = Boolean(step.hanzi) && (step.type !== "listen_choice" || revealed) && !(step.type === "fill_hanzi" && step.noHint && !revealed);
  const canSubmitShortAnswer = shortAnswer.trim().length > 0 && !revealed;

  function markStepComplete(stepId: string) {
    updateStoredStoryProgress(story.id, (previous) => {
      const completedStepIds = Array.from(new Set([...(previous?.completedStepIds ?? []), stepId]));
      return {
        completedStepIds,
        completed: previous?.completed ?? false,
        bestScore: previous?.bestScore ?? 0,
        attempts: previous?.attempts ?? 0,
        updatedAt: Date.now(),
      };
    });
    onProgressChange();
  }

  function recordStoryError(currentStep: StoryStep, userAnswer: string) {
    if (!currentStep.reviewTarget) return;
    const correctAnswer = storyAnswerText(currentStep);
    const error: ActivityErrorRecord = {
      id: `story:${story.id}:${currentStep.id}:${Date.now()}`,
      lessonId: `story:${story.id}`,
      moduleId: story.moduleId ?? "immersion-stories",
      phaseId: "interactive-story",
      taskId: currentStep.id,
      questionId: currentStep.id,
      exerciseId: currentStep.id,
      type: currentStep.type,
      prompt: currentStep.promptPt ?? currentStep.hanzi ?? story.title,
      correctAnswer,
      selectedAnswer: userAnswer,
      topic: story.title,
      tokens: [currentStep.hanzi, currentStep.pinyin].filter((token): token is string => Boolean(token)),
      hanzi: currentStep.hanzi,
      pinyin: currentStep.pinyin,
      meaningPt: currentStep.translationPt,
      explanation: currentStep.explanationPt,
      timestamp: Date.now(),
      skill: storySkill(currentStep),
      targets: [currentStep.reviewTarget],
    };
    recordActivityError(error);
  }

  function gradeStoryTarget(currentStep: StoryStep, correct: boolean) {
    const target = currentStep.reviewTarget;
    if (!target) return;
    gradeSrs(target.type, target.itemId, correct ? "good" : "again", target.track, target.domain);
  }

  function submitAnswer(answer: string) {
    if (!interactive || revealed) return;
    const cleanAnswer = answer.trim();
    if (!cleanAnswer) return;
    const correct = storyAnswerMatches(step, cleanAnswer);
    setSelectedAnswer(cleanAnswer);
    setLastCorrect(correct);
    setRevealed(true);
    setAnswerResults((current) => ({ ...current, [step.id]: correct }));
    markStepComplete(step.id);
    gradeStoryTarget(step, correct);
    if (!correct) recordStoryError(step, cleanAnswer);
    if (storyStepCountsAsPhrasePractice(step.type)) recordDailyTask("phrasesSpoken");
    playSoundFx(correct ? "success" : "error", soundEffects);
  }

  function resetStepState(nextIndex: number) {
    setCurrentIndex(nextIndex);
    setSelectedAnswer("");
    setShortAnswer("");
    setRevealed(false);
    setLastCorrect(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function finishStory() {
    const score = Object.values(answerResults).filter(Boolean).length;
    updateStoredStoryProgress(story.id, (previous) => ({
      completedStepIds: story.steps.map((storyStep) => storyStep.id),
      completed: true,
      bestScore: Math.max(previous?.bestScore ?? 0, score),
      attempts: (previous?.attempts ?? 0) + 1,
      updatedAt: Date.now(),
    }));
    const listenSteps = story.steps.filter((storyStep) => storyStep.type === "listen_choice").length;
    const rewardXp = story.rewards?.xp ?? 0;
    const rewardQi = story.rewards?.qi ?? 0;
    // Recompensa uma vez por DIA (completeImmersionSession é idempotente por
    // dia): concluir a mesma história de novo hoje não paga de novo.
    const awarded = completeImmersionSession(`story:${story.id}`, {
      audioHeard: Math.max(1, listenSteps),
      microtextsRead: 1,
      leituraMinutes: story.estimatedMinutes ?? 4,
      rewardXp,
      rewardQi,
      source: `História: ${story.title}`,
      isPremiumStory: Boolean(story.premium),
    });
    // Carga extra só na primeira conclusão do dia (grátis: teto por dia; Pro
    // dispensa, já tem cargas ilimitadas). rewardId idempotente evita farm.
    const energy = awarded ? grantStoryEnergy(story.id) : null;
    playSoundFx(awarded ? "lessonComplete" : "success", soundEffects);
    onProgressChange();
    setVictory({ score, total: interactiveTotal, awarded, xp: rewardXp, qi: rewardQi, energy });
    if (awarded) {
      contextualOffer.consider({ storyCompleted: true, storyPremium: Boolean(story.premium) });
    }
  }

  function continueStory() {
    if (interactive && !revealed) return;
    markStepComplete(step.id);
    if (currentIndex >= story.steps.length - 1) {
      finishStory();
      return;
    }
    resetStepState(currentIndex + 1);
  }

  function repeatStory() {
    setVictory(null);
    setAnswerResults({});
    resetStepState(0);
  }

  function optionClass(option: string): string {
    if (!revealed) {
      return selectedAnswer === option
        ? "border-accent bg-accent-soft text-accent"
        : "border-line bg-surface text-ink hover:border-accent/50 hover:bg-surface-2";
    }
    if (storyAnswerMatches(step, option)) return "border-[rgb(var(--good)/0.45)] bg-[rgb(var(--good)/0.10)] text-[rgb(var(--good))]";
    if (selectedAnswer === option && !lastCorrect) return "border-[#B42318]/45 bg-[#B42318]/10 text-[#B42318]";
    return "border-line bg-surface-2 text-ink-soft";
  }

  const storyOptions = step.options ?? [];

  useExerciseHotkeys({
    enabled: Boolean(victory) || (interactive && step.type !== "short_answer" && storyOptions.length > 0),
    mode: "story",
    optionCount: storyOptions.length,
    isAnswered: Boolean(victory) || revealed,
    hasSelection: Boolean(victory) || Boolean(selectedAnswer),
    allowNumberKeys: !victory,
    onSelectOption: (index) => {
      const option = storyOptions[index];
      if (option) submitAnswer(option);
    },
    onContinue: victory ? onClose : continueStory,
  });

  if (victory) {
    const energyGranted = Boolean(victory.energy?.granted);
    return (
      <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
        <Mascot size={126} variant="celebrate" className="mx-auto" />
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-accent">História concluída</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">{story.title}</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Você praticou em contexto e mandou os pontos fracos para revisão.
        </p>

        <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-2">
          <StoryStat label="Acertos" value={`${victory.score}/${victory.total}`} />
          <StoryStat label="XP" value={victory.awarded ? `+${victory.xp}` : "—"} tone="accent" />
          <StoryStat label="Qi" value={victory.awarded ? `+${victory.qi}` : "—"} tone="gold" />
        </div>

        {energyGranted ? (
          <div className="mx-auto mt-4 flex max-w-sm items-center justify-center gap-2 rounded-2xl border border-[rgb(var(--good)/0.3)] bg-[rgb(var(--good)/0.08)] px-4 py-3 text-sm font-semibold text-[rgb(var(--good))]">
            <IconHeadphones width={16} height={16} /> +1 carga extra hoje
          </div>
        ) : victory.awarded && victory.energy?.reason === "limit" ? (
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-faint">
            Você já ganhou o máximo de {victory.energy.cap} cargas por histórias hoje.
          </p>
        ) : victory.awarded && victory.energy?.reason === "pro" ? (
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-faint">No Pro suas cargas já são ilimitadas.</p>
        ) : !victory.awarded ? (
          <p className="mx-auto mt-4 max-w-sm text-xs text-ink-faint">
            Você já concluiu esta história hoje — a recompensa é uma vez por dia.
          </p>
        ) : null}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={onClose}>
            Continuar Imersão <IconChevron width={18} height={18} />
          </Button>
          <Button variant="outline" onClick={() => navigate("/jornada")}>
            <IconPath width={18} height={18} /> Voltar à Jornada
          </Button>
        </div>
        <button
          type="button"
          onClick={repeatStory}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint transition hover:text-ink-soft"
        >
          <IconRefresh width={14} height={14} /> Repetir história
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={() => {
          stopSpeaking();
          onClose();
        }}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35"
      >
        <IconChevron className="rotate-180" width={18} height={18} /> Histórias de Imersão
      </button>

      <header className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            {story.level} · {story.estimatedMinutes ?? 4} min
          </div>
          <h1 className="mt-1 font-serif text-[1.5rem] font-semibold leading-tight text-ink">{story.title}</h1>
        </div>
        <div className="text-xs font-medium text-ink-faint">{currentIndex + 1}/{story.steps.length}</div>
      </header>

      <div>
        <div className="mb-2 flex justify-between text-xs text-ink-faint">
          <span>{interactive ? "Responda em contexto" : "Leia e ouça"}</span>
          <span>{currentIndex + 1} de {story.steps.length}</span>
        </div>
        <ProgressBar value={completedValue} max={story.steps.length} />
      </div>

      <Card className="overflow-hidden rounded-xl border-line/70 p-0 shadow-none">
        <div className="space-y-3 p-3.5 sm:p-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              {(step.speaker ?? (interactive ? "V" : "N")).slice(0, 1).toUpperCase()}
            </span>
            <div className="text-sm font-semibold text-ink">{step.speaker ?? (interactive ? "Sua vez" : "Narrador")}</div>
          </div>

          {step.promptPt && (
            <div className="ml-6 rounded-[22px] rounded-tl-md bg-surface-2 px-4 py-3 text-sm font-medium leading-6 text-ink sm:ml-12">
              {step.promptPt}
            </div>
          )}

          {step.type === "listen_choice" && (
            <div className="ml-6 flex items-center gap-3 rounded-[22px] rounded-tl-md bg-surface-2 px-4 py-3 sm:ml-12">
              <div>
                <div className="text-sm font-semibold text-ink">Ouça a frase</div>
                <p className="mt-1 text-xs text-ink-soft">Depois escolha o sentido.</p>
              </div>
              {step.hanzi && <SpeakButton text={step.hanzi} label="Ouvir frase" size="lg" />}
            </div>
          )}

          {showHanzi && step.hanzi && (
            <div className="ml-6 rounded-[26px] rounded-tl-md border border-line/70 bg-surface px-4 py-5 text-center sm:ml-12">
              <div className="flex justify-center">
                <GlossText
                  text={step.hanzi}
                  pinyin={supportVisible ? step.pinyin : undefined}
                  meaning={supportVisible ? step.translationPt : undefined}
                  className="hanzi text-4xl leading-tight text-ink sm:text-5xl"
                  speakOnClick={!step.noHint || revealed}
                  examMode={step.noHint && !revealed}
                  disabled={step.noHint && !revealed}
                />
              </div>
              {supportVisible && step.pinyin && (
                <Pinyin text={step.pinyin} className="mt-4 block font-serif text-xl leading-relaxed text-ink-soft" />
              )}
              {supportVisible && step.translationPt && (
                <div className="mt-3 text-sm text-ink-soft">{step.translationPt}</div>
              )}
              {step.hanzi && step.type !== "listen_choice" && (
                <div className="mt-3">
                  <SpeakButton text={step.hanzi} label="Ouvir frase" />
                </div>
              )}
            </div>
          )}

          {interactive && step.type !== "short_answer" && step.options && (
            <div>
              <KeyboardShortcutHint />
            <div className="mt-3 grid gap-2">
              {step.options.map((option, index) => (
                <button
                  key={option}
                  type="button"
                  disabled={revealed}
                  onClick={() => submitAnswer(option)}
                  aria-label={`Opção ${shortcutKeyForIndex(index)}: ${option}`}
                  className={[
                    "relative min-h-11 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/35",
                    optionClass(option),
                  ].join(" ")}
                >
                  <ShortcutBadge className="absolute left-2 top-2">{shortcutKeyForIndex(index)}</ShortcutBadge>
                  <span className="block pl-0 sm:pl-5">
                  {option}
                  </span>
                </button>
              ))}
            </div>
            </div>
          )}

          {interactive && step.type === "short_answer" && (
            <div className="grid gap-3">
              <label className="text-sm font-semibold text-ink" htmlFor={`story-answer-${step.id}`}>
                Sua resposta
              </label>
              <input
                id={`story-answer-${step.id}`}
                value={shortAnswer}
                disabled={revealed}
                onChange={(event) => setShortAnswer(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && canSubmitShortAnswer) submitAnswer(shortAnswer);
                }}
                className="h-12 rounded-xl border border-line bg-surface px-4 text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-surface-2 disabled:text-ink-soft"
                autoComplete="off"
                inputMode="text"
              />
              <Button disabled={!canSubmitShortAnswer} onClick={() => submitAnswer(shortAnswer)}>
                Conferir
              </Button>
            </div>
          )}

          {revealed && (
            <div
              className={[
                "rounded-xl border px-4 py-3 text-sm leading-6",
                lastCorrect
                  ? "border-[rgb(var(--good)/0.35)] bg-[rgb(var(--good)/0.08)] text-ink"
                  : "border-[#B42318]/35 bg-[#B42318]/10 text-ink",
              ].join(" ")}
              role="status"
            >
              <div className="flex items-center gap-2 font-semibold">
                {lastCorrect ? <IconCheck width={18} height={18} /> : <IconTarget width={18} height={18} />}
                {lastCorrect ? "Certo" : "Quase"}
              </div>
              {!lastCorrect && (
                <div className="mt-2">
                  Resposta esperada: <span className="font-semibold">{storyAnswerText(step)}</span>
                </div>
              )}
              {step.explanationPt && <div className="mt-2 text-ink-soft">{step.explanationPt}</div>}
            </div>
          )}
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => resetStepState(Math.max(0, currentIndex - 1))}
        >
          <IconChevron className="rotate-180" width={18} height={18} /> Voltar
        </Button>
        <Button disabled={interactive && !revealed} onClick={continueStory}>
          {currentIndex >= story.steps.length - 1 ? "Concluir" : "Continuar"}
          <IconChevron width={18} height={18} />
        </Button>
      </div>
      <ProPaywall
        open={contextualOffer.open}
        kind={contextualOffer.offer?.paywallKind ?? "story"}
        offer={contextualOffer.offer}
        onClose={contextualOffer.dismiss}
      />
    </div>
  );
}

function ImmersionPlayer({
  session,
  completedToday,
  onClose,
}: {
  session: ImmersionSession;
  completedToday: boolean;
  onClose: () => void;
}) {
  const ttsRate = useStore((state) => state.ttsRate);
  const toneColors = useStore((state) => state.toneColors);
  const completeImmersionSession = useStore((state) => state.completeImmersionSession);
  const soundEffects = useStore((state) => state.soundEffects);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState<PlaybackPhase>("ready");
  const [isPlaying, setIsPlaying] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showTranslation, setShowTranslation] = useState(true);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [answerVisible, setAnswerVisible] = useState(session.mode === "guided_reading");
  const [speed, setSpeed] = useState(() => Math.min(1, Math.max(0.65, ttsRate)));
  const [victory, setVictory] = useState(false);
  const [earnedQi, setEarnedQi] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  const timerRef = useRef<number | null>(null);
  const runRef = useRef(0);

  const item = session.items[currentIndex];
  const progress = victory ? session.items.length : currentIndex + (phase === "ready" ? 0 : 1);

  const stopPlayback = useCallback(() => {
    runRef.current += 1;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    stopSpeaking();
    setIsPlaying(false);
  }, []);

  const finishSession = useCallback(() => {
    stopPlayback();
    const awarded = completeImmersionSession(session.id, {
      ...session.missionProgress,
      somMinutes: session.minutes.som,
      falaMinutes: session.minutes.fala,
      leituraMinutes: session.minutes.leitura,
      rewardXp: session.rewardXp,
      rewardQi: session.rewardQi,
      source: `Imersão: ${session.title}`,
    });
    setEarnedQi(awarded ? session.rewardQi : 0);
    setEarnedXp(awarded ? session.rewardXp : 0);
    setVictory(true);
    if (awarded) playSoundFx("qiGain", soundEffects);
  }, [completeImmersionSession, session, soundEffects, stopPlayback]);

  const startAt = useCallback((startIndex: number) => {
    stopPlayback();
    const runId = runRef.current;

    function runItem(index: number) {
      if (runRef.current !== runId) return;
      const nextItem = session.items[index];
      if (!nextItem) {
        finishSession();
        return;
      }

      setCurrentIndex(index);
      setTranslationOpen(false);
      setAnswerVisible(session.mode === "guided_reading");
      setPhase("speaking");
      setIsPlaying(true);

      let speechFinished = false;
      const afterSpeech = () => {
        if (runRef.current !== runId || speechFinished) return;
        speechFinished = true;
        if (timerRef.current !== null) window.clearTimeout(timerRef.current);

        const moveNext = () => {
          if (runRef.current !== runId) return;
          if (index >= session.items.length - 1) finishSession();
          else runItem(index + 1);
        };

        if (session.mode === "auditory_review") {
          setPhase("recall");
          timerRef.current = window.setTimeout(() => {
            if (runRef.current !== runId) return;
            setAnswerVisible(true);
            setPhase("answer");
            timerRef.current = window.setTimeout(moveNext, 1900);
          }, 1900);
          return;
        }

        setAnswerVisible(true);
        setPhase(session.mode === "guided_reading" ? "following" : "repeat");
        timerRef.current = window.setTimeout(moveNext, session.mode === "guided_reading" ? 2100 : 2900);
      };
      speak(nextItem.audioText ?? nextItem.hanzi, {
        rate: speed,
        onend: afterSpeech,
      });
      const fallbackDuration = Math.max(2800, Math.min(7000, 1200 + nextItem.hanzi.length * 500));
      timerRef.current = window.setTimeout(afterSpeech, fallbackDuration / speed);
    }

    runItem(Math.max(0, Math.min(startIndex, session.items.length - 1)));
  }, [finishSession, session, speed, stopPlayback]);

  useEffect(() => () => stopPlayback(), [stopPlayback]);

  function togglePlayback() {
    if (isPlaying) {
      stopPlayback();
      setPhase("paused");
      return;
    }
    startAt(currentIndex);
  }

  function changeSpeed(nextSpeed: number) {
    if (isPlaying) {
      stopPlayback();
      setPhase("paused");
    }
    setSpeed(nextSpeed);
  }

  if (victory) {
    return (
      <div className="mx-auto max-w-xl py-6 text-center sm:py-12">
        <Mascot size={126} variant="celebrate" className="mx-auto" />
        <div className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-accent">Sessão concluída</div>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-ink">Mandarim no ouvido</h1>
        <p className="mx-auto mt-2 max-w-md text-ink-soft">
          Você concluiu “{session.title}” e avançou nas missões de hoje.
        </p>
        <div className="mx-auto mt-6 flex max-w-xs items-center justify-center gap-3 border-y border-line py-4">
          <IconStar className="text-accent" />
          <span className="font-semibold text-ink">
            {earnedXp > 0 || earnedQi > 0 ? `+${earnedXp} XP · +${earnedQi} Qi` : "Prática reforçada"}
          </span>
        </div>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button variant="outline" onClick={() => {
            setVictory(false);
            setCurrentIndex(0);
            setPhase("ready");
            setAnswerVisible(session.mode === "guided_reading");
          }}>
            <IconRefresh width={18} height={18} /> Repetir sessão
          </Button>
          <Button onClick={onClose}>Voltar às sessões</Button>
        </div>
      </div>
    );
  }

  const contentVisible = session.mode === "guided_reading" || answerVisible;
  const modeMeta = MODE_META[session.mode];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <button type="button" onClick={() => { stopPlayback(); onClose(); }} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-soft hover:text-ink">
        <IconChevron className="rotate-180" width={18} height={18} /> Sessões de Imersão
      </button>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="accent">{modeMeta.label}</Pill>
          <Pill>{session.estimatedMinutes} min</Pill>
          {completedToday && <Pill tone="good"><IconCheck width={13} height={13} /> feita hoje</Pill>}
        </div>
        <h1 className="mt-3 font-serif text-3xl font-semibold text-ink">{session.title}</h1>
        <p className="mt-1 text-sm text-ink-soft">{modeMeta.instruction}</p>
      </header>

      <div>
        <div className="mb-2 flex justify-between text-xs text-ink-faint">
          <span>{PHASE_LABEL[phase]}</span>
          <span>{Math.min(currentIndex + 1, session.items.length)} de {session.items.length}</span>
        </div>
        <ProgressBar value={progress} max={session.items.length} />
      </div>

      <Card className="flex min-h-[300px] flex-col items-center justify-center p-6 text-center sm:min-h-[340px] sm:p-10">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft text-accent">
          {phase === "speaking" ? <ListeningPulse /> : <modeMeta.icon width={25} height={25} />}
        </div>

        {contentVisible ? (
          <div className="animate-pop max-w-full">
            <div className="hanzi break-words text-4xl leading-tight text-ink sm:text-5xl">{item.hanzi}</div>
            {showPinyin && (
              <Pinyin text={item.pinyin} className="mt-4 block break-words font-serif text-xl leading-relaxed text-ink-soft sm:text-2xl" />
            )}
            {showTranslation && (
              session.mode === "guided_reading" ? (
                <button
                  type="button"
                  className="mt-5 min-h-11 text-sm font-medium text-accent hover:underline"
                  onClick={() => setTranslationOpen((open) => !open)}
                >
                  {translationOpen ? item.meaning : "Ver tradução"}
                </button>
              ) : (
                <div className="mt-5 text-sm text-ink-soft">{item.meaning}</div>
              )
            )}
          </div>
        ) : (
          <div className="animate-pop">
            <div className="font-serif text-2xl font-semibold text-ink">
              {phase === "recall" ? "Reconheceu o som?" : "Só escute agora"}
            </div>
            <p className="mt-2 text-sm text-ink-soft">
              {phase === "recall" ? "A resposta aparece em instantes." : "A frase aparece depois do áudio."}
            </p>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-center gap-3">
        <ControlButton label="Voltar item" disabled={currentIndex === 0} onClick={() => startAt(currentIndex - 1)}>
          <IconChevron className="rotate-180" />
        </ControlButton>
        <ControlButton label="Repetir item" onClick={() => startAt(currentIndex)}>
          <IconRefresh />
        </ControlButton>
        <button
          type="button"
          data-testid="immersion-play-pause"
          aria-label={isPlaying ? "Pausar sessão" : "Reproduzir sessão"}
          onClick={togglePlayback}
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-lift transition hover:bg-accent-strong active:scale-[0.98]"
        >
          {isPlaying ? <IconPause width={27} height={27} /> : <IconPlay width={27} height={27} />}
        </button>
        <ControlButton label="Avançar item" onClick={() => currentIndex >= session.items.length - 1 ? finishSession() : startAt(currentIndex + 1)}>
          <IconChevron />
        </ControlButton>
      </div>

      <section className="border-y border-line py-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <div className="mb-2 text-xs font-semibold text-ink-soft">Velocidade</div>
            <div className="flex rounded-xl bg-surface-2 p-1">
              {[0.7, 0.85, 1].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => changeSpeed(value)}
                  className={["h-9 flex-1 rounded-lg text-xs font-semibold transition", Math.abs(speed - value) < 0.02 ? "bg-surface text-accent shadow-sm" : "text-ink-soft"].join(" ")}
                >
                  {value}x
                </button>
              ))}
            </div>
          </div>
          <PreferenceToggle label="Pinyin" enabled={showPinyin} onChange={setShowPinyin} />
          <PreferenceToggle label="Tradução" enabled={showTranslation} onChange={setShowTranslation} />
        </div>
        {!toneColors && session.mode === "auditory_review" && (
          <p className="mt-3 text-xs text-ink-faint">As cores de tom estão desativadas nas configurações.</p>
        )}
      </section>
    </div>
  );
}

function StoryStat({ label, value, tone = "ink" }: { label: string; value: string; tone?: "ink" | "accent" | "gold" }) {
  const valueColor = tone === "accent" ? "text-accent" : tone === "gold" ? "text-gold" : "text-ink";
  return (
    <div className="rounded-2xl border border-line/70 bg-surface px-3 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">{label}</div>
      <div className={["mt-1 text-lg font-bold", valueColor].join(" ")}>{value}</div>
    </div>
  );
}

function ControlButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-ink-soft transition hover:bg-surface-2 hover:text-ink disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function PreferenceToggle({ label, enabled, onChange }: { label: string; enabled: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-stretch">
      <div className="text-xs font-semibold text-ink-soft">{label}</div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={["flex h-11 items-center justify-between rounded-xl px-3 text-sm font-medium transition", enabled ? "bg-accent-soft text-accent" : "bg-surface-2 text-ink-soft"].join(" ")}
      >
        <span>{enabled ? "Mostrar" : "Ocultar"}</span>
        <span className={["relative h-6 w-10 rounded-full transition", enabled ? "bg-accent" : "bg-line"].join(" ")}>
          <span className={["absolute top-1 h-4 w-4 rounded-full bg-white transition", enabled ? "left-5" : "left-1"].join(" ")} />
        </span>
      </button>
    </div>
  );
}

function ListeningPulse() {
  return (
    <span className="flex h-7 items-center gap-1" aria-hidden="true">
      {[12, 22, 16, 25].map((height, index) => (
        <span
          key={index}
          className="longyu-audio-bar w-1 rounded-full bg-accent"
          style={{ height, animationDelay: `${index * 90}ms` }}
        />
      ))}
    </span>
  );
}
