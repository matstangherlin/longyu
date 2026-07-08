import { useMemo, useState } from "react";
import {
  ACHIEVEMENTS,
  ACHIEVEMENT_CATEGORY_META,
  achievementRewardLabel,
  type AchievementDef,
} from "../../data/achievements";
import { useAchievementSnapshot } from "../../components/achievements/AchievementsWatcher";
import { useStore } from "../../lib/store";
import { Card, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";

type AchievementFilter = "todas" | "desbloqueadas" | "bloqueadas" | "proximas";

const FILTERS: { id: AchievementFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "desbloqueadas", label: "Desbloqueadas" },
  { id: "bloqueadas", label: "Bloqueadas" },
  { id: "proximas", label: "Próximas" },
];

interface AchievementView {
  def: AchievementDef;
  current: number;
  target: number;
  ratio: number;
  unlockedAt?: number;
}

function formatUnlockDate(timestamp: number): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).format(timestamp);
}

export function AchievementsPage() {
  const snapshot = useAchievementSnapshot();
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked ?? {});
  const [filter, setFilter] = useState<AchievementFilter>("todas");

  const views = useMemo<AchievementView[]>(
    () =>
      ACHIEVEMENTS.map((def) => {
        const { current, target } = def.progress(snapshot);
        return {
          def,
          current,
          target,
          ratio: target > 0 ? current / target : 0,
          unlockedAt: achievementsUnlocked[def.id],
        };
      }),
    [achievementsUnlocked, snapshot]
  );

  const unlocked = views.filter((view) => view.unlockedAt);
  const locked = views.filter((view) => !view.unlockedAt);
  // "Próximas": bloqueadas mais perto de completar.
  const upcoming = [...locked].sort((a, b) => b.ratio - a.ratio).slice(0, 6);
  const nextUp = upcoming[0];

  const visible =
    filter === "desbloqueadas"
      ? unlocked
      : filter === "bloqueadas"
      ? locked
      : filter === "proximas"
      ? upcoming
      : views;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      <SectionTitle
        eyebrow="Meu Longyu"
        title="Conquistas"
        desc="Medalhas da sua jornada no mandarim. A medalha do mês continua especial, em Missões."
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <div className="flex min-w-max gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                className={[
                  "inline-flex h-10 items-center rounded-full border px-3.5 text-sm font-semibold transition",
                  filter === option.id
                    ? "border-accent bg-accent text-white shadow-card"
                    : "border-line bg-surface text-ink-soft hover:bg-surface-2 hover:text-ink",
                ].join(" ")}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <Pill tone={unlocked.length > 0 ? "accent" : "muted"}>
          {unlocked.length}/{views.length} desbloqueadas
        </Pill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-3">
          {visible.map((view) => (
            <AchievementCard key={view.def.id} view={view} />
          ))}
          {visible.length === 0 && (
            <Card className="col-span-full p-6 text-center text-sm text-ink-soft">
              Nada por aqui ainda. Continue estudando — as medalhas vêm com a prática.
            </Card>
          )}
        </div>

        {/* Painel lateral (desktop): próxima conquista mais perto de sair. */}
        <aside className="hidden lg:block">
          <Card className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              Próxima conquista
            </div>
            {nextUp ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <span className="hanzi flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-3xl text-accent">
                    {nextUp.def.glyph}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{nextUp.def.title}</div>
                    <div className="text-xs text-ink-faint">
                      {ACHIEVEMENT_CATEGORY_META[nextUp.def.category].label}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{nextUp.def.desc}</p>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink-faint">
                    <span>Progresso</span>
                    <span className="tabular-nums">{nextUp.current}/{nextUp.target}</span>
                  </div>
                  <ProgressBar value={nextUp.current} max={nextUp.target} />
                </div>
                <div className="mt-3 text-xs font-semibold text-accent">
                  Recompensa: {achievementRewardLabel(nextUp.def.reward)}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                Você desbloqueou tudo. 干杯 — brinde do dragão!
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function AchievementCard({ view }: { view: AchievementView }) {
  const { def, current, target, unlockedAt } = view;
  const unlocked = Boolean(unlockedAt);
  const category = ACHIEVEMENT_CATEGORY_META[def.category];

  return (
    <Card
      className={[
        "flex min-h-40 flex-col p-3.5 transition sm:p-4",
        unlocked ? "border-accent-soft bg-surface" : "border-line bg-surface-2/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={[
            "hanzi flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl",
            unlocked ? "bg-accent text-white shadow-card" : "bg-surface-2 text-ink-faint grayscale",
          ].join(" ")}
        >
          {def.glyph}
        </span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
          {category.label}
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-tight text-ink">{def.title}</h3>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{def.desc}</p>
      <div className="mt-auto space-y-1.5 pt-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
          <span className={unlocked ? "font-semibold text-[rgb(var(--good))]" : "text-ink-faint"}>
            {unlocked ? "Desbloqueada" : "Bloqueada"}
          </span>
          <span className="truncate text-ink-faint">{achievementRewardLabel(def.reward)}</span>
        </div>
        <ProgressBar value={current} max={target} />
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-faint">
          <span className="tabular-nums">{current}/{target}</span>
          <span>{unlockedAt ? formatUnlockDate(unlockedAt) : "Ainda sem data"}</span>
        </div>
      </div>
    </Card>
  );
}
