import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ProgressionShell, rememberProgressionAnchor } from "../../components/progression/ProgressionShell";
import { ButtonLink } from "../../components/ui/primitives";
import { cultureText } from "../../data/cultureQuest";
import { getCultureItem, localizedCulture } from "../../data/culture";
import {
  CULTURE_V2_PATHS,
  culturePathProgress,
  nextNodeInPath,
  resolveRecommendedCulturePath,
  type CulturePathDef,
} from "../../data/culturePaths";
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

/**
 * RC2.3.13F — primary `/cultura` surface: Culture Journey with 12-path model.
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
  const [pathOverride, setPathOverride] = useState<string | null>(null);
  const [showPathPicker, setShowPathPicker] = useState(false);

  const nextId = pickNextCultureMissionId(completedIds, startedIds);
  const nextMission = nextId ? getCultureMission(nextId) : undefined;
  const recommended = useMemo(
    () => resolveRecommendedCulturePath(completedIds, nextMission?.cultureItemId ?? nextId),
    [completedIds, nextId, nextMission?.cultureItemId],
  );
  const currentPath: CulturePathDef = useMemo(() => {
    if (pathOverride) {
      return CULTURE_V2_PATHS.find((p) => p.id === pathOverride) ?? recommended;
    }
    return recommended;
  }, [pathOverride, recommended]);

  const { done, total } = culturePathProgress(currentPath, completedIds);
  const pathNextId = nextNodeInPath(currentPath, completedIds) ?? nextId;
  const due = dueCultureMemoryTargets(memoryById);
  const nextItem = pathNextId ? getCultureItem(pathNextId) : undefined;
  const nextTitle = nextItem
    ? localizedCulture(nextItem, instructionLocale).title
    : nextMission
      ? instructionLocale === "en"
        ? nextMission.titleEn
        : nextMission.titlePt
      : "";

  useEffect(() => {
    if (!readCultureFirstGuideSeen()) {
      setShowGuide(true);
      writeCultureFirstGuideSeen();
    }
  }, []);

  useEffect(() => {
    if (currentPath?.id) rememberProgressionAnchor("culture", `path:${currentPath.id}`);
  }, [currentPath?.id]);

  const primaryHref = pathNextId ? `/cultura/${pathNextId}` : "/cultura/explorar";

  return (
    <ProgressionShell
      mode="culture"
      headerTitle={t("progression.cultureHeader")}
      headerDesc={t("progression.cultureDesc")}
    >
      <div data-testid="culture-journey" data-culture-journey="rc2-3-13f" className="space-y-4">
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
          data-progression-anchor={`path:${currentPath.id}`}
          data-culture-current-path={currentPath.id}
          data-culture-path-status={currentPath.status}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">
            {t("progression.currentPath")}
          </p>
          <h2 className="mt-1 font-serif text-xl font-semibold text-ink">
            {cultureText({ pt: currentPath.titlePt, en: currentPath.titleEn }, instructionLocale)}
          </h2>
          <p className="mt-1 text-sm text-ink-soft">
            {cultureText({ pt: currentPath.descriptionPt, en: currentPath.descriptionEn }, instructionLocale)}
          </p>
          <p className="mt-1 text-sm font-semibold text-ink" data-testid="culture-route-progress">
            {done === 0 && total > 0
              ? t("progression.emptyStart")
              : t("progression.pathProgress", { done, total })}
            {currentPath.status === "EXPANSION_PENDING" ? (
              <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
                {t("progression.expansionPending")}
              </span>
            ) : null}
          </p>

          {pathNextId ? (
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
                  rememberProgressionAnchor("culture", `node:${pathNextId}`);
                  recordTechEvent("culture_node_open", {
                    itemId: pathNextId,
                    pathId: currentPath.id,
                    origin: fromJourney ? "journey" : "culture",
                  });
                  recordTechEvent("culture_path_open", { pathId: currentPath.id });
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

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink-soft"
            data-testid="culture-path-picker-toggle"
            data-cta-hierarchy="tertiary"
            aria-expanded={showPathPicker}
            onClick={() => setShowPathPicker((v) => !v)}
          >
            {t("progression.switchPath")}
          </button>
        </div>

        {showPathPicker ? (
          <div
            className="flex gap-2 overflow-x-auto pb-1"
            data-testid="culture-path-picker"
            role="listbox"
            aria-label={t("progression.switchPath")}
          >
            {CULTURE_V2_PATHS.map((path) => {
              const active = path.id === currentPath.id;
              const label = cultureText({ pt: path.titlePt, en: path.titleEn }, instructionLocale);
              return (
                <button
                  key={path.id}
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-testid={`culture-path-chip-${path.id}`}
                  data-cta-hierarchy="tertiary"
                  className={[
                    "min-h-11 shrink-0 rounded-full border px-3 text-sm",
                    active ? "border-accent bg-accent/10 font-semibold text-ink" : "border-line bg-surface text-ink-soft",
                  ].join(" ")}
                  onClick={() => {
                    setPathOverride(path.id);
                    setShowPathPicker(false);
                    rememberProgressionAnchor("culture", `path:${path.id}`);
                    recordTechEvent("culture_path_open", { pathId: path.id, via: "picker" });
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {due.length > 0 && pathNextId ? (
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
          {currentPath.orderedNodeIds.map((itemId) => {
            const item = getCultureItem(itemId);
            if (!item) return null;
            const title = localizedCulture(item, instructionLocale).title;
            const doneNode = completedIds.includes(itemId);
            const conceptId = conceptIdForItem(itemId);
            const knowledge = knowledgeById[conceptId];
            const visible = visibleKnowledgeState(knowledge, memoryById[conceptId]);
            const fromJourneyNode = knowledge?.source === "journey" && visible !== "unseen";
            const isNext = itemId === pathNextId;
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
                  recordTechEvent("culture_node_open", { itemId, pathId: currentPath.id });
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
          onClick={() => recordTechEvent("culture_atlas_open", { from: "culture_journey" })}
        >
          {t("progression.exploreAtlas")} →
        </Link>
      </div>
    </ProgressionShell>
  );
}
