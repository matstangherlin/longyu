/**
 * RC2.3.13R.3.2.3 — Journey SVG visual storytelling gates.
 *
 *   validate:journey-svg-assets     — parse, safety, size, ids (per asset)
 *   validate:journey-svg-style      — Longyu vector contract, palette, themes
 *   validate:journey-scene-registry — registry ↔ files ↔ deterministic plan
 *   validate:journey-scene-layout   — lane contract + E2E layout evidence
 *   validate:rc2-3-13r3-2-3-…       — all of the above + release honesty
 *
 * Every checker is a pure function over a `sources` object so the mutation
 * runner can corrupt one input and prove the matching error fires. Registry
 * and plan are not regex-parsed: their (possibly mutated) TypeScript is
 * transpiled and executed against the real curriculum data.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";
import { require as tsRequire } from "./v495a-runtime.mjs";
import { journeyFingerprint } from "./report-meta.mjs";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const SCENE_DIR = "src/assets/journey/scenes";
export const VIEWBOX = "0 0 320 240";
export const MAX_BYTES = 35 * 1024;
export const MIN_STROKE = 2;
export const LIBRARY_MIN = 12;
export const LIBRARY_MAX = 16;

export const ROLES = [
  "ink",
  "soft",
  "mark",
  "mark-soft",
  "paper",
  "pale",
  "wash",
  "accent",
  "clay",
  "sage",
  "sage-soft",
  "sand",
  "glow",
  "gold",
];

/** Learner runtime this wave stamps (JourneyScene integration + medallion). */
export const PREVIOUS_LEARNER_RUNTIME_SHA = "0357f82476d03bc8364efc66902b4640b4a155b9";
export const EXPECTED_FINGERPRINT = "29bb02ec0336";
export const PARENT_PR = 353;
export const PARENT_HEAD_SHA = "05bcf51e5897982dbe15af98e38e8c9d1b37edd1";
export const STALE_APK_SHA256 = [
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af",
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8",
];
export const FREEZE_REASON = "OWNER_APPROVED_JOURNEY_SVG_VISUAL_STORYTELLING";

/**
 * #353 LEGIT engine skip: explicit, narrow, WebKit-only, documented.
 * The call text is assembled at runtime: the convergence skip scanner hunts
 * real skips in scripts/, and this is a detector fixture, not a skip.
 */
const SKIP_CALL = ["test", "skip("].join(".");
export const WEBKIT_SKIP = {
  file: "e2e/v494-builder-ux.spec.ts",
  narrow: `${SKIP_CALL}browserName === "webkit", "CI WebKit crashes on clear`,
};

export const REQUIRED_LAYOUT_ROWS = [
  "360x640-light",
  "375x667-light",
  "390x844-light",
  "390x844-dark",
  "tablet-834x1112-light",
  "desktop-1280x900-light",
  "360x640-large-font",
  "390x844-reduced-motion",
];

/* ------------------------------------------------------------------ */
/* Sources                                                            */
/* ------------------------------------------------------------------ */

export const RUNTIME_FILES = [
  "src/features/journey/scenes/journeySceneRegistry.ts",
  "src/features/journey/scenes/journeyScenePlan.ts",
  "src/features/journey/scenes/journeySceneMarkup.ts",
  "src/features/journey/scenes/JourneyScene.tsx",
  "src/features/journey/scenes/JourneyLaneRow.tsx",
  "src/components/progression/ProgressionReviewMedallion.tsx",
];

const CSS_START = "RC2.3.13R.3.2.3 — Journey scene lanes";
const CSS_END = "/* end Journey scene palette */";

export function sceneCssSection(css) {
  const a = css.indexOf(CSS_START);
  const b = css.indexOf(CSS_END);
  return a >= 0 && b > a ? css.slice(a, b + CSS_END.length) : "";
}

export function loadSvgFiles(dir = SCENE_DIR) {
  const abs = path.join(ROOT, dir);
  if (!fs.existsSync(abs)) return {};
  return Object.fromEntries(
    fs
      .readdirSync(abs)
      .filter((f) => f.endsWith(".svg"))
      .sort()
      .map((f) => [f, fs.readFileSync(path.join(abs, f), "utf8")]),
  );
}

export function loadJourneySvgSources() {
  return {
    files: loadSvgFiles(),
    registry: read("src/features/journey/scenes/journeySceneRegistry.ts"),
    plan: read("src/features/journey/scenes/journeyScenePlan.ts"),
    markup: read("src/features/journey/scenes/journeySceneMarkup.ts"),
    component: read("src/features/journey/scenes/JourneyScene.tsx"),
    laneRow: read("src/features/journey/scenes/JourneyLaneRow.tsx"),
    medallion: read("src/components/progression/ProgressionReviewMedallion.tsx"),
    bubble: read("src/components/progression/ProgressionNodeBubble.tsx"),
    label: read("src/components/progression/ProgressionNodeLabel.tsx"),
    pathComp: read("src/components/progression/ProgressionPath.tsx"),
    ornaments: read("src/components/progression/symbolicOrnaments.tsx"),
    journeyPage: read("src/features/journey/JourneyPage.tsx"),
    cultureJourney: read("src/features/culture/CultureJourneyPage.tsx"),
    cultureDetail: read("src/features/culture/CultureTopicDetailPage.tsx"),
    css: read("src/index.css"),
    inventory: read("docs/release/journey-svg-assets.json"),
    designDoc: read("docs/ux/journey-svg-visual-system.md"),
    layoutEvidence: read("docs/release/evidence/rc2-3-13r3-2-3/journey-scene-layout.json"),
    cert: read("docs/release/rc2-3-13r3-2-3-certification.json"),
    rc: read("docs/release/final-pre-beta-rc.json"),
    report: read("docs/reports/rc2-3-13r3-2-3-journey-svg-storytelling.md"),
    handoff: read("docs/release/OWNER_R32_3_JOURNEY_SVG_HANDOFF.md"),
    freeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    gateRegistry: read("docs/release/gate-registry.json"),
    suites: read("scripts/release/canonical-suites.mjs"),
    skipAllowlist: read("docs/release/skip-allowlist.json"),
    builderSpec: read("e2e/v494-builder-ux.spec.ts"),
    vite: read("vite.config.ts"),
    liveFingerprint: journeyFingerprint(ROOT),
  };
}

/* ------------------------------------------------------------------ */
/* Minimal strict XML parser (no dependency)                          */
/* ------------------------------------------------------------------ */

const TOKEN =
  /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[[\s\S]*?\]\]>|<\/([A-Za-z][\w:.-]*)\s*>|<([A-Za-z][\w:.-]*)((?:\s+[A-Za-z_:][\w:.-]*\s*=\s*"[^"<]*")*)\s*(\/?)>|([^<]+)/y;
const ATTR = /([A-Za-z_:][\w:.-]*)\s*=\s*"([^"<]*)"/g;

export function parseSvg(text) {
  if (typeof text !== "string" || !text.trim()) return { ok: false, error: "empty" };
  const rootHolder = { name: "#doc", attrs: {}, children: [] };
  const stack = [rootHolder];
  TOKEN.lastIndex = 0;
  let pos = 0;
  while (pos < text.length) {
    TOKEN.lastIndex = pos;
    const m = TOKEN.exec(text);
    if (!m || m.index !== pos) return { ok: false, error: `unexpected markup at ${pos}` };
    pos = TOKEN.lastIndex;
    const [whole, close, open, attrText, selfClose, textNode] = m;
    if (whole.startsWith("<!--") || whole.startsWith("<?")) continue;
    if (whole.startsWith("<![CDATA[")) {
      stack[stack.length - 1].children.push({ name: "#text", text: whole.slice(9, -3) });
      continue;
    }
    if (close) {
      const top = stack.pop();
      if (!top || top.name !== close) return { ok: false, error: `mismatched </${close}>` };
      continue;
    }
    if (open) {
      const attrs = {};
      for (const a of (attrText ?? "").matchAll(ATTR)) {
        if (a[1] in attrs) return { ok: false, error: `duplicate attribute ${a[1]} on <${open}>` };
        attrs[a[1]] = a[2];
      }
      const node = { name: open, attrs, children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
      continue;
    }
    if (textNode !== undefined) {
      if (stack.length === 1 && textNode.trim()) return { ok: false, error: "text outside root" };
      if (stack.length > 1) stack[stack.length - 1].children.push({ name: "#text", text: textNode });
    }
  }
  if (stack.length !== 1) return { ok: false, error: `unclosed <${stack[stack.length - 1].name}>` };
  const roots = rootHolder.children.filter((c) => c.name !== "#text");
  if (roots.length !== 1 || roots[0].name !== "svg") return { ok: false, error: "root must be a single <svg>" };
  return { ok: true, root: roots[0] };
}

function walk(node, fn, parent = null) {
  fn(node, parent);
  for (const child of node.children ?? []) if (child.name !== "#text") walk(child, fn, node);
}

function textOf(node) {
  return (node.children ?? []).filter((c) => c.name === "#text").map((c) => c.text).join("");
}

const DRAW = new Set(["path", "rect", "circle", "ellipse", "line", "polyline", "polygon"]);
const ALLOWED_ELEMENTS = new Set([
  "svg",
  "g",
  "defs",
  "style",
  "linearGradient",
  "radialGradient",
  "stop",
  "clipPath",
  ...DRAW,
]);

/* ------------------------------------------------------------------ */
/* 1. Asset integrity (validate:journey-svg-assets)                   */
/* ------------------------------------------------------------------ */

export function checkSvgAssets(src) {
  const errors = [];
  const stats = {
    files: 0,
    parsed: 0,
    externalRefs: 0,
    scripts: 0,
    foreignObject: 0,
    embeddedRaster: 0,
    missingViewBox: 0,
    oversizeAssets: 0,
    duplicateIdsWithinAsset: 0,
  };
  const files = src.files ?? {};
  if (Object.keys(files).length === 0) errors.push("SVG_LIBRARY_EMPTY");
  for (const [file, text] of Object.entries(files)) {
    stats.files += 1;
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > MAX_BYTES) {
      stats.oversizeAssets += 1;
      errors.push("SVG_OVERSIZE");
    }
    if (/<script/i.test(text) || /javascript:/i.test(text)) {
      stats.scripts += 1;
      errors.push("SVG_SCRIPT");
    }
    if (/<foreignObject/i.test(text)) {
      stats.foreignObject += 1;
      errors.push("SVG_FOREIGN_OBJECT");
    }
    if (/<image\b/i.test(text) || /data:image|;base64,/i.test(text)) {
      stats.embeddedRaster += 1;
      errors.push("SVG_EMBEDDED_RASTER");
    }
    if (/\b(?:href|xlink:href)\s*=\s*"(?!#)/i.test(text) || /url\(\s*["']?(?!#)/i.test(text) || /https?:|\/\/[a-z]/i.test(text.replace('xmlns="http://www.w3.org/2000/svg"', "")) || /@import/i.test(text)) {
      stats.externalRefs += 1;
      errors.push("SVG_EXTERNAL_REF");
    }
    if (/<(?:animate|animateTransform|animateMotion|set)\b/i.test(text)) errors.push("SVG_SMIL_MOTION");
    if (/@font-face|<font\b|font-family/i.test(text)) errors.push("SVG_EMBEDDED_FONT");
    const parsed = parseSvg(text);
    if (!parsed.ok) {
      errors.push("SVG_PARSE_FAILED");
      continue;
    }
    stats.parsed += 1;
    const root = parsed.root;
    if (!root.attrs.viewBox) {
      stats.missingViewBox += 1;
      errors.push("SVG_MISSING_VIEWBOX");
    }
    const ids = new Map();
    const refs = new Set();
    walk(root, (node) => {
      if (!ALLOWED_ELEMENTS.has(node.name)) errors.push("SVG_FORBIDDEN_ELEMENT");
      for (const [k, v] of Object.entries(node.attrs)) {
        if (/^on/i.test(k)) errors.push("SVG_EVENT_HANDLER");
        if (k === "id") ids.set(v, (ids.get(v) ?? 0) + 1);
        for (const r of String(v).matchAll(/url\(#([^)]+)\)/g)) refs.add(r[1]);
        if ((k === "href" || k === "xlink:href") && v.startsWith("#")) refs.add(v.slice(1));
      }
    });
    for (const n of ids.values()) {
      if (n > 1) {
        stats.duplicateIdsWithinAsset += 1;
        errors.push("SVG_DUPLICATE_ID");
      }
    }
    for (const ref of refs) if (!ids.has(ref)) errors.push("SVG_DANGLING_REF");
    void file;
  }
  return { errors: [...new Set(errors)], stats };
}

/* ------------------------------------------------------------------ */
/* 2. Style contract (validate:journey-svg-style)                     */
/* ------------------------------------------------------------------ */

function rgbTriples(text) {
  return [...String(text).matchAll(/rgb\(\s*(\d+)\s+(\d+)\s+(\d+)(?:\s*\/\s*([\d.]+))?\s*\)/g)].map((m) => ({
    rgb: [Number(m[1]), Number(m[2]), Number(m[3])],
    alpha: m[4] === undefined ? 1 : Number(m[4]),
  }));
}

/** Token triples of a theme block in index.css, e.g. ':root,\n[data-theme="clay"]'. */
export function themeTokens(css, selectorStart) {
  const i = css.indexOf(selectorStart);
  if (i < 0) return {};
  const block = css.slice(css.indexOf("{", i) + 1, css.indexOf("}", i));
  const out = {};
  for (const m of block.matchAll(/--([\w-]+):\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) out[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
  return out;
}

export function lightTokens(css) {
  return themeTokens(css, ':root,\n[data-theme="clay"]');
}

export function darkTokens(css) {
  return themeTokens(css, '[data-theme="dark"] {');
}

const sameRgb = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];

function canonicalStyleOf(text) {
  return String(text).match(/<style>[\s\S]*?<\/style>/)?.[0] ?? "";
}

export function checkSvgStyle(src) {
  const errors = [];
  const files = src.files ?? {};
  const light = lightTokens(src.css ?? "");
  const allowedTriples = Object.values(light).concat(Object.values(darkTokens(src.css ?? "")));
  let referenceStyle = null;
  for (const [file, text] of Object.entries(files)) {
    if (/[^\x09\x0a\x0d\x20-\x7e]/.test(text)) errors.push("SVG_NON_ASCII_OR_EMOJI");
    if (/<(?:text|tspan|textPath)\b/i.test(text)) errors.push("SVG_VISIBLE_TEXT");
    if (/<(?:title|desc)\b/i.test(text) || /\baria-label\s*=|\balt\s*=/i.test(text)) errors.push("DECORATIVE_TEXT_EXPOSED");
    if (/font-family|@font-face|@import/i.test(text)) errors.push("SVG_EXTERNAL_FONT");
    const parsed = parseSvg(text);
    if (!parsed.ok) continue;
    const root = parsed.root;
    const id = file.replace(/^journey-/, "").replace(/\.svg$/, "");
    if (root.attrs.viewBox !== VIEWBOX) errors.push("SVG_WRONG_VIEWBOX");
    if (root.attrs["data-lys-scene"] !== id) errors.push("SCENE_ID_ATTR_MISMATCH");
    if (root.attrs.fill !== "none") errors.push("SVG_ROOT_PAINT");
    if (root.attrs["stroke-linecap"] !== "round" || root.attrs["stroke-linejoin"] !== "round") {
      errors.push("STYLE_NOT_LONGYU");
    }
    if (root.attrs.style || /background/i.test(root.attrs.style ?? "")) errors.push("SVG_OPAQUE_CANVAS");

    // Standalone palette: one canonical block, both schemes, token-derived colors.
    const style = canonicalStyleOf(text);
    if (!style) errors.push("SVG_STYLE_CONTRACT_DRIFT");
    if (referenceStyle === null) referenceStyle = style;
    else if (style !== referenceStyle) errors.push("SVG_STYLE_CONTRACT_DRIFT");
    if (!/@media \(prefers-color-scheme:dark\)/.test(style)) errors.push("SVG_DARK_SCHEME_MISSING");
    for (const role of ROLES) {
      if (!style.includes(`.lys-f-${role}{`) || !style.includes(`.lys-s-${role}{`)) errors.push("SVG_STYLE_CONTRACT_DRIFT");
    }
    for (const { rgb } of rgbTriples(style)) {
      if (!allowedTriples.some((t) => sameRgb(t, rgb))) errors.push("ALIEN_PALETTE");
    }

    let hasDisc = false;
    let hasAccent = false;
    walk(root, (node, parent) => {
      const cls = String(node.attrs.class ?? "").split(/\s+/).filter(Boolean);
      for (const c of cls) {
        if (!c.startsWith("lys-")) continue;
        const m = c.match(/^lys-([fs])-(.+)$/);
        if (c === "lys-stop-wash") continue;
        if (!m || !ROLES.includes(m[2])) errors.push("UNKNOWN_ROLE");
        if (m && m[2] === "accent") hasAccent = true;
      }
      for (const k of ["fill", "stroke", "stop-color", "color"]) {
        const v = node.attrs[k];
        if (v === undefined) continue;
        if (node.name === "svg" && k === "fill" && v === "none") continue;
        if (v !== "none" && !/^url\(#[^)]+\)$/.test(v)) errors.push("HARDCODED_COLOR");
      }
      if (node.attrs.style) errors.push("HARDCODED_COLOR");
      if (node.name === "stop" && !cls.includes("lys-stop-wash")) errors.push("UNROLED_PAINT");
      if (DRAW.has(node.name)) {
        const roled = cls.some((c) => /^lys-[fs]-/.test(c)) || /^url\(#/.test(node.attrs.fill ?? "");
        // <clipPath> children are geometry, not paint.
        if (!roled && parent?.name !== "clipPath") errors.push("UNROLED_PAINT");
        if (cls.some((c) => c.startsWith("lys-s-"))) {
          const sw = Number(node.attrs["stroke-width"] ?? "1");
          if (!(sw >= MIN_STROKE)) errors.push("STROKE_TOO_THIN");
        }
        if (node.name === "rect") {
          const x = Number(node.attrs.x ?? 0);
          const y = Number(node.attrs.y ?? 0);
          const w = Number(node.attrs.width ?? 0);
          const h = Number(node.attrs.height ?? 0);
          if (x <= 0 && y <= 0 && w >= 320 && h >= 240) errors.push("SVG_OPAQUE_CANVAS");
        }
        if (/^M0[ ,]0H320V240H0Z?$/i.test(String(node.attrs.d ?? "").replace(/\s+/g, ""))) errors.push("SVG_OPAQUE_CANVAS");
        if (node.name === "circle" && /^url\(#[\w-]+-disc\)$/.test(node.attrs.fill ?? "")) {
          hasDisc = true;
          if (Number(node.attrs.r) > 120) errors.push("SVG_OPAQUE_CANVAS");
        }
      }
    });
    if (!hasDisc) errors.push("SIGNATURE_DISC_MISSING");
    if (!hasAccent) errors.push("FOCAL_ACCENT_MISSING");
  }
  return [...new Set(errors)];
}

/* ------------------------------------------------------------------ */
/* 3. Theme visibility (contrast against the real tokens)             */
/* ------------------------------------------------------------------ */

function luminance([r, g, b]) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

const over = (fg, alpha, bg) => fg.map((c, i) => Math.round(c * alpha + bg[i] * (1 - alpha)));

/** `--scene-x: var(--text)` (light) or `--scene-x: 47 52 55` (dark). */
function sceneTokenMap(cssSection, selector, themeTokensMap) {
  const i = cssSection.indexOf(selector);
  if (i < 0) return null;
  const block = cssSection.slice(cssSection.indexOf("{", i) + 1, cssSection.indexOf("}", i));
  const out = {};
  for (const m of block.matchAll(/--(scene-[\w-]+):\s*([^;]+);/g)) {
    const v = m[2].trim();
    const ref = v.match(/^var\(--([\w-]+)\)$/);
    if (ref) out[m[1]] = themeTokensMap[ref[1]] ?? null;
    else {
      const nums = v.match(/^(\d+)\s+(\d+)\s+(\d+)$/);
      out[m[1]] = nums ? [Number(nums[1]), Number(nums[2]), Number(nums[3])] : null;
    }
  }
  const op = block.match(/(?:^|[;\s])opacity:\s*([\d.]+)/);
  out.__opacity = op ? Number(op[1]) : 1;
  return out;
}

function roleRule(cssSection, role, prop) {
  const kind = prop === "fill" ? "f" : "s";
  const re = new RegExp(`\\.journey-scene \\.lys-${kind}-${role.replace("-", "\\-")} \\{ ${prop}: rgb\\(var\\(--([\\w-]+)\\)(?: / ([\\d.]+))?\\); \\}`);
  const m = cssSection.match(re);
  return m ? { token: m[1], alpha: m[2] === undefined ? 1 : Number(m[2]) } : null;
}

export function checkThemes(src) {
  const errors = [];
  const css = src.css ?? "";
  const section = sceneCssSection(css);
  if (!section) return ["SCENE_CSS_SECTION_MISSING"];
  const light = lightTokens(css);
  const dark = darkTokens(css);
  for (const role of ROLES) {
    for (const prop of ["fill", "stroke"]) {
      if (!roleRule(section, role, prop)) errors.push("APP_ROLE_CSS_MISSING");
    }
  }
  if (/\.journey-scene \.lys-[fs]-[\w-]+ \{ (?:fill|stroke): #/.test(section)) errors.push("APP_ROLE_HARDCODED");

  const lightScene = sceneTokenMap(section, ".journey-scene {\n  --scene-ink", light);
  const darkScene = sceneTokenMap(section, '[data-theme="dark"] .journey-scene {', dark);
  if (!lightScene || !darkScene) return [...new Set([...errors, "SCENE_TOKENS_MISSING"])];
  for (const [k, v] of Object.entries(lightScene)) {
    if (k.startsWith("__")) continue;
    if (!v) errors.push("ALIEN_PALETTE");
  }
  // Moonlit dark keeps the clay theme's own token values — nothing invented.
  const lightValues = Object.values(light);
  for (const [k, v] of Object.entries(darkScene)) {
    if (k.startsWith("__")) continue;
    if (!v || !lightValues.some((t) => sameRgb(t, v))) errors.push("ALIEN_PALETTE");
  }
  if (!/\[data-theme="dark"\] \.journey-scene \.lys-stop-wash \{\s*stop-opacity: 1;/.test(section)) {
    errors.push("DARK_MOON_FADES");
  }

  const ink = roleRule(section, "ink", "stroke");
  const accent = roleRule(section, "accent", "fill");
  const moonKey = "scene-moon";
  const resolvable = (map, keys) => keys.every((k) => Array.isArray(map[k]));
  if (ink && accent && light.bg && dark.bg) {
    // Light: linework must read on the page background and on the wash disc.
    if (!resolvable(lightScene, [ink.token, moonKey])) errors.push("LIGHT_SCENE_INVISIBLE");
    else {
      const lInk = over(lightScene[ink.token], ink.alpha, light.bg);
      if (contrast(lInk, light.bg) < 3 || contrast(over(lightScene[ink.token], ink.alpha, lightScene[moonKey]), lightScene[moonKey]) < 3) {
        errors.push("LIGHT_SCENE_INVISIBLE");
      }
    }
    // Dark (moonlit): the moon must stand out from the dark page, the ink on the moon.
    const op = darkScene.__opacity;
    const moon = darkScene[moonKey];
    if (!resolvable(darkScene, [moonKey, ink.token, accent.token]) || op < 0.6) errors.push("DARK_SCENE_INVISIBLE");
    else {
      const moonOnPage = over(moon, op, dark.bg);
      const inkOnMoon = over(over(darkScene[ink.token], ink.alpha, moon), op, dark.bg);
      if (contrast(moonOnPage, dark.bg) < 3 || contrast(inkOnMoon, moonOnPage) < 3) errors.push("DARK_SCENE_INVISIBLE");
      const accentOnMoon = over(over(darkScene[accent.token], accent.alpha, moon), op, dark.bg);
      if (contrast(accentOnMoon, moonOnPage) < 1.8) errors.push("DARK_SCENE_INVISIBLE");
    }
    if (op > 0.95) errors.push("DARK_SCENE_TOO_BRIGHT");
  }
  return [...new Set(errors)];
}

/* ------------------------------------------------------------------ */
/* 4. Registry + deterministic plan (validate:journey-scene-registry) */
/* ------------------------------------------------------------------ */

const SCENES_DIR_ABS = path.join(ROOT, "src/features/journey/scenes");

function transpile(source) {
  return ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
}

function evalModule(source, filename, resolveOverride) {
  const mod = { exports: {} };
  const req = (spec) => {
    const override = resolveOverride?.(spec);
    if (override) return override;
    if (spec.startsWith(".")) {
      const base = path.resolve(path.dirname(filename), spec);
      const file = [".ts", ".tsx", "/index.ts"].map((ext) => base + ext).find((f) => fs.existsSync(f)) ?? base;
      return tsRequire(file);
    }
    return Module.createRequire(filename)(spec);
  };
  // eslint-disable-next-line no-new-func
  new Function("exports", "require", "module", "__filename", "__dirname", transpile(source))(
    mod.exports,
    req,
    mod,
    filename,
    path.dirname(filename),
  );
  return mod.exports;
}

/** Executes (possibly mutated) registry + plan sources against real curriculum data. */
export function evaluateSceneModules(src) {
  try {
    const registry = evalModule(src.registry, path.join(SCENES_DIR_ABS, "journeySceneRegistry.ts"));
    const plan = evalModule(src.plan, path.join(SCENES_DIR_ABS, "journeyScenePlan.ts"), (spec) =>
      spec === "./journeySceneRegistry" ? registry : null,
    );
    return { ok: true, registry, plan };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
}

const RANDOMNESS = /Math\.random|Date\.now|new Date\b|performance\.now|crypto\.getRandomValues|randomUUID/;

export function checkRegistry(src) {
  const errors = [];
  for (const key of ["registry", "plan", "component", "laneRow", "markup"]) {
    if (RANDOMNESS.test(src[key] ?? "")) errors.push("RANDOM_MAPPING");
  }
  const evald = evaluateSceneModules(src);
  if (!evald.ok) return [...new Set([...errors, "REGISTRY_EVAL_FAILED"])];
  const { registry, plan: planMod } = evald;
  const scenes = registry.JOURNEY_SCENES ?? [];
  const ids = scenes.map((s) => s.id);
  if (new Set(ids).size !== ids.length) errors.push("DUPLICATE_SCENE_ID");
  if (new Set(registry.JOURNEY_SCENE_IDS ?? []).size !== (registry.JOURNEY_SCENE_IDS ?? []).length) errors.push("DUPLICATE_SCENE_ID");
  if (ids.length < LIBRARY_MIN || ids.length > LIBRARY_MAX) errors.push("LIBRARY_SIZE_OUT_OF_RANGE");
  if (registry.JOURNEY_SCENE_PACK_VERSION !== 1) errors.push("PACK_VERSION_MISSING");
  if (registry.JOURNEY_SCENE_VIEWBOX !== VIEWBOX) errors.push("SVG_WRONG_VIEWBOX");
  const files = new Set(Object.keys(src.files ?? {}));
  for (const s of scenes) {
    if (s.file !== `journey-${s.id}.svg` || s.src !== `${SCENE_DIR}/${s.file}`) errors.push("REGISTRY_ID_FILE_MISMATCH");
    if (!files.has(s.file)) errors.push("REGISTRY_SRC_MISSING");
    if (!(s.regions ?? []).length) errors.push("REGION_CONTRACT_BROKEN");
    if (!["sparse", "normal"].includes(s.density)) errors.push("REGISTRY_ID_FILE_MISMATCH");
  }
  for (const f of files) if (!scenes.some((s) => s.file === f)) errors.push("UNREGISTERED_SCENE");

  let plan;
  let replay;
  try {
    plan = planMod.planJourneyScenes(planMod.journeyPlanUnits(), planMod.canonicalLessonStops);
    replay = planMod.planJourneyScenes(planMod.journeyPlanUnits(), planMod.canonicalLessonStops);
  } catch {
    return [...new Set([...errors, "PLAN_EVAL_FAILED"])];
  }
  if (plan.digest !== replay.digest || JSON.stringify(plan.scenes) !== JSON.stringify(replay.scenes)) {
    errors.push("PLAN_NONDETERMINISTIC");
  }
  const byId = new Map(scenes.map((s) => [s.id, s]));
  const units = planMod.journeyPlanUnits();
  const unitIds = new Set(units.map((u) => u.id));
  for (const id of Object.keys(planMod.JOURNEY_UNIT_SCENES ?? {})) if (!unitIds.has(id)) errors.push("STALE_UNIT_MAPPING");
  for (const [unitId, seq] of Object.entries(planMod.JOURNEY_UNIT_SCENES ?? {})) {
    const unit = units.find((u) => u.id === unitId);
    const region = unit ? planMod.regionForPhase(unit.phaseId) : null;
    for (const id of seq) {
      if (!byId.has(id)) errors.push("PLAN_UNREGISTERED_SCENE");
      else if (region && !byId.get(id).regions.includes(region)) errors.push("REGION_CONTRACT_BROKEN");
    }
  }

  // Density, alternation, determinism of the real arrangement.
  let stops = 0;
  for (const u of units) for (const id of u.lessonIds) {
    const s = planMod.canonicalLessonStops(id);
    stops += s.before + 1 + s.after;
  }
  const n = plan.scenes.length;
  if (n === 0) errors.push("SCENES_MISSING");
  const perScene = n ? stops / n : Infinity;
  if (perScene < 3) errors.push("SCENE_EVERY_NODE");
  if (perScene > 6) errors.push("SCENES_TOO_SPARSE");
  for (let i = 0; i < n; i += 1) {
    const s = plan.scenes[i];
    if (!byId.has(s.sceneId)) errors.push("PLAN_UNREGISTERED_SCENE");
    else if (!byId.get(s.sceneId).regions.includes(s.region)) errors.push("REGION_CONTRACT_BROKEN");
    if (s.ordinal !== i) errors.push("PLAN_NONDETERMINISTIC");
    if (i > 0) {
      const prev = plan.scenes[i - 1];
      if (prev.side === s.side) errors.push("ALTERNATION_BROKEN");
      if (prev.sceneId === s.sceneId) errors.push("CONSECUTIVE_DUPLICATE_SCENE");
      if (prev.unitId === s.unitId && (s.lessonIndex - prev.lessonIndex < 2 || s.stop - prev.stop < 3)) {
        errors.push("SCENE_EVERY_NODE");
      }
    }
  }
  for (const id of ids) if (!plan.scenes.some((s) => s.sceneId === id)) errors.push("SCENE_UNUSED");
  if (!plan.ornaments.length) errors.push("ORNAMENTS_REMOVED");
  for (const o of plan.ornaments) {
    const near = plan.scenes.some((s) => s.unitId === o.unitId && Math.abs(s.lessonIndex - o.lessonIndex) < 2);
    if (near) errors.push("ORNAMENT_SCENE_COLLISION");
  }

  // Inventory must describe exactly these files and this arrangement.
  let inv = null;
  try {
    inv = JSON.parse(src.inventory || "null");
  } catch {
    inv = null;
  }
  if (!inv) errors.push("INVENTORY_MISSING");
  else {
    if (inv.version !== 1) errors.push("INVENTORY_DRIFT");
    if (inv.planDigest !== plan.digest) errors.push("INVENTORY_DRIFT");
    if (inv.sceneSlots !== n) errors.push("INVENTORY_DRIFT");
    const assets = inv.assets ?? [];
    if (assets.length !== scenes.length) errors.push("INVENTORY_DRIFT");
    for (const s of scenes) {
      const row = assets.find((a) => a.id === s.id);
      const text = src.files?.[s.file];
      if (!row || !text) {
        errors.push("INVENTORY_DRIFT");
        continue;
      }
      if (row.file !== s.src || row.viewBox !== VIEWBOX || row.decorative !== true || row.maxBytes !== MAX_BYTES) errors.push("INVENTORY_DRIFT");
      if (row.bytes !== Buffer.byteLength(text, "utf8") || row.sha256 !== createHash("sha256").update(text).digest("hex")) {
        errors.push("INVENTORY_DRIFT");
      }
    }
  }
  return [...new Set(errors)];
}

/* ------------------------------------------------------------------ */
/* 5. Renderer, accessibility, isolation                              */
/* ------------------------------------------------------------------ */

// Drops real comments only (block comments opened by slash-star-star or
// slash-star-space, and line comments), never globs such as scenes/<star>.svg.
const strip = (code) =>
  String(code ?? "")
    .replace(/\/\*(?:\*|\s)[\s\S]*?\*\//g, " ")
    .replace(/(^|\s)\/\/[^\n]*/g, "$1 ");

export function checkRenderer(src) {
  const errors = [];
  const component = strip(src.component);
  const lane = strip(src.laneRow);
  const markup = strip(src.markup);
  const page = strip(src.journeyPage);
  const medallion = strip(src.medallion);

  // Bundled, registered, synchronous (no flash, no network, offline-safe).
  if (!/import\.meta\.glob/.test(component) || !/query:\s*"\?raw"/.test(component)) errors.push("SCENE_NOT_BUNDLED");
  if (!/eager:\s*true/.test(component)) errors.push("LAYOUT_SHIFT_RISK");
  if (/fetch\(|https?:\/\/|new Image\(|<img/.test(component + lane)) errors.push("SCENE_NETWORK_DEPENDENCY");
  if (!/JOURNEY_SCENE_BY_ID\.get/.test(component)) errors.push("UNREGISTERED_LOOKUP");
  if (!/prepareSceneMarkup\(/.test(component)) errors.push("MARKUP_GUARD_BYPASSED");

  // Decorative only.
  if (!/aria-hidden="true"/.test(component)) errors.push("SCENE_ANNOUNCED");
  if (/role="img"|aria-label|alt=|<title|aria-describedby/.test(component + lane)) errors.push("DECORATIVE_TEXT_EXPOSED");
  if (/tabIndex|<button|<a\s|onClick|onKeyDown|href=/.test(component + lane)) errors.push("SCENE_FOCUSABLE");
  errors.push(...checkMarkupBehaviour(src));

  // Motion: wrapper-only, reduced-motion aware.
  // The guard itself, not just the helper's definition.
  if (!/if \(prefersReducedMotion\(\)\) return "done";/.test(component) || !/prefers-reduced-motion: reduce/.test(component)) {
    errors.push("REDUCED_MOTION_IGNORED");
  }
  if (!/revealedThisSession/.test(component)) errors.push("REVEAL_REPLAYS");

  // Lanes: scenes and ornaments only in side lanes, never both on one row.
  if (!/journey-lane journey-lane-left" aria-hidden="true"/.test(lane) || !/journey-lane journey-lane-right" aria-hidden="true"/.test(lane)) {
    errors.push("SCENE_ANNOUNCED");
  }
  if (!/if \(!scene && ornament\?\.side === side\)/.test(lane)) errors.push("ORNAMENT_SCENE_COLLISION");
  if (!/<SymbolicOrnament\b/.test(lane)) errors.push("ORNAMENTS_REMOVED");
  if (/journey-lane-center"[^>]*style=|translate|marginLeft|marginRight/.test(lane)) errors.push("AXIS_MOVED");
  if (/<JourneyScene\b/.test(page)) errors.push("SCENE_NOT_IN_LANE");
  if (!/<JourneyLaneRow\b/.test(page) || !/journeyLaneDecorFor\(lesson\.id\)/.test(page)) errors.push("SCENES_NOT_INTEGRATED");
  if (!/data-progression-axis="stable"/.test(page)) errors.push("AXIS_MOVED");
  if (!/return 0;/.test(src.bubble ?? "") || /Math\.sin\(/.test(src.bubble ?? "")) errors.push("AXIS_MOVED");

  // Presentation only — never reads learner state.
  const logic = /\buseStore\b|lib\/store|\blessonState\b|\bcompletedLessons\b|\blessonMastery|\bcultureGate|\bxp\b|\bpoints\b|\bunlock|\bjourneyNodeProgress\b|\bpersist/;
  for (const code of [strip(src.registry), strip(src.plan), component, lane, markup]) {
    if (logic.test(code)) errors.push("PRESENTATION_TOUCHES_LOGIC");
  }

  // Culture stays clean (scenes are Journey-only; ornaments stay in Culture).
  for (const code of [src.cultureJourney, src.cultureDetail, src.pathComp]) {
    if (/JourneyScene|JourneyLaneRow|journey-scene|journeyScenePlan/.test(strip(code))) errors.push("CULTURE_SCENES_LEAKED");
  }
  if (!/SymbolicOrnamentRail/.test(src.pathComp ?? "")) errors.push("CULTURE_ORNAMENTS_REMOVED");

  // Review medallion: decorative frame, state-legible, review nodes only.
  if (!/aria-hidden="true"/.test(medallion) || !/focusable="false"/.test(medallion) || !/pointer-events-none/.test(medallion)) {
    errors.push("MEDALLION_EXPOSED");
  }
  if (/LOCKED:\s*\{[^}]*--accent/.test(medallion)) errors.push("MEDALLION_LOCKED_ACCENT");
  if (!/frame=\{isReview \? "review" : undefined\}/.test(page)) errors.push("MEDALLION_EVERY_NODE");
  if (!/reviewFrame\s*\?\s*"h-\[84px\] w-\[84px\]"/.test(src.bubble ?? "")) errors.push("MEDALLION_CROWDS_LABEL");
  return [...new Set(errors)];
}


/** Runs the (possibly mutated) markup preparer against hostile and real input. */
export const HOSTILE_SVGS = [
  '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>',
  '<svg viewBox="0 0 1 1"><foreignObject><div/></foreignObject></svg>',
  '<svg viewBox="0 0 1 1"><image href="data:image/png;base64,AAAA"/></svg>',
  '<svg viewBox="0 0 1 1" onload="alert(1)"><path d="M0 0"/></svg>',
  '<svg viewBox="0 0 1 1"><path fill="url(https://cdn.example/x.svg#a)" d="M0 0"/></svg>',
  '<svg viewBox="0 0 1 1"><use href="https://cdn.example/x.svg#a"/></svg>',
  '<svg viewBox="0 0 1 1"><text>Ola</text></svg>',
  '<svg viewBox="0 0 1 1"><style>@import url(x.css);</style></svg>',
];

export function checkMarkupBehaviour(src) {
  const errors = [];
  let mod;
  try {
    mod = evalModule(src.markup ?? "", path.join(SCENES_DIR_ABS, "journeySceneMarkup.ts"));
  } catch {
    return ["MARKUP_GUARD_BYPASSED"];
  }
  if (typeof mod.prepareSceneMarkup !== "function") return ["MARKUP_GUARD_BYPASSED"];
  for (const hostile of HOSTILE_SVGS) if (mod.prepareSceneMarkup(hostile, "k") !== null) errors.push("MARKUP_GUARD_WEAKENED");
  const [file, raw] = Object.entries(src.files ?? {})[0] ?? [];
  if (!raw) return errors;
  const a = mod.prepareSceneMarkup(raw, "inst-a");
  const b = mod.prepareSceneMarkup(raw, "inst-b");
  if (typeof a !== "string" || typeof b !== "string") return [...errors, "SCENE_RENDER_BROKEN"];
  if (!/^<svg[^>]*aria-hidden="true"/.test(a)) errors.push("SCENE_ANNOUNCED");
  if (!/^<svg[^>]*focusable="false"/.test(a)) errors.push("SCENE_FOCUSABLE");
  if (/<style>/.test(a)) errors.push("STANDALONE_STYLE_LEAKS");
  if (/^<svg[^>]*\swidth="/.test(a)) errors.push("LAYOUT_SHIFT_RISK");
  const idsA = [...a.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const idsB = new Set([...b.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  if (idsA.some((id) => idsB.has(id))) errors.push("SVG_ID_COLLISION_RISK");
  for (const ref of a.matchAll(/url\(#([^)]+)\)/g)) if (!idsA.includes(ref[1])) errors.push("SVG_ID_COLLISION_RISK");
  void file;
  return errors;
}

/* ------------------------------------------------------------------ */
/* 6. Layout contract + evidence (validate:journey-scene-layout)      */
/* ------------------------------------------------------------------ */

export function runtimeDigest(sources) {
  const h = createHash("sha256");
  for (const [file, text] of Object.entries(sources.files ?? {}).sort()) h.update(`${file}\n${text}\n`);
  for (const key of ["registry", "plan", "markup", "component", "laneRow", "medallion"]) h.update(`${key}\n${sources[key] ?? ""}\n`);
  h.update(sceneCssSection(sources.css ?? ""));
  return h.digest("hex").slice(0, 16);
}

function cssRule(section, selector) {
  const i = section.indexOf(`${selector} {`);
  if (i < 0) return "";
  return section.slice(i, section.indexOf("}", i) + 1);
}

function remOf(value) {
  const m = String(value).match(/([\d.]+)rem/);
  return m ? Number(m[1]) : NaN;
}

export function checkLayout(src) {
  const errors = [];
  const section = sceneCssSection(src.css ?? "");
  if (!section) return ["SCENE_CSS_SECTION_MISSING"];
  const row = cssRule(section, ".journey-lane-row");
  if (!/grid-template-columns: minmax\(0, 1fr\) minmax\(var\(--journey-node-lane\), auto\) minmax\(0, 1fr\);/.test(row)) {
    errors.push("LANE_GRID_ASYMMETRIC");
  }
  const lane = section.match(/--journey-node-lane:\s*([\d.]+rem)/)?.[1];
  const labelW = (src.label ?? "").match(/w-\[([\d.]+rem)\]/)?.[1];
  if (!lane || lane !== labelW) errors.push("NODE_LANE_WIDTH_DRIFT");
  const scene = cssRule(section, ".journey-scene");
  if (!/aspect-ratio: 4 \/ 3;/.test(scene)) errors.push("LAYOUT_SHIFT_RISK");
  if (!/width: min\(100%, var\(--journey-scene-max\)\);/.test(scene)) errors.push("SCENE_SIZE_UNBOUNDED");
  if (/position:\s*(?:absolute|fixed)/.test(scene + cssRule(section, ".journey-lane"))) errors.push("SCENE_ABSOLUTE_POSITION");
  const maxes = [...section.matchAll(/--journey-scene-max:\s*([\d.]+rem)/g)].map((m) => remOf(m[1]));
  if (!maxes.length || maxes[0] > 7 || Math.max(...maxes) > 9) errors.push("SCENE_TOO_TALL");
  const laneRule = cssRule(section, ".journey-lane");
  if (!/min-width: 0;/.test(laneRule)) errors.push("HORIZONTAL_OVERFLOW");
  if (!/pointer-events: none;/.test(laneRule)) errors.push("SCENE_INTERACTIVE");
  if (!/container-type: inline-size;/.test(laneRule) || !/@container \(max-width: \d+px\) \{\s*\.journey-scene \{\s*display: none;/.test(section)) {
    errors.push("LARGE_FONT_COLLISION");
  }
  const kf = section.slice(section.indexOf("@keyframes journey-scene-drift"), section.indexOf(".journey-scene-svg"));
  if (/filter|blur|box-shadow|width|height|\bd:/.test(kf)) errors.push("HEAVY_MOTION");
  const drift = kf.match(/translate3d\(0, -([\d.]+)px, 0\)/);
  if (!drift || Number(drift[1]) > 3 || Number(drift[1]) < 1) errors.push("MOTION_OUT_OF_RANGE");
  const tilt = section.match(/--journey-scene-tilt: ([\d.]+)deg;/);
  if (!tilt || Number(tilt[1]) > 0.5) errors.push("MOTION_OUT_OF_RANGE");
  const rm = (src.css ?? "").slice((src.css ?? "").indexOf("@media (prefers-reduced-motion: reduce)"));
  if (!/\.journey-scene-drift \{\s*animation: none !important;/.test(rm)) {
    errors.push("REDUCED_MOTION_IGNORED");
  }
  if (!/\.journey-scene\[data-reveal="pending"\] \.journey-scene-reveal \{\s*opacity: 1 !important;/.test(rm)) {
    errors.push("REDUCED_MOTION_IGNORED");
  }

  // Evidence from the E2E layout spec (real browser measurement).
  let ev = null;
  try {
    ev = JSON.parse(src.layoutEvidence || "null");
  } catch {
    ev = null;
  }
  if (!ev) return [...new Set([...errors, "LAYOUT_EVIDENCE_MISSING"])];
  if (ev.runtimeDigest !== runtimeDigest(src)) errors.push("LAYOUT_EVIDENCE_STALE");
  const rows = ev.rows ?? [];
  for (const name of REQUIRED_LAYOUT_ROWS) if (!rows.some((r) => r.name === name)) errors.push("LAYOUT_MATRIX_INCOMPLETE");
  for (const r of rows) {
    if (!(r.scenesMeasured > 0)) errors.push("LAYOUT_EVIDENCE_VACUOUS");
    if (r.sceneNodeOverlap !== 0) errors.push("SCENE_NODE_OVERLAP");
    if (r.sceneLabelOverlap !== 0) errors.push("SCENE_LABEL_OVERLAP");
    if (r.sceneCtaOverlap !== 0) errors.push("SCENE_CTA_OVERLAP");
    if (r.sceneCardOverlap !== 0) errors.push("SCENE_CARD_OVERLAP");
    if (r.sceneOrnamentOverlap !== 0) errors.push("ORNAMENT_SCENE_COLLISION");
    if (r.horizontalOverflowPx !== 0) errors.push("HORIZONTAL_OVERFLOW");
    if (!(Math.abs(r.axisDeltaPx) <= 0.5)) errors.push("AXIS_MOVED");
    if (!(Math.abs(r.axisLineDeltaPx) <= 1)) errors.push("CONNECTOR_SHIFTED");
    if (!(r.maxSceneHeightPx <= 140)) errors.push("SCENE_TOO_TALL");
    if (r.alternationBreaks !== 0) errors.push("ALTERNATION_BROKEN");
    if (r.nodeJumpPx !== 0) errors.push("LAYOUT_SHIFT");
    if (r.sceneLayoutShift !== null && r.sceneLayoutShift !== undefined && r.sceneLayoutShift > 0.01) errors.push("LAYOUT_SHIFT");
    if (r.focusableScenes !== 0) errors.push("SCENE_FOCUSABLE");
    if (r.exposedScenes !== 0) errors.push("SCENE_ANNOUNCED");
    if (r.brokenScenes !== 0) errors.push("SCENE_RENDER_BROKEN");
    if (r.name.includes("reduced-motion") && r.animatingScenes !== 0) errors.push("REDUCED_MOTION_IGNORED");
    if (r.name.startsWith("360x640") && !r.name.includes("large-font") && !(r.minSceneWidthPx >= 56 && r.maxSceneWidthPx <= 100)) {
      errors.push("SCENE_WIDTH_OUT_OF_RANGE");
    }
    if (r.name.startsWith("390x844") && !(r.minSceneWidthPx >= 64 && r.maxSceneWidthPx <= 110)) errors.push("SCENE_WIDTH_OUT_OF_RANGE");
  }
  return [...new Set(errors)];
}

/* ------------------------------------------------------------------ */
/* 7. Release honesty                                                 */
/* ------------------------------------------------------------------ */

function j(text) {
  try {
    return JSON.parse(text || "null");
  } catch {
    return null;
  }
}

export function checkRelease(src) {
  const errors = [];
  const cert = j(src.cert);
  const rc = j(src.rc);
  if (!cert) return ["CERT_MISSING"];
  if (!rc) return ["RC_MISSING"];
  const pkg = src.packageJson ?? "";
  for (const script of [
    "validate:journey-svg-assets",
    "validate:journey-svg-style",
    "validate:journey-scene-registry",
    "validate:journey-scene-layout",
    "validate:rc2-3-13r3-2-3-journey-svg-storytelling",
    "test:rc2-3-13r3-2-3-journey-svg-storytelling",
    "gate:rc2-3-13r3-2-3-journey-svg-storytelling",
  ]) {
    if (!pkg.includes(`"${script}"`)) errors.push("GATE_SCRIPT_MISSING");
    if (!(src.gateRegistry ?? "").includes(`"gateId": "${script}"`)) errors.push("GATE_REGISTRY_MISSING");
  }
  for (const step of ["validate:journey-svg-assets", "validate:journey-scene-layout", "test:rc2-3-13r3-2-3-journey-svg-storytelling"]) {
    // A real suite list item, not merely the ADDED_STEPS description key.
    if (!new RegExp(`\\n\\s+"${step}",\\n`).test(src.suites ?? "")) errors.push("GATE_NOT_IN_HOSTED_SUITE");
  }
  if (!(src.designDoc ?? "").includes("Longyu vector illustration language")) errors.push("DESIGN_DOC_MISSING");
  if (!/RC2\.3\.13R\.3\.2\.3/.test(src.report ?? "")) errors.push("REPORT_MISSING");
  if (!/USE THIS APK/.test(src.handoff ?? "") || !/DO NOT USE/.test(src.handoff ?? "")) errors.push("OWNER_HANDOFF_MISSING");
  // The owner compares the on-device pack digest (/qa/device) with the handoff.
  const inventory = j(src.inventory);
  if (inventory?.planDigest && !(src.handoff ?? "").includes(`digest ${inventory.planDigest}`)) errors.push("HANDOFF_DIGEST_STALE");
  for (const h of STALE_APK_SHA256) if (!(src.handoff ?? "").includes(h)) errors.push("HANDOFF_STALE_LIST_INCOMPLETE");

  // Freeze exception + scope.
  if (!new RegExp(`PRE_BETA_FREEZE_EXCEPTION_R323[\\s\\S]*${FREEZE_REASON}`).test(src.freeze ?? "")) errors.push("FREEZE_EXCEPTION_MISSING");
  if (cert.freezeException !== FREEZE_REASON) errors.push("FREEZE_EXCEPTION_MISSING");
  for (const k of ["navigationRedesign", "curriculumExpansion", "pedagogyChange", "masteryChange", "economyChange"]) {
    if (cert.scope?.[k] !== false) errors.push("SCOPE_CREEP");
  }

  // Runtime identity.
  const lr = cert.runtime?.learnerRuntimeSha;
  if (!lr || lr === PREVIOUS_LEARNER_RUNTIME_SHA || !/^[0-9a-f]{40}$/.test(lr)) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (rc.learnerRuntimeSha !== lr) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (cert.runtime?.previousLearnerRuntimeSha !== PREVIOUS_LEARNER_RUNTIME_SHA) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (cert.parentPr !== PARENT_PR || cert.parentHeadSha !== PARENT_HEAD_SHA) errors.push("WRONG_PARENT_PR");
  if (src.liveFingerprint !== EXPECTED_FINGERPRINT || rc.fingerprint !== src.liveFingerprint || cert.runtime?.fingerprint !== src.liveFingerprint) {
    errors.push("FINGERPRINT_DRIFT");
  }
  if (!new RegExp(`RC_BASE_FINGERPRINT = "${src.liveFingerprint}"`).test(src.freeze ?? "")) errors.push("FINGERPRINT_DRIFT");

  // Hosted / artifact / physical honesty.
  const hosted = cert.hosted ?? {};
  const artifact = cert.artifact ?? {};
  const physical = cert.physical ?? {};
  const visual = cert.visualFreeze ?? {};
  const rejected = cert.rejectedApkSha256List ?? [];
  for (const h of STALE_APK_SHA256) if (!rejected.includes(h)) errors.push("STALE_HASH_REJECTION_MISSING");
  if (cert.priorDeviceQa !== "STALE_FOR_CURRENT_RUNTIME") errors.push("OLD_APK_ACCEPTED");
  if (artifact.apkSha256 && rejected.includes(artifact.apkSha256)) errors.push("OLD_APK_ACCEPTED");
  if (artifact.status === "BUILT") {
    if (hosted.overall !== "PASS" || hosted.headSha !== artifact.artifactSourceSha) errors.push("APK_FROM_RED_HEAD");
    if (artifact.learnerRuntimeSha !== lr) errors.push("APK_RUNTIME_MISMATCH");
    if (!/^[0-9a-f]{64}$/.test(artifact.apkSha256 ?? "")) errors.push("APK_HASH_ABSENT");
    if (artifact.channel !== "DEVICE_QA") errors.push("WRONG_CHANNEL");
    if (!artifact.workflowRunId || !artifact.artifactId) errors.push("MISSING_PROVENANCE");
    if (!(src.handoff ?? "").includes(String(artifact.apkSha256))) errors.push("HANDOFF_MISSING_NEW_HASH");
  }
  if (artifact.playReady === true || cert.play?.debugAabPlayReady === true) errors.push("DEBUG_AAB_PLAY_READY");
  if (cert.play?.signedAab === "BUILT" && cert.play?.signingSource === "debug") errors.push("DEBUG_AAB_PLAY_READY");
  for (const key of ["releaseTruth", "security", "betaSuites", "qualityBuild", "androidFoundation", "androidRuntime", "chromium", "firefox", "webkit"]) {
    if (hosted.overall === "PASS" && !["PASS", "PASS_WITH_ALLOWLISTED_ENGINE_SKIP"].includes(hosted[key])) errors.push("HOSTED_PASS_DISHONEST");
  }
  if (hosted.firefox === "PASS_WITH_ALLOWLISTED_ENGINE_SKIP" || hosted.chromium === "PASS_WITH_ALLOWLISTED_ENGINE_SKIP") {
    errors.push("HOSTED_PASS_DISHONEST");
  }
  // WebKit honesty: the LEGIT Hanzi Builder skip stays narrow and named.
  const allow = j(src.skipAllowlist);
  const entry = (allow?.entries ?? []).find((e) => e.file === WEBKIT_SKIP.file && /clear/.test(e.snippet ?? "") && /rebuild/.test(e.snippet ?? ""));
  const spec = src.builderSpec ?? "";
  if (
    !entry ||
    entry.classification !== "LEGIT" ||
    entry.pattern !== "test.skip" ||
    !String(entry.snippet).startsWith(WEBKIT_SKIP.narrow) ||
    !spec.includes(WEBKIT_SKIP.narrow) ||
    /test\.describe\.skip|test\.skip\(\)|\|\| true/.test(spec)
  ) {
    errors.push("WEBKIT_SKIP_WEAKENED");
  }
  if (hosted.webkit === "PASS") errors.push("WEBKIT_DISHONEST");
  if (hosted.webkitSkipPolicy !== "PASS_WITH_ALLOWLISTED_ENGINE_SKIP") errors.push("WEBKIT_DISHONEST");

  const svgChecks = ["loads", "crispness", "theme", "sideAlternation", "nodeCollision", "textCollision", "animation", "reducedMotion"];
  if (physical.status === "PASS") {
    if (physical.emulator !== false || !physical.device) errors.push("PHYSICAL_PASS_FROM_EMULATOR");
    if (!artifact.apkSha256 || physical.artifactSha256 !== artifact.apkSha256) errors.push("PHYSICAL_STALE_APK");
    for (const k of svgChecks) if (physical.svg?.[k] !== "PASS") errors.push("PHYSICAL_SVG_INCOMPLETE");
    if ((physical.audioX20Count ?? 0) < 20) errors.push("AUDIO_X20_BELOW_20");
  }
  if (physical.status !== "PASS" && (visual.JOURNEY_SVG_VISUAL_SYSTEM === "OWNER_ACCEPTED" || visual.JOURNEY_CULTURE_VISUAL_FREEZE === "OWNER_ACCEPTED")) {
    errors.push("VISUAL_FREEZE_WITHOUT_PHYSICAL");
  }
  if (visual.JOURNEY_SVG_VISUAL_SYSTEM === "OWNER_ACCEPTED" && visual.boundApkSha256 !== artifact.apkSha256) errors.push("VISUAL_FREEZE_UNBOUND");
  if (cert.journeySvgSystem !== "CODE_PASS") errors.push("SVG_SYSTEM_STATE_DISHONEST");

  // Entry.
  if (rc.entry?.PUBLIC_BETA_ENTRY !== "HOLD" || cert.entry?.PUBLIC_BETA_ENTRY !== "HOLD") errors.push("PUBLIC_BETA_GO");
  if ((rc.wave1?.invited ?? 0) > 0 || (cert.wave1?.invited ?? 0) > 0) {
    if (physical.status !== "PASS" || cert.ownerReleaseAcceptance !== "PASS") errors.push("WAVE1_INVITED_EARLY");
  }
  if ((cert.wave1?.invited ?? 0) > 10) errors.push("WAVE1_OVER_TARGET");
  if (cert.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && cert.play?.signedAab !== "BUILT") errors.push("PLAY_GO_WITHOUT_SIGNED_AAB");
  return [...new Set(errors)];
}

/* ------------------------------------------------------------------ */

export function checkAssetsGate(src) {
  return checkSvgAssets(src).errors;
}

export function checkStyleGate(src) {
  return [...new Set([...checkSvgStyle(src), ...checkThemes(src)])];
}

export function checkRegistryGate(src) {
  return checkRegistry(src);
}

export function checkLayoutGate(src) {
  return [...new Set([...checkLayout(src), ...checkRenderer(src)])];
}

export function checkAll(src) {
  return [
    ...new Set([
      ...checkAssetsGate(src),
      ...checkStyleGate(src),
      ...checkRegistryGate(src),
      ...checkLayoutGate(src),
      ...checkRelease(src),
    ]),
  ];
}
