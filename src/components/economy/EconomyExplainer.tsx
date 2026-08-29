import { Link } from "react-router-dom";
import { ButtonLink, Card } from "../ui/primitives";
import { DAILY_CHARGES_FREE, ECONOMY_SUMMARY } from "../../data/economy";
import { getPlanFeature } from "../../data/planFeatures";
import { useTranslation } from "../../i18n/useTranslation";
import { displayInstruction } from "../../i18n/overlays/journeyChrome";
import type { MessageKey } from "../../locales/pt-BR";

interface EconomyExplainerProps {
  isPro?: boolean;
  /** Contexto curto para a tela (loja, missões, treino, conta). */
  context?: "loja" | "missoes" | "treino" | "conta" | "ligas";
  className?: string;
}

const CONTEXT_LEAD_KEYS: Record<NonNullable<EconomyExplainerProps["context"]>, MessageKey> = {
  loja: "hub.economyLeadLoja",
  missoes: "hub.economyLeadMissoes",
  treino: "hub.economyLeadTreino",
  conta: "hub.economyLeadConta",
  ligas: "hub.economyLeadLigas",
};

export function EconomyExplainer({ isPro = false, context = "conta", className = "" }: EconomyExplainerProps) {
  const { t } = useTranslation();
  const lead = t(CONTEXT_LEAD_KEYS[context]);

  return (
    <Card className={["border-line/50 p-3 text-xs leading-5 text-ink-soft", className].join(" ")}>
      <p className="text-ink-faint">{lead}</p>
      <p className="mt-2">
        <span className="font-semibold text-ink">{t("pro.free")}:</span>{" "}
        {t("hub.economyFreeBody", {
          n: DAILY_CHARGES_FREE,
          qi: displayInstruction(ECONOMY_SUMMARY.free.qiUses),
          chest: displayInstruction(ECONOMY_SUMMARY.free.chestSmall),
        })}
      </p>
      <p className="mt-1">
        <span className="font-semibold text-gold">{t("common.pro")}:</span>{" "}
        {t("hub.economyProBody", {
          benefit: displayInstruction(getPlanFeature("cargas").proBenefit),
          qi: ECONOMY_SUMMARY.pro.qiBonusPerLesson,
          retry: displayInstruction(ECONOMY_SUMMARY.pro.retryCost),
          chest: displayInstruction(ECONOMY_SUMMARY.pro.chestDeepReview),
        })}
        {isPro ? (
          <span className="text-gold"> {t("hub.economyActive")}</span>
        ) : context === "missoes" ? null : (
          <>
            {" "}
            <Link to="/pro" className="inline-flex min-h-11 items-center font-semibold text-gold hover:underline">
              {t("settings.seeProPlans")}
            </Link>
          </>
        )}
      </p>
      {!isPro && context === "missoes" ? (
        <ButtonLink to="/pro" variant="outline" size="sm" className="mt-2 w-full min-w-0">
          {t("settings.seeProPlans")}
        </ButtonLink>
      ) : null}
    </Card>
  );
}
