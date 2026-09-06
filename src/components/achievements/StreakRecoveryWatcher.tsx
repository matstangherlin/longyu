import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../../lib/store";
import { Button } from "../ui/primitives";
import { ModalOverlay } from "../ui/ModalOverlay";
import { IconFlame, IconRefresh } from "../ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Modal de recuperação de ofensiva: aparece assim que a tela abre depois de
 * o aluno passar 24h (um dia inteiro) sem estudar. A ofensiva já zerou, mas
 * há uma janela de 24h para recuperá-la estudando.
 *
 * Este modal não é o caminho da recuperação, é só um atalho para ela. Quem o
 * dispensa e vai estudar por conta própria recupera igual, porque o que conta
 * é concluir uma revisão ou uma atividade da Jornada. Por isso ele oferece as
 * duas rotas e diz, em texto, o que é preciso fazer.
 */
export function StreakRecoveryWatcher() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const pending = useStore((s) => s.pendingStreakRecovery);
  const clear = useStore((s) => s.clearStreakRecovery);
  const hold = useStore((s) => s.holdAchievementModals);

  if (pending == null || hold) return null;

  const daysLabel = pending === 1 ? t("shell.dayCountOne") : t("shell.dayCountMany", { count: pending });

  // O CTA não abre modo especial nenhum: ele só encurta o caminho até estudar.
  // Quem fecha esta tela e vai para a Jornada por conta própria recupera do
  // mesmo jeito — o que recupera é concluir, não passar por aqui.
  const goReview = () => {
    clear();
    navigate("/revisao");
  };
  const goJourney = () => {
    clear();
    navigate("/jornada");
  };

  return (
    <ModalOverlay
      className="items-stretch p-0 sm:items-center sm:p-4"
      label={t("shell.recoverStreak")}
      onBackdropClick={clear}
    >
      <div
        className="flex min-h-[100dvh] w-full flex-col bg-[radial-gradient(circle_at_50%_0%,rgba(183,121,31,.22),rgb(var(--surface))_55%,rgb(var(--bg))_100%)] px-6 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] pt-[calc(env(safe-area-inset-top)+2rem)] text-center shadow-lift sm:min-h-0 sm:max-w-md sm:rounded-[30px] sm:border sm:border-accent-soft sm:p-7"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="my-auto sm:my-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {t("shell.streakAtRisk")}
          </div>
          <div className="relative mx-auto mt-5 flex h-24 w-24 items-center justify-center rounded-[30px] bg-surface-2 text-ink-faint shadow-lift sm:mt-4 sm:h-20 sm:w-20 sm:rounded-[26px]">
            <IconFlame width={44} height={44} fill="currentColor" className="opacity-40" />
          </div>
          <h2 className="mt-5 font-serif text-3xl font-semibold text-ink sm:mt-4 sm:text-2xl">
            {t("shell.streakZeroed")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-ink-soft sm:mt-1">
            {t("shell.streakRecoveryBody", { days: daysLabel })}
          </p>
          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
            <IconFlame width={13} height={13} /> {t("shell.recoverStreakDays", { days: daysLabel })}
          </div>
          {/* O que exatamente devolve a ofensiva, dito antes de escolher. */}
          <p
            data-testid="streak-recovery-how"
            className="mt-4 rounded-xl bg-surface-2 px-3 py-2.5 text-sm leading-5 text-ink-soft"
          >
            {t("shell.recoverStreakHow")}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:mt-5">
          <Button
            size="lg"
            className="w-full shadow-lift"
            data-testid="streak-recovery-review"
            onClick={goReview}
          >
            <IconRefresh width={16} height={16} /> {t("shell.recoverStreakReview")}
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="w-full"
            data-testid="streak-recovery-journey"
            onClick={goJourney}
          >
            {t("shell.recoverStreakJourney")}
          </Button>
          <Button variant="text" size="md" className="w-full" onClick={clear}>
            {t("pro.notNow")}
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

/**
 * Confirmação curta de que a ofensiva voltou.
 *
 * É uma faixa e não um modal de propósito: a recuperação acontece no instante
 * em que o aluno conclui a lição ou a revisão, e nesse momento ele já está
 * olhando a tela de conclusão. Outro modal por cima seria uma interrupção para
 * dar uma boa notícia. Some sozinha — ninguém precisa dispensar um elogio.
 */
export function StreakRecoveredBanner() {
  const { t } = useTranslation();
  const recovered = useStore((s) => s.pendingStreakRecovered);
  const clear = useStore((s) => s.clearStreakRecovered);

  useEffect(() => {
    if (recovered == null) return;
    const id = window.setTimeout(clear, 4200);
    return () => window.clearTimeout(id);
  }, [recovered, clear]);

  if (recovered == null) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="streak-recovered"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center px-4"
    >
      <div className="animate-pop flex items-center gap-2 rounded-full border border-accent-soft bg-surface px-4 py-2.5 text-sm font-semibold text-accent shadow-lift">
        <IconFlame width={16} height={16} fill="currentColor" />
        {t("shell.streakRecovered")}
      </div>
    </div>
  );
}
