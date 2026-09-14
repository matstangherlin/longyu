import { useEffect, useState } from "react";
import { ButtonLink, Card, LoadingState } from "../../components/ui/primitives";
import { fetchBusinessOverview, type BusinessErrorCode, type BusinessOverview } from "../../services/businessWorkspaceService";
import { useTranslation } from "../../i18n/useTranslation";
import {
  BusinessNoWorkspace,
  BusinessWorkspaceError,
  BusinessWorkspaceShell,
  useWorkspaceOrganizationId,
} from "./BusinessWorkspaceShared";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="font-serif text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-5 text-ink-soft">{label}</p>
    </Card>
  );
}

export function BusinessDashboardPage() {
  const { t } = useTranslation();
  const organizationId = useWorkspaceOrganizationId();
  const [overview, setOverview] = useState<BusinessOverview | null>(null);
  const [error, setError] = useState<BusinessErrorCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void fetchBusinessOverview(organizationId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setOverview(result.value);
        setError(null);
      } else {
        setError(result.code);
        setOverview(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  if (!organizationId) return <BusinessNoWorkspace />;
  if (loading) return <LoadingState label={t("common.loading")} />;
  if (error) return <BusinessWorkspaceError code={error} />;
  if (!overview) return <BusinessNoWorkspace />;

  return (
    <BusinessWorkspaceShell title={overview.name || t("business.workspace")}>
      <Card className="p-4" data-business-seats>
        <h2 className="font-semibold text-ink">{t("business.seats")}</h2>
        <p className="mt-1 font-serif text-2xl font-semibold text-ink">
          {t("business.seatsUsage", { reserved: overview.seatsReserved, total: overview.seatEntitlement })}
        </p>
        <ul className="mt-2 space-y-1 text-xs text-ink-soft">
          <li>{t("business.seatsActive", { count: overview.seatsActive })}</li>
          <li>{t("business.seatsPending", { count: overview.seatsPending })}</li>
          <li>{t("business.seatsAvailable", { count: overview.seatsAvailable })}</li>
        </ul>
      </Card>

      <section className="space-y-2">
        <h2 className="font-semibold text-ink">{t("business.activity")}</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label={t("business.activeLearners")} value={String(overview.activeLearners7d)} />
          <Metric label={t("business.lessonsCompleted")} value={String(overview.lessonsCompletedTotal)} />
          <Metric label={t("business.averageProgress")} value={`${overview.averageJourneyProgress}%`} />
        </div>
      </section>

      <ButtonLink to="/business/members" className="w-full sm:w-auto">
        {t("business.seeMembers")}
      </ButtonLink>
    </BusinessWorkspaceShell>
  );
}
