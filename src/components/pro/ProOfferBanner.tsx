import { ButtonLink } from "../ui/primitives";
import { IconStar, IconX } from "../ui/Icon";
import { PRO_PAYWALL_CTA } from "../../data/planFeatures";
import { recordProOfferClicked, type ProOfferCopy } from "../../lib/proOfferEngine";

/**
 * Oferta do Pro em faixa, no fluxo da página — a contrapartida discreta do
 * ProPaywall. O motor de ofertas já distingue "card" de "strong"
 * (proOfferEngine: strength "card" → channel "banner", isento do teto de
 * modais), mas até aqui todo call site renderizava modal, inclusive os que
 * pediam a versão discreta.
 *
 * Quem decide se aparece é o motor, não este componente: Pro nunca vê, nunca
 * interrompe momento protegido, respeita o primeiro minuto de sessão e o
 * cooldown de 24h por tipo de oferta. Aqui só desenhamos o que ele liberou.
 */
export function ProOfferBanner({
  offer,
  onDismiss,
  className,
}: {
  offer: ProOfferCopy | null;
  onDismiss: () => void;
  className?: string;
}) {
  if (!offer) return null;

  return (
    <aside
      aria-label="Oferta do Longyu Pro"
      className={[
        "relative overflow-hidden rounded-xl border border-gold/25 bg-gold/[0.06] p-3 sm:p-3.5",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold/12 text-gold">
          <IconStar width={17} height={17} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">{offer.eyebrow}</div>
          <h3 className="mt-0.5 text-sm font-semibold leading-tight text-ink">{offer.title}</h3>
          <p className="mt-1 text-xs leading-5 text-ink-soft">{offer.description}</p>
          {/* Mantém a promessa do grátis visível: a faixa vende sem sugerir
              que o caminho gratuito parou de existir. */}
          <p className="mt-1.5 text-[11px] leading-4 text-ink-faint">{offer.freeContinues}</p>

          <ButtonLink
            to="/pro"
            onClick={() => recordProOfferClicked(offer)}
            className="mt-2.5 w-full sm:w-auto"
          >
            {PRO_PAYWALL_CTA}
          </ButtonLink>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dispensar oferta do Pro"
          className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-faint transition hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45"
        >
          <IconX width={15} height={15} />
        </button>
      </div>
    </aside>
  );
}
