import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Pill } from "../../components/ui/primitives";
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

// Comparação concreta: o que o grátis permite e o que o Longyu Pro melhora.
// Nada aqui bloqueia o aprendizado gratuito: a Jornada, a revisão essencial e a
// correção imediata de erros continuam livres para sempre.
const COMPARISON_ROWS: { area: string; free: string; pro: string }[] = [
  { area: "Jornada de lições", free: "Completa, no seu ritmo", pro: "Completa, no seu ritmo" },
  { area: "Correção imediata de erros", free: "Sempre grátis", pro: "Sempre grátis" },
  { area: "Cargas diárias", free: `${DAILY_CHARGES_FREE} por dia`, pro: "Ilimitadas" },
  { area: "Revisão inteligente", free: `Até ${FREE_REVIEW_SESSION_LIMIT} itens por sessão`, pro: "Ilimitada, fila completa" },
  { area: "Erros detalhados", free: "—", pro: "Histórico, padrões e revisão focada" },
  { area: "Treino focado nos pontos fracos", free: "Recomendação simples", pro: "Plano de estudo inteligente" },
  { area: "Pinyin Lab e Hànzì Lab", free: "Com Cargas", pro: "Completos, sem limite" },
  { area: "Imersão e histórias", free: "Trilha básica com Cargas", pro: "Imersão ampliada + histórias extras" },
  { area: "Refazer questão ou teste", free: "Custa Qi", pro: "Sem custo" },
  { area: "Qi por conclusão", free: "Padrão", pro: `+${PRO_LESSON_QI_BONUS} Qi por lição` },
  { area: "Missões", free: "Missões diárias úteis", pro: "+ missões Pro com mais Qi" },
  { area: "Baús", free: "Qi, cargas, escudo, tentativa extra", pro: "Baús melhores, mais Qi" },
];

// Coluna "grátis" para a comparação em cartões (mobile-friendly).
const FREE_FEATURES = [
  "Jornada completa de lições",
  `${DAILY_CHARGES_FREE} Cargas por dia`,
  `Revisão essencial (até ${FREE_REVIEW_SESSION_LIMIT} itens/sessão)`,
  "Correção imediata de erros",
  "Biblioteca básica",
];

const PRO_FEATURES = [
  "Cargas ilimitadas",
  "Revisão ilimitada",
  "Erros detalhados",
  "Treino focado nos seus pontos fracos",
  "Pinyin Lab completo",
  "Hànzì Lab completo",
  "Imersão ampliada",
  "Histórias extras",
  "Baús melhores",
  "Mais Qi por conclusão",
  "Missões Pro",
  "Plano de estudo inteligente",
];

const BENEFITS = [
  { title: "Cargas ilimitadas", detail: "Estude mais por dia sem esperar as cargas voltarem.", icon: IconFlame },
  { title: "Revisão inteligente", detail: "O Longyu organiza seus erros por prioridade e mostra o que corrigir primeiro.", icon: IconRefresh },
  { title: "Erros detalhados", detail: "Histórico completo, padrões de repetição e correção intensiva por ponto fraco.", icon: IconTarget },
  { title: "Plano de estudo inteligente", detail: "A próxima prática é montada a partir dos seus próprios erros.", icon: IconShield },
  { title: "Pinyin Lab completo", detail: "Treine tons, sílabas e escuta com menos limites.", icon: IconStar },
  { title: "Hànzì profundo", detail: "Monte caracteres, revise componentes e reconheça padrões visuais.", icon: IconBook },
  { title: "Imersão ampliada", detail: "Acesse mais histórias, diálogos e treinos de escuta.", icon: IconHeadphones },
  { title: "Economia acelerada", detail: "Mais Qi por conclusão e baús melhores — nunca progresso comprado.", icon: IconCheck },
];

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
    eyebrow: "Melhor economia",
    name: "Longyu Pro Anual",
    priceLine: "R$ 10/mês no anual",
    detail: "Cobrança única de R$ 120/ano após 30 dias grátis.",
    badge: "60% OFF",
    featured: true,
    comparison: "Equivale a R$ 10/mês em vez de R$ 24,90/mês.",
  },
  {
    key: "pro_monthly",
    eyebrow: "Flexível",
    name: "Longyu Pro Mensal",
    priceLine: "R$ 24,90/mês",
    detail: "30 dias grátis. Depois, renovação mensal.",
    comparison: "Ideal para começar sem compromisso anual.",
  },
];

export function ProPage() {
  const navigate = useNavigate();
  const serverIsPro = useStore((state) => state.serverIsPro);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanKey>("pro_annual");
  // Checkout só está disponível quando o backend/Stripe está configurado.
  // Sem isso, a página continua honesta: mostra os planos, mas não promete
  // cobrança e nunca ativa Pro localmente.
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
      setCheckoutNotice("Não foi possível abrir o checkout agora. Tente de novo em instantes.");
    }
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
          Aprenda com menos limites, revisão mais inteligente, imersão ampliada e ferramentas avançadas para
          evoluir mais rápido.
        </p>

        {serverIsPro ? (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-[rgb(var(--good)/0.3)] bg-[rgb(var(--good)/0.08)] px-4 py-3 text-sm font-semibold text-[rgb(var(--good))]">
            Sua assinatura Pro está ativa. Obrigado por apoiar o Longyu!
          </div>
        ) : (
          <div className="mx-auto mt-7 flex max-w-sm flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-[#9A6518] hover:bg-[#785014]"
              onClick={() => void handleSubscribe(selectedPlan)}
              disabled={!checkoutReady}
            >
              {checkoutReady ? "Começar 30 dias grátis" : "Assinatura em breve"}
            </Button>
            {checkoutReady && (
              <Button variant="outline" className="w-full" onClick={() => void handleSubscribe(selectedPlan)}>
                Ir para checkout seguro
              </Button>
            )}
            <p className="text-xs leading-5 text-ink-faint">
              {checkoutReady
                ? "30 dias grátis. Cancele quando quiser, direto na sua conta."
                : "Checkout em configuração. Em breve você poderá assinar o Longyu Pro com segurança."}
            </p>
            {checkoutNotice && <p className="text-xs leading-5 text-ink-soft">{checkoutNotice}</p>}
          </div>
        )}
      </header>

      <section>
        <div className="mb-5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Compare com calma</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">O que o grátis permite, o que o Pro melhora</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            O Pro não conclui lições por você e não vende XP: ele tira fricção do caminho e devolve tempo de estudo.
          </p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[560px] border-collapse bg-surface text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-[0.1em] text-ink-faint">
                <th className="px-4 py-3 font-semibold">Área</th>
                <th className="px-4 py-3 font-semibold">Grátis</th>
                <th className="bg-[#B7791F]/[0.07] px-4 py-3 font-semibold text-gold">Longyu Pro</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.area} className="border-b border-line/60 last:border-b-0">
                  <td className="px-4 py-3 font-medium text-ink">{row.area}</td>
                  <td className="px-4 py-3 text-ink-soft">{row.free}</td>
                  <td className="bg-[#B7791F]/[0.05] px-4 py-3 font-medium text-ink">{row.pro}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-5">
        <div className="text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Planos</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Escolha como quer assinar</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Os dois planos começam com 30 dias grátis e podem ser cancelados a qualquer momento, direto na sua conta.
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
                  {checkoutReady ? "Checkout seguro via Stripe" : "Checkout abre quando o pagamento estiver ativo"}
                </div>
              </button>
            );
          })}
        </div>

        {checkoutReady ? (
          <div className="rounded-3xl border border-[#B7791F]/20 bg-[#B7791F]/[0.06] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <Pill tone="gold">{selectedPlanMeta.badge ?? "30 dias grátis"}</Pill>
                <h3 className="mt-2 font-serif text-2xl font-semibold text-ink">{selectedPlanMeta.name}</h3>
                <p className="mt-1 text-sm leading-6 text-ink-soft">
                  {selectedPlanMeta.detail} {selectedPlanMeta.comparison} Cancele quando quiser.
                </p>
              </div>
              <Button
                size="lg"
                className="bg-[#9A6518] hover:bg-[#785014]"
                onClick={() => void handleSubscribe(selectedPlan)}
              >
                Assinar Pro {selectedPlan === "pro_annual" ? "anual" : "mensal"} <IconChevron width={18} height={18} />
              </Button>
            </div>
            {checkoutNotice && <p className="mt-3 text-xs leading-5 text-ink-soft">{checkoutNotice}</p>}
          </div>
        ) : (
          <div className="rounded-3xl border border-line bg-surface p-5 text-center sm:p-6">
            <Pill tone="gold">Checkout em configuração</Pill>
            <h3 className="mt-3 font-serif text-2xl font-semibold text-ink">A assinatura chega em breve</h3>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">
              Os planos do Longyu Pro já estão definidos. A assinatura será liberada assim que o checkout seguro
              estiver ativo.
            </p>
            <div className="mt-5 flex justify-center">
              <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
            </div>
          </div>
        )}
      </section>

      <section>
        <div className="mb-5 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Por que o Pro acelera</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">Mais prática, menos interrupções</h2>
        </div>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="min-h-40 bg-surface p-4">
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
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold">Grátis vs Longyu Pro</div>
          <h2 className="mt-2 font-serif text-3xl font-semibold text-ink">O hábito continua grátis</h2>
          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-ink-soft">
            Revisão essencial, biblioteca básica, correção imediata de erros e a Jornada inteira não desaparecem no
            plano gratuito. O Pro existe para quem quer treinar mais — nunca para travar quem estuda.
          </p>
        </div>
        <div className="grid overflow-hidden rounded-2xl border border-line md:grid-cols-2">
          <ComparisonColumn title="Grátis" subtitle="Para começar e manter o hábito" features={FREE_FEATURES} />
          <ComparisonColumn
            title="Longyu Pro"
            subtitle="Para estudar sem limites e com revisão inteligente"
            features={PRO_FEATURES}
            pro
          />
        </div>
      </section>

      <section className="border-y border-[#B7791F]/25 bg-surface px-5 py-7 text-center sm:px-8">
        <h2 className="font-serif text-2xl font-semibold text-ink">Seu estudo, com espaço para crescer</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">
          {checkoutReady
            ? "O Pro começa com 30 dias grátis. No anual, você paga R$ 120/ano, o equivalente a R$ 10 por mês."
            : "Os planos já estão definidos. A assinatura será liberada quando o checkout seguro estiver ativo."}
        </p>
        <div className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          {checkoutReady && (
            <Button className="sm:min-w-48" onClick={() => void handleSubscribe(selectedPlan)}>
              Assinar Pro {selectedPlan === "pro_annual" ? "anual" : "mensal"}
            </Button>
          )}
          <Button className="sm:min-w-40" variant={checkoutReady ? "ghost" : "primary"} onClick={() => navigate(-1)}>
            Voltar
          </Button>
        </div>
      </section>
    </div>
  );
}

function ComparisonColumn({
  title,
  subtitle,
  features,
  pro = false,
}: {
  title: string;
  subtitle: string;
  features: string[];
  pro?: boolean;
}) {
  return (
    <div className={["p-5 sm:p-6", pro ? "border-t border-[#B7791F]/25 bg-[#B7791F]/[0.06] md:border-l md:border-t-0" : "bg-surface"].join(" ")}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-xs text-ink-faint">{subtitle}</p>
        </div>
        {pro && <Pill tone="gold">Mais escolhido</Pill>}
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
