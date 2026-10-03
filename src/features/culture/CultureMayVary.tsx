import { useId, useState } from "react";
import type { CultureLocaleText } from "../../data/cultureQuest";
import { cultureText } from "../../data/cultureQuest";
import type { SupportedLocale } from "../../i18n/config";

/**
 * RC2.3.3 — discrete variability disclosure ("Pode variar").
 * Tap opens short extra context; never a wall of disclaimer.
 */
export function CultureMayVary({
  note,
  locale,
  compact,
}: {
  note?: CultureLocaleText | string | null;
  locale: SupportedLocale;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!note) return null;
  const text = typeof note === "string" ? note : cultureText(note, locale === "en" ? "en" : "pt-BR");
  if (!text.trim()) return null;
  const label = locale === "en" ? "May vary" : "Pode variar";

  return (
    <div className="mt-2" data-testid="culture-may-vary">
      <button
        type="button"
        className="text-left text-[12px] font-semibold text-ink-soft underline-offset-2 hover:underline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {label}
      </button>
      {open && (
        <p
          id={panelId}
          className={[
            "mt-1 text-[12px] leading-5 text-ink-soft",
            compact ? "max-w-prose" : "",
          ].join(" ")}
          data-testid="culture-may-vary-body"
        >
          {text}
        </p>
      )}
    </div>
  );
}
