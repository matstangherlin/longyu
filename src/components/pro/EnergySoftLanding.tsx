import { Link } from "react-router-dom";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button, ButtonLink } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import { useChargeRecovery } from "../../hooks/useChargeRecovery";
import { freeStudyPaths, type FreeStudyLane } from "../../lib/energyPolicy";
import { canUsePracticeTool, useIsPro, type PracticeToolId } from "../../lib/proAccess";
import { useStore } from "../../lib/store";
import type { DiscoveryFeatureId } from "../../lib/progressiveDiscovery";
import type { MessageKey } from "../../locales/pt-BR";

const LANE_FEATURE: Record<FreeStudyLane["id"], DiscoveryFeatureId | null> = {
  review: "review",
  practice: "practice",
  culture: "culture",
  story: "immersion",
  hanzi: "hanzi",
  pinyin: null,
  atlas: "atlas",
};

/**
 * QA 2026-10 · R-19 — o portão que a própria página aplica. A descoberta diz
 * "Hànzì disponível" com 3 caracteres aprendidos, mas /hanzi só abre depois da
 * revisão da Fase 4 (EngineGate): sem este filtro o CTA levava a tela bloqueada.
 */
const LANE_TOOL: Partial<Record<FreeStudyLane["id"], PracticeToolId>> = {
  hanzi: "hanzi",
};

/**
 * RC2.2.23 — Cargas zeradas: UMA superfície calma, nunca "pague ou feche".
 *
 * Primário: estudar de graça agora (Revisar / Praticar / Cultura / História,
 * só o que já está liberado). Secundário: Conseguir Carga (Missões, baú,
 * loja, história). Terciário: Longyu Pro. Sempre existe ao menos um caminho
 * gratuito de estudo imediatamente utilizável.
 */
export function EnergySoftLanding({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const { visibility } = useFeatureVisibility();
  const isPremium = useIsPro();
  const completedLessons = useStore((s) => s.completedLessons);
  const recovery = useChargeRecovery();
  const lanes = freeStudyPaths((id) => {
    const feature = LANE_FEATURE[id];
    if (feature === null || visibility[feature] !== "AVAILABLE") return false;
    const tool = LANE_TOOL[id];
    return !tool || canUsePracticeTool(tool, { isPremium, completedLessons }).allowed;
  });
  return (
    <ModalOverlay role="presentation" onBackdropClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="energy-soft-landing-title"
        data-testid="pro-paywall-energy"
        data-energy-soft-landing="true"
        className="w-full max-w-md rounded-t-2xl border border-line bg-surface p-5 shadow-lift sm:rounded-2xl sm:p-6"
      >
        <h2 id="energy-soft-landing-title" className="font-serif text-xl font-semibold leading-tight text-ink">
          {t("energySoftLanding.title")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-ink-soft">{t("energySoftLanding.body")}</p>
        <div className="mt-4 grid grid-cols-2 gap-2" data-testid="energy-free-lanes">
          {lanes.map((lane) => (
            <ButtonLink key={lane.id} to={lane.to} onClick={onClose} size="lg" className="min-h-12 w-full" data-free-lane={lane.id}>
              {t(`energySoftLanding.${lane.id}` as MessageKey)}
            </ButtonLink>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-faint">{t("energySoftLanding.explain")}</p>
        <p className="mt-1 text-xs font-medium leading-5 text-ink-soft" data-testid="energy-refill-time">
          {t("energyAccess.refillAt", { time: recovery.refillTime })}
        </p>
        <div className="mt-4 grid gap-1">
          {recovery.claimableMission ? (
            <ButtonLink to="/missoes" onClick={onClose} variant="outline" size="lg" className="min-h-12 w-full" data-testid="energy-get-charge">
              {t("energySoftLanding.getCharge")}
            </ButtonLink>
          ) : recovery.openMission ? (
            <p className="text-xs leading-5 text-ink-faint" data-testid="energy-charge-mission-hint">
              {t("energySoftLanding.missionHint", {
                title: displayInstruction(recovery.openMission.title),
                charges: recovery.openMission.reward.charges ?? 0,
              })}
            </p>
          ) : null}
          <div className="flex items-center justify-between">
            <Link to="/pro" onClick={onClose} className="inline-flex min-h-11 items-center text-xs font-medium text-ink-faint underline-offset-2 hover:underline" data-testid="energy-pro-link">
              {t("energySoftLanding.pro")}
            </Link>
            <Button variant="ghost" size="sm" className="min-h-11" onClick={onClose} data-testid="energy-close">
              {t("energySoftLanding.close")}
            </Button>
          </div>
        </div>
      </section>
    </ModalOverlay>
  );
}
