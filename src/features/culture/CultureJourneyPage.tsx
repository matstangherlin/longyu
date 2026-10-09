import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProgressionShell, rememberProgressionAnchor } from "../../components/progression/ProgressionShell";
import { ButtonLink } from "../../components/ui/primitives";
import { CULTURE_ROUTES, cultureText } from "../../data/cultureQuest";
import { getCultureItem, localizedCulture } from "../../data/culture";
import { getCultureMission } from "../../data/cultureMissions";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import { pickNextCultureMissionId, dueCultureMemoryTargets, conceptIdForItem, visibleKnowledgeState } from "../../lib/cultureMastery";
import {
  readCultureFirstGuideSeen,
  writeCultureFirstGuideSeen,
  writeProgressionOpenOrigin,
} from "../../lib/progressionShellState";
import { recordTechEvent } from "../../lib/techEvents";
import { GuideDialogue } from "../../components/guide/GuideDialogue";

function routeProgress(itemIds: readonly string[], completedIds: readonly string[]) {
  const done = itemIds.filter((id) => completedIds.includes(id)).length;
  return { done, total: itemIds.length };
}

function resolveCurrentRoute(completedIds: readonly string[], nextItemId: string | undefined) {
  if (nextItemId) {
    const byNext = CULTURE_ROUTES.find((route) => route.itemIds.includes(nextItemId));
    if (byNext) return byNext;
  }
  const incomplete = CULTURE_ROUTES.find((route) =>
    route.itemIds.some((id) => !completedIds.includes(id)),
  );
  return incomplete ?? CULTURE_ROUTES[0];
}

/**
 * RC2.3.13E — primary `/cultura` surface: Culture Journey progression.
 * Atlas / explore lives at `/cultura/explorar`.
 */
export function CultureJourneyPage() {
  const { t, instructionLocale } = useTranslation();
  const [searchParams] = useSearchParams();
  const fromJourney = searchParams.get("from") === "jornada";
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);
  const masteryById = useStore((s) => s.cultureMasteryById ?? {});
  const memoryById = useStore((s) => s.cultureMemoryById ?? {});
  const knowledgeById = useStore((s) => s.cultureKnowledgeById ?? {});
  const [showGuide, setShowGuide] = useState(false);

  const nextId = pickNextCultureMissionId(completedIds, startedIds);
  const nextMission = nextId ? getCultureMission(nextId) : undefined;
  const currentRoute = useMemo(
    () => resolveCurrentRoute(completedIds, nextMission?.cultureItemId ?? nextId),
    [completedIds, nextId, nextMission?.cultureItemId],
  );
  const { done, total } = routeProgress(currentRoute.itemIds, completedIds);
  const due = dueCultureMemoryTargets(memoryById);
  const nextItem = nextId ? getCultureItem(nextId) : undefined;
  const nextTitle = nextMission
    ? instructionLocale === "en"
      ? nextMission.titleEn
      : nextMission.titlePt
    : nextItem
      ? localizedCulture(nextItem, instructionLocale).title
      : "";

  useEffect(() => {
    if (!readCultureFirstGuideSeen()) {
      setShowGuide(true);
      writeCultureFirstGuideSeen();
    }
  }, []);

  useEffect(() => {
    if (currentRoute?.id) rememberProgressionAnchor("culture", `route:${currentRoute.id}`);
  }, [currentRoute?.id]);

  const primaryHref = nextMission
    ? `/cultura/${nextMission.cultureItemId}`
    : nextId
      ? `/cultura/${nextId}`
      : "/cultura/explorar";

  return (
    <ProgressionShell
      mode="culture"
      headerTitle={t("progression.cultureHeader")}
      headerDesc={t("progression.cultureDesc")}
    >
      <div data-testid="culture-hub" data-culture-journey="rc2-3-13e" className="space-y-4">
        {fromJourney && (
          <Link
            to="/jornada"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent"
            data-testid="culture-back-to-journey"
            onClick={() => writeProgressionOpenOrigin("journey")}
          >
            ← {t("culture.backToJourney")}
          </Link>
        )}

        {showGuide ? (
          <div data-testid="culture-first-guide" className="rounded-2xl border border-line bg-surface p-3">
            <GuideDialogue
              size="compact"
              messages={[t("progression.cultureFirstGuide")]}
              continueLabel={t("culture.continueMission")}
              onComplete={() => setShowGuide(false)}
              data-testid="culture-first-guide-dialogue"
            />
          </div>
        ) : null}

        <section
          className="rounded-2xl border border-line bg-surface p-4"
          data-testid="culture-progress"
          data-progression-anchor={`route:${currentRoute.id}`}
          data-culture-current-route={currentRoute.id}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {t("progression.currentPath")}
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">
            {cultureText({ pt: currentRoute.titlePt, en: currentRoute.titleEn }, instructionLocale)}
          </h2>
          <p className="mt-1 text-sm font-semibold text-ink" data-testid="culture-route-progress">
            {done === 0 && total > 0
              ? t("progression.emptyStart")
              : t("progression.pathProgress", { done, total })}
          </p>

          {nextId ? (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 text-sm text-ink" data-testid="culture-next-title">
                <span className="text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                  {t("progression.nextNode")} ·{" "}
                </span>
                {nextTitle}
              </p>
              <ButtonLink
                to={primaryHref}
                className="min-h-12 shrink-0"
                data-testid="culture-next-cta"
                data-cta-hierarchy="primary"
                data-coachmark-target="culture-recommended"
                onClick={() => {
                  writeProgressionOpenOrigin(fromJourney ? "journey" : "culture");
                  rememberProgressionAnchor("culture", `node:${nextId}`);
                  recordTechEvent("culture_node_open", { itemId: nextId, origin: fromJourney ? "journey" : "culture" });
                }}
              >
                {t("progression.continueCulture")}
              </ButtonLink>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="text-sm text-ink-soft">{t("progression.cultureComplete")}</p>
              {due.length > 0 ? (
                <ButtonLink to="/cultura/revisao" className="min-h-11" data-testid="culture-review-cta" data-cta-hierarchy="secondary">
                  {t("culture.reviewNow")}
                </ButtonLink>
              ) : (
                <ButtonLink to="/cultura/explorar" className="min-h-11" data-testid="culture-atlas-cta" data-cta-hierarchy="secondary">
                  {t("progression.exploreAtlas")}
                </ButtonLink>
              )}
            </div>
          )}
        </section>

        {due.length > 0 && nextId ? (
          <div className="rounded-2xl border border-line bg-surface p-3" data-testid="culture-review-card">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-serif text-base font-semibold text-ink">{t("culture.reviewTitle")}</p>
                <p className="text-sm text-ink-soft">{t("culture.reviewCount", { n: due.length })}</p>
              </div>
              <ButtonLink
                to="/cultura/revisao"
                className="min-h-11"
                data-testid="culture-review-cta"
                data-cta-hierarchy="secondary"
              >
                {t("culture.reviewNow")}
              </ButtonLink>
            </div>
          </div>
        ) : null}

        <section aria-label={t("progression.currentPath")} className="space-y-2">
          {currentRoute.itemIds.map((itemId) => {
            const item = getCultureItem(itemId);
            if (!item) return null;
            const title = localizedCulture(item, instructionLocale).title;
            const doneNode = completedIds.includes(itemId);
            const conceptId = conceptIdForItem(itemId);
            const knowledge = knowledgeById[conceptId];
            const visible = visibleKnowledgeState(knowledge, memoryById[conceptId]);
            const fromJourneyNode = knowledge?.source === "journey" && visible !== "unseen";
            const isNext = itemId === nextId;
            return (
              <Link
                key={itemId}
                to={`/cultura/${itemId}`}
                data-testid={`culture-node-${itemId}`}
                data-progression-anchor={`node:${itemId}`}
                data-knowledge={visible}
                data-cta-hierarchy={isNext ? "secondary" : "tertiary"}
                className={[
                  "flex min-h-12 items-center gap-3 rounded-2xl border px-3 py-2.5 transition",
                  isNext ? "border-accent/50 bg-accent/5" : "border-line bg-surface",
                  doneNode ? "opacity-80" : "",
                ].join(" ")}
                onClick={() => {
                  rememberProgressionAnchor("culture", `node:${itemId}`);
                  recordTechEvent("culture_node_open", { itemId });
                }}
              >
                <span aria-hidden className="text-base text-ink">
                  {doneNode ? "●" : isNext ? "◉" : "○"}
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-ink">{title}</span>
                {fromJourneyNode ? (
                  <span className="text-[10px] text-accent" data-testid={`culture-node-journey-${itemId}`}>
                    {t("culture.seenOnJourney")}
                  </span>
                ) : null}
                {(masteryById[itemId]?.stars ?? 0) > 0 ? (
                  <span className="text-xs text-ink-faint">★{masteryById[itemId]?.stars}</span>
                ) : null}
              </Link>
            );
          })}
        </section>

        <Link
          to="/cultura/explorar"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft underline-offset-2 hover:text-accent hover:underline"
          data-testid="culture-explore-atlas"
          data-cta-hierarchy="tertiary"
        >
          {t("progression.exploreAtlas")} →
        </Link>
      </div>
    </ProgressionShell>
  );
}
