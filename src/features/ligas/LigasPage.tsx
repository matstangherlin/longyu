import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { IconChevron, IconFlame, IconStar, IconTrophy } from "../../components/ui/Icon";
import { useLeagueData } from "../../hooks/useLeagueData";
import { useProOffer } from "../../hooks/useProOffer";
import { ProPaywall } from "../../components/pro/ProPaywall";
import {
  LEAGUE_META,
  leagueOutcomeLabel,
  type LeagueStandingRow,
  type LeagueTier,
} from "../../lib/leagues";
import { getLeagueProBonusLabel, getPlanFeature } from "../../data/planFeatures";
import { EconomyExplainer } from "../../components/economy/EconomyExplainer";
import { claimLeagueWeekReward } from "../../services/leagueService";

export function LigasPage() {
  const league = useLeagueData();
  const contextualOffer = useProOffer();
  const [claimMsg, setClaimMsg] = useState<string | null>(null);

  const {
    now,
    loading,
    isLive,
    isDemo,
    demoMessage,
    leagueTier,
    meta,
    joined,
    standings,
    userWeeklyXp,
    userRank,
    allStandingsZero,
    resetAt,
    lastWeek,
    proHistory,
    isPro,
    promotionCutoff,
    demotionCutoff,
    tiers,
    outcome,
    refreshLive,
  } = league;

  const timeLeft = resetAt ? formatTimeLeft(new Date(resetAt), now) : formatTimeLeft(weekEndsAt(now), now);
  const promotionThresholdXp = standings[promotionCutoff - 1]?.xp ?? 0;
  const xpToPromotion = Math.max(0, promotionThresholdXp - userWeeklyXp + 1);
  const topXp = Math.max(1, standings[0]?.xp ?? userWeeklyXp);
  const inPromotionZone = joined && userRank <= promotionCutoff;
  const inDemotionZone = joined && userRank > standings.length - demotionCutoff;
  const podium = standings.slice(0, 3);
  const isTopTier = leagueTier === "celestial";
  const isBottomTier = leagueTier === "bronze";
  const avgWeeklyXp =
    standings.length > 0
      ? Math.round(standings.reduce((sum, row) => sum + row.xp, 0) / standings.length)
      : 0;
  const dayOfWeek = now.getDay() || 7;
  const daysLeftInWeek = Math.max(1, 8 - dayOfWeek);
  const xpPaceNeeded =
    !inPromotionZone && !isTopTier && joined ? Math.ceil(xpToPromotion / daysLeftInWeek) : 0;

  useEffect(() => {
    if (isPro || !joined || xpToPromotion <= 0 || xpToPromotion > 40) return;
    contextualOffer.consider({ xpToPromotion }, "card");
  }, [contextualOffer, isPro, joined, xpToPromotion]);

  async function handleClaimReward() {
    if (!lastWeek?.week_key || lastWeek.reward_claimed) return;
    const result = await claimLeagueWeekReward(lastWeek.week_key);
    setClaimMsg(result.message);
    if (result.ok) void refreshLive();
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-1 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:px-0">
      {!isPro && isLive && (
        <p className="rounded-xl border border-line/40 bg-surface-2/60 px-3 py-2 text-center text-[11px] text-ink-soft">
          {getPlanFeature("ligas").freeTier}{" "}
          <Link to="/pro" className="font-semibold text-gold hover:underline">Ver planos Pro</Link>
          {" "}para histórico e estatísticas.
        </p>
      )}

      <EconomyExplainer isPro={isPro} context="ligas" />

      {isDemo && (
        <div className="rounded-xl border border-line/50 bg-surface-2/80 px-3 py-2 text-center text-[11px] leading-4 text-ink-soft">
          <span className="font-semibold text-ink">Demonstração</span>
          {" · "}
          {demoMessage ?? "Alunos simulados. Não representam pessoas reais."}
        </div>
      )}

      {isLive && (
        <div className="rounded-xl border border-good/25 bg-good/8 px-3 py-2 text-center text-[11px] text-good">
          Liga real · {standings.length} aluno{standings.length === 1 ? "" : "s"} nesta divisão
        </div>
      )}

      <header className="lg:px-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
          Ligas · semana {loading && isLive ? "…" : ""}
        </div>
        <h1 className="mt-0.5 font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl lg:text-3xl">
          {meta.name}
        </h1>
        <p className="mt-0.5 text-xs text-ink-faint sm:text-sm">{meta.description}</p>
      </header>

      {isLive && allStandingsZero && (
        <Card className="border-accent/25 bg-accent-soft/20 p-4 text-center">
          <p className="font-serif text-base font-semibold text-ink">Complete uma lição para começar a disputar a semana</p>
          <p className="mt-1 text-xs leading-5 text-ink-soft">
            Lições, revisão e imersão somam XP semanal. O ranking atualiza assim que você estuda.
          </p>
          <Link to="/" className="mt-3 inline-block">
            <Button size="sm">Fazer uma lição</Button>
          </Link>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-start">
        <div className="space-y-4">
      <div
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-card lg:p-5"
        style={{ background: `linear-gradient(145deg, ${meta.color}, ${shade(meta.color, -22)})` }}
      >
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/12 blur-2xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              Liga · reset em {timeLeft}
            </div>
            <div className="mt-0.5 font-serif text-2xl font-semibold leading-tight">{meta.shortName}</div>
            <div className="mt-1 text-xs text-white/85">
              {joined ? `#${userRank} de ${standings.length}` : "Complete uma lição para entrar"}
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-center ring-1 ring-white/20">
            <div className="font-serif text-2xl font-semibold leading-none tabular-nums">{userWeeklyXp}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/75">XP</div>
          </div>
        </div>

        <div className="relative mt-4 flex items-end gap-1">
          {tiers.map((t) => {
            const tierMeta = LEAGUE_META[t];
            const active = t === leagueTier;
            const passed = tiers.indexOf(t) < tiers.indexOf(leagueTier);
            return (
              <div key={t} className="flex-1 text-center">
                <div
                  className={[
                    "mx-auto rounded-full transition",
                    active ? "h-2 w-full bg-white" : passed ? "h-1.5 w-full bg-white/70" : "h-1 w-full bg-white/25",
                  ].join(" ")}
                />
                <div className={["mt-1 text-[8px] font-semibold uppercase sm:text-[9px]", active ? "text-white" : "text-white/50"].join(" ")}>
                  {tierMeta.shortName}
                </div>
              </div>
            );
          })}
        </div>

        <div className="relative mt-3 rounded-lg bg-white/10 p-2.5 ring-1 ring-white/15">
          {joined ? (
            <>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-white/90">
                  {inPromotionZone
                    ? isTopTier ? "No topo!" : "Zona de promoção"
                    : `+${xpToPromotion} XP p/ top ${promotionCutoff}`}
                </span>
                <span className="text-white/70">{leagueOutcomeLabel(outcome, leagueTier)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.max(8, Math.min(100, Math.round((userWeeklyXp / topXp) * 100)))}%` }}
                />
              </div>
            </>
          ) : (
            <p className="text-[11px] font-medium text-white/85">
              Lições, revisão e imersão somam XP semanal.
            </p>
          )}
        </div>

        <Link to="/" className="relative mt-3 block">
          <Button className="w-full !bg-white !text-ink hover:!bg-white/90">
            {joined ? "Estudar agora para subir" : "Fazer uma lição"} <IconChevron width={16} height={16} />
          </Button>
        </Link>
      </div>

      {joined && podium.length >= 3 && (
        <div className="grid grid-cols-3 items-end gap-1.5 px-2 lg:px-0">
          <PodiumSpot row={podium[1]} place={2} height="h-16 lg:h-20" />
          <PodiumSpot row={podium[0]} place={1} height="h-20 lg:h-24" highlight />
          <PodiumSpot row={podium[2]} place={3} height="h-14 lg:h-18" />
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
            <IconStar width={12} height={12} /> Prêmio da semana
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{meta.reward}</p>
          {isPro && <p className="mt-1 text-[10px] text-gold">{getLeagueProBonusLabel()}</p>}
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            <IconTrophy width={12} height={12} className="text-accent" /> Semana anterior
          </div>
          {lastWeek ? (
            <>
              <p className="mt-1 text-xs text-ink-soft">
                <span className="font-semibold text-ink">#{lastWeek.final_rank}</span>
                {" · "}
                {lastWeek.weekly_xp} XP · {leagueOutcomeLabel(lastWeek.movement, lastWeek.tier_id as LeagueTier)}
              </p>
              {isLive && !lastWeek.reward_claimed && (
                <Button size="sm" variant="soft" className="mt-2 w-full" onClick={() => void handleClaimReward()}>
                  Resgatar recompensa
                </Button>
              )}
              {claimMsg && <p className="mt-1 text-[10px] text-ink-faint">{claimMsg}</p>}
            </>
          ) : (
            <p className="mt-1 text-xs text-ink-soft">Sua primeira semana na liga!</p>
          )}
        </Card>
      </div>

      {isPro && proHistory && proHistory.length > 1 && (
        <Card className="p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">Histórico Pro</div>
          <ul className="mt-2 space-y-1">
            {proHistory.slice(0, 6).map((week) => (
              <li key={week.week_key} className="flex justify-between text-[11px] text-ink-soft">
                <span>{week.week_key}</span>
                <span>#{week.final_rank} · {week.weekly_xp} XP</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {isPro && joined && (
        <Card className="border-gold/25 bg-gold/5 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">Como subir</div>
          <ul className="mt-2 space-y-1.5 text-[11px] leading-4 text-ink-soft">
            {inPromotionZone ? (
              <li className="text-good">Você está na zona de promoção — mantenha o ritmo até o reset.</li>
            ) : isTopTier ? (
              <li>Você já está na divisão máxima. Compita pelo pódio sem vantagem de plano.</li>
            ) : (
              <li>
                Faltam cerca de <span className="font-semibold text-ink">{xpToPromotion} XP</span> para o top{" "}
                {promotionCutoff}.
                {xpPaceNeeded > 0 && (
                  <> Ritmo sugerido: ~{xpPaceNeeded} XP/dia nos próximos {daysLeftInWeek} dias.</>
                )}
              </li>
            )}
            <li>
              Média da liga: {avgWeeklyXp} XP — você está{" "}
              {userWeeklyXp >= avgWeeklyXp ? "acima" : "abaixo"} da média ({userWeeklyXp} XP).
            </li>
            <li>Lições, revisão e missões geram XP igual para todos — Pro só amplia recompensas, não o ranking.</li>
          </ul>
        </Card>
      )}

      {!isPro && joined && xpToPromotion > 0 && xpToPromotion <= 60 && (
        <Card className="border-gold/20 bg-gold/5 p-3">
          <p className="text-xs leading-5 text-ink-soft">
            Faltam <span className="font-semibold text-ink">{xpToPromotion} XP</span> para a zona de promoção.{" "}
            <button type="button" className="font-semibold text-gold hover:underline" onClick={() => contextualOffer.consider({ xpToPromotion })}>
              Ver como o Pro ajuda a manter o ritmo
            </button>
          </p>
        </Card>
      )}
        </div>

      <section className="min-w-0">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-serif text-base font-semibold text-ink lg:text-lg">Ranking</h2>
          <Pill tone={inPromotionZone ? "good" : inDemotionZone ? "muted" : joined ? "accent" : "muted"}>
            {joined ? (inPromotionZone ? "subindo" : inDemotionZone ? "atenção" : "ativo") : "aguardando"}
          </Pill>
        </div>
        <Card className="overflow-hidden p-0 lg:min-h-[28rem]">
          {standings.length === 0 ? (
            <div className="p-6 text-center text-sm text-ink-soft">Nenhum participante nesta divisão ainda.</div>
          ) : (
          standings.map((row, index) => {
            const promotion = row.rank <= promotionCutoff;
            const demotion = row.rank > standings.length - demotionCutoff;
            const showPromotionDivider = row.rank === 1;
            const showStayDivider = row.rank === promotionCutoff + 1;
            const showDemotionDivider = row.rank === standings.length - demotionCutoff + 1;
            return (
              <div key={row.id}>
                {showPromotionDivider && !isTopTier && (
                  <ZoneDivider tone="good" label={`Promoção · top ${promotionCutoff}`} />
                )}
                {showStayDivider && <ZoneDivider tone="muted" label="Permanece" />}
                {showDemotionDivider && !isBottomTier && (
                  <ZoneDivider tone="wrong" label={`Rebaixamento · últimos ${demotionCutoff}`} />
                )}
                <RankRow
                  row={row}
                  promotion={promotion && !isTopTier}
                  demotion={demotion && !isBottomTier}
                  joined={joined}
                  last={index === standings.length - 1}
                />
              </div>
            );
          })
          )}
        </Card>
        {isDemo && (
          <p className="mt-2 px-1 text-[10px] leading-4 text-ink-faint">
            Ranking de demonstração com alunos simulados. Faça login para competir com contas reais.
          </p>
        )}
      </section>
      </div>

      <ProPaywall
        open={contextualOffer.open}
        kind={contextualOffer.offer?.paywallKind ?? "leagues"}
        offer={contextualOffer.offer}
        onClose={contextualOffer.dismiss}
      />
    </div>
  );
}

function PodiumSpot({
  row,
  place,
  height,
  highlight = false,
}: {
  row: LeagueStandingRow;
  place: number;
  height: string;
  highlight?: boolean;
}) {
  const medal = MEDALS[place - 1];
  return (
    <div className="flex flex-col items-center">
      <div className={["mb-1 max-w-full truncate text-center text-[10px] font-semibold", row.isUser ? "text-accent" : "text-ink-soft"].join(" ")}>
        {row.isUser ? "Você" : row.name}
      </div>
      <div className="text-[10px] tabular-nums text-ink-faint">{row.xp} XP</div>
      <div
        className={["mt-1 flex w-full items-end justify-center rounded-t-lg text-sm font-bold text-white", height, highlight ? "shadow-card" : ""].join(" ")}
        style={{ background: medal }}
      >
        {place}
      </div>
    </div>
  );
}

function ZoneDivider({ tone, label }: { tone: "good" | "wrong" | "muted"; label: string }) {
  const color =
    tone === "good" ? "text-[rgb(var(--good))]" : tone === "wrong" ? "text-wrong" : "text-ink-faint";
  return (
    <div className="flex items-center gap-2 bg-surface-2/50 px-3 py-1">
      <span className={["text-[9px] font-bold uppercase tracking-[0.12em]", color].join(" ")}>{label}</span>
    </div>
  );
}

function RankRow({
  row,
  promotion,
  demotion,
  joined,
  last,
}: {
  row: LeagueStandingRow;
  promotion: boolean;
  demotion: boolean;
  joined: boolean;
  last: boolean;
}) {
  const medal = row.rank <= 3 ? MEDALS[row.rank - 1] : null;
  return (
    <div
      className={[
        "flex items-center gap-2.5 px-3 py-2",
        row.isUser ? "bg-accent-soft/40" : "",
        last ? "" : "border-b border-line/40",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums",
          medal ? "text-white" : promotion ? "bg-good/10 text-good" : demotion ? "bg-wrong-soft text-wrong" : "bg-surface-2 text-ink-soft",
        ].join(" ")}
        style={medal ? { background: medal } : undefined}
      >
        {row.rank}
      </div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[11px] font-bold text-accent">
        {(row.avatarLetter ?? row.name.charAt(0)).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-semibold text-ink">{row.isUser ? "Você" : row.name}</span>
          {row.isPro && <Pill tone="gold" className="!px-1.5 !py-0 text-[8px]">Pro</Pill>}
          {row.isUser && joined && promotion && <IconFlame width={11} height={11} className="shrink-0 text-good" />}
        </div>
        {row.streak != null && row.streak > 0 && (
          <div className="text-[10px] text-ink-faint">{row.streak}d sequência</div>
        )}
        {row.isUser && !joined && <div className="text-[10px] text-ink-faint">fora desta semana</div>}
      </div>
      <div className="text-right">
        <span className="font-serif text-sm font-semibold tabular-nums text-ink">{row.xp}</span>
        <span className="ml-0.5 text-[10px] text-ink-faint">XP</span>
      </div>
    </div>
  );
}

const MEDALS = ["#C6971E", "#9AA3AF", "#B08157"];

function weekEndsAt(now: Date): Date {
  const end = new Date(now);
  const day = end.getDay() || 7;
  end.setHours(0, 0, 0, 0);
  end.setDate(end.getDate() + (8 - day));
  return end;
}

function formatTimeLeft(end: Date, now: Date): string {
  const ms = Math.max(0, end.getTime() - now.getTime());
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h`;
  return `${Math.max(0, hours)}h`;
}

function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `rgb(${r} ${g} ${b})`;
}
