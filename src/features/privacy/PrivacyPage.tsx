import { Link } from "react-router-dom";
import { Card, ButtonLink } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { TelemetryDataDetails } from "../../components/privacy/TelemetryDataDetails";
import { FEEDBACK_EMAIL } from "../../lib/feedback";
import { useTranslation } from "../../i18n/useTranslation";

export function PrivacyPage() {
  const { t } = useTranslation();
  return (
    <HubPage className="space-y-5">
      <HubHeader
        eyebrow={t("hub.privacyEyebrow")}
        title={t("settings.privacyData")}
        desc={t("hub.privacyDesc")}
        aside={
          <ButtonLink to="/ajustes#privacidade-dados" variant="outline" size="sm">
            {t("common.openSettings")}
          </ButtonLink>
        }
      />

      <HubSection id="dados-coletados" title={t("hub.privacyPedagogy")}>
        <Card className="rounded-xl border-line/70 p-4 shadow-none">
          <TelemetryDataDetails />
        </Card>
      </HubSection>

      {/* RC2.2.12 · AH — caminho público de exclusão (Play Console exige URL
          acessível sem o app). */}
      <HubSection id="excluir-conta" title={t("privacyNotice.deletionTitle")}>
        <Card className="rounded-xl border-line/70 p-4 shadow-none text-sm leading-6 text-ink-soft" data-testid="privacy-account-deletion">
          <p>{t("privacyNotice.deletionSteps", { email: FEEDBACK_EMAIL })}</p>
        </Card>
      </HubSection>

      <HubSection id="politica" title={t("settings.privacyPolicy")}>
        <Card
          className="space-y-3 rounded-xl border-line/70 p-4 shadow-none text-sm leading-6 text-ink-soft"
          data-privacy-notice="public-beta"
        >
          <p>{t("privacyNotice.local")}</p>
          <p>{t("privacyNotice.account")}</p>
          <p>{t("privacyNotice.identity")}</p>
          <p>{t("privacyNotice.cloud")}</p>
          <p>{t("privacyNotice.progress")}</p>
          <p>{t("privacyNotice.telemetry")}</p>
          <p>{t("privacyNotice.feedback")}</p>
          <p>{t("privacyNotice.diagnostics")}</p>
          <p>{t("privacyNotice.microphone")}</p>
          <p>{t("privacyNotice.notifications")}</p>
          <p>{t("privacyNotice.export")}</p>
          <p>{t("privacyNotice.deletion")}</p>
          <p>{t("privacyNotice.consent")}</p>
          <p className="text-xs text-ink-faint">
            {t("privacyNotice.contact", { email: FEEDBACK_EMAIL })}
          </p>
          <p className="text-xs text-ink-faint">
            <Link to="/termos" className="underline-offset-2 hover:underline hover:text-ink-soft">
              {t("marketing.terms")}
            </Link>
            {" · "}
            <Link to="/sobre" className="underline-offset-2 hover:underline hover:text-ink-soft">
              {t("marketing.about")}
            </Link>
          </p>
        </Card>
      </HubSection>
    </HubPage>
  );
}
