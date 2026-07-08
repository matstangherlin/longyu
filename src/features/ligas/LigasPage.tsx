import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Button, Card, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";
import { IconChevron, IconRefresh, IconShield, IconStar, IconTarget } from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { weekKey } from "../../lib/storage";
import {
  LEAGUE_DEMOTION_CUTOFF,
  LEAGUE_META,
  LEAGUE_PROMOTION_CUTOFF,
  buildLeagueStandings,
  generateLeagueBots,
  joinedLeagueThisWeek,
  leagueOutcomeForRank,
  leagueOutcomeLabel,
  leagueZoneLabel,
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
  const zone = leagueZoneLabel(userRow.rank, standings.length, leagueTier);
  const xpToPromotion = Math.max(0, (standings[LEAGUE_PROMOTION_CUTOFF - 1]?.xp ?? 0) - weeklyXp + 1);
  const latestHistory = leagueHistory[0];

  return (
    <div className="space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <SectionTitle
        eyebrow="Ligas"
        title="Ranking semanal"
        desc="Prévia local das ligas. Ranking online chegará com contas em nuvem."
      />

      <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-5 shadow-lift sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <span
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white shadow-card"
                style={{ backgroundColor: meta.color }}
              >
                <IconShield width={30} height={30} />
              </span>
              <div>
                <Pill tone="accent">prévia local</Pill>
                <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">{meta.name}</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-ink-soft">{meta.description}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:min-w-72">
              <LeagueStat label="XP semanal" value={weeklyXp} />
              <LeagueStat label="Posição" value={joined ? `#${userRow.rank}` : "fora"} />
              <LeagueStat label="Fim da semana" value={formatTimeLeft(weekEndsAt(now), now)} />
            </div>
          </div>

          <div className="mt-5 rounded-2xl border border-line bg-surface-2 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-ink">
                  {joined ? zone : "Complete uma lição para entrar nesta semana"}
                </div>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  {joined
                    ? `${leagueOutcomeLabel(outcome, leagueTier)} se a semana terminasse agora.`
                    : "Revisão e imersão já somam XP semanal, mas a liga só abre após uma lição concluída."}
                </p>
              </div>
              <Link to="/">
                <Button variant={joined ? "outline" : "primary"}>
                  {joined ? "Ganhar mais XP" : "Fazer uma lição"} <IconChevron width={17} height={17} />
                </Button>
              </Link>
            </div>
            {joined && (
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink-faint">
                  <span>Top {LEAGUE_PROMOTION_CUTOFF}</span>
                  <span>{xpToPromotion > 0 ? `${xpToPromotion} XP para zona de subida` : "em zona alta"}</span>
                </div>
                <ProgressBar value={Math.max(0, weeklyXp)} max={Math.max(1, standings[0]?.xp ?? weeklyXp)} />
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <IconStar width={22} height={22} />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold text-ink">Recompensa da semana</h2>
              <p className="mt-2 text-sm leading-6 text-ink-soft">{meta.reward}</p>
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <RuleRow icon={<IconTarget width={17} height={17} />} text={`Top ${LEAGUE_PROMOTION_CUTOFF} sobe de liga.`} />
            <RuleRow icon={<IconRefresh width={17} height={17} />} text="Meio da tabela permanece." />
            <RuleRow icon={<IconShield width={17} height={17} />} text={`Últimos ${LEAGUE_DEMOTION_CUTOFF} descem, exceto na Jade.`} />
          </div>
          {latestHistory && (
            <div className="mt-5 rounded-2xl bg-surface-2 px-4 py-3">
              <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Semana anterior</div>
              <div className="mt-1 text-sm font-semibold text-ink">
                #{latestHistory.rank} em {LEAGUE_META[latestHistory.tier].shortName} · {latestHistory.weeklyXp} XP
              </div>
              <div className="text-xs text-ink-soft">{leagueOutcomeLabel(latestHistory.outcome, latestHistory.tier)}</div>
            </div>
          )}
        </Card>
      </section>

      <Card className="border-accent-soft bg-accent-soft/45 p-4">
        <div className="flex items-start gap-3">
          <IconShield width={20} height={20} className="mt-0.5 shrink-0 text-accent" />
          <p className="text-sm leading-6 text-ink-soft">
            Estes nomes não representam pessoas reais. A lista usa alunos simulados enquanto o ranking com outros alunos não está disponível.
          </p>
        </div>
      </Card>

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink">Ranking da semana</h2>
            <p className="text-sm text-ink-soft">XP de lições, revisão e imersão alimenta esta prévia local.</p>
          </div>
          <Pill tone={joined ? "good" : "muted"}>{joined ? "participando" : "aguardando lição"}</Pill>
        </div>
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {standings.map((row) => (
              <div
                key={row.id}
                className={[
                  "grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3 sm:px-5",
                  row.isUser ? "bg-accent-soft/55" : "bg-surface",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-semibold",
                    row.rank <= LEAGUE_PROMOTION_CUTOFF
                      ? "bg-[rgb(var(--good)/0.12)] text-[rgb(var(--good))]"
                      : row.rank > standings.length - LEAGUE_DEMOTION_CUTOFF
                        ? "bg-wrong-soft text-wrong"
                        : "bg-surface-2 text-ink-soft",
                  ].join(" ")}
                >
                  {row.rank}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-ink">
                    {row.isUser ? "Você" : row.name}
                  </div>
                  <div className="mt-0.5 flex flex-wrap gap-1.5 text-xs text-ink-faint">
                    <span>{row.isUser ? (joined ? "participante local" : "fora da liga nesta semana") : row.label}</span>
                    <span>·</span>
                    <span>{leagueZoneLabel(row.rank, standings.length, leagueTier)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-serif text-xl font-semibold text-ink">{row.xp}</div>
                  <div className="text-[11px] font-medium text-ink-faint">XP</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

function LeagueStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-3 text-center shadow-card">
      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{label}</div>
      <div className="mt-1 font-serif text-2xl font-semibold leading-none text-ink">{value}</div>
    </div>
  );
}

function RuleRow({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-2 px-3 py-2.5 text-ink-soft">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-surface text-accent">{icon}</span>
      <span>{text}</span>
    </div>
  );
}

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
