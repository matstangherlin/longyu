import { Link } from "react-router-dom";
import { Card, ButtonLink } from "../../components/ui/primitives";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { FEEDBACK_EMAIL } from "../../lib/feedback";
import { useTranslation } from "../../i18n/useTranslation";

/** Termos mínimos da beta pública — LEGAL_REVIEW_RECOMMENDED (docs, não UI). */
export function TermsPage() {
  const { t } = useTranslation();
  return (
    <HubPage className="space-y-5">
      <HubHeader
        eyebrow={t("terms.eyebrow")}
        title={t("terms.title")}
        desc={t("terms.desc")}
        aside={
          <ButtonLink to="/privacidade" variant="outline" size="sm">
            {t("marketing.privacy")}
          </ButtonLink>
        }
      />

      <HubSection id="termos-beta" title={t("terms.sectionTitle")}>
        <Card
          className="space-y-3 rounded-xl border-line/70 p-4 shadow-none text-sm leading-6 text-ink-soft"
          data-terms-notice="public-beta"
        >
          <p>{t("terms.beta")}</p>
          <p>{t("terms.availability")}</p>
          <p>{t("terms.acceptableUse")}</p>
          <p>{t("terms.account")}</p>
          <p>{t("terms.ip")}</p>
          <p>{t("terms.feedback")}</p>
          <p>{t("terms.changes")}</p>
          <p>{t("terms.termination")}</p>
          <p className="text-xs text-ink-faint">
            {t("terms.contact", { email: FEEDBACK_EMAIL })}
          </p>
          <p className="text-xs text-ink-faint">
            <Link to="/privacidade" className="underline-offset-2 hover:underline hover:text-ink-soft">
              {t("marketing.privacy")}
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
