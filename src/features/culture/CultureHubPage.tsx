import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CULTURE_ITEMS,
  cultureItemsForCategory,
  localizedCulture,
  type CultureCategory,
} from "../../data/culture";
import { CULTURE_ROUTES, CULTURE_SEALS, cultureText } from "../../data/cultureQuest";
import { getCultureMission } from "../../data/cultureMissions";
import { HubHeader, HubPage, HubSection } from "../../components/layout/HubLayout";
import { ButtonLink, Card } from "../../components/ui/primitives";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import type { MessageKey } from "../../locales/pt-BR";
import { CultureCard } from "./CultureCard";
import { pickNextCultureMissionId } from "../../lib/cultureMastery";
import { dueCultureMemoryTargets, visibleKnowledgeState } from "../../lib/cultureMastery";
import { conceptIdForItem } from "../../lib/cultureMastery";

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
  const [showFilters, setShowFilters] = useState(false);
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const savedIds = useStore((s) => s.cultureSavedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);
  const masteryById = useStore((s) => s.cultureMasteryById ?? {});
  const seals = useStore((s) => s.cultureSeals ?? []);
  const memoryById = useStore((s) => s.cultureMemoryById ?? {});
  const knowledgeById = useStore((s) => s.cultureKnowledgeById ?? {});

  const nextId = pickNextCultureMissionId(completedIds, startedIds);
  const nextMission = nextId ? getCultureMission(nextId) : undefined;
  const nextTitle = nextMission
    ? instructionLocale === "en"
      ? nextMission.titleEn
      : nextMission.titlePt
    : "";
  const due = dueCultureMemoryTargets(memoryById);
  const done = completedIds.length;
  const total = CULTURE_ITEMS.length;
  const items = cultureItemsForCategory(category);

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
            category === filter.id ? "border-accent bg-accent text-white" : "border-line bg-surface text-ink",
          ].join(" ")}
        >
          {t(filter.key)}
        </button>
      )),
    [category, t]
  );

  return (
    <HubPage data-testid="culture-hub">
      <HubHeader eyebrow={t("culture.eyebrow")} title={t("culture.title")} desc={t("culture.passportTagline")} />

      <Card className="p-4" data-testid="culture-progress" data-passport="true">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">{t("culture.passportEyebrow")}</p>
        <p className="mt-1 font-serif text-xl font-semibold text-ink">{t("culture.passportTitle")}</p>
        <p className="mt-2 text-sm font-semibold text-ink">{t("culture.progressCount", { done, total })}</p>
        <p className="text-xs text-ink-soft" data-testid="culture-seal-count">
          {t("culture.sealCount", { n: seals.length })}
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent" style={{ width: `${Math.round((done / total) * 100)}%` }} />
        </div>
        {nextMission ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs uppercase tracking-[0.12em] text-ink-faint">{t("culture.nextMissionLabel")}</p>
            <p className="font-serif text-lg font-semibold text-ink" data-testid="culture-next-title">
              🏮 {nextTitle}
            </p>
            <ButtonLink to={`/cultura/${nextMission.cultureItemId}`} className="min-h-12 w-full" data-testid="culture-next-cta">
              {t("culture.continueMission")}
            </ButtonLink>
          </div>
        ) : (
          <p className="mt-3 text-sm text-ink-soft">{t("culture.allMissionsDone")}</p>
        )}
      </Card>

      {due.length > 0 ? (
        <Card className="p-4" data-testid="culture-review-card">
          <p className="font-serif text-lg font-semibold text-ink">{t("culture.reviewTitle")}</p>
          <p className="mt-1 text-sm text-ink-soft">{t("culture.reviewCount", { n: due.length })}</p>
          <ButtonLink to="/cultura/revisao" className="mt-3 min-h-12" data-testid="culture-review-cta">
            {t("culture.reviewNow")}
          </ButtonLink>
        </Card>
      ) : null}

      <HubSection title={t("culture.currentRoute")}>
        <div className="grid gap-3">
          {CULTURE_ROUTES.map((route) => {
            const nodes = route.itemIds.map((itemId) => {
              const conceptId = conceptIdForItem(itemId);
              const knowledge = knowledgeById[conceptId];
              const visible = visibleKnowledgeState(knowledge, memoryById[conceptId]);
              return {
                itemId,
                done: completedIds.includes(itemId),
                stars: masteryById[itemId]?.stars ?? 0,
                fromJourney: knowledge?.source === "journey" && visible !== "unseen",
                state: visible,
              };
            });
            return (
              <Card key={route.id} className="p-3" data-testid={`culture-route-${route.id}`}>
                <p className="font-serif text-base font-semibold text-ink">
                  {cultureText({ pt: route.titlePt, en: route.titleEn }, instructionLocale)}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {nodes.map((node) => (
                    <Link
                      key={node.itemId}
                      to={`/cultura/${node.itemId}`}
                      className="min-h-11 rounded-full border border-line px-3 py-2 text-xs text-ink"
                      data-testid={`culture-node-${node.itemId}`}
                      data-knowledge={node.state}
                    >
                      {node.done ? "●" : node.state !== "unseen" ? "◐" : "○"} {localizedCultureTitle(node.itemId, instructionLocale)}
                      {node.fromJourney ? (
                        <span className="ml-1 text-[10px] text-accent" data-testid={`culture-node-journey-${node.itemId}`}>
                          {t("culture.seenOnJourney")}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      </HubSection>

      <HubSection title={t("culture.sealsTitle")}>
        <div className="flex flex-wrap gap-2" data-testid="culture-seals">
          {CULTURE_SEALS.map((seal) => {
            const earned = seals.includes(seal.id);
            return (
              <span
                key={seal.id}
                className={["min-h-11 rounded-full border px-3 py-2 text-sm", earned ? "border-gold bg-gold/10" : "border-line bg-surface text-ink-faint"].join(" ")}
                data-testid={`culture-seal-${seal.id}`}
                data-earned={earned ? "true" : "false"}
              >
                {seal.emoji} {cultureText({ pt: seal.titlePt, en: seal.titleEn }, instructionLocale)}
              </span>
            );
          })}
        </div>
      </HubSection>

      <HubSection title={t("culture.explore")}>
        <button
          type="button"
          className="min-h-11 text-sm font-medium text-accent"
          data-testid="culture-show-categories"
          onClick={() => setShowFilters((open) => !open)}
        >
          {showFilters ? t("culture.hideCategories") : t("culture.showCategories")}
        </button>
        {showFilters ? (
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1" data-testid="culture-category-filter">
            {filterButtons}
          </div>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <CultureCard
              key={item.id}
              item={item}
              title={localizedCulture(item, instructionLocale).title}
              completedIds={completedIds}
              savedIds={savedIds}
              startedIds={startedIds}
              to={`/cultura/${item.id}`}
              cta={t("culture.learn")}
            />
          ))}
        </div>
      </HubSection>

      <p className="text-center text-xs text-ink-faint">
        <Link to="/jornada" className="underline-offset-2 hover:underline">
          {t("culture.backToJourney")}
        </Link>
      </p>
    </HubPage>
  );
}

function localizedCultureTitle(itemId: string, locale: "pt-BR" | "en"): string {
  const mission = getCultureMission(itemId);
  if (!mission) return itemId;
  return locale === "en" ? mission.titleEn : mission.titlePt;
}
