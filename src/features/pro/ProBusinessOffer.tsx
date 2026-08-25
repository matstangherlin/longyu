import { ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { IconCheck } from "../../components/ui/Icon";
import { PRO_PAGE_BUSINESS_ITEMS, PRO_PAGE_ENTERPRISE_ITEMS } from "../../data/businessOffer";
import { trackBusinessEvent } from "../../services/businessEvents";

function BenefitList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-5 text-ink">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <IconCheck width={11} height={11} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function ProBusinessOffer() {
  return (
    <section data-pro-business className="space-y-3">
      <div className="text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">Para empresas</div>
        <h2 className="mt-1 font-serif text-lg font-semibold text-ink sm:text-xl">Longyu for Business</h2>
        <p className="mt-1 text-sm text-ink-soft">Mandarim para a sua equipe.</p>
      </div>

      <Card variant="premium" className="p-4 sm:p-5">
        <Pill tone="gold">Longyu Business</Pill>
        <h3 className="mt-2 font-serif text-base font-semibold text-ink">Para a sua equipe</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Treine sua equipe em mandarim. Acompanhe adoção, progresso e competências.
        </p>
        <BenefitList items={PRO_PAGE_BUSINESS_ITEMS} />
        <p className="mt-3 text-[11px] leading-4 text-ink-faint">
          Gestão, painel, relatórios e trilhas são oferta comercial — ainda não estão ligados neste app. Sem preço
          público e sem checkout de 1 assento.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <ButtonLink
            to="/business"
            size="lg"
            className="w-full sm:w-auto"
            data-business-cta="pro-page"
            onClick={() => trackBusinessEvent("business_cta_clicked", "pro-page")}
          >
            Conhecer Business
          </ButtonLink>
          <ButtonLink
            to="/business#contato"
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
            data-business-cta="pro-sales"
            onClick={() => trackBusinessEvent("business_cta_clicked", "pro-sales")}
          >
            Falar com vendas
          </ButtonLink>
        </div>
      </Card>

      <Card className="p-4 sm:p-5" data-pro-enterprise>
        <Pill>Grandes empresas</Pill>
        <h3 className="mt-2 font-serif text-base font-semibold text-ink">Longyu Enterprise</h3>
        <p className="mt-1 text-sm text-ink-soft">
          Planos personalizados para grandes equipes, multinacionais e operações Brasil–China.
        </p>
        <BenefitList items={PRO_PAGE_ENTERPRISE_ITEMS} />
        <p className="mt-3 text-[11px] leading-4 text-ink-faint">
          SSO, provisionamento e integrações estão no roadmap Enterprise. Esta página não afirma que já estão ativos
          no produto.
        </p>
        <ButtonLink
          to="/business#contato"
          variant="outline"
          size="lg"
          className="mt-4 w-full sm:w-auto"
          data-business-cta="pro-enterprise"
          onClick={() => trackBusinessEvent("business_cta_clicked", "pro-enterprise")}
        >
          Falar com nosso time
        </ButtonLink>
      </Card>
    </section>
  );
}
