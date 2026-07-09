import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Pill } from "../../components/ui/primitives";
import { IconChevron, IconStar, IconTrophy } from "../../components/ui/Icon";
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

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <header>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Ligas · semana</div>
        <h1 className="mt-1 font-serif text-[1.65rem] font-semibold leading-tight text-ink sm:text-[1.85rem]">
          {meta.name}
        </h1>
      </header>

      {/* Banner da divisão — clima de competição real. */}
      <div
        className="relative overflow-hidden rounded-2xl p-4 text-white shadow-lift sm:p-5"
        style={{ background: `linear-gradient(135deg, ${meta.color}, ${shade(meta.color, -18)})` }}
      >
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-white/15 blur-2xl"
          aria-hidden
        />
        <div className="relative flex items-center gap-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 sm:h-16 sm:w-16">
            <IconTrophy width={30} height={30} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/80">
              {joined ? `Posição #${userRow.rank} de ${standings.length}` : "Fora da liga esta semana"}
            </div>
            <div className="mt-0.5 font-serif text-2xl font-semibold leading-tight">{meta.shortName}</div>
            <div className="mt-0.5 text-sm text-white/85">Reset em {timeLeft}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-serif text-3xl font-semibold leading-none tabular-nums">{weeklyXp}</div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-white/80">XP</div>
          </div>
        </div>

        {/* Escada de divisões */}
        <div className="relative mt-4 flex items-center gap-1.5">
          {LEAGUE_TIERS.map((t) => {
            const active = t === leagueTier;
            const passed = LEAGUE_TIERS.indexOf(t) < LEAGUE_TIERS.indexOf(leagueTier);
            return (
              <div key={t} className="flex-1">
                <div
                  className={[
                    "h-1.5 rounded-full transition",
                    active ? "bg-white" : passed ? "bg-white/70" : "bg-white/25",
                  ].join(" ")}
                />
                <div className={["mt-1 text-center text-[10px] font-semibold uppercase tracking-wide", active ? "text-white" : "text-white/55"].join(" ")}>
                  {LEAGUE_META[t].shortName}
                </div>
              </div>
            );
          })}
        </div>

        {/* Progresso rumo à promoção */}
        <div className="relative mt-4 rounded-xl bg-white/12 p-3 ring-1 ring-white/15">
          {joined ? (
            <>
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-white/85">
                  {inPromotionZone
                    ? leagueTier === "dragao" ? "No topo da Liga Dragão" : "Em zona de promoção 🎉"
                    : `Faltam ${xpToPromotion} XP para o top ${LEAGUE_PROMOTION_CUTOFF}`}
                </span>
                <span className="text-white/70">{leagueOutcomeLabel(outcome, leagueTier)}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-white transition-all duration-500"
                  style={{ width: `${Math.max(6, Math.min(100, Math.round((weeklyXp / topXp) * 100)))}%` }}
                />
              </div>
            </>
          ) : (
            <div className="text-xs font-medium text-white/85">
              Complete uma lição para entrar na liga desta semana. Revisão e imersão também somam XP.
            </div>
          )}
        </div>

        <Link to="/" className="relative mt-3 block">
          <Button className="w-full !bg-white !text-ink shadow-card hover:!bg-white/90">
            {joined ? "Estudar e subir no ranking" : "Fazer uma lição"} <IconChevron width={17} height={17} />
          </Button>
        </Link>
      </div>

      {/* Prêmio + semana anterior */}
      <div className="grid gap-2 sm:grid-cols-2">
        <Card className="rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
            <IconStar width={14} height={14} /> Prêmio da semana
          </div>
          <p className="mt-1.5 text-sm leading-6 text-ink-soft">{meta.reward}</p>
        </Card>
        <Card className="rounded-xl p-3.5">
          <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            <IconTrophy width={14} height={14} className="text-accent" /> Semana anterior
          </div>
          {latestHistory ? (
            <p className="mt-1.5 text-sm text-ink-soft">
              <span className="font-semibold text-ink">#{latestHistory.rank}</span> em {LEAGUE_META[latestHistory.tier].shortName} ·{" "}
              {latestHistory.weeklyXp} XP — {leagueOutcomeLabel(latestHistory.outcome, latestHistory.tier)}
            </p>
          ) : (
            <p className="mt-1.5 text-sm text-ink-soft">Sua primeira semana na liga. Boa sorte!</p>
          )}
        </Card>
      </div>

      {/* Ranking com zonas de promoção/rebaixamento */}
      <section>
        <div className="mb-2 flex items-end justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-ink">Ranking da semana</h2>
          <Pill tone={inPromotionZone ? "good" : inDemotionZone ? "muted" : joined ? "accent" : "muted"}>
            {joined ? (inPromotionZone ? "subindo" : inDemotionZone ? "atenção" : "participando") : "aguardando lição"}
          </Pill>
        </div>
        <Card className="overflow-hidden rounded-xl p-0">
          {standings.map((row, index) => {
            const promotion = row.rank <= LEAGUE_PROMOTION_CUTOFF;
            const demotion = row.rank > standings.length - LEAGUE_DEMOTION_CUTOFF;
            const showPromotionDivider = row.rank === 1;
            const showStayDivider = row.rank === LEAGUE_PROMOTION_CUTOFF + 1;
            const showDemotionDivider = row.rank === standings.length - LEAGUE_DEMOTION_CUTOFF + 1;
            return (
              <div key={row.id}>
                {showPromotionDivider && leagueTier !== "dragao" && (
                  <ZoneDivider tone="good" label={`Zona de promoção · top ${LEAGUE_PROMOTION_CUTOFF}`} />
                )}
                {showStayDivider && <ZoneDivider tone="muted" label="Permanece na divisão" />}
                {showDemotionDivider && leagueTier !== "jade" && (
                  <ZoneDivider tone="wrong" label={`Zona de rebaixamento · últimos ${LEAGUE_DEMOTION_CUTOFF}`} />
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
        <p className="mt-2 px-1 text-[11px] leading-5 text-ink-faint">
          O ranking usa alunos simulados enquanto a competição com outras pessoas não está disponível. Nenhum
          nome representa alguém real.
        </p>
      </section>
    </div>
  );
}

function ZoneDivider({ tone, label }: { tone: "good" | "wrong" | "muted"; label: string }) {
  const color =
    tone === "good" ? "text-[rgb(var(--good))]" : tone === "wrong" ? "text-wrong" : "text-ink-faint";
  return (
    <div className="flex items-center gap-2 bg-surface-2/60 px-4 py-1.5">
      <span className={["text-[10px] font-bold uppercase tracking-[0.14em]", color].join(" ")}>{label}</span>
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
        "flex items-center gap-3 px-3 py-2.5 sm:px-4",
        row.isUser ? "bg-accent-soft/55" : "bg-surface",
        last ? "" : "border-b border-line/60",
      ].join(" ")}
    >
      <div
        className={[
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold tabular-nums",
          medal
            ? "text-white shadow-card"
            : promotion
              ? "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
              : demotion
                ? "bg-wrong-soft text-wrong"
                : "bg-surface-2 text-ink-soft",
        ].join(" ")}
        style={medal ? { background: medal } : undefined}
      >
        {row.rank}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-ink">{row.isUser ? "Você" : row.name}</span>
          {row.isUser && joined && promotion && (
            <IconChevron width={13} height={13} className="shrink-0 rotate-[-90deg] text-[rgb(var(--good))]" />
          )}
          {row.isUser && joined && demotion && (
            <IconChevron width={13} height={13} className="shrink-0 rotate-90 text-wrong" />
          )}
        </div>
        {row.isUser && !joined && (
          <div className="text-[11px] text-ink-faint">fora da liga nesta semana</div>
        )}
      </div>
      <div className="flex items-baseline gap-1 text-right">
        <span className="font-serif text-lg font-semibold tabular-nums text-ink">{row.xp}</span>
        <span className="text-[11px] font-medium text-ink-faint">XP</span>
      </div>
    </div>
  );
}

// Ouro, prata, bronze para o pódio do ranking.
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

// Escurece/clareia um hex para o gradiente do banner (sem depender de libs).
function shade(hex: string, percent: number): string {
  const clean = hex.replace("#", "");
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, (num >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((num >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (num & 0xff) + amt));
  return `rgb(${r} ${g} ${b})`;
}
