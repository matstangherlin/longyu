import { Link } from "react-router-dom";
import { useStore } from "../../lib/store";
import { useTranslation } from "../../i18n/useTranslation";
import { CULTURE_ITEMS } from "../../data/culture";
import { cultureLessonIdForItem, cultureLessonPlayerPath } from "../../data/cultureNative";
import {
  cultureMomentPlayerSearch,
  type JourneyCultureMoment,
} from "../../data/journeyCultureMoments";
import { IconCheck, IconLantern } from "../../components/ui/Icon";
import { ProseGlossText } from "../../components/hanzi/ProseGlossText";

const EYEBROW: Record<NonNullable<JourneyCultureMoment["eyebrowKind"]>, { pt: string; en: string }> = {
  culture: { pt: "Momento cultural", en: "Culture moment" },
  history: { pt: "História", en: "History" },
  literature: { pt: "Literatura", en: "Literature" },
  symbol: { pt: "Símbolo", en: "Symbol" },
  festival: { pt: "Festival", en: "Festival" },
};

/**
 * Compact optional interlude on the Journey trail.
 * Opens the canonical Culture lesson — does not invent a quiz or node.
 */
export function JourneyCultureMomentCard({ moment }: { moment: JourneyCultureMoment }) {
  const { instructionLocale } = useTranslation();
  const en = instructionLocale === "en";
  const completedLessons = useStore((s) => s.completedLessons);
  const cultureCompletedIds = useStore((s) => s.cultureCompletedIds);
  const item = CULTURE_ITEMS.find((entry) => entry.id === moment.cultureItemId);
  if (!item) return null;

  const lessonId = cultureLessonIdForItem(moment.cultureItemId);
  const explored =
    completedLessons.includes(lessonId) || cultureCompletedIds.includes(moment.cultureItemId);
  const title = en ? item.titleEn : item.titlePt;
  const summary = en ? item.summaryEn : item.summaryPt;
  const eyebrow = EYEBROW[moment.eyebrowKind ?? "culture"];
  const href = cultureLessonPlayerPath(moment.cultureItemId, cultureMomentPlayerSearch(moment.id));

  return (
    <aside
      className="w-[min(100%,320px)] rounded-2xl border border-dashed border-accent/35 bg-surface/90 px-3.5 py-3 shadow-card"
      data-testid="journey-culture-moment"
      data-culture-moment={moment.id}
      data-culture-item={moment.cultureItemId}
      data-explored={explored ? "true" : "false"}
      data-optional="true"
    >
      <div className="flex items-start gap-3">
        <span
          className={[
            "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
            explored ? "bg-[rgb(var(--good)/0.14)] text-[rgb(var(--good))]" : "bg-accent-soft text-accent",
          ].join(" ")}
          aria-hidden
        >
          {explored ? <IconCheck width={17} height={17} /> : <IconLantern width={17} height={17} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
            {en ? eyebrow.en : eyebrow.pt}
          </p>
          <h3 className="mt-0.5 text-[13px] font-semibold leading-4 text-ink">{title}</h3>
          {moment.teaserZh || moment.teaserPinyin ? (
            <p className="mt-1 text-xs text-ink-soft">
              {[moment.teaserZh, moment.teaserPinyin].filter(Boolean).join(" · ")}
            </p>
          ) : null}
          <p className="mt-1.5 line-clamp-3 text-[12px] leading-4 text-ink-soft">
            <ProseGlossText text={summary} />
          </p>
          <div className="mt-2.5 flex items-center gap-2">
            <Link
              to={href}
              className="inline-flex items-center rounded-xl bg-accent px-3 py-1.5 text-[12px] font-semibold text-white shadow-lift"
              data-testid="journey-culture-moment-explore"
            >
              {explored ? (en ? "Review" : "Rever") : en ? "Explore" : "Explorar"}
            </Link>
            {explored ? (
              <span className="text-[11px] font-medium text-[rgb(var(--good))]" data-testid="journey-culture-moment-done">
                {en ? "✓ Explored" : "✓ Explorado"}
              </span>
            ) : (
              <span className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">
                {en ? "Optional" : "Opcional"}
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
