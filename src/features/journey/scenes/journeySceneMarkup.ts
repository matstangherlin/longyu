/**
 * RC2.3.13R.3.2.3 — turns a bundled scene file into decorative inline markup.
 *
 * Why inline: the app theme lives on `<html data-theme>`, which an `<img>`
 * SVG cannot see (it only sees the OS `prefers-color-scheme`). Inlined, every
 * `lys-*` role class resolves to the real Longyu tokens from index.css, so a
 * learner who picks dark inside the app gets dark scenes even on a light OS.
 *
 * The input is never user, network or runtime data: it is a file bundled at
 * build time and checked by validate:journey-svg-assets. The refusal below is
 * defense in depth — an unsafe file renders nothing instead of rendering.
 */

const UNSAFE_PATTERNS: readonly RegExp[] = [
  /<script/i,
  /<foreignObject/i,
  /<image/i,
  /<(?:text|tspan|textPath)\b/i,
  /\son[a-z]+\s*=/i,
  /javascript:/i,
  /(?:xlink:)?href\s*=\s*["'](?!#)/i,
  /\bsrc\s*=/i,
  /url\(\s*["']?(?!#)/i,
  /@import/i,
  /@font-face/i,
  /data:/i,
];

export function isSceneMarkupSafe(raw: string): boolean {
  return typeof raw === "string" && raw.trimStart().startsWith("<svg") && !UNSAFE_PATTERNS.some((re) => re.test(raw));
}

/**
 * Strip the standalone palette (the app CSS owns colors), drop the intrinsic
 * size (the lane owns size), mark the drawing decorative, and suffix every id
 * so repeated scenes never share a gradient or clip path.
 */
export function prepareSceneMarkup(raw: string, instanceKey: string): string | null {
  if (!isSceneMarkupSafe(raw)) return null;
  const key = instanceKey.replace(/[^a-zA-Z0-9_-]/g, "") || "s";
  return raw
    .replace(/<\?xml[\s\S]*?\?>/g, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<style>[\s\S]*?<\/style>/g, "")
    .replace(/<svg\b([^>]*)>/, (_match, attrs: string) => {
      const kept = attrs.replace(/\s(?:width|height|aria-hidden|focusable|role)="[^"]*"/g, "");
      return `<svg${kept} class="journey-scene-svg" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">`;
    })
    .replace(/\sid="([^"]+)"/g, ` id="$1-${key}"`)
    .replace(/url\(#([^)]+)\)/g, `url(#$1-${key})`)
    .trim();
}
