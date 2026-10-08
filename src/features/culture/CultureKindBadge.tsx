import type { CultureItemKind } from "../../data/culture";
import type { SupportedLocale } from "../../i18n/config";

/**
 * RC2.3.3 — discrete LITERATURE / LEGEND badges (Prompt 29).
 */
export function CultureKindBadge({
  kind,
  locale,
}: {
  kind: CultureItemKind;
  locale: SupportedLocale;
}) {
  if (kind !== "legend" && kind !== "literature") return null;
  const label =
    kind === "legend"
      ? locale === "en"
        ? "LEGEND"
        : "LENDA"
      : locale === "en"
        ? "LITERATURE"
        : "LITERATURA";
  return (
    <span
      className="inline-flex items-center rounded-md border border-line bg-surface-2 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-ink-soft"
      data-testid="culture-kind-badge"
      data-culture-kind={kind}
    >
      {label}
    </span>
  );
}
