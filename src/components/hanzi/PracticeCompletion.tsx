import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "../ui/primitives";
import { RewardReveal } from "../chests/RewardReveal";
import { IconCheck, IconTarget } from "../ui/Icon";
import type { ChestRewardItem } from "../../lib/store";
import { hapticOnce } from "../../lib/haptics";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import { useTranslation } from "../../i18n/useTranslation";

export interface PracticeMissionProgress {
  id: string;
  title: string;
  progress: number;
  goal: number;
  complete: boolean;
}

/**
 * RC2.2.14 · BA — fim de uma rodada de treino.
 *
 * Mostra SÓ o que aconteceu de verdade: o XP que `grantPracticeRoundXp`
 * pagou agora (zero → diz "treino extra"), as missões cujo progresso andou
 * nesta rodada, Pérolas apenas se um marco de hànzì foi resgatado e quantas
 * formas entraram na revisão. Reusa `RewardReveal`; nada é inventado aqui.
 */
export function PracticeCompletion({
  roundKey,
  correct,
  total,
  xp,
  xpCapped,
  pearls,
  missions,
  formsReviewed,
  onContinue,
  hubTo = "/ideogramas",
}: {
  roundKey: string;
  correct: number;
  total: number;
  xp: number;
  xpCapped: boolean;
  pearls: number;
  missions: PracticeMissionProgress[];
  formsReviewed: number;
  onContinue: () => void;
  hubTo?: string;
}) {
  const { t, instructionLocale } = useTranslation();
  const rewards: ChestRewardItem[] = [
    ...(xp > 0 ? [{ kind: "xp" as const, amount: xp, label: "XP" }] : []),
    ...(pearls > 0 ? [{ kind: "pearl" as const, amount: pearls, label: t("hanziHub.pearls") }] : []),
  ];

  // Uma vibração por rodada concluída (nunca de novo num re-render).
  useEffect(() => {
    hapticOnce(`practice-complete:${roundKey}`, "practiceComplete");
  }, [roundKey]);

  return (
    <section
      data-testid="practice-completion"
      data-practice-xp={xp}
      data-practice-pearls={pearls}
      data-practice-missions={missions.length}
      className="mx-auto flex w-full max-w-md flex-col items-center pt-4 text-center"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]">
        <IconCheck width={26} height={26} />
      </div>
      <h2 className="mt-3 font-serif text-2xl font-semibold text-ink">{t("hanziHub.roundDone")}</h2>
      <p className="mt-1 font-serif text-3xl font-semibold tabular-nums text-ink" data-practice-score>
        {correct}/{total}
      </p>

      {rewards.length > 0 && (
        <div className="mt-4 w-full">
          <RewardReveal rewards={rewards} />
        </div>
      )}
      {xp === 0 && xpCapped && (
        <p className="mt-4 w-full rounded-2xl bg-surface-2 px-4 py-3 text-sm text-ink-soft" data-practice-xp-capped>
          {t("hanziHub.xpCapped")}
        </p>
      )}

      {missions.length > 0 && (
        <ul className="mt-3 grid w-full gap-2" data-practice-mission-list>
          {missions.map((mission) => (
            <li
              key={mission.id}
              className="longyu-reward-rise flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 text-left"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <IconTarget width={18} height={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{displayInstruction(mission.title, instructionLocale)}</span>
                <span className="block text-xs text-ink-faint">
                  {mission.complete ? t("hanziHub.missionReady") : t("hanziHub.missionProgress", { progress: mission.progress, goal: mission.goal })}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {formsReviewed > 0 && (
        <p className="mt-3 text-sm text-ink-soft">{t("hanziHub.formsReviewed", { count: formsReviewed })}</p>
      )}

      <div className="mt-6 grid w-full gap-2">
        <Button size="lg" className="w-full shadow-lift" onClick={onContinue} data-practice-continue>
          {t("hanziHub.keepTraining")}
        </Button>
        <Link
          to={hubTo}
          className="inline-flex min-h-12 items-center justify-center text-sm font-semibold text-ink-soft hover:text-ink"
        >
          {t("hanziHub.changeMode")}
        </Link>
      </div>
    </section>
  );
}
