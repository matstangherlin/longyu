import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore, type DailyStudyRecord } from "../../lib/store";
import { todayKey } from "../../lib/storage";
import { ALL_LESSONS } from "../../data/journey";
import { DOMAIN_META, DOMAIN_ORDER } from "../../data/domains";
import { engineInsights } from "../../lib/engineIntelligence";
import { LEAGUE_META, normalizeLeagueTier } from "../../lib/leagues";
import { ACHIEVEMENTS } from "../../data/achievements";
import { buildMissionViews, type MissionView } from "../../data/missions";
import { useLeagueData } from "../../hooks/useLeagueData";
import { Mascot } from "../../components/brand/Mascot";
import { Card, ProgressBar, Pill } from "../../components/ui/primitives";
import { PageShell, CompactCard, StatTile, RightRail, EmptyState, ActionButton } from "../../components/ui/page";
import {
  IconCheck,
  IconChevron,
  IconFlame,
  IconRefresh,
  IconStar,
  IconTarget,
  IconTrophy,
  IconUser,
} from "../../components/ui/Icon";

const RESERVED_NAMES = new Set(["aluno", "novo", "longyu", "aluno longyu"]);

function firstName(name?: string): string {
  return (name ?? "").trim().split(/\s+/)[0] ?? "";
}

function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "龙";
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("") || "龙";
}

function memberSinceLabel(createdAt?: number): string | undefined {
  if (!createdAt) return undefined;
  try {
    return new Date(createdAt).toLocaleDateString("pt-BR", { month: "short", year: "numeric" }).replace(".", "");
  } catch {
    return undefined;
  }
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} h`;
  const d = Math.floor(h / 24);
  return `${d} d`;
}

/** Últimos 28 dias (4 semanas) no fuso local do aluno. */
function buildStudyCalendar(activityByDay: Record<string, DailyStudyRecord>) {
  const days: { key: string; record?: DailyStudyRecord; isToday: boolean }[] = [];
  const today = todayKey();
  for (let offset = 27; offset >= 0; offset -= 1) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - offset);
    const key = todayKey(d);
    days.push({ key, record: activityByDay[key], isToday: key === today });
  }
  return days;
}

function studyLevel(record?: DailyStudyRecord): 0 | 1 | 2 | 3 {
  if (!record || (record.tasks <= 0 && record.xp <= 0 && record.minutes <= 0)) return 0;
  if (record.xp >= 40 || record.tasks >= 3 || record.minutes >= 15) return 3;
  if (record.xp >= 15 || record.tasks >= 2 || record.minutes >= 8) return 2;
  return 1;
}

interface HistoryEvent {
  icon: ReactNode;
  label: string;
  detail: string;
  time: string;
}

export function ProfilePage() {
  const location = useLocation();
  const accounts = useStore((s) => s.accounts);
  const currentAccountId = useStore((s) => s.currentAccountId);
  const streak = useStore((s) => s.streak);
  const streakRecovery = useStore((s) => s.streakRecovery);
  const clearStreakRecovery = useStore((s) => s.clearStreakRecovery);
  const xpTotal = useStore((s) => s.xpTotal);
  const completedLessons = useStore((s) => s.completedLessons);
  const activityByDay = useStore((s) => s.activityByDay ?? {});
  const lastStudyDate = useStore((s) => s.lastStudyDate);
  const srs = useStore((s) => s.srs);
  const rewardHistory = useStore((s) => s.rewardHistory);
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked ?? {});
  const dailyMissions = useStore((s) => s.dailyMissions);
  const aggregates = useStore((s) => s.getMissionAggregates());
  const league = useLeagueData();

  const account = accounts[currentAccountId];
  const name = account?.name?.trim() || "Aluno Longyu";
  const nickname = useMemo(() => {
    const first = firstName(name);
    if (!first || RESERVED_NAMES.has(name.toLowerCase()) || RESERVED_NAMES.has(first.toLowerCase())) return undefined;
    return `@${first.toLowerCase()}`;
  }, [name]);
  const since = memberSinceLabel(account?.createdAt);
  const tier = normalizeLeagueTier(league.leagueTier);
  const leagueName = LEAGUE_META[tier]?.name ?? "Liga Bronze";

  const domainRows = useMemo(() => engineInsights(completedLessons, srs), [completedLessons, srs]);

  const recentAchievements = useMemo(
    () =>
      ACHIEVEMENTS.filter((def) => achievementsUnlocked[def.id])
        .sort((a, b) => (achievementsUnlocked[b.id] ?? 0) - (achievementsUnlocked[a.id] ?? 0))
        .slice(0, 4),
    [achievementsUnlocked]
  );
  const unlockedCount = useMemo(
    () => ACHIEVEMENTS.filter((def) => achievementsUnlocked[def.id]).length,
    [achievementsUnlocked]
  );

  const calendarDays = useMemo(() => buildStudyCalendar(activityByDay), [activityByDay]);
  const todayStudy = lastStudyDate ? activityByDay[lastStudyDate] : undefined;

  useEffect(() => {
    if (location.hash !== "#ofensiva") return;
    document.getElementById("ofensiva")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [location.hash]);

  const history: HistoryEvent[] = useMemo(() => {
    return [...(rewardHistory ?? [])]
      .sort((a, b) => b.claimedAt - a.claimedAt)
      .slice(0, 3)
      .map((entry) => {
        const isXp = entry.type === "xp";
        return {
          icon: isXp ? <IconStar width={14} height={14} /> : <IconTrophy width={14} height={14} />,
          label: entry.source,
          detail:
            entry.type === "xp"
              ? `+${entry.amount} XP`
              : entry.type === "qi"
              ? `+${entry.amount} Qi`
              : entry.type === "dragonPearl"
              ? `+${entry.amount} pérola`
              : entry.type === "streakShield"
              ? `+${entry.amount} escudo`
              : "conquista",
          time: relativeTime(entry.claimedAt),
        };
      });
  }, [rewardHistory]);

  const dailyMission = useMemo<MissionView | undefined>(() => {
    const views = buildMissionViews("daily", aggregates, dailyMissions.claimed);
    return views.find((m) => !m.claimed && !m.complete) ?? views.find((m) => !m.claimed) ?? views[0];
  }, [aggregates, dailyMissions.claimed]);

  const lastLessonTitle = useMemo(() => {
    const lastId = completedLessons[completedLessons.length - 1];
    return lastId ? ALL_LESSONS.find((l) => l.id === lastId)?.title : undefined;
  }, [completedLessons]);

  const stats = [
    { icon: IconFlame, value: `${streak}`, label: streak === 1 ? "dia de sequência" : "dias de sequência", tone: streak > 0 ? "accent" : "default" },
    { icon: IconStar, value: `${xpTotal}`, label: "XP total", tone: "default" },
    { icon: IconTrophy, value: leagueName.replace("Liga ", ""), label: "Liga atual", tone: "gold" },
    { icon: IconCheck, value: `${completedLessons.length}`, label: "lições concluídas", tone: "good" },
  ] as const;

  // Right rail é só desktop; no mobile o perfil fica curto (Liga já é um stat,
  // semanal e missão vivem em /ligas e /missoes).
  const rail = (
    <div className="hidden lg:block">
    <RightRail>
      <CompactCard>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold/10 text-gold">
              <IconTrophy width={16} height={16} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-ink">{leagueName}</div>
              <div className="text-[11px] text-ink-faint">{league.isDemo ? "Demonstração" : `Você está em #${league.userRank}`}</div>
            </div>
          </div>
          <Link to="/ligas" className="text-xs font-semibold text-accent hover:underline">Ver</Link>
        </div>
      </CompactCard>

      <CompactCard>
        <div className="flex items-center justify-between text-[11px] font-semibold text-ink-faint">
          <span className="uppercase tracking-[0.12em] text-accent">Progresso semanal</span>
          <span className="tabular-nums text-ink">{league.userWeeklyXp} XP</span>
        </div>
        <ProgressBar value={league.userWeeklyXp} max={Math.max(100, league.userWeeklyXp)} className="mt-2 h-2" />
        <p className="mt-1.5 text-[11px] text-ink-faint">XP ganho nesta semana da liga.</p>
      </CompactCard>

      {dailyMission && (
        <CompactCard>
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
            <IconTarget width={12} height={12} /> Missão do dia
          </div>
          <div className="mt-1 text-[13px] font-semibold text-ink">{dailyMission.title}</div>
          <div className="mt-1.5 flex items-center gap-2">
            <ProgressBar value={dailyMission.progress} max={dailyMission.goal} className="h-2 flex-1" />
            <span className="shrink-0 text-[11px] font-semibold tabular-nums text-ink-faint">{dailyMission.progress}/{dailyMission.goal}</span>
          </div>
          <Link to="/missoes" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
            Ver missões <IconChevron width={13} height={13} />
          </Link>
        </CompactCard>
      )}
    </RightRail>
    </div>
  );

  return (
    <PageShell width="wide" rail={rail}>
      {/* 1 · Header do perfil — identidade do aluno. */}
      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
        <div className="relative mx-auto h-20 w-20 shrink-0 sm:mx-0">
          <div className="grid h-20 w-20 place-items-center rounded-2xl bg-surface-2">
            <Mascot size={66} variant={streak > 0 ? "celebrate" : "wave"} />
          </div>
          <span className="absolute -bottom-1.5 -right-1.5 rounded-full border-2 border-surface bg-accent px-2 py-0.5 text-[11px] font-bold text-white">
            {initials(name)}
          </span>
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h1 className="font-serif text-xl font-semibold leading-tight text-ink sm:text-2xl">{name}</h1>
          <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 text-xs text-ink-faint sm:justify-start">
            {nickname && <span className="font-medium text-ink-soft">{nickname}</span>}
            {since && <span>· estuda desde {since}</span>}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 sm:justify-start">
            <Pill tone="accent">PT-BR → Mandarim</Pill>
            {streak > 0 && (
              <Pill tone="muted">
                <IconFlame width={12} height={12} /> {streak} {streak === 1 ? "dia" : "dias"}
              </Pill>
            )}
          </div>
        </div>
        <div className="shrink-0">
          <ActionButton to="/conta" variant="secondary" size="sm" icon={<IconUser width={15} height={15} />}>
            Editar perfil
          </ActionButton>
        </div>
      </Card>

      {/* 2 · Estatísticas principais — 4 cards (2x2 no mobile). */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatTile key={s.label} icon={s.icon} value={s.value} label={s.label} tone={s.tone} />
        ))}
      </div>

      {/* 2b · Ofensiva — calendário de desempenho (fuso local). */}
      <div id="ofensiva" className="scroll-mt-20">
      <CompactCard>
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Ofensiva</div>
          <div className="text-xs font-semibold text-ink">
            <IconFlame width={12} height={12} className="mr-1 inline text-accent" />
            {streak} {streak === 1 ? "dia" : "dias"}
          </div>
        </div>
        <p className="mb-3 text-xs leading-5 text-ink-soft">
          Conta à meia-noite do seu horário local. Só sobe quando você faz uma tarefa — entrar no site não conta.
          Passou 24h sem estudar? A ofensiva zera, mas você tem o dia todo para recuperá-la fazendo um exercício.
        </p>
        {streakRecovery && streakRecovery.brokenOn === todayKey() && (
          <div className="mb-3 flex flex-col gap-2 rounded-2xl border border-accent-soft bg-accent-soft/60 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <IconFlame width={16} height={16} className="mt-0.5 shrink-0 text-accent" />
              <p className="text-xs leading-5 text-ink">
                Sua ofensiva de {streakRecovery.streak} {streakRecovery.streak === 1 ? "dia" : "dias"} zerou por 24h sem estudo.
                Faça um exercício hoje e ela volta.
              </p>
            </div>
            <Link
              to="/revisao"
              onClick={() => clearStreakRecovery()}
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-accent px-4 text-sm font-semibold text-white shadow-card transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
            >
              <IconRefresh width={15} height={15} /> Recuperar ofensiva
            </Link>
          </div>
        )}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day) => {
            const level = studyLevel(day.record);
            const tone =
              level === 0
                ? "bg-surface-2"
                : level === 1
                ? "bg-accent/35"
                : level === 2
                ? "bg-accent/65"
                : "bg-accent";
            const title = day.record
              ? `${day.key}: ${day.record.xp} XP · ${day.record.tasks} tarefa(s) · ${day.record.minutes} min`
              : `${day.key}: sem estudo`;
            return (
              <div
                key={day.key}
                title={title}
                className={[
                  "aspect-square rounded-md",
                  tone,
                  day.isToday ? "ring-2 ring-accent ring-offset-1 ring-offset-surface" : "",
                ].join(" ")}
                aria-label={title}
              />
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[11px]">
          <div className="rounded-xl bg-surface-2 px-2 py-1.5">
            <div className="font-semibold tabular-nums text-ink">{todayStudy?.xp ?? 0}</div>
            <div className="text-ink-faint">XP hoje</div>
          </div>
          <div className="rounded-xl bg-surface-2 px-2 py-1.5">
            <div className="font-semibold tabular-nums text-ink">{todayStudy?.tasks ?? 0}</div>
            <div className="text-ink-faint">Tarefas</div>
          </div>
          <div className="rounded-xl bg-surface-2 px-2 py-1.5">
            <div className="font-semibold tabular-nums text-ink">{todayStudy?.minutes ?? 0}m</div>
            <div className="text-ink-faint">Estudo</div>
          </div>
        </div>
      </CompactCard>
      </div>

      {/* 3 · Progresso de aprendizado — barras por competência. */}
      <CompactCard>
        <div className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">Progresso de aprendizado</div>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {DOMAIN_ORDER.map((track) => {
            const meta = DOMAIN_META[track];
            const row = domainRows.find((r) => r.track === track);
            const pct = Math.max(0, Math.min(100, Math.round(row?.percent ?? 0)));
            const Icon = meta.icon;
            return (
              <div key={track} className="min-w-0">
                <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md" style={{ background: `${meta.color}1a`, color: meta.color }}>
                      <Icon width={12} height={12} />
                    </span>
                    <span className="truncate">{meta.label} <span className="font-normal text-ink-faint">· {meta.tagline}</span></span>
                  </span>
                  <span className="shrink-0 tabular-nums font-semibold text-ink-soft">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: meta.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </CompactCard>

      {/* 4 + 5 · Conquistas e histórico (lado a lado no desktop, recolhíveis no mobile). */}
      <div className="grid gap-3 lg:grid-cols-2 lg:items-start">
      <ResponsiveCollapsible
        title="Conquistas recentes"
        badge={`${unlockedCount} desbloqueada${unlockedCount === 1 ? "" : "s"}`}
      >
        {recentAchievements.length > 0 ? (
          <>
            <div className="grid gap-2">
              {recentAchievements.map((def) => (
                <div key={def.id} className="flex items-center gap-2.5 rounded-xl border border-line/50 bg-surface-2/60 px-3 py-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gold/10 text-gold">
                    <IconTrophy width={16} height={16} />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-semibold text-ink">{def.title}</div>
                    <div className="truncate text-[11px] text-ink-faint">{def.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link to="/conquistas" className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
              Ver todas <IconChevron width={13} height={13} />
            </Link>
          </>
        ) : (
          <EmptyState
            icon={IconTrophy}
            title="Nenhuma conquista ainda"
            desc="Conclua lições e mantenha a sequência para desbloquear medalhas."
            action={<ActionButton to="/jornada" size="sm" trailingChevron>Continuar Jornada</ActionButton>}
          />
        )}
      </ResponsiveCollapsible>

      {/* 5 · Histórico recente (recolhível no mobile). */}
      <ResponsiveCollapsible title="Histórico recente" badge={lastLessonTitle ? `Última: ${lastLessonTitle}` : undefined}>
        {history.length > 0 ? (
          <div className="grid gap-2">
            {history.map((event, i) => (
              <div key={i} className="flex items-center gap-2.5 rounded-xl border border-line/50 bg-surface-2/60 px-3 py-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface text-accent">{event.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-ink">{event.label}</div>
                  <div className="text-[11px] text-ink-faint">{event.detail}</div>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-ink-faint">{event.time}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[13px] text-ink-soft">Seu histórico recente aparece aqui conforme você estuda.</p>
        )}
      </ResponsiveCollapsible>
      </div>

      {/* 6 · Social — sem amigos falsos: só um card honesto de "em breve". */}
      <CompactCard className="border-dashed">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-faint">
            <IconUser width={18} height={18} />
          </span>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-ink">Amigos em breve</div>
            <div className="text-[11px] text-ink-faint">Comparar progresso com amigos chega em uma próxima atualização.</div>
          </div>
        </div>
      </CompactCard>
    </PageShell>
  );
}

// Bloco recolhível: aberto por padrão no desktop, fechado no mobile.
function ResponsiveCollapsible({ title, badge, children }: { title: string; badge?: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    if (typeof window !== "undefined") setOpen(window.matchMedia("(min-width: 1024px)").matches);
  }, []);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
      className="rounded-xl border border-line/50 bg-surface p-3 shadow-card sm:p-3.5"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-accent">
          <IconRefresh width={12} height={12} /> {title}
        </span>
        <span className="flex items-center gap-1.5">
          {badge && <span className="max-w-[9rem] truncate text-[11px] font-medium text-ink-faint">{badge}</span>}
          <IconChevron width={14} height={14} className="text-ink-faint transition group-open:rotate-90" />
        </span>
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
