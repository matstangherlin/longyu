import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ModalOverlay } from "../ui/ModalOverlay";
import { Button } from "../ui/primitives";
import { IconBook, IconChat, IconFlame, IconHanzi, IconHeadphones, IconStar, IconTarget } from "../ui/Icon";

export type ProPaywallKind = "qi" | "energy" | "immersion" | "hanzi" | "speech" | "reports" | "content" | "review" | "errors";

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
    description: "No Pro Preview, repetir uma questão, lição ou teste não consome Qi.",
    benefit: "Refaça no seu ritmo e transforme erros em prática, sem interromper o estudo.",
    icon: IconStar,
  },
  energy: {
    eyebrow: "Cargas do Dragão",
    title: "Suas Cargas acabaram por hoje",
    description: "Volte amanhã, complete uma missão para recuperar cargas ou teste cargas infinitas no Pro Preview.",
    benefit: "O Pro Preview remove esse bloqueio apenas neste dispositivo, sem assinatura real.",
    icon: IconFlame,
  },
  immersion: {
    eyebrow: "Imersão ilimitada",
    title: "Mantenha o mandarim no ouvido",
    description: "Sessões de imersão usam Cargas do Dragão no plano grátis. No Pro Preview, a prática guiada fica ampliada para teste.",
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
    benefit: "Enquanto isso, use a prévia para experimentar o formato e preparar sua fala.",
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
    description: "Visualize novas fases, trilhas HSK e situações reais do mandarim no preview local.",
    benefit: "A jornada gratuita permanece disponível; o preview amplia o caminho para teste.",
    icon: IconBook,
  },
  review: {
    eyebrow: "Revisão avançada",
    title: "Revise além da fila essencial",
    description: "Continue a sessão com tarefas ativas e foco nas fraquezas que mais precisam voltar hoje.",
    benefit: "A revisão gratuita continua ativa todos os dias; o preview libera a fila ampliada localmente.",
    icon: IconTarget,
  },
  errors: {
    eyebrow: "Erros detalhados",
    title: "Erros detalhados fazem parte do Longyu Pro",
    description: "Você ainda pode fazer revisões básicas pela Jornada.",
    benefit: "Pro libera histórico completo, padrões de repetição, análise por competência e correção intensiva por pontos fracos.",
    icon: IconTarget,
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
            Pro Preview
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
        <p className="mt-3 text-center text-xs text-ink-faint">Sem cobrança e sem assinatura real nesta prévia.</p>
      </section>
    </ModalOverlay>
  );
}
