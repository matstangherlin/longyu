import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  CULTURE_ITEMS,
  cultureItemsForCategory,
  getCultureItem,
  localizedCulture,
  type CultureCategory,
} from "../../data/culture";
import {
  CULTURE_COLLECTIONS,
  cultureCollectionProgress,
  type CultureCollectionId,
} from "../../data/cultureCollections";
import { CULTURE_FEATURED_ITEMS } from "../../data/cultureFeatured";
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
import { GuideDialogue } from "../../components/guide/GuideDialogue";
import {
  pickCultureGuideMessage,
  readCultureGuideSeen,
  writeCultureGuideSeen,
  type CultureGuideMessage,
} from "../../lib/cultureGuide";

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

const COLLECTION_ICON: Record<CultureCollectionId, string> = {
  festivals_calendar: "🌕",
  china_history: "🏛",
  legends_literature: "📖",
  symbols_traditions: "☯",
  life_in_china: "🏙",
};

export function CultureHubPage() {
  const { t, instructionLocale } = useTranslation();
  const [category, setCategory] = useState<"all" | CultureCategory>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const savedIds = useStore((s) => s.cultureSavedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);
  const saveCultureItem = useStore((s) => s.saveCultureItem);
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
  const collectionRows = cultureCollectionProgress(completedIds);

  const featured = useMemo(
    () =>
      CULTURE_FEATURED_ITEMS.map((id) => getCultureItem(id)).filter(
        (item): item is NonNullable<typeof item> => Boolean(item)
      ),
    []
  );

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
    <HubPage compact data-testid="culture-hub">
      <HubHeader eyebrow={t("culture.eyebrow")} title={t("culture.title")} desc={t("culture.atlasTagline")} />

      <CultureHubGuide />

      <Card className="p-3" data-testid="culture-progress" data-passport="true">
        {/* RC2.2.13 — passaporte compacto: o conteúdo de Cultura sobe para a primeira dobra no celular. */}
        <p className="font-serif text-base font-semibold text-ink sm:text-lg">
          <span className="mr-1.5 align-middle font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {t("culture.passportEyebrow")}
          </span>
          {t("culture.passportTitle")}
        </p>
        <p className="mt-0.5 flex flex-wrap items-baseline gap-x-2 text-sm font-semibold text-ink">
          <span>{t("culture.progressCount", { done, total })}</span>
          <span className="text-xs font-normal text-ink-soft" data-testid="culture-seal-count">
            {t("culture.sealCount", { n: seals.length })}
          </span>
        </p>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-accent" style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }} />
        </div>
        {nextMission ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-sm text-ink" data-testid="culture-next-title">
              <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">{t("culture.nextMissionLabel")} · </span>
              {nextTitle}
            </p>
            <ButtonLink to={`/cultura/${nextMission.cultureItemId}`} className="min-h-11 shrink-0" data-testid="culture-next-cta" data-coachmark-target="culture-recommended">
              {t("culture.continueMission")}
            </ButtonLink>
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-soft">{t("culture.allMissionsDone")}</p>
        )}
      </Card>

      {due.length > 0 ? (
        <Card className="p-3" data-testid="culture-review-card">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-serif text-base font-semibold text-ink">{t("culture.reviewTitle")}</p>
              <p className="text-sm text-ink-soft">{t("culture.reviewCount", { n: due.length })}</p>
            </div>
            <ButtonLink to="/cultura/revisao" className="min-h-11" data-testid="culture-review-cta">
              {t("culture.reviewNow")}
            </ButtonLink>
          </div>
        </Card>
      ) : null}

      <HubSection title={t("culture.featuredHeading")}>
        <div className="grid gap-2" data-testid="culture-featured">
          {featured.slice(0, 3).map((item) => (
            <CultureCard
              key={item.id}
              item={item}
              title={localizedCulture(item, instructionLocale).title}
              completedIds={completedIds}
              savedIds={savedIds}
              startedIds={startedIds}
              to={`/cultura/${item.id}`}
              cta={t("culture.learn")}
              onSave={(itemId) => saveCultureItem(itemId, true)}
            />
          ))}
        </div>
      </HubSection>

      <HubSection title={t("culture.collectionsHeading")}>
        <div className="grid gap-2" data-testid="culture-collections">
          {collectionRows.map((row) => {
            const meta = CULTURE_COLLECTIONS.find((collection) => collection.id === row.id)!;
            const preparing = row.total === 0;
            const pct = preparing ? 0 : Math.round((row.done / row.total) * 100);
            return (
              <Link
                key={row.id}
                to={`/cultura/colecao/${row.id}`}
                className="block rounded-2xl border border-line bg-surface p-3 transition hover:border-accent/40"
                data-testid={`culture-collection-card-${row.id}`}
                data-collection-empty={preparing ? "true" : "false"}
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl" aria-hidden>
                    {COLLECTION_ICON[row.id]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-serif text-base font-semibold text-ink">{t(meta.titleKey as MessageKey)}</p>
                      <span className="text-ink-faint" aria-hidden>
                        ›
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">{t(meta.blurbKey as MessageKey)}</p>
                    {preparing ? (
                      <p className="mt-2 text-xs font-medium text-ink-faint" data-testid={`culture-collection-preparing-${row.id}`}>
                        {t("culture.collectionPreparing")}
                      </p>
                    ) : (
                      <>
                        <p className="mt-2 text-xs font-semibold text-ink">
                          {t("culture.collectionProgress", { done: row.done, total: row.total })}
                        </p>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-2">
                          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </HubSection>

      <button
        type="button"
        className="min-h-11 text-sm font-medium text-accent"
        data-testid="culture-toggle-secondary"
        onClick={() => setShowSecondary((open) => !open)}
      >
        {showSecondary ? t("culture.hideSecondary") : t("culture.showSecondary")}
      </button>

      {showSecondary ? (
        <>
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
                          {node.done ? "●" : node.state !== "unseen" ? "◐" : "○"}{" "}
                          {localizedCultureTitle(node.itemId, instructionLocale)}
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
                    className={[
                      "min-h-11 rounded-full border px-3 py-2 text-sm",
                      earned ? "border-gold bg-gold/10" : "border-line bg-surface text-ink-faint",
                    ].join(" ")}
                    data-testid={`culture-seal-${seal.id}`}
                    data-earned={earned ? "true" : "false"}
                  >
                    {seal.emoji} {cultureText({ pt: seal.titlePt, en: seal.titleEn }, instructionLocale)}
                  </span>
                );
              })}
            </div>
          </HubSection>

          <HubSection title={t("culture.exploreByTopic")}>
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
            <div className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="culture-topic-list">
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
                  onSave={(itemId) => saveCultureItem(itemId, true)}
                />
              ))}
            </div>
          </HubSection>
        </>
      ) : null}

      <p className="text-center text-xs text-ink-faint">
        <Link to="/jornada" className="underline-offset-2 hover:underline">
          {t("culture.backToJourney")}
        </Link>
      </p>
    </HubPage>
  );
}

/**
 * RC2.2.8 · A1/A2 — o professor-dragão na aba Cultura.
 *
 * Decide UMA vez, ao montar: filtro, "ver extras" e cards não re-renderizam
 * uma fala nova (A2.1/A2.2). Cada fala tem chave; chave ouvida não volta. Sem
 * novidade, o dragão fica quieto. A voz é a do GuideDialogue canônico
 * (guideTextBlip): mesmo corte ao antecipar, mesmo silêncio com efeitos
 * desligados ou movimento reduzido.
 */
function CultureHubGuide() {
  const { t, instructionLocale } = useTranslation();
  const accountId = useStore((s) => s.currentAccountId);
  const cultureCompletedIds = useStore((s) => s.cultureCompletedIds);
  const cultureMasteryById = useStore((s) => s.cultureMasteryById);
  const cultureSeals = useStore((s) => s.cultureSeals);
  const completedLessons = useStore((s) => s.completedLessons);
  const [message, setMessage] = useState<CultureGuideMessage | null>(() =>
    pickCultureGuideMessage({
      progress: { cultureCompletedIds, cultureMasteryById, cultureSeals, completedLessons },
      seenKeys: readCultureGuideSeen(accountId),
    })
  );

  useEffect(() => {
    if (!message) return;
    const seen = readCultureGuideSeen(accountId);
    seen.add(message.key);
    writeCultureGuideSeen(accountId, seen);
  }, [accountId, message]);

  if (!message) return null;

  const lines =
    message.kind === "intro"
      ? [t("culture.guideIntro1"), t("culture.guideIntro2")]
      : message.kind === "collection_done"
        ? [
            t("culture.guideCollectionDone", {
              title: t(CULTURE_COLLECTIONS.find((row) => row.id === message.collectionId)!.titleKey as MessageKey),
            }),
          ]
        : [
            t("culture.guideGateMission", {
              gate: instructionLocale === "en" ? message.gateTitleEn : message.gateTitlePt,
              item: localizedCultureTitle(message.itemId, instructionLocale),
            }),
          ];

  return (
    <Card className="p-3" data-testid="culture-hub-guide" data-guide-message={message.kind}>
      <GuideDialogue
        size="compact"
        messages={lines}
        continueLabel={message.kind === "gate_mission" ? t("culture.guideOpenMission") : t("common.continue")}
        onComplete={() => setMessage(null)}
        data-testid="culture-hub-guide-dialogue"
      />
      {message.kind === "gate_mission" ? (
        <Link
          to={`/cultura/${message.itemId}`}
          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-accent"
          data-testid="culture-hub-guide-cta"
        >
          {localizedCultureTitle(message.itemId, instructionLocale)} ›
        </Link>
      ) : null}
    </Card>
  );
}

function localizedCultureTitle(itemId: string, locale: "pt-BR" | "en"): string {
  const mission = getCultureMission(itemId);
  if (!mission) return itemId;
  return locale === "en" ? mission.titleEn : mission.titlePt;
}
