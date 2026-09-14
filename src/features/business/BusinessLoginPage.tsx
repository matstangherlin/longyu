import { Card, ButtonLink, PageHeader } from "../../components/ui/primitives";
import { loginNextPath } from "../../lib/auth/publicRoutes";
import { PublicMarketingLayout } from "../marketing/PublicMarketingLayout";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * Porta de entrada do painel, e não um segundo login.
 *
 * A tentação aqui é criar autenticação própria para empresa. Seriam duas
 * superfícies de credencial para manter seguras, duas recuperações de senha e
 * duas formas de errar. Quem administra a empresa usa a mesma conta Longyu; o
 * papel dentro da organização é que decide o que ele vê.
 */
export function BusinessLoginPage() {
  const { t } = useTranslation();
  return (
    <PublicMarketingLayout eyebrow={t("business.eyebrow")}>
      <div className="mx-auto max-w-md space-y-4" data-business-login>
        <PageHeader eyebrow={t("business.eyebrow")} title={t("business.loginTitle")} />
        <Card className="p-4">
          <p className="text-sm leading-6 text-ink-soft">{t("business.loginLead")}</p>
          <ButtonLink to={loginNextPath("/business/dashboard")} className="mt-4 w-full">
            {t("business.loginCta")}
          </ButtonLink>
          <ButtonLink to="/business#contato" variant="outline" className="mt-2 w-full">
            {t("business.talkToSales")}
          </ButtonLink>
        </Card>
      </div>
    </PublicMarketingLayout>
  );
}
