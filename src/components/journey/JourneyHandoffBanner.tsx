import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLesson } from "../../data/journey";
import { peekJourneyReturnAnchor, type JourneyReturnAnchor, type JourneyReturnSource } from "../../lib/journeyReturnAnchor";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.2.24 — quem veio da Jornada para outra aba nunca precisa descobrir
 * sozinho o que fazer: "Você veio da Jornada. Complete esta atividade para
 * continuar <unidade>." + [Voltar à Jornada] (volta ao nó certo pela âncora).
 *
 * Lê a âncora num efeito: a Jornada a grava ao desmontar, que acontece no
 * mesmo commit em que esta tela monta.
 */
export function JourneyHandoffBanner({ source }: { source: JourneyReturnSource | readonly JourneyReturnSource[] }) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<JourneyReturnAnchor | null>(null);
  const sources = Array.isArray(source) ? source : [source];
  useEffect(() => {
    const current = peekJourneyReturnAnchor();
    setAnchor(current && current.returnReason === "REQUIRED_ACTIVITY" && sources.includes(current.activitySource) ? current : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- lido uma vez ao entrar
  }, []);
  if (!anchor) return null;
  const unit = getLesson(anchor.lessonId)?.unitTitle ?? "";
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-accent/25 bg-accent-soft/30 px-4 py-3" data-testid="journey-handoff-banner" data-journey-source={anchor.activitySource} data-journey-anchor-lesson={anchor.lessonId}>
      <p className="min-w-0 text-sm text-ink">
        <span className="font-semibold">{t("journey.handoffFromJourney")}</span> {t("journey.handoffComplete", { unit })}
      </p>
      <Link to="/jornada" className="inline-flex min-h-11 items-center text-sm font-semibold text-accent hover:underline" data-testid="journey-handoff-back">
        {t("journey.handoffBack")}
      </Link>
    </div>
  );
}
