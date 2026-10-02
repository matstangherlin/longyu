import { Link } from "react-router-dom";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button, ButtonLink } from "../ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import { freeStudyPaths, type FreeStudyLane } from "../../lib/energyPolicy";
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
  const lanes = freeStudyPaths((id) => {
    const feature = LANE_FEATURE[id];
    return feature === null ? false : visibility[feature] === "AVAILABLE";
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
        <div className="mt-4 grid gap-1">
          <ButtonLink to="/missoes" onClick={onClose} variant="outline" size="lg" className="min-h-12 w-full" data-testid="energy-get-charge">
            {t("energySoftLanding.getCharge")}
          </ButtonLink>
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
