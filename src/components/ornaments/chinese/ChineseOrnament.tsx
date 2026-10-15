import type { CSSProperties } from "react";
import { prepareOrnamentMarkup } from "./chineseOrnamentMarkup";
import { CHINESE_ORNAMENT_BY_ID, type ChineseOrnamentId } from "./chineseOrnamentRegistry";

/** Bundled at build time: no network, works offline and inside Capacitor. */
const ORNAMENT_SOURCES = import.meta.glob<string>("../../../assets/ornaments/chinese/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const prepared = new Map<ChineseOrnamentId, string | null>();

/** Prepared once per asset; an unsafe or missing file yields null (renders nothing). */
export function ornamentMarkupFor(id: ChineseOrnamentId): string | null {
  if (!prepared.has(id)) {
    const entry = CHINESE_ORNAMENT_BY_ID.get(id);
    const raw = entry ? ORNAMENT_SOURCES[`../../../assets/ornaments/chinese/${entry.file}`] : undefined;
    prepared.set(id, raw ? prepareOrnamentMarkup(raw) : null);
  }
  return prepared.get(id) ?? null;
}

export type OrnamentTone = "accent" | "gold" | "muted";

/** One decorative glyph. Hidden from assistive tech, never focusable or tappable. */
export function ChineseOrnament({
  id,
  className,
  style,
}: {
  id: ChineseOrnamentId;
  className?: string;
  style?: CSSProperties;
}) {
  const markup = ornamentMarkupFor(id);
  if (!markup) return null;
  return (
    <span
      className={className ? `lyo-glyph ${className}` : "lyo-glyph"}
      aria-hidden="true"
      data-ornament={id}
      style={style}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
