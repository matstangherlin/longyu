import { TONE_COLOR } from "../../data/tones";
import { toneKnowledge, type MandarinToneNumber, type ToneDisplayMode } from "../../data/toneKnowledge";

const PATHS: Partial<Record<MandarinToneNumber, string>> = {
  1: "M4 8 H44",
  2: "M4 20 L44 6",
  3: "M4 10 C14 26, 26 26, 44 8",
  4: "M4 6 L44 22",
};

export function ToneContour({
  tone,
  mode = "MID",
  locale = "pt-BR",
  className = "",
}: {
  tone: MandarinToneNumber;
  mode?: ToneDisplayMode;
  locale?: "pt-BR" | "en";
  className?: string;
}) {
  const knowledge = toneKnowledge(tone);
  if (mode === "ASSESSMENT") return null;

  const label = locale === "en"
    ? `${tone === 5 ? "Neutral tone" : `${tone}${tone === 1 ? "st" : tone === 2 ? "nd" : tone === 3 ? "rd" : "th"} tone`} · ${knowledge.learnerDescriptionEn}`
    : `${tone === 5 ? "Tom neutro" : `${tone}º tom`} · ${knowledge.learnerDescriptionPt}`;

  return (
    <div
      data-tone-contour={tone}
      data-tone-display-mode={mode}
      className={["inline-flex min-w-0 items-center justify-center gap-2", className].join(" ")}
      role="img"
      aria-label={label}
    >
      {tone === 5 ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: TONE_COLOR[5] }} aria-hidden="true" />
      ) : (
        <svg viewBox="0 0 48 28" className="h-7 w-16 shrink-0" aria-hidden="true">
          <path
            d={PATHS[tone]}
            fill="none"
            stroke={TONE_COLOR[tone]}
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        </svg>
      )}
      {mode !== "LATE" && (
        <span className="min-w-0 text-left">
          <span className="block text-sm font-semibold text-ink">
            {tone === 5 ? (locale === "en" ? "Neutral" : "Neutro") : locale === "en" ? `${tone}${tone === 1 ? "st" : tone === 2 ? "nd" : tone === 3 ? "rd" : "th"}` : `${tone}º`}
            {knowledge.mark ? ` · ${knowledge.mark}` : ""}
          </span>
          {mode === "EARLY" && (
            <span className="block text-xs leading-4 text-ink-soft">
              {locale === "en" ? knowledge.learnerDescriptionEn : knowledge.learnerDescriptionPt}
            </span>
          )}
        </span>
      )}
    </div>
  );
}
