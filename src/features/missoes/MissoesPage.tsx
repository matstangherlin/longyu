import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
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
import { Button, Card, Pill, ProgressBar } from "../../components/ui/primitives";
import { HubEmptyState, HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
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

// Sequência de medalhas: meses consecutivos com medalha terminando no mês atual
// ou no anterior (o mês corrente ainda pode estar em andamento).
function medalStreak(monthKeys: Set<string>, current = monthKey()): number {
  const [cy, cm] = current.split("-").map(Number);
  let year = cy;
  let month = cm;
  // Se o mês atual ainda não tem medalha, começa a contar pelo mês anterior.
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

  // Permite chegar direto na galeria via /missoes#medalhas (hub Meu).
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
  const monthlyComplete = monthlyMission.completed >= MONTHLY_GOAL;
  const medalKeys = useMemo(() => new Set(medals.map((m) => m.id)), [medals]);
  // Medalhas gerais: desbloqueadas primeiro, até 10 glifos no resumo.
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
    // Missão premium completa mas sem Pro: mostra o paywall honesto.
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
    <HubPage className="relative space-y-5">
      {burst && (
        <div className="pointer-events-none fixed inset-x-0 top-20 z-50 flex justify-center px-4">
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

      <EconomyExplainer isPro={isPro} context="missoes" />

      {/* 1. Missão do mês */}
      <Card
        className={[
          "overflow-hidden rounded-xl border-line/70 p-3.5 shadow-none sm:p-4",
          monthlyMission.claimed ? "border-gold/30 bg-gold/5" : "",
          justClaimed === "monthly:medal" ? "longyu-reward-rise" : "",
        ].join(" ")}
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr] lg:items-center">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">
              Missão de {monthName}
            </div>
            <h2 className="mt-1 font-serif text-lg font-semibold text-ink">
              Complete {MONTHLY_GOAL} missões para a medalha do mês.
            </h2>

            <div className="mt-3 rounded-lg bg-surface-2/80 px-3 py-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-ink">Progresso mensal</span>
                <span className="tabular-nums text-ink-soft">
                  {Math.min(monthlyMission.completed, MONTHLY_GOAL)}/{MONTHLY_GOAL}
                </span>
              </div>
              <ProgressBar value={monthlyMission.completed} max={MONTHLY_GOAL} className="mt-2 h-2" />
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-ink-faint">
                <Pill tone="muted">{daysLeft} {daysLeft === 1 ? "dia" : "dias"}</Pill>
                <Pill tone="gold">🏅 + 100 Qi</Pill>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {monthlyMission.claimed ? (
                <Button variant="soft" disabled className="w-full sm:w-auto">
                  <IconCheck width={18} height={18} /> Medalha de {monthName} resgatada
                </Button>
              ) : (
                <Button
                  className="w-full sm:w-auto"
                  disabled={!monthlyComplete}
                  onClick={claimMedal}
                >
                  {monthlyComplete ? "Resgatar medalha do mês" : `Faltam ${MONTHLY_GOAL - monthlyMission.completed} missões`}
                  <IconChevron width={18} height={18} />
                </Button>
              )}
              {monthlyChests > 0 && (
                <div className="flex items-center gap-3">
                  <LongyuChest type="monthly" state="unlocked" size="sm" animated />
                  <Button variant="primary" className="w-full sm:w-auto" onClick={() => setChestOpen(true)}>
                    Abrir Baú Épico ({monthlyChests})
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Medalha do mês */}
          <div className="flex flex-col items-center justify-center">
            <div
              className={[
                "grid h-24 w-24 place-items-center rounded-2xl border-2 text-5xl transition",
                monthlyMission.claimed
                  ? "border-gold/50 bg-gold/10"
                  : monthlyComplete
                  ? "border-accent bg-accent-soft"
                  : "border-line bg-surface-2 opacity-70 grayscale",
              ].join(" ")}
            >
              <span aria-hidden>{medalEmoji(key)}</span>
            </div>
            <div className="mt-2 text-center">
              <div className="text-sm font-semibold text-ink">Medalha de {monthName}</div>
              <div className="text-[11px] text-ink-faint">
                {monthlyMission.claimed ? "Na coleção" : monthlyComplete ? "Pronta" : "Bloqueada"}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* 2. Missões do dia */}
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

      {/* 3. Missões semanais */}
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

      {/* 4. Medalhas */}
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
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {[...medals]
              .sort((a, b) => b.id.localeCompare(a.id))
              .map((medal) => (
                <Card key={medal.id} className="flex flex-col items-center rounded-xl border-line/70 p-3 shadow-none">
                  <div className="grid h-14 w-14 place-items-center rounded-2xl border border-gold/40 bg-gold/10 text-2xl">
                    <span aria-hidden>{medal.emoji}</span>
                  </div>
                  <div className="mt-2 text-xs font-semibold text-ink">{medal.label}</div>
                  <div className="text-[10px] text-ink-faint">
                    {new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(medal.earnedAt)}
                  </div>
                </Card>
              ))}
          </div>
        )}
      </HubSection>

      {/* 5. Medalhas gerais (conquistas): resumo + link para a página completa. */}
      <HubSection
        title="Conquistas"
        desc="Jornada, sequência, hànzì, som e fala."
        count={
          <Pill tone={generalUnlockedCount > 0 ? "accent" : "muted"}>
            {generalUnlockedCount}/{ACHIEVEMENTS.length}
          </Pill>
        }
      >
        <Card className="rounded-xl border-line/70 p-3 shadow-none">
          <div className="flex flex-wrap items-center gap-2">
            {generalHighlights.map(({ def, unlocked }) => (
              <span
                key={def.id}
                title={`${def.title} — ${def.desc}`}
                className={[
                  "hanzi flex h-11 w-11 items-center justify-center rounded-xl text-xl",
                  unlocked ? "bg-accent text-white shadow-card" : "bg-surface-2 text-ink-faint grayscale",
                ].join(" ")}
              >
                {def.glyph}
              </span>
            ))}
          </div>
          <Link to="/conquistas" className="mt-4 block">
            <Button variant="soft" className="w-full sm:w-auto">
              Ver todas as conquistas
            </Button>
          </Link>
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
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
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

  // Tela cheia no mobile — concluir missão é um momento de recompensa.
  return (
    <ModalOverlay className="items-stretch p-0 sm:items-center sm:p-4" onBackdropClick={onClose}>
      <div
        className="flex min-h-[100dvh] w-full max-w-none flex-col overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_52%,rgb(var(--bg))_100%)] p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-[32px] sm:border sm:border-line sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[26px] bg-accent text-white shadow-lift longyu-success-bloom sm:h-16 sm:w-16 sm:rounded-[22px]">
          <IconCheck width={36} height={36} />
        </div>
        <div className="mx-auto mt-4 inline-flex rounded-full bg-surface/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-accent shadow-card">
          Missão concluída
        </div>
        <h2 className="mt-3 font-serif text-3xl font-semibold text-ink">
          1 ponto de missão!
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-ink-soft">
          {celebration.title}
        </p>

        <div className="mt-5 rounded-[24px] border border-line bg-surface/90 p-4 text-left shadow-card">
          <div className="text-sm font-semibold text-ink">{celebration.title}</div>
          <p className="mt-1 text-sm leading-5 text-ink-soft">{celebration.desc}</p>
          <div className="mt-3 inline-flex rounded-full bg-accent-soft px-3 py-1 text-xs font-semibold text-accent">
            {celebration.rewardText}
          </div>
        </div>

        <div className="mt-4 rounded-[24px] border border-line bg-surface/90 p-4 text-left shadow-card">
          <div className="flex items-center justify-between gap-3 text-sm">
            <span className="font-semibold text-ink">Missão mensal</span>
            <span className="tabular-nums text-ink-soft">{monthlyProgress}/{MONTHLY_GOAL}</span>
          </div>
          <ProgressBar value={monthlyProgress} max={MONTHLY_GOAL} className="mt-3 h-2.5" />
        </div>

        {celebration.showMonthlyChest && (
          <div className="mt-4 flex items-center gap-3 rounded-[24px] border border-accent-soft bg-surface/90 p-3 text-left shadow-card">
            <LongyuChest type="monthly" state={canOpenMonthlyChest ? "unlocked" : "locked"} size="sm" animated={canOpenMonthlyChest} />
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-ink">Baú mensal</div>
              <div className="text-xs text-ink-faint">
                {canOpenMonthlyChest ? `${monthlyChests} pronto para abrir` : "Resgate registrado"}
              </div>
            </div>
          </div>
        )}

        <div className="mt-auto grid gap-2 pt-5 sm:mt-5 sm:pt-0">
          {canOpenMonthlyChest && (
            <Button size="lg" className="w-full shadow-lift" onClick={onOpenChest}>
              Abrir baú
            </Button>
          )}
          <Button size="lg" variant={canOpenMonthlyChest ? "outline" : "primary"} className="w-full" onClick={onClose}>
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
  /** Missão premium vista por quem não é Pro: progresso visível, resgate no Pro. */
  lockedPro?: boolean;
}) {
  const Icon = MISSION_ICONS[mission.iconKey];
  const state = mission.claimed
    ? "resgatada"
    : mission.complete
    ? "concluída"
    : mission.progress > 0
    ? "em andamento"
    : "disponível";

  return (
    <Card
      className={[
        "flex min-h-[148px] flex-col rounded-xl border-line/70 p-3 shadow-none transition",
        mission.complete && !mission.claimed ? "border-accent/35 bg-accent-soft/20" : "",
        mission.claimed ? "bg-surface-2/80" : "",
        highlighted ? "longyu-reward-rise ring-2 ring-accent/40" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={[
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            mission.claimed
              ? "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
              : mission.complete
              ? "bg-accent text-white"
              : "bg-accent-soft text-accent",
          ].join(" ")}
        >
          {mission.claimed ? <IconCheck width={17} height={17} /> : <Icon width={17} height={17} />}
        </span>
        <div className="flex flex-col items-end gap-1">
          {mission.pro && <Pill tone="gold" className="text-[10px]">Pro</Pill>}
          <Pill tone="muted" className="text-[10px]">{state}</Pill>
        </div>
      </div>

      <h3 className="mt-2 text-sm font-semibold text-ink">{mission.title}</h3>
      <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">{mission.desc}</p>

      <div className="mt-2 flex flex-wrap gap-1">
        {mission.reward.xp ? <Pill tone="accent">+{mission.reward.xp} XP</Pill> : null}
        {mission.reward.qi ? <Pill tone="muted">+{mission.reward.qi} Qi</Pill> : null}
        {mission.reward.charges ? <Pill tone="good">+{mission.reward.charges} Cargas</Pill> : null}
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-ink-faint">
          <span>Progresso</span>
          <span className="tabular-nums">{mission.progress}/{mission.goal}</span>
        </div>
        <ProgressBar value={mission.progress} max={mission.goal} />
      </div>

      <div className="mt-auto pt-4">
        {mission.claimed ? (
          <Button size="sm" variant="outline" className="w-full" disabled>
            <IconCheck width={15} height={15} /> Resgatada
          </Button>
        ) : mission.complete ? (
          <Button size="sm" variant={lockedPro ? "outline" : "primary"} className="w-full" onClick={onClaim}>
            {lockedPro ? "Resgatar com Pro" : "Resgatar"}
          </Button>
        ) : (
          <Link to={mission.to}>
            <Button size="sm" variant={mission.progress > 0 ? "soft" : "primary"} className="w-full">
              Praticar <IconChevron width={15} height={15} />
            </Button>
          </Link>
        )}
      </div>
    </Card>
  );
}
