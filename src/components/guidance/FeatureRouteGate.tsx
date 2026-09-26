import type { ReactNode } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { Card } from "../ui/primitives";
import { IconLock } from "../ui/Icon";
import { useTranslation } from "../../i18n/useTranslation";
import { useFeatureVisibility } from "../../hooks/useProgressiveDiscovery";
import { routeAccess, type DiscoveryFeatureId } from "../../lib/progressiveDiscovery";
import type { MessageKey } from "../../locales/pt-BR";

const UNAVAILABLE_COPY: Partial<Record<DiscoveryFeatureId, MessageKey>> = {
  culture: "discovery.unavailable.culture",
  immersion: "discovery.unavailable.immersion",
  phaseChallenge: "discovery.unavailable.phaseChallenge",
};

/**
 * RC2.2.18 · CL/CM — página simples para uma área ainda não descoberta. Sem
 * data, número ou "pague para desbloquear": a saída é a Jornada, que é onde o
 * pré-requisito se constrói.
 */
export function FeatureUnavailablePage({ feature }: { feature: DiscoveryFeatureId }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto flex max-w-md flex-col items-stretch gap-4 py-8" data-feature-unavailable={feature}>
      <Card className="flex flex-col items-center gap-3 p-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-ink-soft" aria-hidden>
          <IconLock width={22} height={22} />
        </span>
        <h1 className="text-lg font-semibold text-ink">{t("discovery.unavailable.title")}</h1>
        <p className="text-sm leading-5 text-ink-soft">{t(UNAVAILABLE_COPY[feature] ?? "discovery.unavailable.generic")}</p>
        <Link
          to="/jornada"
          className="mt-1 inline-flex min-h-12 w-full items-center justify-center rounded-2xl bg-accent px-5 text-base font-semibold text-white"
          data-feature-unavailable-cta
        >
          {t("discovery.unavailable.cta")}
        </Link>
      </Card>
    </div>
  );
}

/**
 * Portão de rota das áreas HARD (Cultura, Imersão, Desafio de fase). URL
 * manual não pula o desbloqueio pedagógico (PART AQ); Pro também não (a regra
 * nem recebe o plano). Entradas vindas da Jornada com `journeyNode` já passam
 * pelo JourneyNodeGate, que é a autoridade daquele nó.
 */
export function FeatureRouteGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [params] = useSearchParams();
  const { visibility } = useFeatureVisibility();
  if (params.get("journeyNode")) return <>{children}</>;
  const access = routeAccess(location.pathname, visibility);
  if (access.blocked) return <FeatureUnavailablePage feature={access.feature} />;
  return <>{children}</>;
}
