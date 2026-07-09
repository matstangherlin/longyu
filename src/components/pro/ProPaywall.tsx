import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
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
  PRO_PAYWALL_CTA,
  type PaywallKind,
  type ProPaywallKind,
} from "../../data/planFeatures";

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
}: {
  open: boolean;
  kind: ProPaywallKind;
  onClose: () => void;
}) {
  const copy = PAYWALL_COPY[kind];
  const Icon = PAYWALL_ICONS[kind];
  const realBilling = isSupabaseBackendEnabled();

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
            Longyu Pro
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
            <Link to="/pro" onClick={onClose}>
              <Button size="lg" className="w-full">{PRO_PAYWALL_CTA}</Button>
            </Link>
            <Link to="/missoes" onClick={onClose}>
              <Button size="lg" variant="outline" className="w-full">Ir para missões</Button>
            </Link>
            <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>Voltar amanhã</Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            <Link to="/pro" onClick={onClose}>
              <Button size="lg" className="w-full">{PRO_PAYWALL_CTA}</Button>
            </Link>
            <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>Agora não</Button>
          </div>
        )}
        <p className="mt-3 text-center text-xs text-ink-faint">
          {realBilling
            ? "30 dias grátis. Cancele quando quiser, direto na sua conta."
            : "Os planos do Longyu Pro serão liberados em breve."}
        </p>
      </section>
    </ModalOverlay>
  );
}
