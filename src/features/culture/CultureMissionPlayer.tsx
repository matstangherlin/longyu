import { useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { getCultureItem } from "../../data/culture";
import { cultureLessonPlayerPath } from "../../data/cultureNative";
import { HubPage } from "../../components/layout/HubLayout";
import { ButtonLink, Card } from "../../components/ui/primitives";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * LEGACY — not a published renderer.
 * Public `/cultura/:id` opens LessonPlayer. This module remains so old imports
 * do not crash; any accidental mount hands off to the canonical player.
 */
export function CultureMissionPlayer() {
  const { t } = useTranslation();
  const { id = "" } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const item = getCultureItem(id);

  useEffect(() => {
    if (!item) return;
    navigate(cultureLessonPlayerPath(id, location.search), { replace: true });
  }, [id, item, location.search, navigate]);

  if (item) return null;

  return (
    <HubPage data-testid="culture-mission-legacy">
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
