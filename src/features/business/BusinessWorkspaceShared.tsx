import type { ReactNode } from "react";
import { ButtonLink, Card, EmptyState, ErrorState, PageHeader } from "../../components/ui/primitives";
import { useEntitlementStatus } from "../../lib/entitlementStatus";
import { useTranslation } from "../../i18n/useTranslation";
import type { BusinessErrorCode } from "../../services/businessWorkspaceService";

export const BUSINESS_ERROR_KEYS: Record<BusinessErrorCode, string> = {
  UNAUTHENTICATED: "business.errorUnauthenticated",
  FORBIDDEN: "business.errorForbidden",
  BACKEND_OFF: "business.errorBackendOff",
  UNKNOWN: "business.errorUnknown",
};

export const BUSINESS_ROLE_KEYS: Record<string, string> = {
  owner: "business.roleOwner",
  admin: "business.roleAdmin",
  manager: "business.roleManager",
  learner: "business.roleLearner",
};

export const BUSINESS_SEAT_STATUS_KEYS: Record<string, string> = {
  active: "business.statusActive",
  invited: "business.statusInvited",
  suspended: "business.statusSuspended",
};

/**
 * A organização do painel vem do entitlement do servidor, nunca da URL.
 *
 * Deixar o id na rota convidaria a tentar o UUID do vizinho. A RPC recusaria
 * de qualquer jeito, mas a tela não precisa oferecer a tentação.
 */
export function useWorkspaceOrganizationId(): string | null {
  const detail = useEntitlementStatus((state) => state.detail);
  return detail?.organizationId ?? null;
}

export function BusinessWorkspaceShell({ title, children }: { title: string; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-[calc(env(safe-area-inset-bottom)+1rem)]" data-business-workspace>
      <PageHeader eyebrow={t("business.eyebrow")} title={title} />
      {children}
      <Card className="p-4">
        <p className="text-xs leading-5 text-ink-soft">{t("business.privacy")}</p>
      </Card>
    </div>
  );
}

export function BusinessWorkspaceError({ code }: { code: BusinessErrorCode }) {
  const { t } = useTranslation();
  return <ErrorState title={t("business.workspace")} desc={t(BUSINESS_ERROR_KEYS[code])} />;
}

export function BusinessNoWorkspace() {
  const { t } = useTranslation();
  return (
    <div className="mx-auto max-w-2xl space-y-4" data-business-workspace>
      <PageHeader eyebrow={t("business.eyebrow")} title={t("business.workspace")} />
      <EmptyState
        title={t("business.noWorkspace")}
        desc={t("business.noWorkspaceLead")}
        action={<ButtonLink to="/business#contato">{t("business.talkToSales")}</ButtonLink>}
      />
    </div>
  );
}
