import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mascot } from "../../components/brand/Mascot";
import { Button, Pill } from "../../components/ui/primitives";
import {
  IconBook,
  IconChat,
  IconCheck,
  IconFlame,
  IconHanzi,
  IconHeadphones,
  IconLibrary,
  IconRefresh,
  IconShield,
  IconSound,
  IconTarget,
} from "../../components/ui/Icon";
import { useStore } from "../../lib/store";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";
import { createCheckoutSession } from "../../services/subscriptionService";

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

export function ProPage() {
  const navigate = useNavigate();
  const isPremium = useStore((state) => state.isPremium);
  const setPremium = useStore((state) => state.setPremium);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);
  const cloudBackend = isSupabaseBackendEnabled();

  async function handleSubscribe() {
    const result = await createCheckoutSession("pro_monthly");
    setCheckoutNotice(result.message);
    if (result.data?.url) window.location.assign(result.data.url);
  }

  return (
    <div className="mx-auto max-w-5xl space-y-10 pb-8">
      <header className="border-b border-[#B7791F]/25 pb-8 text-center">
        <Mascot size={104} variant="celebrate" className="mx-auto" />
        <Pill tone="gold" className="mt-3">Longyu Pro Preview</Pill>
        <h1 className="mx-auto mt-4 max-w-3xl font-serif text-4xl font-semibold leading-tight text-ink sm:text-5xl">
          Experimente o Longyu completo em preview local.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-ink-soft sm:text-lg">
          {cloudBackend
            ? "Experimente o preview local ou assine o Pro real com checkout seguro via Stripe."
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
            {cloudBackend ? "Assinar Longyu Pro" : "Assinar Pro (quando disponível)"}
          </Button>
          {checkoutNotice && (
            <p className="text-xs leading-5 text-ink-soft">{checkoutNotice}</p>
          )}
        </div>
      </header>

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
          Ative a prévia para experimentar os recursos no seu perfil local. Isso não cria assinatura real nem pagamento.
        </p>
        <div className="mx-auto mt-5 flex max-w-md flex-col gap-3 sm:flex-row sm:justify-center">
          <Button className="sm:min-w-48" onClick={() => setPremium(true)} disabled={isPremium}>
            {isPremium ? "Preview ativo" : "Ativar Pro Preview"}
          </Button>
          <Button className="sm:min-w-40" variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
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
