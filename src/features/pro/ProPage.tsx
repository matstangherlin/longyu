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

// Comparação concreta: o que o grátis permite e o que o Pro melhora.
// Nada aqui bloqueia o aprendizado gratuito: a Jornada, a revisão essencial e a
// correção imediata de erros continuam livres para sempre.
const COMPARISON_ROWS: { area: string; free: string; pro: string }[] = [
  { area: "Jornada de lições", free: "Completa, no seu ritmo", pro: "Completa, no seu ritmo" },
  { area: "Correção imediata de erros", free: "Sempre grátis", pro: "Sempre grátis" },
  { area: "Cargas diárias", free: `${DAILY_CHARGES_FREE} por dia`, pro: "Sem limite" },
  { area: "Revisão inteligente", free: `Até ${FREE_REVIEW_SESSION_LIMIT} itens por sessão`, pro: "Fila completa, sem limite" },
  { area: "Erros detalhados", free: "—", pro: "Histórico, padrões e revisão focada" },
  { area: "Plano de treino", free: "Recomendação simples", pro: "Correção intensiva dos pontos fracos" },
  { area: "Pinyin Lab e Hànzì Builder", free: "Com Cargas", pro: "Completos, sem limite" },
  { area: "Imersão e histórias", free: "Trilha básica com Cargas", pro: "Sem limite + histórias extras" },
  { area: "Refazer questão ou teste", free: "Custa Qi", pro: "Sem custo" },
  { area: "Qi por conclusão", free: "Padrão", pro: `+${PRO_LESSON_QI_BONUS} Qi por lição` },
  { area: "Missões", free: "Missões diárias úteis", pro: "+ missões premium com mais Qi" },
  { area: "Baús", free: "Qi, cargas, escudo, tentativa extra", pro: "Mais Qi nos mesmos baús" },
];

const BENEFITS = [
  { title: "Cargas ilimitadas", detail: "Estude o quanto quiser: lições, treino, labs e imersão sem esperar o dia virar.", icon: IconFlame },
  { title: "Revisão sem limite", detail: "A fila inteligente inteira, com filtros por modo e prioridade por fraqueza.", icon: IconRefresh },
  { title: "Erros detalhados", detail: "Histórico completo, padrões de repetição e correção intensiva por ponto fraco.", icon: IconTarget },
  { title: "Plano de treino automático", detail: "O Longyu monta a próxima prática a partir dos seus próprios erros.", icon: IconShield },
  { title: "Labs completos", detail: "Pinyin Lab e Hànzì Builder abertos, sem consumir Cargas.", icon: IconBook },
  { title: "Imersão e histórias extras", detail: "Sessões sem limite e histórias adicionais com diálogos maiores.", icon: IconHeadphones },
  { title: "Retry sem custo", detail: "Refazer questão errada ou teste de módulo não gasta Qi.", icon: IconStar },
  { title: "Economia acelerada", detail: `Mais Qi por conclusão e baús mais generosos — nunca progresso comprado.`, icon: IconCheck },
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
    comparison: "Ideal para testar sem compromisso anual.",
  },
];

export function ProPage() {
  const navigate = useNavigate();
  const isPreviewActive = useStore((state) => state.isPremium);
  const serverIsPro = useStore((state) => state.serverIsPro);
  const setPremium = useStore((state) => state.setPremium);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<ProPlanKey>("pro_annual");
  const cloudBackend = isSupabaseBackendEnabled();

  const selectedPlanMeta = useMemo(
    () => BILLING_PLANS.find((plan) => plan.key === selectedPlan) ?? BILLING_PLANS[0],
    [selectedPlan]
  );

  async function handleSubscribe(planKey = selectedPlan) {
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
          Aprenda no grátis. Acelere com o Pro.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
          A Jornada, a revisão essencial e a correção imediata de erros são grátis para sempre.
          O Pro remove os limites diários e transforma seus erros em um plano de treino focado.
        </p>
        {serverIsPro && (
          <div className="mx-auto mt-5 max-w-md rounded-2xl border border-[rgb(var(--good)/0.3)] bg-[rgb(var(--good)/0.08)] px-4 py-3 text-sm font-semibold text-[rgb(var(--good))]">
            Sua assinatura Pro está ativa. Obrigado por apoiar o Longyu!
          </div>
        )}
        {!cloudBackend && (
          <div className="mx-auto mt-5 max-w-xl rounded-2xl border border-line bg-surface px-4 py-3 text-left text-sm leading-6 text-ink-soft">
            <span className="font-semibold text-ink">Status honesto:</span> o pagamento (Stripe) ainda não está
            ativo nesta versão. Nada será cobrado. Você pode ativar o Pro Preview local abaixo, sem pagamento e
            sem assinatura real.
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
                <th className="bg-[#B7791F]/[0.07] px-4 py-3 font-semibold text-gold">Pro</th>
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
                  {cloudBackend ? "Checkout seguro via Stripe" : "Checkout abre quando o pagamento estiver ativo"}
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
                {selectedPlanMeta.detail} {selectedPlanMeta.comparison} Cancele quando quiser.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-[#9A6518] hover:bg-[#785014]"
              onClick={() => void handleSubscribe(selectedPlan)}
            >
              {cloudBackend ? "Começar 30 dias grátis" : "Assinar (quando disponível)"}
              <IconChevron width={18} height={18} />
            </Button>
          </div>
          {checkoutNotice && <p className="mt-3 text-xs leading-5 text-ink-soft">{checkoutNotice}</p>}
        </div>
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

      <section className="rounded-3xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-2xl font-semibold text-ink">Pro Preview</h2>
            <p className="mt-1 max-w-xl text-sm leading-6 text-ink-soft">
              Prévia local dos recursos Pro neste dispositivo — sem pagamento, sem conta em nuvem e sem renovação
              automática. Desative quando quiser.
              {cloudBackend ? " O preview não substitui a assinatura real: o Pro de verdade vem do servidor." : ""}
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:items-end">
            <Button
              size="lg"
              className="bg-[#9A6518] hover:bg-[#785014]"
              disabled={isPreviewActive}
              onClick={() => setPremium(true)}
            >
              {isPreviewActive ? <><IconCheck width={19} height={19} /> Preview ativo</> : "Experimentar Pro Preview"}
            </Button>
            {isPreviewActive && (
              <Button variant="ghost" onClick={() => setPremium(false)}>
                Desativar preview
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="border-y border-[#B7791F]/25 bg-surface px-5 py-7 text-center sm:px-8">
        <h2 className="font-serif text-2xl font-semibold text-ink">O hábito continua grátis</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-soft">
          Revisão essencial, biblioteca básica, correção imediata de erros e a Jornada inteira não desaparecem no
          plano gratuito. O Pro existe para quem quer treinar mais — nunca para travar quem estuda.
        </p>
        <div className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="sm:min-w-48" onClick={() => void handleSubscribe(selectedPlan)}>
            Assinar {selectedPlan === "pro_annual" ? "anual" : "mensal"}
          </Button>
          <Button className="sm:min-w-40" variant="ghost" onClick={() => navigate(-1)}>Voltar</Button>
        </div>
      </section>
    </div>
  );
}
