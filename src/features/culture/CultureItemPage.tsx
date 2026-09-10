import { Navigate, useLocation, useParams } from "react-router-dom";
import { getCultureItem } from "../../data/culture";
import { cultureLessonPlayerPath } from "../../data/cultureNative";
import { HubPage } from "../../components/layout/HubLayout";
import { ButtonLink, Card } from "../../components/ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * `/cultura/:id` is a shortcut, not a second school.
 * Invalid ids stay on the hub missing state; published items open LessonPlayer.
 */
export function CultureItemPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const location = useLocation();
  const item = id ? getCultureItem(id) : undefined;

  if (!item || !id) {
    return (
      <HubPage data-testid="culture-missing">
        <Card className="p-5">
          <h1 className="font-serif text-2xl font-semibold text-ink">{t("culture.missingTitle")}</h1>
          <p className="mt-2 text-sm text-ink-soft">{t("culture.missingBody")}</p>
          <ButtonLink to="/cultura" className="mt-4">
            {t("culture.backToHub")}
          </ButtonLink>
        </Card>
      </HubPage>
    );
  }

  return <Navigate to={cultureLessonPlayerPath(id, location.search)} replace />;
}
