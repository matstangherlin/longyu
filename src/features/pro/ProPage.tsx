import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Pill } from "../../components/ui/primitives";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconChevron,
  IconFlame,
  IconHanzi,
  IconHeadphones,
  IconLibrary,
  IconLock,
  IconRefresh,
  IconShield,
  IconSound,
  IconTarget,
} from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { createCheckoutSession, type ProPlanKey } from "../../services/subscriptionService";

const BENEFITS = [
  { title: "Cargas infinitas", detail: "No preview local, as Cargas não travam a prática.", icon: IconFlame },
  { title: "Fôlego sem travamento", detail: "Erros viram prática; a lição não para por falta de Fôlego no preview.", icon: IconShield },
  { title: "Fala com IA em breve", detail: "Converse em cenários guiados quando o recurso estiver disponível.", icon: IconChat },
  { title: "Correção de pronúncia", detail: "Receba feedback claro nos exercícios disponíveis no app.", icon: IconSound },
  { title: "Modo Imersão ampliado", detail: "Ouça, repita e faça shadowing com limites relaxados para teste.", icon: IconHeadphones },
  { title: "Revisão ampliada", detail: "Continue além da fila essencial e priorize fraquezas por domínio.", icon: IconRefresh },
  { title: "Ferramentas abertas para explorar", detail: "Som, fala, hànzì, leitura, revisão e labs ficam abertos no Preview.", icon: IconTarget },
  { title: "Hànzì profundo", detail: "Explore componentes, famílias e padrões fonéticos.", icon: IconHanzi },
  { title: "Leitura guiada avançada", detail: "Leia textos maiores com suporte ajustável.", icon: IconBook },
  { title: "Estatísticas avançadas", detail: "Entenda sua evolução e a próxima melhor prática.", icon: IconTarget },
  { title: "Trilhas HSK", detail: "Organize o estudo por vocabulário e habilidades do exame.", icon: IconShield },
  { title: "Ferramentas Pro", detail: "Acesse áreas extras sem marcar lições da Jornada como concluídas.", icon: IconLibrary },
];

const FREE_FEATURES = ["Jornada inicial", "5 Cargas diárias", "Revisão essencial", "Biblioteca básica", "Treinos limitados"];
const PRO_FEATURES = ["Pro Preview local", "Cargas sem limite local", "Fôlego sem travamento", "Ferramentas de prática liberadas", "Fala com IA em breve", "Imersão ampliada", "Revisão extra", "Treino focado", "Pinyin Lab e Hànzì Lab", "Jornada preservada por progresso"];

const BILLING_PLANS: {
  key: ProPlanKey;
  eyebrow: string;
  name: string;
  priceLine: string;
  detail: string;
  badge?: string;
  featured?: boolean;
  comparison?: string;
}[] = [
  {
    key: "pro_annual",
    eyebrow: "Mais escolhido",
    name: "Longyu Pro Anual",
    priceLine: "R$ 10/mês no anual",
    detail: "Cobrança de R$ 120/ano após 30 dias grátis.",
    badge: "60% OFF",
    featured: true,
    comparison: "Equivale a R$ 10/mês em vez de R$ 24,90/mês.",
  },
  {
    key: "pro_monthly",
    eyebrow: "Flexível",
    name: "Longyu Pro Mensal",
    priceLine: "R$ 24,90/mês",
    detail: "Primeiro mês grátis. Depois, renovação mensal.",
    comparison: "Ideal para testar sem compromisso anual.",
  },
];

export function ProPage() {
  const navigate = useNavigate();
  const isPremium = useStore((state) => state.isPremium);
  const setPremium = useStore((state) => state.setPremium);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanKey>("pro_annual");
  const cloudBackend = isSupabaseBackendEnabled();

  const selectedPlanMeta = useMemo(
    () => BILLING_PLANS.find((plan) => plan.key === selectedPlan) ?? BILLING_PLANS[0],
    [selectedPlan]
  );

  async function handleSubscribe(planKey = selectedPlan) {
    const result = await createCheckoutSession(planKey);
    setCheckoutNotice(result.message);
    if (result.data?.url) window.location.assign(result.data.url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-8">
      <header className="border-b border-[#B7791F]/25 pb-8 text-center">
        <Mascot size={104} variant="celebrate" className="mx-auto" />
        <Pill tone="gold" className="mt-3">Longyu Pro</Pill>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Destrave o Longyu Pro com 30 dias grátis.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
          {cloudBackend
            ? "Escolha entre mensal ou anual. O plano anual aparece como a melhor oferta, com o equivalente a R$ 10/mês."
            : "Ative recursos de teste neste dispositivo, sem conta em nuvem, assinatura real ou cobrança."}
        </p>
        <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-[#9A6518] hover:bg-[#785014]"
            variant="primary"
            disabled={isPremium}
            onClick={() => setPremium(true)}
          >
            {isPremium ? <><IconCheck width={19} height={19} /> Pro Preview ativo</> : "Experimentar Pro Preview"}
          </Button>
          <p className="text-xs text-ink-faint">
            {cloudBackend
              ? "Preview local não substitui assinatura real. O Pro de pagamento vem do servidor."
              : "Prévia local, sem pagamento ou renovação automática."}
          </p>
          <Button variant="outline" className="w-full" onClick={() => void handleSubscribe()}>
            {cloudBackend ? "Ir para checkout real" : "Assinar Pro (quando disponível)"}
          </Button>
          {checkoutNotice && (
            <p className="text-xs leading-5 text-ink-soft">{checkoutNotice}</p>
          )}
        </div>
      </header>

      <section className="space-y-5">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Planos</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Escolha como quer assinar</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Os dois planos começam com 30 dias grátis. O anual destaca a economia total sem esconder a cobrança real.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {BILLING_PLANS.map((plan) => {
            const active = selectedPlan === plan.key;
            return (
              <button
                key={plan.key}
                type="button"
                onClick={() => setSelectedPlan(plan.key)}
                className={[
                  "rounded-3xl border p-5 text-left transition",
                  active
                    ? "border-[#B7791F]/40 bg-[#B7791F]/10 shadow-card"
                    : "border-line bg-surface hover:border-[#B7791F]/25 hover:bg-[#B7791F]/[0.04]",
                ].join(" ")}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">{plan.eyebrow}</div>
                    <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{plan.name}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {plan.badge && <Pill tone="gold">{plan.badge}</Pill>}
                    {active && <Pill tone="accent">Selecionado</Pill>}
                  </div>
                </div>
                <div className="mt-5 flex items-end gap-2">
                  <span className="font-serif text-3xl font-semibold text-ink">{plan.priceLine}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-ink">{plan.detail}</p>
                {plan.comparison && <p className="mt-1 text-sm text-ink-soft">{plan.comparison}</p>}
                <div className="mt-4 flex items-center gap-2 text-xs font-medium text-ink-faint">
                  <IconLock width={14} height={14} />
                  Checkout seguro via Stripe
                </div>
              </button>
            );
          })}
        </div>

        <div className="rounded-3xl border border-[#B7791F]/20 bg-[#B7791F]/[0.06] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Pill tone="gold">{selectedPlanMeta.badge ?? "30 dias grátis"}</Pill>
              <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{selectedPlanMeta.name}</h3>
              <p className="mt-1 text-sm leading-6 text-ink-soft">
                {selectedPlanMeta.detail} {selectedPlanMeta.comparison}
              </p>
            </div>
            <Button
              size="lg"
              className="bg-[#9A6518] hover:bg-[#785014]"
              onClick={() => void handleSubscribe(selectedPlan)}
            >
              Assinar agora <IconChevron width={18} height={18} />
            </Button>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Tudo que evolui com você</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Mais profundidade, menos interrupções</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-5">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="min-h-44 bg-surface p-4">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#B7791F]/12 text-gold">
                  <Icon width={20} height={20} />
                </span>
                <h3 className="mt-4 text-sm font-semibold text-ink">{benefit.title}</h3>
                <p className="mt-1 text-xs leading-5 text-ink-soft">{benefit.detail}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Compare com calma</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">O hábito continua grátis</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Revisão essencial, biblioteca básica e prática diária mínima não desaparecem no plano gratuito. Pro libera ferramentas, mas não conclui a Jornada automaticamente.
          </p>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-line md:grid-cols-2">
          <ComparisonColumn title="Grátis" subtitle="Para começar e manter o hábito" features={FREE_FEATURES} />
          <ComparisonColumn title="Pro Preview" subtitle="Teste local, sem cobrança" features={PRO_FEATURES} pro />
        </div>
      </section>

      <section className="border-y border-[#B7791F]/25 bg-surface px-5 py-7 text-center sm:px-8">
        <h2 className="font-serif text-2xl font-semibold text-ink">Seu estudo, com espaço para crescer</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">
          O Pro real começa com 30 dias grátis. No anual, você paga R$ 120/ano, o equivalente a R$ 10 por mês.
        </p>
        <div className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="sm:min-w-48" onClick={() => setPremium(true)} disabled={isPremium}>
            {isPremium ? "Preview ativo" : "Ativar Pro Preview"}
          </Button>
          <Button className="sm:min-w-48" variant="outline" onClick={() => void handleSubscribe(selectedPlan)}>
            Assinar {selectedPlan === "pro_annual" ? "anual" : "mensal"}
          </Button>
          <Button className="sm:min-w-40" variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </section>
    </div>
  );
}

function ComparisonColumn({ title, subtitle, features, pro = false }: { title: string; subtitle: string; features: string[]; pro?: boolean }) {
  return (
    <div className={["p-5 sm:p-6", pro ? "border-t border-[#B7791F]/25 bg-[#B7791F]/8 md:border-l md:border-t-0" : "bg-surface"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-xs text-ink-faint">{subtitle}</p>
        </div>
        {pro && <Pill tone="gold">Preview local</Pill>}
      </div>
      <ul className="mt-5 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-3 text-sm text-ink-soft">
            <span className={["flex h-6 w-6 shrink-0 items-center justify-center rounded-full", pro ? "bg-[#B7791F]/15 text-gold" : "bg-surface-2 text-ink-faint"].join(" ")}>
              <IconCheck width={14} height={14} />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}
