import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { IconChevron, IconFlame, IconStar, IconTrophy } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { weekKey } from "../../lib/storage";
import {
  LEAGUE_DEMOTION_CUTOFF,
  LEAGUE_META,
  LEAGUE_PROMOTION_CUTOFF,
  LEAGUE_TIERS,
  type LeagueStandingRow,
  buildLeagueStandings,
  generateLeagueBots,
  joinedLeagueThisWeek,
  leagueOutcomeForRank,
  leagueOutcomeLabel,
  normalizeLeagueTier,
} from "../../lib/leagues";

export function LigasPage() {
  const syncLeagueWeek = useStore((s) => s.syncLeagueWeek);
  const tier = useStore((s) => s.leagueTier);
  const weeklyXp = useStore((s) => s.getWeeklyXp());
  const joinedAt = useStore((s) => s.leagueJoinedAt);
  const leagueBots = useStore((s) => s.leagueBots);
  const leagueHistory = useStore((s) => s.leagueHistory);
  const accountName = useStore((s) => s.accounts[s.currentAccountId]?.name ?? "Você");
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    syncLeagueWeek();
  }, [syncLeagueWeek]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const leagueTier = normalizeLeagueTier(tier);
  const meta = LEAGUE_META[leagueTier];
  const joined = joinedLeagueThisWeek(joinedAt, now);
  const currentWeek = weekKey(now);
  const bots = joined && leagueBots.length > 0
    ? leagueBots
    : generateLeagueBots(leagueTier, currentWeek, joined ? "joined-preview" : "preview");
  const standings = useMemo(
    () => buildLeagueStandings(weeklyXp, bots, firstName(accountName)),
    [accountName, bots, weeklyXp]
  );
  const userRow = standings.find((row) => row.isUser) ?? standings[0];
  const outcome = leagueOutcomeForRank(userRow.rank, standings.length, leagueTier);
  const promotionThresholdXp = standings[LEAGUE_PROMOTION_CUTOFF - 1]?.xp ?? 0;
  const xpToPromotion = Math.max(0, promotionThresholdXp - weeklyXp + 1);
  const topXp = Math.max(1, standings[0]?.xp ?? weeklyXp);
  const latestHistory = leagueHistory[0];
  const timeLeft = formatTimeLeft(weekEndsAt(now), now);
  const inPromotionZone = joined && userRow.rank <= LEAGUE_PROMOTION_CUTOFF;
  const inDemotionZone = joined && userRow.rank > standings.length - LEAGUE_DEMOTION_CUTOFF;
  const podium = standings.slice(0, 3);

  return (
    <div className="mx-auto max-w-lg space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {/* Banner da divisão */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-card"
        style={{ background: `linear-gradient(145deg, ${meta.color}, ${shade(meta.color, -22)})` }}
      >
        <div className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/12 blur-2xl" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/75">
              Liga · reset em {timeLeft}
            </div>
            <h1 className="mt-0.5 font-serif text-2xl font-semibold leading-tight">{meta.name}</h1>
            <div className="mt-1 text-xs text-white/80">
              {joined ? `#${userRow.rank} de ${standings.length}` : "Complete uma lição para entrar"}
            </div>
          </div>
          <div className="shrink-0 rounded-xl bg-white/15 px-3 py-2 text-center ring-1 ring-white/20">
            <div className="font-serif text-2xl font-semibold leading-none tabular-nums">{weeklyXp}</div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/75">XP</div>
          </div>
        </div>

        {/* Escada de divisões */}
        <div className="relative mt-4 flex items-end gap-1">
          {LEAGUE_TIERS.map((t) => {
            const active = t === leagueTier;
            const passed = LEAGUE_TIERS.indexOf(t) < LEAGUE_TIERS.indexOf(leagueTier);
            return (
              <div key={t} className="flex-1 text-center">
                <div
                  className={[
                    "mx-auto rounded-full transition",
                    active ? "h-2 w-full bg-white" : passed ? "h-1.5 w-full bg-white/70" : "h-1 w-full bg-white/25",
                  ].join(" ")}
                />
                <div className={["mt-1 text-[9px] font-semibold uppercase", active ? "text-white" : "text-white/50"].join(" ")}>
                  {LEAGUE_META[t].shortName}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progresso */}
        <div className="relative mt-3 rounded-lg bg-white/10 p-2.5 ring-1 ring-white/15">
          {joined ? (
            <>
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span className="text-white/90">
                  {inPromotionZone
                    ? leagueTier === "dragao" ? "No topo!" : "Zona de promoção"
                    : `+${xpToPromotion} XP p/ top ${LEAGUE_PROMOTION_CUTOFF}`}
                </span>
                <span className="text-white/70">{leagueOutcomeLabel(outcome, leagueTier)}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.max(8, Math.min(100, Math.round((weeklyXp / topXp) * 100)))}%` }}
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
            {joined ? "Estudar e subir" : "Fazer uma lição"} <IconChevron width={16} height={16} />
          </Button>
        </Link>
      </div>

      {/* Pódio */}
      {joined && podium.length >= 3 && (
        <div className="grid grid-cols-3 items-end gap-1.5 px-2">
          <PodiumSpot row={podium[1]} place={2} height="h-16" />
          <PodiumSpot row={podium[0]} place={1} height="h-20" highlight />
          <PodiumSpot row={podium[2]} place={3} height="h-14" />
        </div>
      )}

      {/* Prêmio + histórico */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">
            <IconStar width={12} height={12} /> Prêmio da semana
          </div>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{meta.reward}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
            <IconTrophy width={12} height={12} className="text-accent" /> Semana anterior
          </div>
          {latestHistory ? (
            <p className="mt-1 text-xs text-ink-soft">
              <span className="font-semibold text-ink">#{latestHistory.rank}</span> · {latestHistory.weeklyXp} XP ·{" "}
              {leagueOutcomeLabel(latestHistory.outcome, latestHistory.tier)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-ink-soft">Primeira semana na liga!</p>
          )}
        </Card>
      </div>

      {/* Ranking */}
      <section>
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="font-serif text-base font-semibold text-ink">Ranking</h2>
          <Pill tone={inPromotionZone ? "good" : inDemotionZone ? "muted" : joined ? "accent" : "muted"}>
            {joined ? (inPromotionZone ? "subindo" : inDemotionZone ? "atenção" : "ativo") : "aguardando"}
          </Pill>
        </div>
        <Card className="overflow-hidden p-0">
          {standings.map((row, index) => {
            const promotion = row.rank <= LEAGUE_PROMOTION_CUTOFF;
            const demotion = row.rank > standings.length - LEAGUE_DEMOTION_CUTOFF;
            const showPromotionDivider = row.rank === 1;
            const showStayDivider = row.rank === LEAGUE_PROMOTION_CUTOFF + 1;
            const showDemotionDivider = row.rank === standings.length - LEAGUE_DEMOTION_CUTOFF + 1;
            return (
              <div key={row.id}>
                {showPromotionDivider && leagueTier !== "dragao" && (
                  <ZoneDivider tone="good" label={`Promoção · top ${LEAGUE_PROMOTION_CUTOFF}`} />
                )}
                {showStayDivider && <ZoneDivider tone="muted" label="Permanece" />}
                {showDemotionDivider && leagueTier !== "jade" && (
                  <ZoneDivider tone="wrong" label={`Rebaixamento · últimos ${LEAGUE_DEMOTION_CUTOFF}`} />
                )}
                <RankRow
                  row={row}
                  promotion={promotion && leagueTier !== "dragao"}
                  demotion={demotion && leagueTier !== "jade"}
                  joined={joined}
                  last={index === standings.length - 1}
                />
              </div>
            );
          })}
        </Card>
        <p className="mt-2 px-1 text-[10px] leading-4 text-ink-faint">
          Ranking com alunos simulados até a competição real estar disponível.
        </p>
      </section>
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
        className={[
          "mt-1 flex w-full items-end justify-center rounded-t-lg text-sm font-bold text-white",
          height,
          highlight ? "shadow-card" : "",
        ].join(" ")}
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
          medal
            ? "text-white"
            : promotion
              ? "bg-good/10 text-good"
              : demotion
                ? "bg-wrong-soft text-wrong"
                : "bg-surface-2 text-ink-soft",
        ].join(" ")}
        style={medal ? { background: medal } : undefined}
      >
        {row.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-xs font-semibold text-ink">{row.isUser ? "Você" : row.name}</span>
          {row.isUser && joined && promotion && (
            <IconFlame width={11} height={11} className="shrink-0 text-good" />
          )}
        </div>
        {row.isUser && !joined && (
          <div className="text-[10px] text-ink-faint">fora desta semana</div>
        )}
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

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Você";
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
