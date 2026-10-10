import { Link } from "react-router-dom";
import { IconChevron, IconLock } from "../../components/ui/Icon";
import { CultureTopicIcon, type CultureTopicIconKey } from "./CultureTopicIcon";
import { cultureText } from "../../data/cultureQuest";
import {
  cultureTopicHref,
  cultureTopicProgress,
  cultureTopicState,
  type CultureTopicGroup,
} from "../../data/cultureTopicGroups";
import { useTranslation } from "../../i18n/useTranslation";

/**
 * RC2.3.13R.3.2 — compact rectangular topic card.
 * RC2.3.13R.3.2.1 — crafted line icons, tighter hierarchy, integrated progress.
 */
export function CultureTopicCard({
  topic,
  completedIds,
}: {
  topic: CultureTopicGroup;
  completedIds: readonly string[];
}) {
  const { t, instructionLocale } = useTranslation();
  const { done, total, subtopicCount } = cultureTopicProgress(topic, completedIds);
  const state = cultureTopicState(topic, completedIds);
  const title = cultureText({ pt: topic.titlePt, en: topic.titleEn }, instructionLocale);
  const description = cultureText(
    { pt: topic.descriptionPt, en: topic.descriptionEn },
    instructionLocale,
  );
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const subLabel =
    subtopicCount === 1
      ? t("progression.subtopicCount", { n: subtopicCount })
      : t("progression.subtopicCountPlural", { n: subtopicCount });

  const a11y = [
    title,
    state === "COMPLETED"
      ? t("progression.topicCompleted")
      : state === "LOCKED"
        ? t("progression.topicLocked")
        : t("progression.topicProgress", { done, total }),
  ].join(", ");

  return (
    <Link
      to={cultureTopicHref(topic.id)}
      data-testid={`culture-topic-card-${topic.id}`}
      data-culture-topic={topic.id}
      data-culture-topic-state={state}
      data-cta-hierarchy="secondary"
      aria-label={a11y}
      className={[
        "culture-topic-card group flex min-h-[110px] flex-col justify-between rounded-2xl border border-line bg-surface p-3.5 shadow-card",
        "transition-[transform,background-color] duration-[var(--motion-fast)] ease-[var(--ease-standard)]",
        "active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
        "hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        state === "LOCKED" ? "opacity-80" : "",
      ].join(" ")}
    >
      <div className="flex items-start gap-2.5">
        <span
          className="culture-topic-icon mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft/70 text-accent"
          aria-hidden
          data-topic-icon-family="longyu-line"
        >
          {state === "LOCKED" ? (
            <IconLock className="h-4 w-4" />
          ) : (
            <CultureTopicIcon name={topic.icon as CultureTopicIconKey | undefined} />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="type-card-title">{title}</h3>
          <p className="type-supporting mt-1 line-clamp-2">{description}</p>
        </div>
        <IconChevron className="mt-1 h-4 w-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          {state === "COMPLETED" ? (
            <p className="type-label text-accent" data-testid={`culture-topic-done-${topic.id}`}>
              ✓ {t("progression.topicCompleted")}
            </p>
          ) : state === "LOCKED" ? (
            <p className="type-label">{t("progression.topicLockedHint")}</p>
          ) : (
            <>
              <p className="type-label" data-testid={`culture-topic-progress-${topic.id}`}>
                {t("progression.topicProgress", { done, total })}
              </p>
              <div
                className="culture-progress-track mt-1.5 h-1 overflow-hidden rounded-full bg-surface-2"
                role="progressbar"
                aria-valuenow={pct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
              </div>
            </>
          )}
        </div>
        <p className="type-caption shrink-0">{subLabel}</p>
      </div>
    </Link>
  );
}
