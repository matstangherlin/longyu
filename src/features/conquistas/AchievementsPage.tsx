import { useMemo, useState } from "react";
import {
  ACHIEVEMENTS,
  achievementPresentationKind,
  type AchievementDef,
  type AchievementPresentationKind,
} from "../../data/achievements";
import { useAchievementSnapshot } from "../../components/achievements/AchievementsWatcher";
import { useStore } from "../../lib/store";
import { Card, EmptyState, Pill, ProgressBar, SectionTitle } from "../../components/ui/primitives";
import { formatDate } from "../../i18n/format";
import { useTranslation } from "../../i18n/useTranslation";
import {
  localizedAchievementCategory,
  localizedAchievementDesc,
  localizedAchievementReward,
  localizedAchievementTitle,
} from "../../i18n/achievements";

type AchievementFilter = "todas" | "desbloqueadas" | "bloqueadas" | "proximas";

interface AchievementView {
  def: AchievementDef;
  current: number;
  target: number;
  ratio: number;
  unlockedAt?: number;
}

function formatUnlockDate(timestamp: number): string {
  return formatDate(timestamp, { day: "2-digit", month: "short", year: "numeric" });
}

export function AchievementsPage() {
  const { t } = useTranslation();
  const snapshot = useAchievementSnapshot();
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked ?? {});
  const [filter, setFilter] = useState<AchievementFilter>("todas");
  const FILTERS: { id: AchievementFilter; label: string }[] = [
    { id: "todas", label: t("hub.filterAll") },
    { id: "desbloqueadas", label: t("hub.filterUnlocked") },
    { id: "bloqueadas", label: t("hub.filterLocked") },
    { id: "proximas", label: t("hub.filterUpcoming") },
  ];

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
    <div className="mx-auto max-w-5xl space-y-5 pb-[calc(var(--app-safe-bottom)+1rem)]">
      <SectionTitle
        eyebrow={t("hub.achievementsEyebrow")}
        title={t("navigation.achievements")}
        desc={t("hub.achievementsDesc")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="ui-scroll-tabs min-w-0 flex-1">
          <div className="flex min-w-max gap-2">
            {FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setFilter(option.id)}
                aria-pressed={filter === option.id}
                className={[
                  "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45",
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
          {t("hub.unlockedCount", { count: unlocked.length, total: views.length })}
        </Pill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* RC2.2.11 — MEDALHAS (raras) · CONQUISTAS · MARCOS: o mesmo motor,
            três pesos visuais. Nada some; a poluição vira hierarquia. */}
        <div className="min-w-0 space-y-6" data-testid="achievement-sections">
          {KIND_ORDER.map((kind) => {
            const items = visible.filter((view) => achievementPresentationKind(view.def) === kind);
            if (items.length === 0) return null;
            return (
              <section key={kind} data-testid={`achievement-section-${kind}`} data-achievement-kind={kind} aria-labelledby={`achievement-section-${kind}-title`}>
                <div className="mb-2.5 flex items-baseline justify-between gap-2">
                  <h2 id={`achievement-section-${kind}-title`} className="font-serif text-lg font-semibold text-ink">
                    {t(KIND_COPY[kind].title)}
                  </h2>
                  <span className="text-xs text-ink-faint">{t(KIND_COPY[kind].desc)}</span>
                </div>
                <div
                  className={
                    kind === "medal"
                      ? "grid grid-cols-1 gap-3 sm:grid-cols-2"
                      : kind === "achievement"
                        ? "grid grid-cols-1 gap-3 min-[390px]:grid-cols-2 xl:grid-cols-3"
                        : "grid grid-cols-1 gap-2 min-[390px]:grid-cols-2 xl:grid-cols-3"
                  }
                >
                  {items.map((view) => (
                    <AchievementCard key={view.def.id} view={view} kind={kind} />
                  ))}
                </div>
              </section>
            );
          })}
          {visible.length === 0 && (
            <EmptyState
              title={t("hub.emptyFilterTitle")}
              desc={t("hub.emptyFilterDesc")}
            />
          )}
        </div>

        {/* Painel lateral (desktop): próxima conquista mais perto de sair. */}
        <aside className="hidden lg:block">
          <Card className="p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
              {t("hub.nextAchievement")}
            </div>
            {nextUp ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <span className="hanzi flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-3xl text-accent">
                    {nextUp.def.glyph}
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold text-ink">{localizedAchievementTitle(nextUp.def.id, nextUp.def.title)}</div>
                    <div className="text-xs text-ink-faint">
                      {localizedAchievementCategory(nextUp.def.category)}
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{localizedAchievementDesc(nextUp.def.id, nextUp.def.desc)}</p>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-medium text-ink-faint">
                    <span>{t("common.progress")}</span>
                    <span className="tabular-nums">{nextUp.current}/{nextUp.target}</span>
                  </div>
                  <ProgressBar value={nextUp.current} max={nextUp.target} />
                </div>
                <div className="mt-3 text-xs font-semibold text-accent">
                  {t("hub.rewardLabel", { label: localizedAchievementReward(nextUp.def.reward) })}
                </div>
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink-soft">
                {t("hub.allUnlocked")}
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

const KIND_ORDER: readonly AchievementPresentationKind[] = ["medal", "achievement", "milestone"];

const KIND_COPY: Record<AchievementPresentationKind, { title: string; desc: string; label: string }> = {
  medal: { title: "hub.achievementKindMedals", desc: "hub.achievementKindMedalsDesc", label: "hub.achievementKindMedal" },
  achievement: {
    title: "hub.achievementKindAchievements",
    desc: "hub.achievementKindAchievementsDesc",
    label: "hub.achievementKindAchievement",
  },
  milestone: { title: "hub.achievementKindMilestones", desc: "hub.achievementKindMilestonesDesc", label: "hub.achievementKindMilestone" },
};

function AchievementCard({ view, kind }: { view: AchievementView; kind: AchievementPresentationKind }) {
  const { t } = useTranslation();
  const { def, current, target, unlockedAt } = view;
  const unlocked = Boolean(unlockedAt);
  const medal = kind === "medal";
  const milestone = kind === "milestone";

  return (
    <Card
      data-testid={`achievement-card-${def.id}`}
      data-achievement-kind={kind}
      className={[
        "flex min-w-0 flex-col transition",
        medal ? "min-h-44 p-4 sm:p-5" : milestone ? "min-h-0 p-3" : "min-h-40 p-3.5 sm:p-4",
        unlocked
          ? medal
            ? "border-gold/50 bg-[radial-gradient(circle_at_100%_0%,rgb(var(--gold)/0.14),rgb(var(--surface))_60%)] shadow-card"
            : "border-accent-soft bg-surface"
          : "border-line bg-surface-2/70",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={[
            "hanzi flex shrink-0 items-center justify-center",
            medal ? "h-14 w-14 rounded-2xl text-3xl" : milestone ? "h-8 w-8 rounded-lg text-lg" : "h-11 w-11 rounded-xl text-2xl",
            unlocked
              ? medal
                ? "bg-gold text-white shadow-lift ring-2 ring-gold/30"
                : milestone
                  ? "bg-accent-soft text-accent"
                  : "bg-accent text-white shadow-card"
              : "bg-surface-2 text-ink-faint grayscale",
          ].join(" ")}
        >
          {def.glyph}
        </span>
        <span className="flex flex-col items-end gap-1">
          <span
            className={[
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              medal ? "bg-gold/15 text-gold" : "bg-surface-2 text-ink-faint",
            ].join(" ")}
          >
            {t(KIND_COPY[kind].label)}
          </span>
          <span className="text-[10px] font-medium text-ink-faint">{localizedAchievementCategory(def.category)}</span>
        </span>
      </div>
      <h3 className="mt-3 text-sm font-semibold leading-tight text-ink">{localizedAchievementTitle(def.id, def.title)}</h3>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{localizedAchievementDesc(def.id, def.desc)}</p>
      <div className="mt-auto space-y-1.5 pt-3">
        <div className="flex items-center justify-between gap-2 text-[11px] font-medium">
          <span className={unlocked ? "font-semibold text-[rgb(var(--good))]" : "text-ink-faint"}>
            {unlocked ? t("achievements.unlocked") : t("achievements.locked")}
          </span>
          <span className="truncate text-ink-faint">{localizedAchievementReward(def.reward)}</span>
        </div>
        <ProgressBar value={current} max={target} />
        <div className="flex items-center justify-between gap-2 text-[11px] text-ink-faint">
          <span className="tabular-nums">{current}/{target}</span>
          <span>{unlockedAt ? formatUnlockDate(unlockedAt) : t("achievements.noDateYet")}</span>
        </div>
      </div>
    </Card>
  );
}
