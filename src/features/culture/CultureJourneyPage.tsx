import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProgressionShell, rememberProgressionAnchor } from "../../components/progression/ProgressionShell";
import { ButtonLink } from "../../components/ui/primitives";
import { cultureText } from "../../data/cultureQuest";
import { getCultureItem, localizedCulture } from "../../data/culture";
import { cultureLessonPlayerPath } from "../../data/cultureNative";
import { getCultureMission } from "../../data/cultureMissions";
import {
  CULTURE_TOPIC_GROUPS,
  cultureTopicHref,
  migrateCulturePathToTopic,
  resolveCultureContinuation,
} from "../../data/cultureTopicGroups";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import { pickNextCultureMissionId, dueCultureMemoryTargets } from "../../lib/cultureMastery";
import {
  readCultureFirstGuideSeen,
  readProgressionAnchor,
  writeCultureFirstGuideSeen,
  writeCultureTopicId,
  writeProgressionOpenOrigin,
} from "../../lib/progressionShellState";
import { recordTechEvent } from "../../lib/techEvents";
import { GuideDialogue } from "../../components/guide/GuideDialogue";
import { CultureTopicCard } from "./CultureTopicCard";

/**
 * RC2.3.13R.3.2 — Culture root = topic hub.
 * Rectangular topic cards; no horizontal path pills; no root progression bubbles;
 * no path-switch toggle. Bubbles live inside topic detail.
 */
export function CultureJourneyPage() {
  const { t, instructionLocale } = useTranslation();
  const [searchParams] = useSearchParams();
  const fromJourney = searchParams.get("from") === "jornada";
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const startedIds = useStore((s) => s.cultureStartedIds);
  const memoryById = useStore((s) => s.cultureMemoryById ?? {});
  const [showGuide, setShowGuide] = useState(false);

  const nextId = pickNextCultureMissionId(completedIds, startedIds);
  const nextMission = nextId ? getCultureMission(nextId) : undefined;
  const continuation = useMemo(
    () => resolveCultureContinuation(completedIds, nextMission?.cultureItemId ?? nextId),
    [completedIds, nextId, nextMission?.cultureItemId],
  );

  const nextItem = continuation.itemId ? getCultureItem(continuation.itemId) : undefined;
  const nextTitle = nextItem
    ? localizedCulture(nextItem, instructionLocale).title
    : nextMission
      ? instructionLocale === "en"
        ? nextMission.titleEn
        : nextMission.titlePt
      : "";
  const pathTitle = cultureText(
    { pt: continuation.path.titlePt, en: continuation.path.titleEn },
    instructionLocale,
  );
  const hasProgress = completedIds.length > 0 || startedIds.length > 0;
  const due = dueCultureMemoryTargets(memoryById);

  useEffect(() => {
    if (!readCultureFirstGuideSeen()) {
      setShowGuide(true);
      writeCultureFirstGuideSeen();
    }
  }, []);

  // Migrate legacy path:/node: anchors → topic for switch restore.
  useEffect(() => {
    const anchor = readProgressionAnchor("culture");
    const migrated = migrateCulturePathToTopic(anchor);
    if (migrated) writeCultureTopicId(migrated.id);
  }, []);

  useEffect(() => {
    rememberProgressionAnchor("culture", `topic:${continuation.topic.id}`);
  }, [continuation.topic.id]);

  const primaryHref = continuation.itemId
    ? cultureLessonPlayerPath(
        continuation.itemId,
        `?src=cultura&from=${encodeURIComponent(cultureTopicHref(continuation.topic.id))}`,
      )
    : cultureTopicHref(continuation.topic.id);

  return (
    <ProgressionShell
      mode="culture"
      headerTitle={t("progression.cultureHeader")}
      headerDesc={t("progression.cultureDesc")}
    >
      <div
        data-testid="culture-journey"
        data-culture-journey="rc2-3-13r3-2"
        data-culture-topic-hub="true"
        data-culture-path-bubbles="false"
        className="space-y-5"
      >
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
          key={continuation.topic.id}
          className="culture-path-card-enter rounded-2xl border border-line bg-surface p-4"
          data-testid="culture-progress"
          data-progression-anchor={`topic:${continuation.topic.id}`}
          data-culture-current-path={continuation.path.id}
          data-culture-current-topic={continuation.topic.id}
          data-culture-path-status={continuation.path.status}
          data-typography="culture-continue-card"
        >
          <p className="type-eyebrow">
            {hasProgress ? t("progression.continueLearning") : t("progression.startCulture")}
          </p>
          <h2 className="type-card-title mt-1.5">{pathTitle}</h2>
          {nextTitle ? (
            <p className="type-supporting mt-1.5" data-testid="culture-next-title">
              {nextTitle}
            </p>
          ) : null}
          <p className="type-body-strong mt-2" data-testid="culture-route-progress">
            {continuation.done === 0 && continuation.total > 0
              ? t("progression.emptyStart")
              : t("progression.topicProgress", {
                  done: continuation.done,
                  total: continuation.total,
                })}
          </p>

          {continuation.itemId ? (
            <div className="mt-3">
              <ButtonLink
                to={primaryHref}
                className="inline-flex min-h-11"
                data-testid="culture-next-cta"
                data-cta-hierarchy="primary"
                data-coachmark-target="culture-recommended"
                onClick={() => {
                  writeProgressionOpenOrigin(fromJourney ? "journey" : "culture");
                  writeCultureTopicId(continuation.topic.id);
                  rememberProgressionAnchor("culture", `node:${continuation.itemId}`);
                  recordTechEvent("culture_topic_continue", {
                    topicId: continuation.topic.id,
                    itemId: continuation.itemId,
                    pathId: continuation.path.id,
                    origin: fromJourney ? "journey" : "culture",
                  });
                  recordTechEvent("culture_node_open", {
                    itemId: continuation.itemId!,
                    pathId: continuation.path.id,
                    topicId: continuation.topic.id,
                  });
                }}
              >
                {hasProgress ? t("culture.continueMission") : t("progression.startCulture")}
              </ButtonLink>
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <p className="type-supporting">{t("progression.cultureComplete")}</p>
              {due.length > 0 ? (
                <ButtonLink
                  to="/cultura/revisao"
                  className="min-h-11"
                  data-testid="culture-review-cta"
                  data-cta-hierarchy="secondary"
                >
                  {t("culture.reviewNow")}
                </ButtonLink>
              ) : (
                <ButtonLink
                  to="/cultura/explorar"
                  className="min-h-11"
                  data-testid="culture-atlas-cta"
                  data-cta-hierarchy="secondary"
                >
                  {t("progression.exploreAtlas")}
                </ButtonLink>
              )}
            </div>
          )}
        </section>

        {due.length > 0 && continuation.itemId ? (
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

        <section aria-label={t("progression.exploreByTopic")} data-testid="culture-topic-catalog">
          <h2 className="type-section-title mb-3">{t("progression.exploreByTopic")}</h2>
          <div
            className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-3.5"
            data-testid="culture-topic-grid"
          >
            {CULTURE_TOPIC_GROUPS.map((topic) => (
              <CultureTopicCard key={topic.id} topic={topic} completedIds={completedIds} />
            ))}
          </div>
        </section>

        <Link
          to="/cultura/explorar"
          className="inline-flex min-h-11 items-center text-sm font-medium text-ink-soft underline-offset-2 hover:text-accent hover:underline"
          data-testid="culture-explore-atlas"
          data-cta-hierarchy="tertiary"
          onClick={() => recordTechEvent("culture_atlas_open", { from: "culture_topic_hub" })}
        >
          {t("progression.exploreAtlas")} →
        </Link>
      </div>
    </ProgressionShell>
  );
}
