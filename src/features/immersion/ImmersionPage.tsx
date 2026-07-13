import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pinyin } from "../../components/hanzi/Pinyin";
import { Mascot } from "../../components/brand/Mascot";
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
} from "../../components/ui/Icon";
import { buildMissionViews, isMissionActionable } from "../../data/missions";
import {
  IMMERSION_SESSIONS,
  type ImmersionMode,
  type ImmersionSession,
} from "../../data/immersion";
import {
  INTERACTIVE_STORIES,
  type InteractiveStory,
} from "../../data/interactiveStories";
import { InteractiveStoryPlayer } from "./InteractiveStoryPlayer";
import {
  readStoryProgress,
  storyCompletedCount,
  storyStatus,
  storyStepCount,
  storyStepIsInteractive,
  type StoredStoryProgress,
  type StoryProgressMap,
  type StoryStatus,
} from "./interactiveStoryHelpers";
import { playSoundFx } from "../../lib/soundFx";
import { useStore, STORY_ENERGY_DAILY_CAP } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { speak, stopSpeaking } from "../../lib/tts";
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

  const visibleListenSessions = IMMERSION_SESSIONS.filter((session) => session.mode === "listen_repeat");
  const visibleGuidedSessions = IMMERSION_SESSIONS.filter((session) => session.mode === "guided_reading");
  const visibleReviewSessions = IMMERSION_SESSIONS.filter((session) => session.mode === "auditory_review");
  const visibleStories = INTERACTIVE_STORIES.filter(() =>
    activeCategory === "all" || activeCategory === "stories" || activeCategory === "dialogues"
  );
  const visibleUpcoming = UPCOMING_SESSIONS.filter((session) => {
    if (activeCategory === "all") return true;
    if (activeCategory === "pro") return session.pro;
    return session.category === activeCategory;
  });
  const showListenSessions = activeCategory === "all" || activeCategory === "listen_repeat";
  const showGuidedSessions = activeCategory === "all" || activeCategory === "guided_reading";
  const showReviewSessions = activeCategory === "all" || activeCategory === "auditory_review";

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
        desc="Histórias interativas em cena, escuta guiada e revisão auditiva — pratique em contexto real."
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
          desc="Cenas com personagens, escolhas e recompensa de energia ao concluir."
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

      {showListenSessions && (
        <HubSection
          title="Escuta"
          desc="Ouça e repita frases curtas em contexto."
          count={<Pill tone="muted">{visibleListenSessions.length}</Pill>}
        >
          {visibleListenSessions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleListenSessions.map((session) => {
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
            <HubEmptyState title="Nenhuma sessão de escuta" desc="Volte mais tarde." />
          )}
        </HubSection>
      )}

      {showGuidedSessions && (
        <HubSection
          title="Leitura guiada"
          desc="Leia junto com áudio e tradução sob controle."
          count={<Pill tone="muted">{visibleGuidedSessions.length}</Pill>}
        >
          {visibleGuidedSessions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleGuidedSessions.map((session) => {
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
            <HubEmptyState title="Nenhuma leitura guiada" desc="Volte mais tarde." />
          )}
        </HubSection>
      )}

      {showReviewSessions && (
        <HubSection
          title="Revisão auditiva"
          desc="Reconheça tons e contornos antes de ver a resposta."
          count={<Pill tone="muted">{visibleReviewSessions.length}</Pill>}
        >
          {visibleReviewSessions.length > 0 ? (
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {visibleReviewSessions.map((session) => {
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
            <HubEmptyState title="Nenhuma revisão auditiva" desc="Volte mais tarde." />
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
  const totalSteps = storyStepCount(story);
  const rewardXp = story.rewardXp;
  const rewardQi = story.rewardQi;
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
          <p className="mt-1 line-clamp-2 max-w-lg text-sm leading-6 text-ink-soft">{story.description}</p>
        </div>
        <Pill tone={story.premium ? "gold" : "accent"}>{story.premium ? "Pro" : `Nível ${story.level}`}</Pill>
      </div>

      <div className="mt-3">
        <div className="mb-1 flex justify-between text-[10px] text-ink-faint">
          <span>{completedSteps}/{totalSteps} passos</span>
          <span>{story.estimatedMinutes ?? 4} min</span>
        </div>
        <ProgressBar value={completedSteps} max={totalSteps} className="h-1.5" />
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
  const totalSteps = storyStepCount(story);
  const interactionCount = story.scenes
    .flatMap((scene) => scene.steps)
    .filter((step) => storyStepIsInteractive(step)).length;
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
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{story.description}</p>
      <div className="mt-2.5">
        <div className="mb-1 flex justify-between text-[10px] text-ink-faint">
          <span>{completedSteps}/{totalSteps} passos</span>
          <span>Nível {story.level} · {story.estimatedMinutes ?? 4} min</span>
        </div>
        <ProgressBar value={completedSteps} max={totalSteps} className="h-1" />
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
