import { Link } from "react-router-dom";
import { Card } from "../ui/primitives";
import { DAILY_CHARGES_FREE, ECONOMY_SUMMARY } from "../../data/economy";
import { getPlanFeature } from "../../data/planFeatures";

interface EconomyExplainerProps {
  isPro?: boolean;
  /** Contexto curto para a tela (loja, missões, treino, conta). */
  context?: "loja" | "missoes" | "treino" | "conta" | "ligas";
  className?: string;
}

const CONTEXT_LEAD: Record<NonNullable<EconomyExplainerProps["context"]>, string> = {
  loja: "Qi compra conforto e tentativas — nunca progresso direto.",
  missoes: "Missões devolvem Qi e cargas; corrigir erros na lição não gasta carga.",
  treino: "Treino focado e erros detalhados abrem no Pro; revisão essencial continua grátis.",
  conta: "Resumo da economia: aprenda no grátis, estude sem interrupção no Pro.",
  ligas: "Ligas competem só por XP de estudo — Pro não altera o ranking.",
};

export function EconomyExplainer({ isPro = false, context = "conta", className = "" }: EconomyExplainerProps) {
  const lead = CONTEXT_LEAD[context];

  return (
    <Card className={["border-line/50 p-3 text-xs leading-5 text-ink-soft", className].join(" ")}>
      <p className="text-ink-faint">{lead}</p>
      <p className="mt-2">
        <span className="font-semibold text-ink">Grátis:</span>{" "}
        {DAILY_CHARGES_FREE} cargas/dia · revisão essencial sem carga ·{" "}
        {ECONOMY_SUMMARY.free.qiUses.toLowerCase()} · baús com {ECONOMY_SUMMARY.free.chestSmall.toLowerCase()}.
      </p>
      <p className="mt-1">
        <span className="font-semibold text-gold">Pro:</span>{" "}
        {getPlanFeature("cargas").proBenefit} · +{ECONOMY_SUMMARY.pro.qiBonusPerLesson} Qi/lição ·{" "}
        {ECONOMY_SUMMARY.pro.retryCost.toLowerCase()} · {ECONOMY_SUMMARY.pro.chestDeepReview.toLowerCase()}.
        {isPro ? (
          <span className="text-gold"> Ativo na sua conta.</span>
        ) : (
          <>
            {" "}
            <Link to="/pro" className="font-semibold text-gold hover:underline">
              Ver planos Pro
            </Link>
          </>
        )}
      </p>
    </Card>
  );
}
