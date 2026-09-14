import { useEffect, useState } from "react";
import { Button, ButtonLink, LoadingState } from "../../components/ui/primitives";
import {
  fetchBusinessMembers,
  type BusinessErrorCode,
  type BusinessMembersPage as MembersPage,
} from "../../services/businessWorkspaceService";
import { useTranslation } from "../../i18n/useTranslation";
import {
  BUSINESS_ROLE_KEYS,
  BUSINESS_SEAT_STATUS_KEYS,
  BusinessNoWorkspace,
  BusinessWorkspaceError,
  BusinessWorkspaceShell,
  useWorkspaceOrganizationId,
} from "./BusinessWorkspaceShared";

const PAGE_SIZE = 25;

function formatDate(value: string | null, locale: string): string | null {
  if (!value) return null;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(locale === "pt-BR" ? "pt-BR" : "en-US", { dateStyle: "medium" }).format(ms);
}

export function BusinessMembersPage() {
  const { t, locale } = useTranslation();
  const organizationId = useWorkspaceOrganizationId();
  const [page, setPage] = useState<MembersPage | null>(null);
  const [offset, setOffset] = useState(0);
  const [error, setError] = useState<BusinessErrorCode | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizationId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetchBusinessMembers(organizationId, { limit: PAGE_SIZE, offset }).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setPage(result.value);
        setError(null);
      } else {
        setError(result.code);
        setPage(null);
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [organizationId, offset]);

  if (!organizationId) return <BusinessNoWorkspace />;
  if (loading && !page) return <LoadingState label={t("common.loading")} />;
  if (error) return <BusinessWorkspaceError code={error} />;
  if (!page) return <BusinessNoWorkspace />;

  const from = page.total === 0 ? 0 : page.offset + 1;
  const to = Math.min(page.offset + page.members.length, page.total);

  return (
    <BusinessWorkspaceShell title={t("business.members")}>
      <p className="text-xs leading-5 text-ink-soft">{t("business.membersLead")}</p>

      {/* A tabela rola sozinha no celular; a página nunca rola de lado. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm" data-business-members>
          <thead>
            <tr className="text-[11px] uppercase tracking-[0.08em] text-ink-faint">
              <th scope="col" className="px-2 py-2">{t("business.memberName")}</th>
              <th scope="col" className="px-2 py-2">{t("business.memberRole")}</th>
              <th scope="col" className="px-2 py-2">{t("business.memberStatus")}</th>
              <th scope="col" className="px-2 py-2">{t("business.memberLastActive")}</th>
              <th scope="col" className="px-2 py-2">{t("business.memberProgress")}</th>
            </tr>
          </thead>
          <tbody>
            {page.members.map((member) => (
              <tr key={member.userId} className="border-t border-line/60">
                <td className="px-2 py-2 text-ink">{member.displayName ?? t("business.unnamed")}</td>
                <td className="px-2 py-2 text-ink-soft">{t(BUSINESS_ROLE_KEYS[member.role] ?? "business.roleLearner")}</td>
                <td className="px-2 py-2 text-ink-soft">
                  {t(BUSINESS_SEAT_STATUS_KEYS[member.seatStatus] ?? "business.statusActive")}
                </td>
                <td className="px-2 py-2 text-ink-soft">{formatDate(member.lastActive, locale) ?? t("business.never")}</td>
                <td className="px-2 py-2 text-ink-soft">{member.journeyProgressPercent}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-faint">{t("business.pageOf", { from, to, total: page.total })}</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={offset === 0 || loading}
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
          >
            {t("business.previous")}
          </Button>
          <Button variant="outline" disabled={to >= page.total || loading} onClick={() => setOffset(offset + PAGE_SIZE)}>
            {t("business.next")}
          </Button>
        </div>
      </div>

      <ButtonLink to="/business/dashboard" variant="outline" className="w-full sm:w-auto">
        {t("business.backToDashboard")}
      </ButtonLink>
    </BusinessWorkspaceShell>
  );
}
