import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ProgressionShell, rememberProgressionAnchor } from "../../components/progression/ProgressionShell";
import { ProgressionPath } from "../../components/progression/ProgressionPath";
import type { ProgressionNodeState, ProgressionPathNode } from "../../components/progression/progressionTypes";
import { ButtonLink } from "../../components/ui/primitives";
import { cultureText } from "../../data/cultureQuest";
import { getCultureItem, localizedCulture } from "../../data/culture";
import { cultureLessonPlayerPath } from "../../data/cultureNative";
import { nextNodeInPath, type CulturePathDef } from "../../data/culturePaths";
import {
  cultureTopicById,
  cultureTopicHref,
  cultureTopicPaths,
  cultureTopicProgress,
  cultureTopicState,
  nextNodeInTopic,
} from "../../data/cultureTopicGroups";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import { conceptIdForItem, visibleKnowledgeState } from "../../lib/cultureMastery";
import {
  readCultureTopicScroll,
  writeCultureTopicId,
  writeCultureTopicScroll,
  writeProgressionOpenOrigin,
} from "../../lib/progressionShellState";
import { recordTechEvent } from "../../lib/techEvents";
import { HubPage } from "../../components/layout/HubLayout";

function buildPathNodes(input: {
  path: CulturePathDef;
  completedIds: readonly string[];
  pathNextId: string | undefined;
  topicId: string;
  instructionLocale: string;
  knowledgeById: Record<string, Parameters<typeof visibleKnowledgeState>[0]>;
  memoryById: Record<string, Parameters<typeof visibleKnowledgeState>[1]>;
  masteryById: Record<string, { stars?: number } | undefined>;
  t: (key: string) => string;
}): ProgressionPathNode[] {
  const { path, completedIds, pathNextId, topicId, instructionLocale, knowledgeById, memoryById, masteryById, t } =
    input;
  const nextIndex = pathNextId ? path.orderedNodeIds.indexOf(pathNextId) : path.orderedNodeIds.length;
  const fromHref = cultureTopicHref(topicId);
  return path.orderedNodeIds.flatMap((itemId, index) => {
    const item = getCultureItem(itemId);
    if (!item) return [];
    const title = localizedCulture(item, instructionLocale as "pt-BR" | "en").title;
    const doneNode = completedIds.includes(itemId);
    const isNext = itemId === pathNextId;
    let state: ProgressionNodeState;
    if (doneNode) state = "COMPLETED";
    else if (isNext) state = "CURRENT";
    else if (nextIndex >= 0 && index > nextIndex) state = "LOCKED";
    else state = "AVAILABLE";

    const conceptId = conceptIdForItem(itemId);
    const knowledge = knowledgeById[conceptId];
    const visible = visibleKnowledgeState(knowledge, memoryById[conceptId]);
    const fromJourneyNode = knowledge?.source === "journey" && visible !== "unseen";
    const stars = masteryById[itemId]?.stars ?? 0;
    const href =
      state === "LOCKED"
        ? undefined
        : cultureLessonPlayerPath(itemId, `?src=cultura&from=${encodeURIComponent(fromHref)}`);

    return [
      {
        id: itemId,
        title,
        state,
        href,
        statusLabel: doneNode
          ? instructionLocale === "en"
            ? "Done"
            : "Feito"
          : isNext
            ? instructionLocale === "en"
              ? "Continue"
              : "Continuar"
            : undefined,
        metaLabel: fromJourneyNode
          ? t("culture.seenOnJourney")
          : stars > 0
            ? `★${stars}`
            : undefined,
        testId: `culture-node-${itemId}`,
        anchor: `node:${itemId}`,
        onSelect: () => {
          if (state === "LOCKED") return;
          rememberProgressionAnchor("culture", `node:${itemId}`);
          writeCultureTopicId(topicId);
          recordTechEvent("culture_node_open", { itemId, pathId: path.id, topicId });
          recordTechEvent("culture_subtopic_started", { pathId: path.id, topicId });
        },
      } satisfies ProgressionPathNode,
    ];
  });
}

/**
 * RC2.3.13R.3.2 — topic detail: labeled subtopics + ProgressionPath bubbles.
 */
export function CultureTopicDetailPage() {
  const { topicId = "" } = useParams();
  const topic = cultureTopicById(topicId);
  const { t, instructionLocale } = useTranslation();
  const completedIds = useStore((s) => s.cultureCompletedIds);
  const masteryById = useStore((s) => s.cultureMasteryById ?? {});
  const memoryById = useStore((s) => s.cultureMemoryById ?? {});
  const knowledgeById = useStore((s) => s.cultureKnowledgeById ?? {});
  const restoreDone = useRef(false);

  useEffect(() => {
    if (!topic) return;
    writeCultureTopicId(topic.id);
    rememberProgressionAnchor("culture", `topic:${topic.id}`);
    recordTechEvent("culture_topic_opened", { topicId: topic.id });
  }, [topic]);

  useLayoutEffect(() => {
    if (!topic || restoreDone.current) return;
    restoreDone.current = true;
    const y = readCultureTopicScroll(topic.id);
    if (y > 0) window.scrollTo({ top: y, behavior: "auto" });
  }, [topic]);

  useEffect(() => {
    if (!topic) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        writeCultureTopicScroll(topic.id, window.scrollY);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [topic]);

  const next = useMemo(
    () => (topic ? nextNodeInTopic(topic, completedIds) : undefined),
    [topic, completedIds],
  );
  const { done, total } = topic ? cultureTopicProgress(topic, completedIds) : { done: 0, total: 0 };
  const state = topic ? cultureTopicState(topic, completedIds) : "LOCKED";
  const paths = topic ? cultureTopicPaths(topic) : [];

  if (!topic) {
    return <Navigate to="/cultura" replace />;
  }

  const title = cultureText({ pt: topic.titlePt, en: topic.titleEn }, instructionLocale);
  const description = cultureText(
    { pt: topic.descriptionPt, en: topic.descriptionEn },
    instructionLocale,
  );
  const continueHref = next
    ? cultureLessonPlayerPath(
        next.itemId,
        `?src=cultura&from=${encodeURIComponent(cultureTopicHref(topic.id))}`,
      )
    : undefined;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <HubPage compact data-testid="culture-topic-detail-hub">
      <ProgressionShell mode="culture">
        <div
          data-testid="culture-topic-detail"
          data-culture-topic={topic.id}
          data-culture-topic-state={state}
          data-progression-anchor={`topic:${topic.id}`}
          className="space-y-5"
        >
          <Link
            to="/cultura"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-accent"
            data-testid="culture-topic-back"
            onClick={() => {
              writeCultureTopicId(null);
              recordTechEvent("culture_root_returned", { fromTopicId: topic.id });
            }}
          >
            ← {t("progression.backToCultureRoot")}
          </Link>

          <header>
            <h1 className="type-page-title" data-testid="culture-topic-title">
              {title}
            </h1>
            <p className="type-supporting mt-1.5">{description}</p>
            <p className="type-body-strong mt-2" data-testid="culture-topic-detail-progress">
              {t("progression.topicProgress", { done, total })}
            </p>
            <div
              className="mt-2 h-1.5 max-w-md overflow-hidden rounded-full bg-surface-2"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </header>

          {continueHref ? (
            <ButtonLink
              to={continueHref}
              className="inline-flex min-h-11"
              data-testid="culture-topic-continue"
              data-cta-hierarchy="primary"
              onClick={() => {
                writeProgressionOpenOrigin("culture");
                writeCultureTopicId(topic.id);
                if (next) rememberProgressionAnchor("culture", `node:${next.itemId}`);
                recordTechEvent("culture_topic_continue", {
                  topicId: topic.id,
                  itemId: next?.itemId,
                  pathId: next?.path.id,
                });
              }}
            >
              {t("progression.continueTopic")}
            </ButtonLink>
          ) : (
            <p className="type-supporting" data-testid="culture-topic-complete">
              {t("progression.topicComplete")}
            </p>
          )}

          {paths.map((path) => {
            const pathDone = path.orderedNodeIds.filter((id) => completedIds.includes(id)).length;
            const pathTotal = path.orderedNodeIds.length;
            const pathComplete = pathDone >= pathTotal && pathTotal > 0;
            const pathNext = nextNodeInPath(path, completedIds);
            const isCurrentSubtopic = next?.path.id === path.id;
            const pathTitle = cultureText(
              { pt: path.titlePt, en: path.titleEn },
              instructionLocale,
            );
            const nodes = buildPathNodes({
              path,
              completedIds,
              pathNextId: pathNext,
              topicId: topic.id,
              instructionLocale,
              knowledgeById,
              memoryById,
              masteryById,
              t,
            });

            if (pathComplete && !isCurrentSubtopic) {
              return (
                <section
                  key={path.id}
                  data-testid={`culture-subtopic-${path.id}`}
                  data-culture-subtopic-state="COMPLETED"
                  data-progression-anchor={`path:${path.id}`}
                  className="rounded-2xl border border-line bg-surface px-3.5 py-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="type-section-title text-base">✓ {pathTitle}</h2>
                      <p className="type-label mt-0.5">
                        {t("progression.pathProgress", { done: pathDone, total: pathTotal })}{" "}
                        {instructionLocale === "en" ? "done" : "concluídos"}
                      </p>
                    </div>
                    {path.orderedNodeIds[0] ? (
                      <ButtonLink
                        to={cultureLessonPlayerPath(
                          path.orderedNodeIds[0],
                          `?src=cultura&from=${encodeURIComponent(cultureTopicHref(topic.id))}`,
                        )}
                        className="min-h-11"
                        data-testid={`culture-subtopic-review-${path.id}`}
                        data-cta-hierarchy="tertiary"
                      >
                        {t("progression.reviewSubtopic")}
                      </ButtonLink>
                    ) : null}
                  </div>
                </section>
              );
            }

            return (
              <section
                key={path.id}
                data-testid={`culture-subtopic-${path.id}`}
                data-culture-subtopic-state={pathComplete ? "COMPLETED" : "ACTIVE"}
                data-culture-current-subtopic={isCurrentSubtopic ? "true" : "false"}
                data-progression-anchor={`path:${path.id}`}
                className="space-y-3"
              >
                <div>
                  <h2 className="type-section-title">{pathTitle}</h2>
                  <p className="type-label mt-0.5">
                    {t("progression.pathProgress", { done: pathDone, total: pathTotal })}
                    {path.status === "EXPANSION_PENDING" ? (
                      <span className="type-eyebrow-muted ml-2 normal-case tracking-wide">
                        {t("progression.expansionPending")}
                      </span>
                    ) : null}
                  </p>
                </div>
                <ProgressionPath
                  nodes={nodes}
                  personality="culture"
                  testId={`culture-path-bubbles-${path.id}`}
                />
              </section>
            );
          })}
        </div>
      </ProgressionShell>
    </HubPage>
  );
}
