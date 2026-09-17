import { CULTURE_HISTORY_TIMELINE, type HistoryTimelineEntry } from "../../data/cultureHistory";
import { useTranslation } from "../../i18n/useTranslation";

function yearLabel(entry: HistoryTimelineEntry, locale: "pt-BR" | "en"): string {
  return locale === "en" ? entry.eraLabelEn : entry.eraLabelPt;
}

/**
 * Vertical timeline for History collection / overview.
 * Accessible: each entry is text; colour is not the only cue.
 */
export function CultureTimeline({
  entries = CULTURE_HISTORY_TIMELINE,
  highlightId,
}: {
  entries?: readonly HistoryTimelineEntry[];
  highlightId?: string;
}) {
  const { instructionLocale } = useTranslation();
  return (
    <ol
      className="relative m-0 list-none space-y-0 border-l-2 border-accent/30 pl-0"
      data-testid="culture-timeline"
      aria-label={instructionLocale === "en" ? "Chinese history timeline" : "Linha do tempo da história chinesa"}
    >
      {entries.map((entry, index) => {
        const label = instructionLocale === "en" ? entry.labelEn : entry.labelPt;
        const era = yearLabel(entry, instructionLocale);
        const active = highlightId && (entry.id === highlightId || entry.cultureItemId === highlightId);
        return (
          <li
            key={entry.id}
            className="relative pl-6 py-2"
            data-testid={`culture-timeline-entry-${entry.id}`}
            data-timeline-index={index}
          >
            <span
              className={[
                "absolute -left-[5px] top-3 h-2.5 w-2.5 rounded-full border-2",
                active ? "border-accent bg-accent" : "border-accent/50 bg-surface",
              ].join(" ")}
              aria-hidden
            />
            <p className="font-serif text-sm font-semibold text-ink">
              {entry.hanzi ? (
                <span className="mr-1.5 text-accent" lang="zh-CN">
                  {entry.hanzi}
                </span>
              ) : null}
              {label}
              {entry.pinyin ? <span className="ml-1.5 text-xs font-normal text-ink-soft">{entry.pinyin}</span> : null}
            </p>
            <p className="text-xs text-ink-soft">{era}</p>
          </li>
        );
      })}
    </ol>
  );
}
