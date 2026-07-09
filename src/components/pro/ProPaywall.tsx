import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import { IconBook, IconChat, IconFlame, IconHanzi, IconHeadphones, IconStar, IconTarget } from "../ui/Icon";
import { isSupabaseBackendEnabled } from "../../lib/backendConfig";

export type ProPaywallKind =
  | "qi"
  | "energy"
  | "immersion"
  | "hanzi"
  | "speech"
  | "reports"
  | "content"
  | "review"
  | "errors"
  | "weak_spots"
  | "story"
  | "training";

const PAYWALL_COPY: Record<ProPaywallKind, {
  eyebrow: string;
  title: string;
  description: string;
  benefit: string;
  icon: typeof IconStar;
}> = {
  qi: {
    eyebrow: "Refazer sem gastar Qi",
    title: "Continue praticando sem contar tentativas",
    description: "Com o Longyu Pro, repetir uma questão, lição ou teste não consome Qi.",
    benefit: "Refaça no seu ritmo e transforme erros em prática, sem interromper o estudo.",
    icon: IconStar,
  },
  energy: {
    eyebrow: "Cargas do Dragão",
    title: "Suas Cargas de hoje acabaram",
    description: "Continue sem limite com o Longyu Pro — ou volte amanhã, ou complete uma missão para recuperar cargas.",
    benefit: "No Pro, Cargas não travam a prática: você estuda o quanto quiser, todos os dias.",
    icon: IconFlame,
  },
  immersion: {
    eyebrow: "Imersão ilimitada",
    title: "Mantenha o mandarim no ouvido",
    description: "Sessões de imersão usam Cargas do Dragão no plano grátis. Com o Longyu Pro, a imersão fica ampliada.",
    benefit: "Faça quantas sessões quiser e avance para shadowing avançado quando estiver pronto.",
    icon: IconHeadphones,
  },
  hanzi: {
    eyebrow: "Hànzì profundo",
    title: "Entenda o caractere por inteiro",
    description: "Explore famílias de componentes, padrões fonéticos e uso em palavras reais.",
    benefit: "Menos decoreba, mais conexões entre forma, som, significado e contexto.",
    icon: IconHanzi,
  },
  speech: {
    eyebrow: "Fala com IA",
    title: "Pratique conversas com feedback",
    description: "Em breve você poderá treinar conversas guiadas com feedback mais completo.",
    benefit: "Um recurso do Longyu Pro para praticar a fala com correção clara.",
    icon: IconChat,
  },
  reports: {
    eyebrow: "Relatórios de progresso",
    title: "Veja exatamente onde avançar",
    description: "Acompanhe evolução por motor, tom, habilidade e período de estudo.",
    benefit: "Transforme seu histórico em uma recomendação clara para a próxima prática.",
    icon: IconTarget,
  },
  content: {
    eyebrow: "Conteúdo premium",
    title: "Continue sua jornada completa",
    description: "Acesse novas fases, trilhas HSK e situações reais do mandarim com o Longyu Pro.",
    benefit: "A jornada gratuita permanece disponível; o Pro amplia o caminho para você avançar mais.",
    icon: IconBook,
  },
  review: {
    eyebrow: "Revisão avançada",
    title: "Revise além da fila essencial",
    description: "Continue a sessão com tarefas ativas e foco nas fraquezas que mais precisam voltar hoje.",
    benefit: "A revisão gratuita continua ativa todos os dias; o Longyu Pro libera a fila ampliada.",
    icon: IconTarget,
  },
  errors: {
    eyebrow: "Erros detalhados",
    title: "Veja seus padrões de erro e corrija pontos fracos",
    description: "A correção imediata do erro da lição atual continua grátis. O Pro adiciona o histórico completo e os padrões de repetição.",
    benefit: "Pro libera histórico completo, padrões por competência e correção intensiva dos pontos fracos.",
    icon: IconTarget,
  },
  weak_spots: {
    eyebrow: "Revisão focada",
    title: "O Pro cria uma revisão focada nos seus pontos fracos",
    description: "Você teve dificuldade nesta lição. Corrigir os erros agora continua grátis — o Pro monta um plano de treino automático para os pontos que mais repetem.",
    benefit: "Correção intensiva por ponto fraco, com fila montada a partir dos seus próprios erros.",
    icon: IconTarget,
  },
  story: {
    eyebrow: "Histórias extras",
    title: "Histórias extras fazem parte do Longyu Pro",
    description: "As histórias da trilha básica continuam grátis. As histórias extras aprofundam vocabulário e diálogos.",
    benefit: "Mais contexto real: diálogos maiores, escolhas e revisão integrada em cada história.",
    icon: IconBook,
  },
  training: {
    eyebrow: "Treino livre completo",
    title: "Treino livre completo é Pro",
    description: "O treino básico e a revisão essencial continuam grátis todos os dias. O Pro libera treino ilimitado e a fila de itens fracos.",
    benefit: "Treine qualquer ponto fraco, sem limite de Cargas e com priorização automática.",
    icon: IconFlame,
  },
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
  const Icon = copy.icon;
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
        {kind === "energy" ? (
          <div className="mt-5 grid gap-2">
            <Link to="/pro" onClick={onClose}>
              <Button size="lg" className="w-full">Ver Longyu Pro</Button>
            </Link>
            <Link to="/treino" onClick={onClose}>
              <Button size="lg" variant="outline" className="w-full">Ir para missões</Button>
            </Link>
            <Button size="lg" variant="ghost" className="w-full" onClick={onClose}>Voltar amanhã</Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-2">
            <Link to="/pro" onClick={onClose}>
              <Button size="lg" className="w-full">Ver Longyu Pro</Button>
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
