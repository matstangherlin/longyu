import { useEffect } from "react";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button, ButtonLink } from "../ui/primitives";
import {
  IconBook,
  IconChat,
  IconFlame,
  IconHanzi,
  IconHeadphones,
  IconStar,
  IconTarget,
  IconTrophy,
} from "../ui/Icon";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import {
  PAYWALL_COPY,
  type PaywallKind,
  type ProPaywallKind,
} from "../../data/planFeatures";
import { recordProOfferClicked, type ProOfferCopy } from "../../lib/proOfferEngine";
import { useTranslation } from "../../i18n/useTranslation";

export type { PaywallKind, ProPaywallKind };

const PAYWALL_ICONS: Record<PaywallKind, typeof IconStar> = {
  qi: IconStar,
  energy: IconFlame,
  immersion: IconHeadphones,
  hanzi: IconHanzi,
  speech: IconChat,
  reports: IconTarget,
  content: IconBook,
  review: IconTarget,
  errors: IconTarget,
  weak_spots: IconTarget,
  story: IconBook,
  training: IconFlame,
  pinyin: IconStar,
  leagues: IconTrophy,
};

export function ProPaywall({
  open,
  kind,
  onClose,
  offer,
}: {
  open: boolean;
  kind: ProPaywallKind;
  onClose: () => void;
  /** Copy contextual do proOfferEngine (sobrescreve PAYWALL_COPY). */
  offer?: ProOfferCopy | null;
}) {
  const { t, locale } = useTranslation();
  const baseCopy = PAYWALL_COPY[kind];
  const localizedCopy = {
    eyebrow: t("pro.paywallEyebrow"),
    title: t("pro.paywallTitle"),
    description: t("pro.paywallDescription"),
    benefit: t("pro.paywallBenefit"),
    freeContinues: t("pro.paywallFreeContinues"),
  };
  const copy = offer && locale === "pt-BR"
    ? {
        eyebrow: offer.eyebrow,
        title: offer.title,
        description: offer.description,
        benefit: offer.benefit,
        freeContinues: offer.freeContinues,
      }
    : locale === "pt-BR" ? baseCopy : localizedCopy;
  const Icon = PAYWALL_ICONS[offer?.paywallKind ?? kind];
  const realBilling = isSupabaseBackendEnabled();

  // CTA da oferta: registra "clicked" (com atribuição de origem) e fecha o modal.
  const handleCta = () => {
    if (offer) recordProOfferClicked(offer);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <ModalOverlay role="presentation" onBackdropClick={onClose}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="pro-paywall-title"
        data-testid={`pro-paywall-${kind}`}
        className="w-full max-w-md rounded-t-2xl border border-[#B7791F]/30 bg-surface p-5 shadow-lift sm:rounded-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#B7791F]/15 text-gold">
            <Icon width={24} height={24} />
          </span>
          <span className="rounded-full border border-[#B7791F]/25 bg-[#B7791F]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-gold">
            {t("pro.badge")}
          </span>
        </div>
        <div className="mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">{copy.eyebrow}</div>
        <h2 id="pro-paywall-title" className="mt-2 font-serif text-2xl font-semibold leading-tight text-ink">
          {copy.title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-ink-soft">{copy.description}</p>
        <div className="mt-4 border-y border-line py-4 text-sm font-medium leading-6 text-ink">
          {copy.benefit}
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-faint">{copy.freeContinues}</p>
        {kind === "energy" ? (
          <div className="mt-5 grid gap-2">
            <ButtonLink to="/pro" onClick={handleCta} size="lg" className="w-full">
              {t("pro.viewPlans")}
            </ButtonLink>
            <ButtonLink to="/missoes" onClick={onClose} size="lg" variant="outline" className="w-full">
              {t("pro.goToMissions")}
            </ButtonLink>
            <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>{t("pro.comeBackTomorrow")}</Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            <ButtonLink to="/pro" onClick={handleCta} size="lg" className="w-full">
              {t("pro.viewPlans")}
            </ButtonLink>
            <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>{t("pro.notNow")}</Button>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-ink-faint">
          {realBilling
            ? t("pro.trialFootnote")
            : t("pro.comingSoonFootnote")}
        </p>
      </section>
    </ModalOverlay>
  );
}
