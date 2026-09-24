import { useEffect, useState } from "react";
import {
  ACHIEVEMENTS,
  achievementPresentationKind,
  isAchievementComplete,
  type AchievementDef,
  type AchievementSnapshot,
} from "../../data/achievements";
import { freshLifetimeStats, useStore } from "../../lib/store";
import { playSoundFx } from "../../lib/soundFx";
import { holdCelebration, useOtherCelebrationActive } from "../../lib/celebrationLock";
import { pendingCultureSealReveals } from "../../lib/profileShowcase";
import { Button } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { useTranslation } from "../../i18n/useTranslation";
import {
  localizedAchievementCategory,
  localizedAchievementDesc,
  localizedAchievementReward,
  localizedAchievementTitle,
} from "../../i18n/achievements";

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
  const validatedModules = useStore((s) => s.validatedModules);
  const cultureCompletedIds = useStore((s) => s.cultureCompletedIds);
  const cultureSeals = useStore((s) => s.cultureSeals);
  const cultureKnowledgeById = useStore((s) => s.cultureKnowledgeById);
  return {
    completedLessons: completedLessons ?? [],
    longestStreak,
    xpTotal,
    learnedChars: learnedChars ?? [],
    learnedChunks: learnedChunks ?? [],
    srs: srs ?? {},
    lifetimeStats: lifetimeStats ?? freshLifetimeStats(),
    medals: medals ?? [],
    missionHistory: missionHistory ?? [],
    rewardHistory: rewardHistory ?? [],
    mandarinDisplayMode,
    validatedModules: validatedModules ?? [],
    cultureCompletedIds: cultureCompletedIds ?? [],
    cultureSeals: cultureSeals ?? [],
    cultureKnowledgeById: cultureKnowledgeById ?? {},
  };
}

// Observa o progresso e desbloqueia medalhas completas. O unlockAchievement é
// idempotente na store, então nenhuma medalha (nem recompensa) duplica — mesmo
// que o efeito rode duas vezes.
// Durante a lição (holdAchievementModals), o desbloqueio acontece em silêncio e
// o modal só aparece ao concluir a tarefa / sair do modo exercício.
export function AchievementsWatcher() {
  const snapshot = useAchievementSnapshot();
  const achievementsUnlocked = useStore((s) => s.achievementsUnlocked);
  const unlockAchievement = useStore((s) => s.unlockAchievement);
  const soundEffects = useStore((s) => s.soundEffects);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const holdAchievementModals = useStore((s) => s.holdAchievementModals);

  const [queue, setQueue] = useState<AchievementDef[]>([]);
  const [pendingShow, setPendingShow] = useState<AchievementDef[]>([]);
  // RC2.2.8 — reveal de Selo e modal de medalha nunca se empilham.
  const otherCelebration = useOtherCelebrationActive("achievement-unlock");
  // O selo tem a vez: quando os dois nascem juntos, a medalha espera o reveal.
  const sealRevealPending = useStore(
    (s) => pendingCultureSealReveals(s.cultureSeals, s.cultureSealsRevealed).length > 0
  );

  useEffect(() => {
    if (!accountSetupComplete) return;
    const unlockedNow = ACHIEVEMENTS.filter(
      (def) => !(achievementsUnlocked ?? {})[def.id] && isAchievementComplete(def, snapshot)
    ).filter((def) => unlockAchievement(def.id, def.reward));
    if (unlockedNow.length > 0) {
      if (holdAchievementModals) {
        setPendingShow((current) => [...current, ...unlockedNow]);
      } else {
        playSoundFx("medal", soundEffects);
        setQueue((current) => [...current, ...unlockedNow]);
      }
    }
    // O snapshot é recriado por render, mas os campos internos são referências
    // estáveis da store — as deps abaixo cobrem tudo que muda progresso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    accountSetupComplete,
    achievementsUnlocked,
    holdAchievementModals,
    snapshot.completedLessons,
    snapshot.cultureCompletedIds,
    snapshot.cultureKnowledgeById,
    snapshot.cultureSeals,
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

  useEffect(() => {
    if (holdAchievementModals || pendingShow.length === 0) return;
    playSoundFx("medal", soundEffects);
    setQueue((current) => [...current, ...pendingShow]);
    setPendingShow([]);
  }, [holdAchievementModals, pendingShow, soundEffects]);

  const current = queue[0];
  if (!current || holdAchievementModals || otherCelebration || sealRevealPending) return null;

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
  const { t } = useTranslation();
  useEffect(() => holdCelebration("achievement-unlock"), []);
  // RC2.2.11 — o peso do momento segue a raridade: MEDALHA ganha a tela cheia
  // (mobile); CONQUISTA e MARCO viram um card compacto. Nada de "Nova
  // medalha!" para o primeiro áudio.
  const kind = achievementPresentationKind(achievement);
  const copy =
    kind === "medal"
      ? { label: "shell.newMedalUnlocked", headline: "shell.newMedal" }
      : kind === "achievement"
        ? { label: "shell.newAchievementUnlocked", headline: "shell.newAchievement" }
        : { label: "shell.newMilestoneUnlocked", headline: "shell.newMilestone" };
  const fullScreen = kind === "medal";
  return (
    <ModalOverlay
      className={fullScreen ? "items-stretch p-0 sm:items-center sm:p-4" : "items-center p-4"}
      label={t(copy.label)}
      onBackdropClick={onClose}
    >
      <div
        data-achievement-kind={kind}
        className={
          fullScreen
            ? "flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgb(var(--accent-soft)),rgb(var(--surface))_55%,rgb(var(--bg))_100%)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-[30px] sm:border sm:border-accent-soft sm:p-7"
            : "flex w-full max-w-sm flex-col rounded-[26px] border border-line bg-surface px-5 py-5 text-center shadow-lift"
        }
        onClick={(event) => event.stopPropagation()}
      >
        <div className={fullScreen ? "my-auto sm:my-0" : ""}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {t(copy.headline)}
          </div>
          <div
            className={
              fullScreen
                ? "longyu-chest-open mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-gold text-white shadow-lift ring-4 ring-gold/25 sm:mt-4 sm:h-20 sm:w-20 sm:rounded-[26px]"
                : "mx-auto mt-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"
            }
          >
            <span aria-hidden className={["hanzi leading-none", fullScreen ? "text-5xl sm:text-4xl" : "text-3xl"].join(" ")}>{achievement.glyph}</span>
          </div>
          <h2 className={["font-serif font-semibold text-ink", fullScreen ? "mt-5 text-3xl sm:mt-4 sm:text-2xl" : "mt-3 text-xl"].join(" ")}>{localizedAchievementTitle(achievement.id, achievement.title)}</h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft sm:mt-1">{localizedAchievementDesc(achievement.id, achievement.desc)}</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-xs sm:mt-3">
            <span className="rounded-full bg-surface-2 px-2.5 py-1 font-medium text-ink-soft">
              {localizedAchievementCategory(achievement.category)}
            </span>
            <span className="rounded-full bg-accent-soft px-2.5 py-1 font-semibold text-accent">
              {localizedAchievementReward(achievement.reward)}
            </span>
          </div>
        </div>
        <Button size="lg" className="mt-6 w-full shadow-lift sm:mt-5" onClick={onClose}>
          {t("common.continue")}
        </Button>
      </div>
    </ModalOverlay>
  );
}
