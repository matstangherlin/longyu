import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  cultureItemsForCategory,
  cultureItemsRelatedToLesson,
  cultureProgressByCategory,
  localizedCulture,
  type CultureCategory,
} from "../../data/culture";
import { currentLessonId } from "../../data/journey";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { Card } from "../../components/ui/primitives";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";
import { CultureCard, cultureCategoryLabel } from "./CultureCard";

const CATEGORY_FILTERS: Array<{ id: "all" | CultureCategory; key: MessageKey }> = [
  { id: "all", key: "culture.filterAll" },
  { id: "home_visits", key: "culture.categoryHomeVisits" },
  { id: "table_food", key: "culture.categoryTableFood" },
  { id: "social_etiquette", key: "culture.categorySocialEtiquette" },
  { id: "gifts", key: "culture.categoryGifts" },
  { id: "school_work", key: "culture.categorySchoolWork" },
  { id: "festivals", key: "culture.categoryFestivals" },
  { id: "contemporary_china", key: "culture.categoryContemporaryChina" },
  { id: "daily_life", key: "culture.categoryDailyLife" },
  { id: "transport_public", key: "culture.categoryTransportPublic" },
  { id: "communication_relations", key: "culture.categoryCommunication" },
];

export function CultureHubPage() {
  const { t, instructionLocale } = useTranslation();
  const [category, setCategory] = useState<"all" | CultureCategory>("all");
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const savedIds = useStore((s) => s.cultureSavedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);
  const completedLessons = useStore((s) => s.completedLessons);
  const lessonMasteryById = useStore((s) => s.lessonMasteryById);

  const items = cultureItemsForCategory(category);
  const continueItems = items.filter((item) => savedIds.includes(item.id) || startedIds.includes(item.id)).filter((item) => !completedIds.includes(item.id));
  const profile = cultureProgressByCategory(completedIds);
  const done = completedIds.length;
  const total = profile.reduce((sum, row) => sum + row.total, 0);
  const currentId = currentLessonId(completedLessons, false, lessonMasteryById);
  const related = currentId ? cultureItemsRelatedToLesson(currentId).slice(0, 3) : [];

  const cta = t("culture.learn");

  const filterButtons = useMemo(
    () =>
      CATEGORY_FILTERS.map((filter) => (
        <button
          key={filter.id}
          type="button"
          data-testid={filter.id === "all" ? "culture-filter-all" : `culture-filter-${filter.id}`}
          onClick={() => setCategory(filter.id)}
          className={[
            "min-h-10 shrink-0 rounded-full border px-3 text-sm",
            category === filter.id
              ? "border-accent bg-accent text-white"
              : "border-line bg-surface text-ink",
          ].join(" ")}
        >
          {t(filter.key)}
        </button>
      )),
    [category, t]
  );

  return (
    <HubPage data-testid="culture-hub">
      <HubHeader eyebrow={t("culture.eyebrow")} title={t("culture.title")} desc={t("culture.tagline")} />

      <Card className="p-4" data-testid="culture-progress">
        <p className="text-sm font-semibold text-ink">{t("culture.progressCount", { done, total })}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {profile.map((row) => (
            <li key={row.category} className="flex items-center justify-between text-sm text-ink-soft">
              <span>{cultureCategoryLabel(row.category, t)}</span>
              <span className="font-medium text-ink">
                {row.done}/{row.total}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      {continueItems.length > 0 && (
        <HubSection title={t("culture.continueLearning")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {continueItems.map((item) => (
              <CultureCard
                key={`continue-${item.id}`}
                item={item}
                title={localizedCulture(item, instructionLocale).title}
                completedIds={completedIds}
                savedIds={savedIds}
                startedIds={startedIds}
                to={`/cultura/${item.id}`}
                cta={cta}
              />
            ))}
          </div>
        </HubSection>
      )}

      {related.length > 0 && (
        <HubSection title={t("culture.relatedToJourney")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((item) => (
              <CultureCard
                key={`related-${item.id}`}
                item={item}
                title={localizedCulture(item, instructionLocale).title}
                completedIds={completedIds}
                savedIds={savedIds}
                startedIds={startedIds}
                to={`/cultura/${item.id}`}
                cta={cta}
              />
            ))}
          </div>
        </HubSection>
      )}

      <HubSection title={t("culture.categories")}>
        <div className="flex gap-2 overflow-x-auto pb-1" data-testid="culture-category-filter">
          {filterButtons}
        </div>
      </HubSection>

      <HubSection title={t("culture.recent")}>
        {items.length === 0 ? (
          <p className="text-sm text-ink-soft">{t("culture.emptyCategory")}</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <CultureCard
                key={item.id}
                item={item}
                title={localizedCulture(item, instructionLocale).title}
                completedIds={completedIds}
                savedIds={savedIds}
                startedIds={startedIds}
                to={`/cultura/${item.id}`}
                cta={cta}
              />
            ))}
          </div>
        )}
      </HubSection>

      <p className="text-center text-xs text-ink-faint">
        <Link to="/jornada" className="underline-offset-2 hover:underline">
          {t("culture.backToJourney")}
        </Link>
      </p>
    </HubPage>
  );
}
