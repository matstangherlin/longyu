import { isSceneMarkupSafe } from "../../../features/journey/scenes/journeySceneMarkup";

/**
 * RC2.3.13R.3.2.4 — inline markup for one bundled ornament file.
 *
 * Same contract as the Journey scenes: the input is a file bundled at build
 * time and checked by validate:chinese-ornamental-assets; anything unsafe is
 * refused whole (null) with the scenes' single refusal list — never
 * regex-"cleaned". Inline (not `<img>`) so the `lyo-*` roles see the app's
 * `<html data-theme>` tokens.
 */

const STYLE_OPEN = "<style>";
const STYLE_CLOSE = "</style>";

function withoutStandalonePalette(raw: string): string | null {
  const open = raw.indexOf(STYLE_OPEN);
  if (open < 0) return raw;
  const close = raw.indexOf(STYLE_CLOSE, open);
  if (close < 0) return null;
  const rest = raw.slice(0, open) + raw.slice(close + STYLE_CLOSE.length);
  return rest.includes("<style") ? null : rest;
}

/**
 * Drops the standalone palette (app CSS owns color), the intrinsic size (the
 * slot owns size; aspect ratio is kept by the viewBox), and marks the drawing
 * decorative. Ornaments carry no ids, so nothing needs suffixing.
 */
export function prepareOrnamentMarkup(raw: string): string | null {
  if (!isSceneMarkupSafe(raw)) return null;
  if (/\sid="/.test(raw)) return null;
  const body = withoutStandalonePalette(raw);
  if (body === null) return null;
  return body
    .replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
      const kept = attrs.replace(/\s(?:width|height|aria-hidden|focusable|role|preserveAspectRatio)="[^"]*"/g, "");
      return `<svg${kept} class="lyo-svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">`;
    })
    .trim();
}
