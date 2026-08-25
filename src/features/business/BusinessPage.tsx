import { useEffect } from "react";
import { ButtonLink, Card, Pill } from "../../components/ui/primitives";
import { IconCheck } from "../../components/ui/Icon";
import {
  BUSINESS_BENEFITS,
  BUSINESS_FAQ,
  BUSINESS_HERO,
  BUSINESS_PLAN,
  BUSINESS_STEPS,
  BUSINESS_TRACKS_PREVIEW,
  BUSINESS_USE_CASES,
  ENTERPRISE_PLAN,
} from "../../data/businessOffer";
import { trackBusinessEvent } from "../../services/businessEvents";
import { PublicMarketingLayout } from "../marketing/PublicMarketingLayout";
import { BusinessLeadForm } from "./BusinessLeadForm";

function BenefitList({ items }: { items: readonly string[] }) {
  return (
    <ul className="mt-3 space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-sm leading-5 text-ink">
          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <IconCheck width={11} height={11} />
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export function BusinessPage() {
  useEffect(() => {
    trackBusinessEvent("business_page_view");
  }, []);

  return (
    <PublicMarketingLayout eyebrow="Para empresas">
      <article data-business-page className="space-y-10 overflow-x-hidden pb-[calc(env(safe-area-inset-bottom)+1rem)]">
        <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-[linear-gradient(160deg,rgb(var(--gold)/0.12)_0%,rgb(var(--surface))_45%,rgb(var(--bg))_100%)] p-5 sm:p-6">
          <Pill tone="gold">{BUSINESS_HERO.eyebrow}</Pill>
          <h1 className="mt-3 font-serif text-[1.85rem] font-semibold leading-[1.1] tracking-[-0.02em] text-ink sm:text-[2.35rem]">
            {BUSINESS_HERO.title}
          </h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-ink-soft sm:text-base">{BUSINESS_HERO.lead}</p>
          <div className="mt-5 flex flex-col gap-2 sm:max-w-md sm:flex-row">
            <ButtonLink
              to="#contato"
              size="lg"
              className="w-full sm:w-auto"
              data-business-cta="hero-sales"
              onClick={() => trackBusinessEvent("business_cta_clicked", "hero-sales")}
            >
              Falar com vendas
            </ButtonLink>
            <ButtonLink
              to="#enterprise"
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
              data-business-cta="hero-enterprise"
              onClick={() => trackBusinessEvent("business_cta_clicked", "hero-enterprise")}
            >
              Conhecer Enterprise
            </ButtonLink>
          </div>
          <p className="mt-3 text-[11px] leading-4 text-ink-faint">
            Sem preço público. Sem checkout de 1 assento. Empresas não passam pelo fluxo do Longyu Pro.
          </p>
        </section>

        <section aria-labelledby="business-benefits">
          <h2 id="business-benefits" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
            O que o programa corporativo oferece
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Parte já existe no produto para o aluno premium. Gestão, relatórios e trilhas por indústria são oferta comercial — não recursos ligados neste app ainda.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {BUSINESS_BENEFITS.map((item) => (
              <Card key={item.title} className="p-4">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-ink-soft">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="business-use-cases">
          <h2 id="business-use-cases" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
            Para quem faz sentido
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Perfis de operação — indústria, energia, logística, comércio exterior, tecnologia — não uma lista de clientes. Não usamos nomes nem logotipos sem autorização.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {BUSINESS_USE_CASES.map((item) => (
              <Card key={item.title} className="p-4">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1.5 text-xs leading-5 text-ink-soft">{item.body}</p>
              </Card>
            ))}
          </div>
        </section>

        <section aria-labelledby="business-how">
          <h2 id="business-how" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
            Como funciona
          </h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {BUSINESS_STEPS.map((step) => (
              <li key={step.title}>
                <Card className="h-full p-4">
                  <h3 className="text-sm font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-ink-soft">{step.body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </section>

        <section id="business" aria-labelledby="business-plan" className="scroll-mt-20">
          <Card variant="premium" className="p-5 sm:p-6">
            <Pill tone="gold">{BUSINESS_PLAN.eyebrow}</Pill>
            <h2 id="business-plan" className="mt-3 font-serif text-xl font-semibold text-ink sm:text-2xl">
              {BUSINESS_PLAN.title}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{BUSINESS_PLAN.lead}</p>
            <BenefitList items={BUSINESS_PLAN.items} />
            <p className="mt-3 text-[11px] leading-4 text-ink-faint">{BUSINESS_PLAN.footnote}</p>
            <ButtonLink
              to="#contato"
              size="lg"
              className="mt-4 w-full sm:w-auto"
              data-business-cta="business-sales"
              onClick={() => trackBusinessEvent("business_cta_clicked", "business-sales")}
            >
              Falar com vendas
            </ButtonLink>
          </Card>
        </section>

        <section id="enterprise" aria-labelledby="enterprise-plan" className="scroll-mt-20">
          <Card className="p-5 sm:p-6">
            <Pill>{ENTERPRISE_PLAN.eyebrow}</Pill>
            <h2 id="enterprise-plan" className="mt-3 font-serif text-xl font-semibold text-ink sm:text-2xl">
              {ENTERPRISE_PLAN.title}
            </h2>
            <p className="mt-2 text-sm text-ink-soft">{ENTERPRISE_PLAN.lead}</p>
            <BenefitList items={ENTERPRISE_PLAN.items} />
            <p className="mt-3 text-[11px] leading-4 text-ink-faint">{ENTERPRISE_PLAN.footnote}</p>
            <ButtonLink
              to="#contato"
              variant="outline"
              size="lg"
              className="mt-4 w-full sm:w-auto"
              data-business-cta="enterprise-sales"
              onClick={() => trackBusinessEvent("business_cta_clicked", "enterprise-sales")}
            >
              Falar com nosso time
            </ButtonLink>
          </Card>
        </section>

        <section aria-labelledby="business-tracks">
          <h2 id="business-tracks" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
            Trilhas futuras por operação
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Roadmap pedagógico corporativo — ainda não são cursos ligados no app. Uma empresa automotiva poderia, mais adiante, escolher uma trilha Brasil–China com vocabulário de fábrica, qualidade e prazo.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {BUSINESS_TRACKS_PREVIEW.map((track) => (
              <li key={track}>
                <span className="inline-flex min-h-11 items-center rounded-full border border-line/70 bg-surface px-3 text-xs font-medium text-ink-soft">
                  {track}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="business-faq">
          <h2 id="business-faq" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
            Perguntas frequentes
          </h2>
          <div className="mt-4 space-y-2">
            {BUSINESS_FAQ.map((item) => (
              <details key={item.q} className="rounded-2xl border border-line/55 bg-surface px-4 py-1">
                <summary className="min-h-11 cursor-pointer list-none py-2.5 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45">
                  {item.q}
                </summary>
                <p className="pb-3 text-sm leading-6 text-ink-soft">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="business-contact">
          <h2 id="business-contact" className="font-serif text-xl font-semibold text-ink sm:text-2xl">
            Falar com vendas
          </h2>
          <p className="mt-2 text-sm text-ink-soft">
            Conte o tamanho da equipe e o objetivo. O pedido segue pelo servidor — o navegador não grava o lead direto no banco.
          </p>
          <Card className="relative mt-4 p-4 sm:p-5">
            <BusinessLeadForm sourceCta="form" />
          </Card>
        </section>
      </article>
    </PublicMarketingLayout>
  );
}
