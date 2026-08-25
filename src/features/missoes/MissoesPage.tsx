import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { useStore } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import { monthKey } from "../../lib/storage";
import {
  buildMissionViews,
  medalEmoji,
  monthLabel,
  monthlyMedalLabel,
  MONTHLY_GOAL,
  MONTHLY_MEDAL_REWARD,
  type MissionIconKey,
  type MissionScope,
  type MissionView,
} from "../../data/missions";
import { ACHIEVEMENTS } from "../../data/achievements";
import { useIsPro } from "../../lib/proAccess";
import { EconomyExplainer } from "../../components/economy/EconomyExplainer";
import { ProPaywall } from "../../components/pro/ProPaywall";
import { ChestRewardModal } from "../../components/chests/ChestRewardModal";
import { LongyuChest } from "../../components/chests/LongyuChest";
import { Button, ButtonLink, Card, Pill, ProgressBar, cx } from "../../components/ui/primitives";
import { HubEmptyState, HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { zLayerClass } from "../../components/ui/layers";
import {
  IconBook,
  IconCheck,
  IconChevron,
  IconHanzi,
  IconHeadphones,
  IconRefresh,
  IconSound,
  IconStar,
  IconTarget,
} from "../../components/ui/Icon";
import {
  missionCardVariant,
  missionCta,
  missionIconTileClass,
  missionStatusOf,
  missionUi,
  type MissionUiStatus,
} from "./missionUi";

const MISSION_ICONS: Record<MissionIconKey, typeof IconStar> = {
  xp: IconStar,
  minutes: IconTarget,
  reviews: IconRefresh,
  audio: IconSound,
  hanzi: IconHanzi,
  immersion: IconHeadphones,
  lessons: IconCheck,
  microtexts: IconBook,
  star: IconStar,
  fix: IconRefresh,
  medal: IconStar,
};

function rewardLabel(reward: MissionView["reward"]): string {
  const parts: string[] = [];
  if (reward.xp) parts.push(`+${reward.xp} XP`);
  if (reward.qi) parts.push(`+${reward.qi} Qi`);
  if (reward.charges) parts.push(`+${reward.charges} Cargas`);
  return parts.join(" · ");
}

interface MissionCelebration {
  scope: MissionScope;
  title: string;
  desc: string;
  rewardText: string;
  showMonthlyChest?: boolean;
}

function daysLeftInMonth(now = new Date()): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(0, lastDay - now.getDate());
}

function medalStreak(monthKeys: Set<string>, current = monthKey()): number {
  const [cy, cm] = current.split("-").map(Number);
  let year = cy;
  let month = cm;
  if (!monthKeys.has(current)) {
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  let streak = 0;
  while (monthKeys.has(`${year}-${String(month).padStart(2, "0")}`)) {
    streak += 1;
    month -= 1;
    if (month < 1) {
      month = 12;
      year -= 1;
    }
  }
  return streak;
}

export function MissoesPage() {
  const aggregates = useStore((s) => s.getMissionAggregates());
  const dailyMissions = useStore((s) => s.dailyMissions);
  const weeklyMissions = useStore((s) => s.weeklyMissions);
  const monthlyMission = useStore((s) => s.monthlyMission);
  const medals = useStore((s) => s.medals);
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked ?? {});
  const monthlyChests = useStore((s) => s.chests.monthly);
  const claimMission = useStore((s) => s.claimMission);
  const soundEffects = useStore((s) => s.soundEffects);
  const isPro = useIsPro();

  const [burst, setBurst] = useState<string | null>(null);
  const [justClaimed, setJustClaimed] = useState<string | null>(null);
  const [chestOpen, setChestOpen] = useState(false);
  const [proPaywallOpen, setProPaywallOpen] = useState(false);
  const [missionCelebration, setMissionCelebration] = useState<MissionCelebration | null>(null);
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace("#", "");
    if (!id) return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const dailyViews = useMemo(
    () => buildMissionViews("daily", aggregates, dailyMissions.claimed),
    [aggregates, dailyMissions.claimed]
  );
  const weeklyViews = useMemo(
    () => buildMissionViews("weekly", aggregates, weeklyMissions.claimed),
    [aggregates, weeklyMissions.claimed]
  );

  const key = monthKey();
  const monthName = monthLabel(key);
  const daysLeft = daysLeftInMonth();
  const medalKeys = useMemo(() => new Set(medals.map((m) => m.id)), [medals]);
  const generalUnlockedCount = ACHIEVEMENTS.filter((def) => achievementsUnlocked[def.id]).length;
  const generalHighlights = useMemo(
    () =>
      ACHIEVEMENTS.map((def) => ({ def, unlocked: Boolean(achievementsUnlocked[def.id]) }))
        .sort((a, b) => Number(b.unlocked) - Number(a.unlocked))
        .slice(0, 10),
    [achievementsUnlocked]
  );
  const streak = useMemo(() => medalStreak(medalKeys), [medalKeys]);
  const dailyDone = dailyViews.filter((m) => m.claimed).length;
  const weeklyDone = weeklyViews.filter((m) => m.claimed).length;

  function showBurst(text: string, id: string, sound: Parameters<typeof playSoundFx>[0] = "missionComplete") {
    playSoundFx(sound, soundEffects);
    setBurst(text);
    setJustClaimed(id);
    window.setTimeout(() => setBurst(null), 1100);
    window.setTimeout(() => setJustClaimed(null), 900);
  }

  function claim(scope: MissionScope, mission: MissionView) {
    if (mission.pro && !isPro) {
      setProPaywallOpen(true);
      return;
    }
    if (claimMission(scope, mission.id)) {
      const rewards = rewardLabel(mission.reward);
      showBurst(rewards, `${scope}:${mission.id}`);
      setMissionCelebration({
        scope,
        title: mission.title,
        desc: mission.desc,
        rewardText: rewards,
      });
    }
  }

  function claimMedal() {
    if (claimMission("monthly", "medal")) {
      const rewardText = `+${MONTHLY_MEDAL_REWARD.qi} Qi · +${MONTHLY_MEDAL_REWARD.shield} Escudo`;
      showBurst(monthlyMedalLabel(key), "monthly:medal", "medal");
      window.setTimeout(() => playSoundFx("chestReady", soundEffects), 420);
      setMissionCelebration({
        scope: "monthly",
        title: monthlyMedalLabel(key),
        desc: `Medalha de ${monthName} resgatada.`,
        rewardText,
        showMonthlyChest: true,
      });
    }
  }

  return (
    <HubPage className={missionUi.surface} data-mission-surface="">
      {burst && (
        <div
          className={cx(
            "pointer-events-none fixed inset-x-0 top-[calc(var(--app-header-height)+0.5rem)] flex justify-center px-4",
            zLayerClass.toast
          )}
        >
          <div className="longyu-claim-float rounded-full bg-[rgb(var(--good)/0.16)] px-5 py-2.5 text-sm font-semibold text-[rgb(var(--good))] shadow-lift">
            {burst}
          </div>
        </div>
      )}

      <HubHeader
        eyebrow="Missões"
        title="Objetivos e recompensas"
        desc="Metas curtas para manter ritmo e resgatar Qi."
      />

      <EconomyExplainer isPro={isPro} context="missoes" className="shadow-none" />

      <MonthlyHero
        monthName={monthName}
        monthKeyValue={key}
        daysLeft={daysLeft}
        completed={monthlyMission.completed}
        claimed={monthlyMission.claimed}
        monthlyChests={monthlyChests}
        highlighted={justClaimed === "monthly:medal"}
        onClaimMedal={claimMedal}
        onOpenChest={() => setChestOpen(true)}
      />

      <MissionSection
        title="Missões do dia"
        desc="Resetam todo dia. Complete para somar na missão do mês."
        done={dailyDone}
        total={dailyViews.length}
        missions={dailyViews}
        onClaim={(m) => claim("daily", m)}
        justClaimed={justClaimed}
        scope="daily"
        isPro={isPro}
      />

      <MissionSection
        title="Missões da semana"
        desc="Resetam toda semana. Objetivos maiores, recompensas maiores."
        done={weeklyDone}
        total={weeklyViews.length}
        missions={weeklyViews}
        onClaim={(m) => claim("weekly", m)}
        justClaimed={justClaimed}
        scope="weekly"
        isPro={isPro}
      />

      <HubSection
        id="medalhas"
        title="Medalhas mensais"
        desc="Uma medalha por mês concluído."
        count={
          <Pill tone={streak > 0 ? "accent" : "muted"}>
            <IconStar width={13} height={13} /> {streak} {streak === 1 ? "mês" : "meses"}
          </Pill>
        }
      >
        {medals.length === 0 ? (
          <HubEmptyState
            title="Nenhuma medalha ainda"
            desc={`Complete ${MONTHLY_GOAL} missões diárias em um mês para ganhar a primeira.`}
          />
        ) : (
          <div className={missionUi.collectionGrid} data-mission-collection="medals">
            {[...medals]
              .sort((a, b) => b.id.localeCompare(a.id))
              .map((medal) => (
                <Card key={medal.id} className="flex min-w-0 flex-col items-center p-3.5 shadow-none">
                  <div className="grid h-14 w-14 place-items-center rounded-xl border border-gold/40 bg-gold/10 text-2xl">
                    <span aria-hidden>{medal.emoji}</span>
                  </div>
                  <div className="mt-2 w-full break-words text-center text-xs font-semibold text-ink">{medal.label}</div>
                  <div className="text-[10px] text-ink-faint">
                    {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(medal.earnedAt)}
                  </div>
                </Card>
              ))}
          </div>
        )}
      </HubSection>

      <HubSection
        title="Conquistas"
        desc="Jornada, sequência, hànzì, som e fala."
        count={
          <Pill tone={generalUnlockedCount > 0 ? "accent" : "muted"}>
            {generalUnlockedCount}/{ACHIEVEMENTS.length}
          </Pill>
        }
      >
        <Card className="min-w-0 p-3.5 shadow-none">
          <div className="flex flex-wrap items-center gap-2">
            {generalHighlights.map(({ def, unlocked }) => (
              <span
                key={def.id}
                title={`${def.title} — ${def.desc}`}
                className={cx(
                  "hanzi flex h-11 w-11 items-center justify-center rounded-xl text-xl",
                  unlocked ? "bg-accent text-white shadow-card" : "bg-surface-2 text-ink-faint grayscale"
                )}
              >
                {def.glyph}
              </span>
            ))}
          </div>
          <ButtonLink to="/conquistas" variant="soft" size="sm" className="mt-4 w-full">
            Ver todas as conquistas
          </ButtonLink>
        </Card>
      </HubSection>

      {missionCelebration && (
        <MissionCompleteModal
          celebration={missionCelebration}
          monthlyCompleted={monthlyMission.completed}
          monthlyChests={monthlyChests}
          onOpenChest={() => setChestOpen(true)}
          onClose={() => setMissionCelebration(null)}
        />
      )}
      {chestOpen && <ChestRewardModal type="monthly" onClose={() => setChestOpen(false)} />}
      <ProPaywall open={proPaywallOpen} kind="training" onClose={() => setProPaywallOpen(false)} />
    </HubPage>
  );
}

function MonthlyHero({
  monthName,
  monthKeyValue,
  daysLeft,
  completed,
  claimed,
  monthlyChests,
  highlighted,
  onClaimMedal,
  onOpenChest,
}: {
  monthName: string;
  monthKeyValue: string;
  daysLeft: number;
  completed: number;
  claimed: boolean;
  monthlyChests: number;
  highlighted: boolean;
  onClaimMedal: () => void;
  onOpenChest: () => void;
}) {
  const monthlyComplete = completed >= MONTHLY_GOAL;
  const status: MissionUiStatus = claimed ? "claimed" : monthlyComplete ? "complete" : completed > 0 ? "progress" : "incomplete";
  const chestIsPrimary = claimed && monthlyChests > 0;
  const medalLabel = claimed
    ? `Medalha de ${monthName} resgatada`
    : monthlyComplete
      ? "Resgatar medalha do mês"
      : `Faltam ${MONTHLY_GOAL - completed} missões`;

  return (
    <Card
      variant={missionCardVariant(status)}
      data-mission-hero=""
      data-mission-status={status}
      className={cx(missionUi.hero, highlighted && "longyu-reward-rise ring-2 ring-accent/40")}
    >
      <div className="grid min-w-0 gap-4 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
            Missão de {monthName}
          </div>
          <h2 className="mt-1 min-w-0 break-words font-serif text-lg font-semibold text-ink">
            Complete {MONTHLY_GOAL} missões para a medalha do mês.
          </h2>

          <div className="mt-3 min-w-0 rounded-xl bg-surface-2/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-ink">Progresso mensal</span>
              <span className="tabular-nums text-ink-soft">
                {Math.min(completed, MONTHLY_GOAL)}/{MONTHLY_GOAL}
              </span>
            </div>
            <ProgressBar value={completed} max={MONTHLY_GOAL} className="mt-2 h-2" />
            <div className="mt-2 flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
              <Pill tone="muted">{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</Pill>
              <Pill tone="gold">🏅 + 100 Qi</Pill>
            </div>
          </div>

          <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-2">
            <Button
              size="md"
              variant={claimed ? "soft" : "primary"}
              className="w-full min-w-0"
              disabled={!monthlyComplete || claimed}
              data-mission-cta={claimed ? "completed" : monthlyComplete ? "primary" : "disabled"}
              onClick={onClaimMedal}
            >
              {claimed ? <IconCheck width={18} height={18} /> : null}
              <span className="min-w-0 break-words text-center">{medalLabel}</span>
              {!claimed ? <IconChevron width={18} height={18} /> : null}
            </Button>
            {monthlyChests > 0 && (
              <div className={missionUi.chestRow} data-mission-chest="">
                <div className="flex justify-center sm:justify-start">
                  <LongyuChest type="monthly" state="unlocked" size="sm" animated />
                </div>
                <Button
                  size="md"
                  variant={chestIsPrimary ? "primary" : "outline"}
                  className="w-full min-w-0"
                  data-mission-cta={chestIsPrimary ? "primary" : "secondary"}
                  onClick={onOpenChest}
                >
                  <span className="min-w-0 break-words text-center">Abrir Baú Épico ({monthlyChests})</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-center">
          <div
            className={cx(
              "grid h-24 w-24 place-items-center rounded-2xl border-2 text-5xl transition",
              claimed
                ? "border-gold/50 bg-gold/10"
                : monthlyComplete
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface-2 opacity-70 grayscale"
            )}
          >
            <span aria-hidden>{medalEmoji(monthKeyValue)}</span>
          </div>
          <div className="mt-2 text-center">
            <div className="text-sm font-semibold text-ink">Medalha de {monthName}</div>
            <div className="text-[11px] text-ink-faint">
              {claimed ? "Na coleção" : monthlyComplete ? "Pronta" : "Bloqueada"}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function MissionSection({
  title,
  desc,
  done,
  total,
  missions,
  onClaim,
  justClaimed,
  scope,
  isPro,
}: {
  title: string;
  desc: string;
  done: number;
  total: number;
  missions: MissionView[];
  onClaim: (mission: MissionView) => void;
  justClaimed: string | null;
  scope: MissionScope;
  isPro: boolean;
}) {
  return (
    <HubSection title={title} desc={desc} count={<Pill tone={done > 0 ? "accent" : "muted"}>{done}/{total}</Pill>}>
      <div className={missionUi.grid}>
        {missions.map((mission) => (
          <MissionCard
            key={mission.id}
            mission={mission}
            lockedPro={Boolean(mission.pro) && !isPro}
            onClaim={() => onClaim(mission)}
            highlighted={justClaimed === `${scope}:${mission.id}`}
          />
        ))}
      </div>
    </HubSection>
  );
}

function MissionCompleteModal({
  celebration,
  monthlyCompleted,
  monthlyChests,
  onOpenChest,
  onClose,
}: {
  celebration: MissionCelebration;
  monthlyCompleted: number;
  monthlyChests: number;
  onOpenChest: () => void;
  onClose: () => void;
}) {
  const monthlyProgress = Math.min(monthlyCompleted, MONTHLY_GOAL);
  const canOpenMonthlyChest = Boolean(celebration.showMonthlyChest && monthlyChests > 0);

  return (
    <ModalOverlay className="items-stretch p-0 sm:items-center sm:p-4" onBackdropClick={onClose} label="Missão concluída">
      <div
        data-mission-celebration=""
        className="flex min-h-[100dvh] w-full max-w-none flex-col overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_52%,rgb(var(--bg))_100%)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-2xl sm:border sm:border-line sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-accent text-white shadow-lift longyu-success-bloom sm:h-16 sm:w-16">
          <IconCheck width={36} height={36} />
        </div>
        <div className="mx-auto mt-4 inline-flex rounded-full bg-surface/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent shadow-card">
          Missão concluída
        </div>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-ink">1 ponto de missão!</h2>
        <p className="mx-auto mt-2 max-w-sm break-words text-sm leading-6 text-ink-soft">
          {celebration.title}
        </p>

        <div className="mt-5 rounded-2xl border border-line bg-surface/90 p-4 text-left shadow-card">
          <div className="text-sm font-semibold text-ink">{celebration.title}</div>
          <p className="mt-1 text-sm leading-5 text-ink-soft">{celebration.desc}</p>
          <div className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            {celebration.rewardText}
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-line bg-surface/90 p-4 text-left shadow-card">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">Missão mensal</span>
            <span className="tabular-nums text-ink-soft">{monthlyProgress}/{MONTHLY_GOAL}</span>
          </div>
          <ProgressBar value={monthlyProgress} max={MONTHLY_GOAL} className="mt-3 h-2.5" />
        </div>

        {celebration.showMonthlyChest && (
          <div className="mt-4 grid w-full min-w-0 grid-cols-1 gap-3 rounded-2xl border border-accent-soft bg-surface/90 p-3 text-left shadow-card sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
            <div className="flex justify-center sm:justify-start">
              <LongyuChest type="monthly" state={canOpenMonthlyChest ? "unlocked" : "locked"} size="sm" animated={canOpenMonthlyChest} />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">Baú mensal</div>
              <div className="text-xs text-ink-faint">
                {canOpenMonthlyChest
                  ? `${monthlyChests} ${monthlyChests === 1 ? "pronto" : "prontos"} para abrir`
                  : "Resgate registrado"}
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto grid gap-2 pt-5">
          {canOpenMonthlyChest && (
            <Button size="lg" className="w-full shadow-lift" data-mission-cta="primary" onClick={onOpenChest}>
              Abrir baú
            </Button>
          )}
          <Button
            size="lg"
            variant={canOpenMonthlyChest ? "outline" : "primary"}
            className="w-full"
            data-mission-cta={canOpenMonthlyChest ? "secondary" : "primary"}
            onClick={onClose}
          >
            Continuar
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

function MissionCard({
  mission,
  onClaim,
  highlighted,
  lockedPro = false,
}: {
  mission: MissionView;
  onClaim: () => void;
  highlighted: boolean;
  lockedPro?: boolean;
}) {
  const Icon = MISSION_ICONS[mission.iconKey];
  const rewards = rewardLabel(mission.reward);
  const status = missionStatusOf({
    complete: mission.complete,
    claimed: mission.claimed,
    lockedPro,
    progress: mission.progress,
  });
  const cta = missionCta(status);

  return (
    <Card
      variant={missionCardVariant(status)}
      data-mission-card=""
      data-mission-id={mission.id}
      data-mission-status={status}
      className={cx(missionUi.card, "h-full", highlighted && "longyu-reward-rise ring-2 ring-accent/40")}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <span className={missionIconTileClass(status)}>
          {mission.claimed ? <IconCheck width={17} height={17} /> : <Icon width={17} height={17} />}
        </span>
        <div className="flex min-w-0 shrink flex-wrap items-center justify-end gap-1">
          {mission.pro && <Pill tone="gold" className="text-[10px]">Pro</Pill>}
          {status === "progress" && <Pill tone="accent">Em andamento</Pill>}
          {status === "complete" && <Pill tone="accent">Pronta</Pill>}
          {status === "claimed" && <Pill tone="good">Concluída</Pill>}
        </div>
      </div>

      <h3 className={cx("mt-2", missionUi.title)}>{mission.title}</h3>
      <p className={missionUi.desc}>{mission.desc}</p>

      {rewards && (
        <div className="mt-2 min-w-0">
          <span className={missionUi.reward}>{rewards}</span>
        </div>
      )}

      <div className={missionUi.progressWrap}>
        <div className="mb-1 flex items-center justify-between gap-2 text-xs text-ink-faint">
          <span>Progresso</span>
          <span className="tabular-nums">{mission.progress}/{mission.goal}</span>
        </div>
        <ProgressBar value={mission.progress} max={mission.goal} />
      </div>

      <div className={missionUi.actionWrap}>
        {mission.claimed || mission.complete ? (
          <Button
            size="sm"
            variant={cta.variant}
            className="w-full min-w-0"
            disabled={cta.disabled}
            data-mission-cta={status === "premium" ? "premium" : status === "claimed" ? "completed" : "primary"}
            onClick={cta.disabled ? undefined : onClaim}
          >
            {mission.claimed ? <IconCheck width={15} height={15} /> : null}
            <span className="min-w-0 break-words text-center">{cta.label}</span>
          </Button>
        ) : (
          <ButtonLink
            to={mission.to}
            size="sm"
            variant={cta.variant}
            className="w-full min-w-0"
            data-mission-cta="primary"
          >
            <span className="min-w-0 break-words text-center">{cta.label}</span>
            <IconChevron width={15} height={15} />
          </ButtonLink>
        )}
      </div>
    </Card>
  );
}
