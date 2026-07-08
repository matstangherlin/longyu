import { useEffect, useState } from "react";
import {
  ACHIEVEMENTS,
  achievementRewardLabel,
  isAchievementComplete,
  type AchievementDef,
  type AchievementSnapshot,
} from "../../data/achievements";
import { freshLifetimeStats, useStore } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import { Button } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { ACHIEVEMENT_CATEGORY_META } from "../../data/achievements";

/** Snapshot reativo da store para calcular o progresso das medalhas. */
export function useAchievementSnapshot(): AchievementSnapshot {
  const completedLessons = useStore((s) => s.completedLessons);
  const longestStreak = useStore((s) => s.longestStreak);
  const xpTotal = useStore((s) => s.xpTotal);
  const learnedChars = useStore((s) => s.learnedChars);
  const learnedChunks = useStore((s) => s.learnedChunks);
  const srs = useStore((s) => s.srs);
  const lifetimeStats = useStore((s) => s.lifetimeStats);
  const medals = useStore((s) => s.medals);
  const missionHistory = useStore((s) => s.missionHistory);
  const rewardHistory = useStore((s) => s.rewardHistory);
  const mandarinDisplayMode = useStore((s) => s.mandarinDisplayMode);
  return {
    completedLessons,
    longestStreak,
    xpTotal,
    learnedChars,
    learnedChunks,
    srs,
    lifetimeStats: lifetimeStats ?? freshLifetimeStats(),
    medals: medals ?? [],
    missionHistory: missionHistory ?? [],
    rewardHistory: rewardHistory ?? [],
    mandarinDisplayMode,
  };
}

// Observa o progresso e desbloqueia medalhas completas. O unlockAchievement é
// idempotente na store, então nenhuma medalha (nem recompensa) duplica — mesmo
// que o efeito rode duas vezes.
export function AchievementsWatcher() {
  const snapshot = useAchievementSnapshot();
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked);
  const unlockAchievement = useStore((s) => s.unlockAchievement);
  const soundEffects = useStore((s) => s.soundEffects);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);

  const [queue, setQueue] = useState<AchievementDef[]>([]);

  useEffect(() => {
    if (!accountSetupComplete) return;
    const unlockedNow = ACHIEVEMENTS.filter(
      (def) => !(achievementsUnlocked ?? {})[def.id] && isAchievementComplete(def, snapshot)
    ).filter((def) => unlockAchievement(def.id, def.reward));
    if (unlockedNow.length > 0) {
      playSoundFx("medal", soundEffects);
      setQueue((current) => [...current, ...unlockedNow]);
    }
    // O snapshot é recriado por render, mas os campos internos são referências
    // estáveis da store — as deps abaixo cobrem tudo que muda progresso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountSetupComplete,
    achievementsUnlocked,
    snapshot.completedLessons,
    snapshot.learnedChars,
    snapshot.learnedChunks,
    snapshot.lifetimeStats,
    snapshot.longestStreak,
    snapshot.mandarinDisplayMode,
    snapshot.medals,
    snapshot.missionHistory,
    snapshot.rewardHistory,
    snapshot.srs,
    snapshot.xpTotal,
    soundEffects,
    unlockAchievement,
  ]);

  const current = queue[0];
  if (!current) return null;

  return (
    <AchievementUnlockModal
      achievement={current}
      onClose={() => setQueue((items) => items.slice(1))}
    />
  );
}

// Modal pequeno: "Nova medalha!" com ícone, nome e recompensa.
function AchievementUnlockModal({
  achievement,
  onClose,
}: {
  achievement: AchievementDef;
  onClose: () => void;
}) {
  const category = ACHIEVEMENT_CATEGORY_META[achievement.category];
  // Tela cheia no mobile (momento de recompensa); card centrado no desktop.
  return (
    <ModalOverlay
      className="items-stretch p-0 sm:items-center sm:p-4"
      label="Nova medalha desbloqueada"
      onBackdropClick={onClose}
    >
      <div
        className="flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_55%,rgb(var(--bg))_100%)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-[30px] sm:border sm:border-accent-soft sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="my-auto sm:my-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Nova medalha!
          </div>
          <div className="longyu-chest-open mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-accent text-white shadow-lift sm:mt-4 sm:h-20 sm:w-20 sm:rounded-[26px]">
            <span aria-hidden className="hanzi text-5xl leading-none sm:text-4xl">{achievement.glyph}</span>
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold text-ink sm:mt-4 sm:text-2xl">{achievement.title}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft sm:mt-1">{achievement.desc}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:mt-3">
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-soft">
              {category.label}
            </span>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
              {achievementRewardLabel(achievement.reward)}
            </span>
          </div>
        </div>
        <Button size="lg" className="mt-6 w-full shadow-lift sm:mt-5" onClick={onClose}>
          Continuar
        </Button>
      </div>
    </ModalOverlay>
  );
}
