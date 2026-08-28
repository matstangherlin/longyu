import { useEffect } from "react";
import { PEARL_STREAK_MILESTONES } from "../../data/economy";
import { useStore } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import { Button } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { IconFlame, IconShield, IconStar } from "../ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";

function dayCountLabel(days: number, one: string, many: string): string {
  return days === 1 ? one : many.replace("{count}", String(days));
}

const STREAK_MILESTONES = PEARL_STREAK_MILESTONES.map((m) => m.days);

/**
 * Modal de ofensiva (estilo medalha): aparece ao completar um dia de estudo.
 * Só sobe com tarefa real (recordStudyDay), nunca com visita ao site.
 */
export function StreakWatcher() {
  const { t } = useTranslation();
  const pending = useStore((s) => s.pendingStreakCelebration);
  const clear = useStore((s) => s.clearStreakCelebration);
  const hold = useStore((s) => s.holdAchievementModals);
  const soundEffects = useStore((s) => s.soundEffects);
  const streakShields = useStore((s) => s.streakShields);
  const activityByDay = useStore((s) => s.activityByDay);
  const lastStudyDate = useStore((s) => s.lastStudyDate);

  useEffect(() => {
    if (pending == null || hold) return;
    playSoundFx("streak", soundEffects);
  }, [pending, hold, soundEffects]);

  if (pending == null || hold) return null;

  const today = lastStudyDate ? activityByDay[lastStudyDate] : undefined;
  const nextMilestone = STREAK_MILESTONES.find((mark) => mark > pending) ?? pending + 7;
  const daysLabel = dayCountLabel(pending, t("shell.dayCountOne"), t("shell.dayCountMany", { count: pending }));

  return (
    <ModalOverlay
      className="items-stretch p-0 sm:items-center sm:p-4"
      label={t("shell.streakUpdated")}
      onBackdropClick={clear}
    >
      <div
        className="flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(183,121,31,.28),rgb(var(--surface))_55%,rgb(var(--bg))_100%)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-[30px] sm:border sm:border-accent-soft sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="my-auto sm:my-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {t("shell.streakTitle")}
          </div>
          <div className="longyu-chest-open mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-accent text-white shadow-lift sm:mt-4 sm:h-20 sm:w-20 sm:rounded-[26px]">
            <IconFlame width={44} height={44} fill="currentColor" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold text-ink sm:mt-4 sm:text-2xl">
            {t("shell.streakInARow", { days: daysLabel })}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft sm:mt-1">
            {t("shell.streakBody")}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded-2xl bg-surface-2 px-2.5 py-2">
              <div className="font-semibold text-ink">{today?.xp ?? 0}</div>
              <div className="text-ink-faint">{t("shell.xpToday")}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-2.5 py-2">
              <div className="font-semibold text-ink">{today?.tasks ?? 0}</div>
              <div className="text-ink-faint">{t("shell.tasks")}</div>
            </div>
            <div className="rounded-2xl bg-surface-2 px-2.5 py-2">
              <div className="font-semibold text-ink">{today?.minutes ?? 0}m</div>
              <div className="text-ink-faint">{t("shell.study")}</div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
              <IconStar width={12} height={12} /> {t("shell.nextMilestone", { count: nextMilestone })}
            </span>
            {streakShields > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-soft">
                <IconShield width={12} height={12} /> {t("shell.shields", { count: streakShields })}
              </span>
            )}
          </div>
        </div>
        <Button size="lg" className="mt-6 w-full shadow-lift sm:mt-5" onClick={clear}>
          {t("common.continue")}
        </Button>
      </div>
    </ModalOverlay>
  );
}
