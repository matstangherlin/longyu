import { useEffect, useRef } from "react";
import { useStore } from "../../lib/store";
import { CULTURE_SEALS, cultureText } from "../../data/cultureQuest";
import { CULTURE_PROGRESSION_GATES } from "../../data/cultureProgressionGates";
import { GuideDialogue } from "../../components/guide/GuideDialogue";
import { ModalOverlay } from "../../components/ui/ModalOverlay";
import { playSoundFx } from "../../lib/soundFx";
import { holdCelebration, useOtherCelebrationActive } from "../../lib/celebrationLock";
import { pendingCultureSealReveals } from "../../lib/profileShowcase";
import { useTranslation } from "../../i18n/useTranslation";

const CELEBRATION_ID = "culture-seal-reveal";

/**
 * RC2.2.8 · A4 — o selo ganho finalmente tem cerimônia.
 *
 * `newSeals` já era calculado desde a RC2.2.6, mas ninguém mostrava. Agora:
 * dragão + selo + uma fala curta (GuideDialogue canônico, com a voz
 * `guideTextBlip`) + um som canônico. Um reveal por selo; `cultureSealsRevealed`
 * persiste, então reload e troca de aparelho não repetem (A4.2/A4.3).
 *
 * Nunca aparece no meio de uma lição (modo foco) nem por cima de outra
 * cerimônia: espera a vez.
 */
export function CultureSealRevealWatcher({ suspended }: { suspended: boolean }) {
  const seals = useStore((s) => s.cultureSeals);
  const revealed = useStore((s) => s.cultureSealsRevealed);
  const hold = useStore((s) => s.holdAchievementModals);
  const accountSetupComplete = useStore((s) => s.accountSetupComplete);
  const ensureBaseline = useStore((s) => s.ensureCultureSealRevealBaseline);
  const otherCelebration = useOtherCelebrationActive(CELEBRATION_ID);

  useEffect(() => {
    ensureBaseline();
  }, [ensureBaseline]);

  const pending = pendingCultureSealReveals(seals, revealed);
  const sealId = pending[0];
  const blocked = suspended || hold || !accountSetupComplete || otherCelebration;
  if (!sealId || blocked) return null;
  return <CultureSealReveal key={sealId} sealId={sealId} />;
}

export function CultureSealReveal({ sealId }: { sealId: string }) {
  const { t, instructionLocale } = useTranslation();
  const markRevealed = useStore((s) => s.markCultureSealRevealed);
  const soundEffects = useStore((s) => s.soundEffects);
  const playedRef = useRef(false);
  const seal = CULTURE_SEALS.find((candidate) => candidate.id === sealId);
  const gate = CULTURE_PROGRESSION_GATES.find((candidate) => candidate.requiredSealId === sealId);

  useEffect(() => holdCelebration(CELEBRATION_ID), []);

  useEffect(() => {
    if (playedRef.current) return;
    playedRef.current = true;
    playSoundFx("missionComplete", soundEffects);
  }, [soundEffects]);

  useEffect(() => {
    // Selo desconhecido (dado antigo): só marca e sai, sem tela vazia.
    if (!seal) markRevealed(sealId);
  }, [markRevealed, seal, sealId]);

  if (!seal) return null;

  const title = cultureText({ pt: seal.titlePt, en: seal.titleEn }, instructionLocale);
  const lines = [
    t("culture.sealRevealLine", { title }),
    gate ? t("culture.sealRevealGateLine") : t("culture.sealRevealPassportLine"),
  ];

  return (
    <ModalOverlay className="items-end p-3 sm:items-center sm:p-4" label={t("culture.newSeal")}>
      <div
        className="w-full max-w-md rounded-[28px] border border-gold/40 bg-surface p-5 shadow-lift"
        data-testid="culture-seal-reveal"
        data-seal-id={seal.id}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">
          {t("culture.newSeal")}
        </div>
        <div className="mx-auto mt-3 flex h-20 w-20 items-center justify-center rounded-full border-2 border-gold bg-gold/10 text-4xl shadow-card">
          <span aria-hidden>{seal.emoji}</span>
        </div>
        <p className="mt-2 text-center font-serif text-xl font-semibold text-ink" data-testid="culture-seal-reveal-title">
          {title}
        </p>
        <GuideDialogue
          className="mt-4"
          size="compact"
          messages={lines}
          continueLabel={t("common.continue")}
          onComplete={() => markRevealed(seal.id)}
          data-testid="culture-seal-reveal-guide"
        />
      </div>
    </ModalOverlay>
  );
}
