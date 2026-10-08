import { useId, useState } from "react";
import type { CultureLocaleText } from "../../data/cultureQuest";
import { cultureText } from "../../data/cultureQuest";
import type { SupportedLocale } from "../../i18n/config";

type WhyMore = {
  motive: CultureLocaleText;
  context: CultureLocaleText;
  variation?: CultureLocaleText;
  sourceNote?: CultureLocaleText;
};

/**
 * RC2.3.3 — on-demand "Por quê?" / "Entenda melhor".
 * Keeps the main answer short; details stay behind a tap.
 */
export function CultureWhyMore({
  whyMore,
  locale,
  label,
}: {
  whyMore?: WhyMore | null;
  locale: SupportedLocale;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  if (!whyMore) return null;
  const loc = locale === "en" ? "en" : "pt-BR";
  const buttonLabel = label ?? (locale === "en" ? "Why?" : "Por quê?");

  const rows: Array<{ key: string; title: string; copy: CultureLocaleText | undefined }> = [
    { key: "motive", title: locale === "en" ? "Motive" : "Motivo", copy: whyMore.motive },
    { key: "context", title: locale === "en" ? "Context" : "Contexto", copy: whyMore.context },
    {
      key: "variation",
      title: locale === "en" ? "Variation" : "Variação",
      copy: whyMore.variation,
    },
    {
      key: "source",
      title: locale === "en" ? "Source note" : "Nota de fonte",
      copy: whyMore.sourceNote,
    },
  ];

  return (
    <div className="mt-2" data-testid="culture-why-more">
      <button
        type="button"
        className="text-left text-[12px] font-semibold text-accent underline-offset-2 hover:underline"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {buttonLabel}
      </button>
      {open && (
        <div id={panelId} className="mt-2 space-y-2 rounded-xl bg-surface-2 p-3 text-[12px] leading-5 text-ink">
          {rows.map((row) => {
            if (!row.copy) return null;
            return (
              <div key={row.key}>
                <p className="font-semibold text-ink-soft">{row.title}</p>
                <p>{cultureText(row.copy, loc)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
