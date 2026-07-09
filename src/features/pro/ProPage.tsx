import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Card, Pill } from "../../components/ui/primitives";
import {
  IconBook,
  IconCheck,
  IconChevron,
  IconFlame,
  IconHeadphones,
  IconLock,
  IconRefresh,
  IconShield,
  IconStar,
  IconTarget,
} from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { DAILY_CHARGES_FREE, FREE_REVIEW_SESSION_LIMIT, PRO_LESSON_QI_BONUS } from "../../data/economy";
import { createCheckoutSession, type ProPlanKey } from "../../services/subscriptionService";

const FREE_HIGHLIGHTS = [
  "Jornada completa",
  `${DAILY_CHARGES_FREE} Cargas/dia`,
  `Revisão até ${FREE_REVIEW_SESSION_LIMIT} itens`,
  "Correção imediata",
];

const PRO_HIGHLIGHTS = [
  "Cargas ilimitadas",
  "Revisão ilimitada",
  "Erros detalhados",
  "Pinyin + Hànzì Lab completos",
  "Imersão ampliada",
  "Mais Qi por lição",
];

const BENEFITS = [
  { title: "Cargas ilimitadas", icon: IconFlame },
  { title: "Revisão inteligente", icon: IconRefresh },
  { title: "Erros detalhados", icon: IconTarget },
  { title: "Plano de estudo", icon: IconShield },
  { title: "Pinyin Lab", icon: IconStar },
  { title: "Hànzì profundo", icon: IconBook },
  { title: "Imersão ampliada", icon: IconHeadphones },
  { title: "Mais Qi", icon: IconCheck },
];

const BILLING_PLANS: {
  key: ProPlanKey;
  eyebrow: string;
  name: string;
  priceLine: string;
  detail: string;
  badge?: string;
  featured?: boolean;
}[] = [
  {
    key: "pro_annual",
    eyebrow: "Melhor economia",
    name: "Anual",
    priceLine: "R$ 10/mês",
    detail: "R$ 120/ano após 30 dias grátis",
    badge: "60% OFF",
    featured: true,
  },
  {
    key: "pro_monthly",
    eyebrow: "Flexível",
    name: "Mensal",
    priceLine: "R$ 24,90/mês",
    detail: "30 dias grátis, cancele quando quiser",
  },
];

export function ProPage() {
  const navigate = useNavigate();
  const serverIsPro = useStore((state) => state.serverIsPro);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanKey>("pro_annual");
  const checkoutReady = isSupabaseBackendEnabled();

  const selectedPlanMeta = useMemo(
    () => BILLING_PLANS.find((plan) => plan.key === selectedPlan) ?? BILLING_PLANS[0],
    [selectedPlan]
  );

  async function handleSubscribe(planKey = selectedPlan) {
    if (!checkoutReady) return;
    try {
      const result = await createCheckoutSession(planKey);
      setCheckoutNotice(result.message);
      if (result.data?.url) window.location.assign(result.data.url);
    } catch {
      setCheckoutNotice("Não foi possível abrir o checkout. Tente de novo.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-[calc(env(safe-area-inset-bottom)+1rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-[linear-gradient(160deg,rgb(var(--gold)/0.12)_0%,rgb(var(--surface))_45%,rgb(var(--bg))_100%)] p-5 text-center shadow-card sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gold/10 blur-3xl" aria-hidden />
        <Mascot size={88} variant="celebrate" className="relative mx-auto" />
        <Pill tone="gold" className="relative mt-3">Longyu Pro</Pill>
        <h1 className="relative mt-3 font-serif text-2xl font-semibold leading-tight text-ink sm:text-3xl">
          30 dias grátis. Estude sem limites.
        </h1>
        <p className="relative mx-auto mt-2 max-w-sm text-sm text-ink-soft">
          Revisão ilimitada, cargas infinitas e ferramentas avançadas para evoluir mais rápido.
        </p>

        {serverIsPro ? (
          <div className="relative mx-auto mt-4 max-w-xs rounded-xl border border-good/30 bg-good/10 px-4 py-2.5 text-sm font-semibold text-good">
            Assinatura Pro ativa. Obrigado!
          </div>
        ) : (
          <div className="relative mx-auto mt-5 max-w-xs space-y-2">
            <Button
              size="lg"
              className="w-full bg-gold text-white hover:brightness-95"
              onClick={() => void handleSubscribe(selectedPlan)}
              disabled={!checkoutReady}
            >
              {checkoutReady ? "Começar 30 dias grátis" : "Em breve"}
            </Button>
            {checkoutReady && (
              <p className="text-[11px] leading-4 text-ink-faint">
                Cancele quando quiser. Checkout seguro via Stripe.
              </p>
            )}
            {checkoutNotice && <p className="text-xs text-ink-soft">{checkoutNotice}</p>}
          </div>
        )}
      </section>

      {/* Comparação Grátis vs Pro */}
      <section>
        <h2 className="mb-3 text-center font-serif text-lg font-semibold text-ink sm:text-xl">
          Grátis vs Pro
        </h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <Card className="p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">Grátis</div>
            <h3 className="mt-0.5 text-sm font-semibold text-ink">Para começar</h3>
            <ul className="mt-3 space-y-2">
              {FREE_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-ink-soft">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-2 text-ink-faint">
                    <IconCheck width={11} height={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
          <Card className="border-gold/25 bg-gold/[0.06] p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">Pro</div>
              <Pill tone="gold">Recomendado</Pill>
            </div>
            <h3 className="mt-0.5 text-sm font-semibold text-ink">Sem limites</h3>
            <ul className="mt-3 space-y-2">
              {PRO_HIGHLIGHTS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-ink">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
                    <IconCheck width={11} height={11} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <p className="mt-2 text-center text-[11px] text-ink-faint">
          O Pro não conclui lições por você. +{PRO_LESSON_QI_BONUS} Qi por lição concluída.
        </p>
      </section>

      {/* Planos */}
      {!serverIsPro && (
        <section className="space-y-3">
          <h2 className="text-center font-serif text-lg font-semibold text-ink">Escolha o plano</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {BILLING_PLANS.map((plan) => {
              const active = selectedPlan === plan.key;
              return (
                <button
                  key={plan.key}
                  type="button"
                  onClick={() => setSelectedPlan(plan.key)}
                  className={[
                    "rounded-xl border p-3.5 text-left transition",
                    active
                      ? "border-gold/40 bg-gold/10 shadow-card"
                      : "border-line/50 bg-surface hover:border-gold/25",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gold">{plan.eyebrow}</div>
                      <h3 className="mt-0.5 font-serif text-lg font-semibold text-ink">{plan.name}</h3>
                    </div>
                    {plan.badge && <Pill tone="gold">{plan.badge}</Pill>}
                  </div>
                  <div className="mt-2 font-serif text-2xl font-semibold text-ink">{plan.priceLine}</div>
                  <p className="mt-0.5 text-xs text-ink-soft">{plan.detail}</p>
                  {active && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-ink-faint">
                      <IconLock width={11} height={11} />
                      {checkoutReady ? "Checkout Stripe" : "Em breve"}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {checkoutReady && (
            <Card className="border-gold/20 bg-gold/[0.05] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Pill tone="gold">30 dias grátis</Pill>
                  <h3 className="mt-1.5 font-serif text-lg font-semibold text-ink">{selectedPlanMeta.name}</h3>
                  <p className="mt-0.5 text-xs text-ink-soft">{selectedPlanMeta.detail}</p>
                </div>
                <Button
                  size="lg"
                  className="w-full shrink-0 bg-gold text-white hover:brightness-95 sm:w-auto"
                  onClick={() => void handleSubscribe(selectedPlan)}
                >
                  Assinar {selectedPlan === "pro_annual" ? "anual" : "mensal"} <IconChevron width={16} height={16} />
                </Button>
              </div>
            </Card>
          )}
        </section>
      )}

      {/* Benefícios */}
      <section>
        <h2 className="mb-3 text-center font-serif text-lg font-semibold text-ink">O que você ganha</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <Card key={benefit.title} className="flex flex-col items-center p-3 text-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold/10 text-gold">
                  <Icon width={18} height={18} />
                </span>
                <h3 className="mt-2 text-[11px] font-semibold leading-tight text-ink">{benefit.title}</h3>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="rounded-xl border border-line/50 bg-surface p-4 text-center shadow-card">
        <p className="text-sm text-ink-soft">
          {checkoutReady
            ? "30 dias grátis no anual — R$ 10/mês depois."
            : "A assinatura será liberada em breve."}
        </p>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {checkoutReady && !serverIsPro && (
            <Button className="bg-gold text-white hover:brightness-95" onClick={() => void handleSubscribe(selectedPlan)}>
              Começar grátis
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </section>
    </div>
  );
}
