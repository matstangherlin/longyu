#!/usr/bin/env node
/**
 * RC2.3.13R.3.2.4 — Living UI, Chinese ornamental embroidery & motion delight gate.
 *
 *   node scripts/rc2-3-13r3-2-4-living-ui-ornamental-polish.mjs assets|system|motion|budget|performance|a11y|theme|validate
 *   node scripts/rc2-3-13r3-2-4-living-ui-ornamental-polish.mjs test            # mutation kills (≥120)
 *   node scripts/rc2-3-13r3-2-4-living-ui-ornamental-polish.mjs inventory [--write]
 *   node scripts/rc2-3-13r3-2-4-living-ui-ornamental-polish.mjs digest          # evidence runtime digest
 *
 * Each mutation names the checker it targets; that checker must be clean on
 * the real sources first, so every kill proves the corruption — not a
 * pre-existing failure — fired the error.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import {
  checkA11yGate,
  checkAll,
  checkAssetsGate,
  checkBudgetGate,
  checkEvidence,
  checkMotionGate,
  checkOrnamentAssets,
  checkPerformanceGate,
  checkRelease,
  checkSystemGate,
  checkThemeGate,
  evaluateOrnamentModules,
  loadLivingUiSources,
  ORNAMENT_DIR,
  PARENT_HEAD_SHA,
  PREVIOUS_LEARNER_RUNTIME_SHA,
  runtimeDigest,
  STALE_APK_SHA256,
} from "./lib/rc2-3-13r3-2-4-living-ui-gates.mjs";
import { WEBKIT_SKIP } from "./lib/rc2-3-13r3-2-3-journey-svg-gates.mjs";

// Skip fixtures assembled at runtime: the convergence skip scanner hunts real
// skips in scripts/, and these are detector fixtures, not skips.
const SKIP_CALL = ["test", "skip("].join(".");
const DESCRIBE_SKIP = `${["test", "describe", "skip"].join(".")}();`;

const MODE = process.argv[2] ?? "validate";
const INVENTORY = "docs/release/chinese-ornamental-assets.json";
const MIN_KILLS = 120;

function report(name, errors, extra = "") {
  if (errors.length) {
    console.error(`FAIL ${name}\n${errors.map((e) => `- ${e}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}${extra}`);
}

export function buildInventory(src) {
  const evald = evaluateOrnamentModules(src);
  if (!evald.ok) throw new Error(evald.error);
  const { registry } = evald;
  return {
    schema: "longyu-chinese-ornamental-assets/1",
    wave: "RC2.3.13R.3.2.4",
    version: registry.CHINESE_ORNAMENT_PACK_VERSION,
    dir: ORNAMENT_DIR,
    maxBytes: registry.CHINESE_ORNAMENT_MAX_BYTES,
    decorative: true,
    opacityBands: registry.ORNAMENT_OPACITY,
    surfaces: [...registry.ORNAMENT_SURFACES],
    forbiddenSurfaces: [...registry.ORNAMENT_FORBIDDEN_SURFACES],
    densityPerSurface: registry.ORNAMENT_DENSITY,
    assets: registry.CHINESE_ORNAMENTS.map((entry) => {
      const text = src.files[entry.file] ?? "";
      return {
        id: entry.id,
        motif: entry.motif,
        kind: entry.kind,
        file: `${ORNAMENT_DIR}/${entry.file}`,
        viewBox: text.match(/viewBox="([^"]+)"/)?.[1] ?? null,
        aspect: entry.aspect,
        bytes: Buffer.byteLength(text, "utf8"),
        sha256: createHash("sha256").update(text).digest("hex"),
        surfaces: [...entry.surfaces],
        intensities: [...entry.intensities],
        decorative: true,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */

const clone = (src) => ({ ...src, files: { ...src.files }, users: { ...src.users } });

function replaceIn(text, from, to, label) {
  if (typeof from === "string" ? !text.includes(from) : !from.test(text)) {
    throw new Error(`MUTATION_SOURCE_MISSING ${label}: ${String(from).slice(0, 90)}`);
  }
  return typeof from === "string" ? text.split(from).join(to) : text.replace(from, to);
}

function m(base, key, from, to) {
  const next = clone(base);
  next[key] = replaceIn(String(base[key] ?? ""), from, to, key);
  return next;
}

function mf(base, file, from, to) {
  const next = clone(base);
  next.files[file] = replaceIn(base.files[file], from, to, file);
  return next;
}

function mu(base, file, from, to) {
  const next = clone(base);
  next.users[file] = replaceIn(base.users[file], from, to, file);
  return next;
}

function withJson(base, key, fn) {
  const next = clone(base);
  const obj = JSON.parse(base[key]);
  fn(obj);
  next[key] = JSON.stringify(obj, null, 2);
  return next;
}

const K = "ornament-knot-divider.svg";
const X = "ornament-xiangyun-corner.svg";

function cases(base) {
  const A = checkAssetsGate;
  const S = checkSystemGate;
  const M = checkMotionGate;
  const B = checkBudgetGate;
  const P = checkPerformanceGate;
  const Y = checkA11yGate;
  const T = checkThemeGate;
  const E = checkEvidence;
  const R = checkRelease;
  const del = (file) => () => {
    const next = clone(base);
    delete next.files[file];
    return next;
  };
  const row = (name, fn) => () => withJson(base, "evidence", (o) => fn(o.rows.find((r) => r.name === name)));
  const allRows = (fn) => () => withJson(base, "evidence", (o) => o.rows.forEach(fn));
  const cert = (fn) => () => withJson(base, "cert", fn);
  return [
    // ── 1 Ornament assets ─────────────────────────────────────────────
    ["ornament missing asset", "ORNAMENT_ASSET_MISSING", S, del(K)],
    ["external SVG href", "ORNAMENT_EXTERNAL_REF", A, () => mf(base, K, '<path class="lyo-f-wash"', '<path href="https://x.test/a.svg" class="lyo-f-wash"')],
    ["external url() in palette", "ORNAMENT_EXTERNAL_REF", A, () => mf(base, K, "<style>", "<style>.x{background:url(https://x.test/a.png)}")],
    ["embedded raster image", "ORNAMENT_EMBEDDED_RASTER", A, () => mf(base, K, "</svg>", '<image width="1" height="1"/></svg>')],
    ["embedded data URI", "ORNAMENT_EMBEDDED_RASTER", A, () => mf(base, K, '<path class="lyo-f-wash"', '<path data-x="data:image/png;base64,AAAA" class="lyo-f-wash"')],
    ["script in asset", "ORNAMENT_SCRIPT", A, () => mf(base, K, "</svg>", "<script>alert(1)</script></svg>")],
    ["foreignObject in asset", "ORNAMENT_FOREIGN_OBJECT", A, () => mf(base, K, "</svg>", "<foreignObject></foreignObject></svg>")],
    ["missing viewBox", "ORNAMENT_MISSING_VIEWBOX", A, () => mf(base, K, 'viewBox="0 0 240 32" ', "")],
    ["oversize asset", "ORNAMENT_OVERSIZE", A, () => mf(base, K, "</svg>", `<path class="lyo-s-thread" d="${"M0 0L1 1".repeat(1200)}"/></svg>`)],
    ["asset parse error", "ORNAMENT_PARSE_FAILED", A, () => mf(base, K, "</svg>", "<g></svg>")],
    ["embedded font", "ORNAMENT_EMBEDDED_FONT", A, () => mf(base, K, "<style>", "<style>.f{font-family:serif}")],
    ["text glyph in asset", "ORNAMENT_TEXT", A, () => mf(base, K, "</svg>", "<text>福</text></svg>")],
    ["SMIL loop in asset", "ORNAMENT_SMIL", A, () => mf(base, K, "</svg>", '<animate attributeName="opacity"/></svg>')],
    ["comment in asset", "ORNAMENT_COMMENT_OR_PROLOG", A, () => mf(base, K, "</svg>", "<!-- note --></svg>")],
    ["id in asset", "ORNAMENT_HAS_IDS", A, () => mf(base, K, '<path class="lyo-f-wash"', '<path id="w" class="lyo-f-wash"')],
    ["event handler in asset", "ORNAMENT_EVENT_HANDLER", A, () => mf(base, K, '<path class="lyo-f-wash"', '<path onclick="x()" class="lyo-f-wash"')],
    ["opaque root fill", "ORNAMENT_NOT_TRANSPARENT", A, () => mf(base, K, 'height="32" fill="none"', 'height="32" fill="#fff"')],
    ["background rect", "ORNAMENT_NOT_TRANSPARENT", A, () => mf(base, K, "</style>", '</style><rect class="lyo-f-wash" width="240" height="32"/>')],
    ["data-lyo id mismatch", "ORNAMENT_ID_MISMATCH", A, () => mf(base, K, 'data-lyo-ornament="knot-divider"', 'data-lyo-ornament="knot"')],
    ["unknown role class", "ORNAMENT_UNKNOWN_ROLE", A, () => mf(base, K, '<path class="lyo-f-wash"', '<path class="lyo-f-neon"')],
    ["hard-coded stroke color", "ORNAMENT_HARDCODED_COLOR", A, () => mf(base, K, '<path class="lyo-f-wash"', '<path stroke="#c00" class="lyo-f-wash"')],
    ["standalone palette drift", "ORNAMENT_PALETTE_DRIFT", A, () => mf(base, K, ".lyo-f-knot{fill:rgb(138 90 23 / 0.86)}", ".lyo-f-knot{fill:rgb(138 90 23 / 0.5)}")],
    ["library shrunk below 10", "ORNAMENT_LIBRARY_SIZE", A, () => {
      const next = clone(base);
      for (const f of Object.keys(next.files).slice(0, 4)) delete next.files[f];
      return next;
    }],
    ["bad asset file name", "ORNAMENT_FILE_NAME", A, () => {
      const next = clone(base);
      next.files["Ornament_Knot.svg"] = next.files[K];
      return next;
    }],
    ["forbidden element (mask)", "ORNAMENT_FORBIDDEN_ELEMENT", A, () => mf(base, K, "</svg>", "<mask></mask></svg>")],

    // ── 2 Ornament system ─────────────────────────────────────────────
    ["registry id duplicated", "ORNAMENT_REGISTRY_DRIFT", S, () => m(base, "registry", '  "roof-eave",\n  "bamboo-corner",', '  "roof-eave",\n  "roof-eave",')],
    ["unregistered asset", "ORNAMENT_UNREGISTERED", S, () => {
      const next = clone(base);
      next.files["ornament-lotus-corner.svg"] = next.files[K].replace('data-lyo-ornament="knot-divider"', 'data-lyo-ornament="lotus-corner"');
      return next;
    }],
    ["ornament stretched (aspect)", "ORNAMENT_STRETCHED", S, () => m(base, "registry", 'ornament("knot-divider", "knot", "divider", 7.5,', 'ornament("knot-divider", "knot", "divider", 4,')],
    ["ornament deformed (preserveAspectRatio none)", "ORNAMENT_STRETCHED", S, () => m(base, "markup", 'preserveAspectRatio="xMidYMid meet"', 'preserveAspectRatio="none"')],
    ["unknown surface in registry", "ORNAMENT_SURFACE_UNKNOWN", S, () => m(base, "registry", '["home-continue", "culture-topic-hero", "qa-gallery"]', '["home-continue", "settings-page", "qa-gallery"]')],
    ["milestone opacity too strong", "ORNAMENT_OPACITY_BAND", S, () => m(base, "registry", "  milestone: 0.55,", "  milestone: 0.9,")],
    ["subtle opacity too strong", "ORNAMENT_OPACITY_BAND", S, () => m(base, "registry", "  subtle: 0.16,", "  subtle: 0.4,")],
    ["CSS intensity drifts from registry", "ORNAMENT_OPACITY_BAND", S, () => m(base, "css", '.lyo[data-intensity="milestone"] {\n  opacity: 0.55;', '.lyo[data-intensity="milestone"] {\n  opacity: 0.95;')],
    ["density budget inflated", "ORNAMENT_DENSITY_BUDGET", S, () => m(base, "registry", '  "journey-milestone": 1,', '  "journey-milestone": 9,')],
    ["forbidden surface dropped", "ORNAMENT_FORBIDDEN_SURFACE", S, () => m(base, "registry", '  "answer-option",\n', "")],
    ["frame motif mapped to divider", "FRAME_MOTIF_UNMAPPED", S, () => m(base, "registry", '  huiwen: "huiwen-frame",', '  huiwen: "huiwen-strip",')],
    ["unsafe markup accepted", "ORNAMENT_UNSAFE_MARKUP_ACCEPTED", S, () => m(base, "markup", "  if (!isSceneMarkupSafe(raw)) return null;\n", "")],
    ["ids accepted into the page", "ORNAMENT_UNSAFE_MARKUP_ACCEPTED", S, () => m(base, "markup", '  if (/\\sid="/.test(raw)) return null;\n', "")],
    ["ornament announced (markup)", "ORNAMENT_ANNOUNCED", S, () => m(base, "markup", ' aria-hidden="true" focusable', " focusable")],
    ["ornament focusable (markup)", "ORNAMENT_FOCUSABLE", S, () => m(base, "markup", 'focusable="false"', 'focusable="true"')],
    ["standalone palette leaks", "ORNAMENT_PALETTE_LEAKS", S, () => m(base, "markup", "  const body = withoutStandalonePalette(raw);", "  const body = raw;")],
    ["intrinsic size kept", "ORNAMENT_FIXED_SIZE", S, () => m(base, "markup", "(?:width|height|aria-hidden", "(?:aria-hidden")],
    ["regex sanitizing", "ORNAMENT_REGEX_SANITIZING", S, () => m(base, "markup", "  return body\n", '  return body\n    .replace(/<script[^>]*>/g, "")\n')],
    ["sanitizer forked", "ORNAMENT_SANITIZER_FORKED", S, () => m(base, "markup", "if (!isSceneMarkupSafe(raw)) return null;", "if (/<script/.test(raw)) return null;")],
    ["frame announced", "ORNAMENT_ANNOUNCED", S, () => m(base, "frame", '      aria-hidden="true"\n', "\n")],
    ["corner focusable", "ORNAMENT_FOCUSABLE", S, () => m(base, "corner", '      aria-hidden="true"\n', '      aria-hidden="true"\n      tabIndex={0}\n')],
    ["divider exposed as image", "ORNAMENT_FOCUSABLE", S, () => m(base, "divider", '      aria-hidden="true"\n', '      aria-hidden="true"\n      role="img"\n')],
    ["raw markup rendered", "ORNAMENT_UNPREPARED_MARKUP", S, () => m(base, "ornament", "dangerouslySetInnerHTML={{ __html: markup }}", "dangerouslySetInnerHTML={{ __html: raw }}")],
    // RC2.3.13R.3.2.6 — anchor moved: the frame's last prop is now `level` (frame levels).
    ["frame wraps content", "ORNAMENT_WRAPS_CONTENT", S, () => m(base, "frame", '  level = "embroidered",\n}: {', '  level = "embroidered",\n  children,\n}: {\n  children?: React.ReactNode;')],
    ["ornaments fetched at runtime", "ORNAMENT_NOT_BUNDLED", S, () => m(base, "ornament", "  eager: true,", "  eager: false,")],
    ["network ornament", "ORNAMENT_EXTERNAL_REF", S, () => m(base, "ornament", "  const markup = ornamentMarkupFor(id);", '  void fetch("https://cdn.x/o.svg");\n  const markup = ornamentMarkupFor(id);')],
    ["frame changes layout size", "ORNAMENT_FRAME_CHANGES_LAYOUT", S, () => m(base, "css", ".lyo-frame {\n  position: absolute;", ".lyo-frame {\n  position: relative;")],
    ["corner motif changes layout", "ORNAMENT_FRAME_CHANGES_LAYOUT", S, () => m(base, "css", ".lyo-corner-motif {\n  position: absolute;", ".lyo-corner-motif {\n  position: static;")],
    ["divider height not reserved", "ORNAMENT_DIVIDER_SHIFTS_LAYOUT", S, () => m(base, "css", "  height: 12px;\n  width: 100%;", "  width: 100%;")],
    ["ornaments take taps", "ORNAMENT_INTERACTIVE", S, () => m(base, "css", "  --lyo-stitch-a: 0.8;\n  pointer-events: none;", "  --lyo-stitch-a: 0.8;\n  pointer-events: auto;")],
    ["border obscures content (huge corner)", "ORNAMENT_OBSCURES_CONTENT", S, () => m(base, "css", "--lyo-corner-size: 48px;", "--lyo-corner-size: 96px;")],
    ["every topic card ornamented", "ORNAMENT_EVERY_CARD", S, () => m(base, "cultureCard", '      <div className="flex items-start gap-2.5">', '      <ChineseCornerMotif motif="plum" surface="home-continue" />\n      <div className="flex items-start gap-2.5">')],
    ["every Button ornamented", "ORNAMENT_EVERY_CARD", S, () => m(base, "primitives", "      {loading && (", '      <ChineseOrnamentalDivider motif="knot" surface="victory" />\n      {loading && (')],
    ["ornament on an unlisted surface file", "ORNAMENT_SURFACE_FORBIDDEN", S, () => {
      const next = clone(base);
      next.users["src/features/settings/SettingsPage.tsx"] = '<div className="relative isolate"><ChineseCornerMotif motif="plum" surface="home-continue" /></div>';
      return next;
    }],
    ["host uses another host's surface", "ORNAMENT_SURFACE_FORBIDDEN", S, () => mu(base, "src/features/journey/HomeCognitiveBlocks.tsx", 'surface="home-continue"', 'surface="victory"')],
    ["asset not allowed on surface", "ORNAMENT_SURFACE_NOT_ALLOWED_FOR_ASSET", S, () => mu(base, "src/features/journey/HomeCognitiveBlocks.tsx", 'motif="plum" corner="top-right"', 'motif="bamboo" corner="top-right"')],
    ["intensity not allowed for asset", "ORNAMENT_INTENSITY_NOT_ALLOWED", S, () => mu(base, "src/components/progression/ProgressionShell.tsx", 'motif="lattice" intensity="medium"', 'motif="lattice" intensity="milestone"')],
    ["density exceeded on a surface", "ORNAMENT_DENSITY_EXCEEDED", S, () => mu(base, "src/features/journey/JourneyPage.tsx", '<ChineseOrnamentalFrame motif="huiwen"', '<ChineseOrnamentalFrame motif="huiwen" intensity="subtle" surface="journey-milestone" />\n          <ChineseOrnamentalFrame motif="huiwen"')],
    ["host not isolated", "ORNAMENT_HOST_NOT_ISOLATED", S, () => mu(base, "src/features/culture/CultureTopicDetailPage.tsx", '"relative isolate space-y-2', '"relative space-y-2')],

    // ── 3 Living UI motion ────────────────────────────────────────────
    ["instant token too short", "MOTION_TOKEN_OUT_OF_BAND", M, () => m(base, "livingUiMotion", "  instant: 80,", "  instant: 40,")],
    ["emphasis token too long", "MOTION_TOKEN_OUT_OF_BAND", M, () => m(base, "livingUiMotion", "  emphasis: 280,", "  emphasis: 600,")],
    ["celebration too long", "CELEBRATION_TOO_LONG", M, () => m(base, "livingUiMotion", "  celebrate: 1100,", "  celebrate: 2500,")],
    ["TS and CSS tokens drift", "MOTION_TOKEN_DRIFT", M, () => m(base, "livingUiMotion", "  fast: 140,", "  fast: 150,")],
    ["ambient token too fast", "MOTION_TOKEN_OUT_OF_BAND", M, () => m(base, "css", "--motion-ambient: 7s;", "--motion-ambient: 2s;")],
    ["current-node pulse too fast", "CURRENT_NODE_PULSE_TOO_FAST", M, () => m(base, "css", "--motion-ambient-current: 5s;", "--motion-ambient-current: 1.2s;")],
    ["ambient easing role missing", "EASING_ROLE_MISSING", M, () => m(base, "css", "  --ease-ambient: cubic-bezier(0.37, 0, 0.63, 1);\n", "")],
    ["arbitrary raw duration", "ARBITRARY_DURATION", M, () => m(base, "css", "  animation: living-enter-up var(--motion-normal) var(--ease-enter) both;", "  animation: living-enter-up 720ms var(--ease-enter) both;")],
    ["arbitrary long transition", "ARBITRARY_LONG_TRANSITION", M, () => m(base, "css", "  animation: living-enter-up var(--motion-normal) var(--ease-enter) both;", "  animation: living-enter-up calc(var(--motion-emphasis) * 8) var(--ease-enter) both;")],
    ["entrance loops forever", "AMBIENT_OUTSIDE_BUDGET", M, () => m(base, "css", "  animation: living-enter-up var(--motion-normal) var(--ease-enter) both;", "  animation: living-enter-up var(--motion-normal) var(--ease-enter) infinite;")],
    ["ten simultaneous ambient loops (halo outside budget)", "AMBIENT_OUTSIDE_BUDGET", M, () => m(base, "css", '.living-halo[data-ambient="run"] {', ".living-halo {")],
    ["burst outlasts the celebration", "CELEBRATION_TOO_LONG", M, () => m(base, "css", "calc(var(--motion-emphasis) * 2) var(--ease-enter) var(--motion-normal) both", "calc(var(--motion-emphasis) * 4) var(--ease-enter) var(--motion-normal) both")],
    ["infinite confetti", "INFINITE_CONFETTI", M, () => m(base, "css", "var(--petal-delay, 0ms) both;", "var(--petal-delay, 0ms) infinite;")],
    ["too many particles", "INFINITE_CONFETTI", M, () => m(base, "livingUiMotion", "export const COMPLETION_PARTICLES = 6;", "export const COMPLETION_PARTICLES = 24;")],
    ["reduced motion ignored (halo)", "REDUCED_MOTION_IGNORED", M, () => m(base, "css", "  .living-halo,\n  .lyo-frame", "  .lyo-frame")],
    ["reduced motion ignored (modal)", "REDUCED_MOTION_IGNORED", M, () => m(base, "css", "  :where(.living-overlay) > :where(*) {\n    animation-name: living-fade-in;", "  :where(.living-overlay) > :where(*) {\n    animation-name: living-sheet-in;")],
    ["reduced-motion block removed", "REDUCED_MOTION_IGNORED", M, () => m(base, "css", "@media (prefers-reduced-motion: reduce) {\n  /* Living UI", "@media (min-width: 1px) {\n  /* Living UI")],
    ["Living UI block hoisted above the first reduced block", "REDUCED_MOTION_BLOCK_REORDERED", M, () => m(base, "css", "@tailwind base;", "/* RC2.3.13R.3.2.4 — Living UI */\n@tailwind base;")],
    ["business on animationend", "BUSINESS_ON_ANIMATION_END", M, () => m(base, "completionBurst", '      data-testid="completion-burst"', '      data-testid="completion-burst"\n      onAnimationEnd={() => undefined}')],
    ["animation callback grants reward", "MOTION_TOUCHES_BUSINESS", M, () => m(base, "completionBurst", 'import type { CSSProperties } from "react";', 'import type { CSSProperties } from "react";\nimport { claimReward } from "../../lib/store";\nvoid claimReward;')],
    ["completion animation reports completion", "BUSINESS_ON_ANIMATION_END", M, () => m(base, "completionBurst", "export function CompletionBurst({ play }: { play: boolean }) {", "export function CompletionBurst({ play }: { play: boolean; onDone?: () => void }) {")],
    ["audio remounted by animation", "AUDIO_REMOUNT_BY_MOTION", M, () => m(base, "speakButton", "    <button\n      type=\"button\"", "    <button\n      key={String(playing)}\n      type=\"button\"")],
    ["motion restarts audio", "AUDIO_REMOUNT_BY_MOTION", M, () => m(base, "animatedCounter", 'import { useValueDelta } from "../../lib/motion/valueDelta";', 'import { useValueDelta } from "../../lib/motion/valueDelta";\nimport { cancelAllMandarinSpeech } from "../../lib/mandarinSpeech";\nvoid cancelAllMandarinSpeech;')],
    ["motion timer gates state", "MOTION_TIMER_GATES_STATE", M, () => m(base, "progressFill", "    // Let the old value paint first so the move starts from it.", "    setTimeout(() => setShown(target), 400);\n    // Let the old value paint first so the move starts from it.")],
    ["haptic from a counter", "MOTION_TOUCHES_BUSINESS", M, () => m(base, "animatedCounter", 'import { useValueDelta } from "../../lib/motion/valueDelta";', 'import { useValueDelta } from "../../lib/motion/valueDelta";\nimport { haptic } from "../../lib/haptics";\nvoid haptic;')],
    ["button motion blocks click", "MOTION_BLOCKS_INPUT", M, () => m(base, "css", "[data-button-variant]:active:not(:disabled) {\n  transition-duration: var(--motion-instant);", "[data-button-variant]:active:not(:disabled) {\n  pointer-events: none;\n  transition-duration: var(--motion-instant);")],
    ["modal unclickable during animation", "MOTION_BLOCKS_INPUT", M, () => m(base, "css", ":where(.living-overlay) {\n  animation:", ".living-overlay {\n  pointer-events: none;\n}\n:where(.living-overlay) {\n  animation:")],
    ["modal motion removed", "MODAL_MOTION_UNSTANDARDIZED", M, () => m(base, "modal", '"living-overlay fixed inset-0', '"fixed inset-0')],
    ["modal motion overrides panels", "MODAL_MOTION_OVERRIDES_PANELS", M, () => m(base, "css", ":where(.living-overlay) > :where(*) {\n  animation: living-sheet-in", ".living-overlay > * {\n  animation: living-sheet-in")],
    ["disabled control fakes a press", "DISABLED_FAKE_PRESS", M, () => m(base, "css", "/* ---- Counters (XP", "[data-button-variant]:disabled:active {\n  transform: scale(0.97);\n}\n\n/* ---- Counters (XP")],
    ["button motion unstandardized", "BUTTON_MOTION_UNSTANDARDIZED", M, () => m(base, "css", "[data-button-variant]:active:not(:disabled) {", "[data-button-variant]:hover {")],
    ["current node aggressive bounce", "CURRENT_NODE_AGGRESSIVE_BOUNCE", M, () => m(base, "css", "    transform: scale(1.025);", "    transform: scale(1.2);")],
    ["current node halo flashes", "CURRENT_NODE_AGGRESSIVE_BOUNCE", M, () => m(base, "css", "    opacity: 0.55;\n    transform: scale(1.025);", "    opacity: 1;\n    transform: scale(1.025);")],
    ["current node bubble bounces", "CURRENT_NODE_AGGRESSIVE_BOUNCE", M, () => m(base, "bubble", '"relative flex items-center justify-center rounded-full border-2 transition active:scale-95",', '"relative flex items-center justify-center rounded-full border-2 transition active:scale-95 animate-bounce",')],
    ["halo loop no longer budget-gated", "CURRENT_NODE_AGGRESSIVE_BOUNCE", M, () => m(base, "css", '.living-halo[data-ambient="run"] {\n  animation: living-halo-breathe', '.living-halo[data-ambient="rest"] {\n  animation: living-halo-breathe')],
    ["aggressive wrong shake", "AGGRESSIVE_WRONG_SHAKE", M, () => m(base, "css", "  30% { transform: translateX(-3px); }", "  30% { transform: translateX(-8px); }")],
    ["step transition flashes blank", "STEP_BLANK_FRAME", M, () => m(base, "css", "  from {\n    opacity: 0.4;\n    transform: translateX(10px);", "  from {\n    opacity: 0;\n    transform: translateX(10px);")],
    ["answer selection feedback removed", "ANSWER_SELECTION_FEEDBACK_MISSING", M, () => m(base, "css", '[data-option-index][data-selected="true"] {\n  animation: living-select-press', '[data-option-index][data-selected="true"] {\n  animation: none; --x: living-select-press')],
    ["verdict shown before the result", "VERDICT_BEFORE_RESULT", M, () => m(base, "css", '[data-option-index][data-selected="true"] {\n  animation: living-select-press var(--motion-fast) var(--ease-standard);', '[data-option-index][data-selected="true"] {\n  animation: living-select-press var(--motion-fast) var(--ease-standard);\n  --shake: longyu-error-shake;')],
    ["segment indicator snaps", "SEGMENT_INDICATOR_SNAPS", M, () => m(base, "shell", 'thumbMode === "culture" ?', 'mode === "culture" ?')],
    ["segment slide never recorded", "SEGMENT_INDICATOR_SNAPS", M, () => m(base, "shell", "      thumbSlideFrom = mode;\n", "")],
    ["segment indicator overshoots", "SEGMENT_INDICATOR_OVERSHOOT", M, () => m(base, "css", '[data-motion="segment-indicator"] {\n  transition-duration: var(--motion-normal);', '[data-motion="segment-indicator"] {\n  transition-duration: var(--motion-normal);\n  transition-timing-function: var(--ease-spring);')],
    ["counter animates every render", "COUNTER_ANIMATES_EVERY_RENDER", M, () => m(base, "valueDelta", "previous === next) return null;", "Number.isNaN(next)) return null;")],
    ["XP counter animates on mount", "COUNTER_ANIMATES_ON_MOUNT", M, () => m(base, "valueDelta", "if (previous === undefined || !Number.isFinite(previous) || previous === next) return null;", "if (previous === next) return null;\n  if (previous === undefined) return \"up\";")],
    ["counter delta lost", "COUNTER_DELTA_LOST", M, () => m(base, "valueDelta", "    if (direction) setDelta((current) => ({ key: current.key + 1, direction }));", "    void direction;")],
    ["counter effect runs every render", "COUNTER_ANIMATES_EVERY_RENDER", M, () => m(base, "animatedCounter", "    if (!key || !el || typeof el.animate !== \"function\") return;", "    if (!el || typeof el.animate !== \"function\") return;")],
    ["progress replays from zero", "PROGRESS_REPLAYS_FROM_ZERO", M, () => m(base, "progressFill", "  const [shown, setShown] = useState(start.current);", "  const [shown, setShown] = useState(0);")],
    ["progress always transitions", "PROGRESS_REPLAYS_FROM_ZERO", M, () => m(base, "progressFill", "  const [animate, setAnimate] = useState(false);", "  const [animate, setAnimate] = useState(true);")],
    ["progress delta lost", "PROGRESS_DELTA_LOST", M, () => m(base, "progressFill", "    const frame = requestAnimationFrame(() => setShown(target));", "    const frame = requestAnimationFrame(() => undefined);")],
    ["progress bar back to width transitions", "PROGRESS_REPLAYS_FROM_ZERO", M, () => m(base, "primitives", "      <ProgressFill\n", '      <div className="transition-[width]" />\n      <Progress\n')],
    ["TopBar counters lose deltas", "TOPBAR_DELTA_MISSING", M, () => m(base, "topBar", 'delta={{ id: "topbar-streak", value: streak }}', "")],
    ["XP counts every open", "XP_COUNTS_EVERY_OPEN", M, () => m(base, "victory", "if (reducedMotion || !firstShow) {", "if (reducedMotion) {")],
    ["completion burst replays on reopen", "COMPLETION_REPLAYS", M, () => m(base, "victory", "<CompletionBurst play={firstShow && !reducedMotion} />", "<CompletionBurst play />")],

    // ── 4 Ambient budget ──────────────────────────────────────────────
    ["budget raised to 10", "AMBIENT_BUDGET_EXCEEDED", B, () => m(base, "livingUiMotion", "export const MAX_VISIBLE_AMBIENT_ANIMATIONS = 4;", "export const MAX_VISIBLE_AMBIENT_ANIMATIONS = 10;")],
    ["allocation ignores the cap", "AMBIENT_BUDGET_EXCEEDED", B, () => m(base, "ambientBudget", "      .slice(0, max)\n", "")],
    ["allocation priority inverted", "AMBIENT_PRIORITY_INVERTED", B, () => m(base, "ambientBudget", "a.priority - b.priority || a.id - b.id", "b.priority - a.priority || a.id - b.id")],
    ["priority constants inverted", "AMBIENT_PRIORITY_INVERTED", B, () => m(base, "livingUiMotion", "  ornament: 3,", "  ornament: 1,")],
    ["ambient continues offscreen", "AMBIENT_RUNS_OFFSCREEN", B, () => m(base, "ambientBudget", "      .filter((candidate) => candidate.visible)\n", "")],
    ["no near-viewport margin", "AMBIENT_RUNS_OFFSCREEN", B, () => m(base, "ambientBudget", "{ rootMargin: NEAR_VIEWPORT, threshold: 0 }", "{ threshold: 0 }")],
    ["visibility never updated", "AMBIENT_RUNS_OFFSCREEN", B, () => m(base, "ambientBudget", "          if (entry) entry.visible = record.isIntersecting;", "          void entry;")],
    ["background app keeps looping", "AMBIENT_RUNS_WHILE_HIDDEN", B, () => m(base, "ambientBudget", "const paused = documentHidden() || prefersReducedMotion();", "const paused = prefersReducedMotion();")],
    ["scheduler waits on a frame only (no timer backup)", "AMBIENT_STALE_WITHOUT_FRAMES", B, () => m(base, "ambientBudget", "  fallback = setTimeout(apply, hidden ? 0 : APPLY_FALLBACK_MS);\n", "")],
    ["timer only when already hidden (R.3.2.4 scheduler)", "AMBIENT_STALE_WITHOUT_FRAMES", B, () => m(base, "ambientBudget", "fallback = setTimeout(apply, hidden ? 0 : APPLY_FALLBACK_MS);", "if (hidden) fallback = setTimeout(apply, 0);")],
    ["applied schedule never released", "AMBIENT_RUNS_WHILE_HIDDEN", B, () => m(base, "ambientBudget", "function apply(): void {\n  scheduled = false;", "function apply(): void {")],
    ["no visibilitychange listener", "AMBIENT_RUNS_WHILE_HIDDEN", B, () => m(base, "ambientBudget", '  document.addEventListener("visibilitychange", schedule);\n', "")],
    ["pause flag ignored by allocation", "AMBIENT_RUNS_WHILE_HIDDEN", B, () => m(base, "ambientBudget", "  if (paused || max <= 0) return new Set();", "  if (max <= 0) return new Set();")],
    ["reduced-motion changes ignored", "REDUCED_MOTION_IGNORED", B, () => m(base, "ambientBudget", "  subscribeReducedMotion(schedule);\n", "")],
    ["halo not registered", "AMBIENT_LOOP_UNREGISTERED", B, () => m(base, "bubble", '  useAmbientMotion(ref, "currentNode");\n', "")],
    ["scene drift not registered", "AMBIENT_LOOP_UNREGISTERED", B, () => m(base, "journeyScene", '  useAmbientMotion(driftRef, "scene", markup !== null);\n', "")],
    ["lane ornament drift not registered", "AMBIENT_LOOP_UNREGISTERED", B, () => m(base, "symbolicOrnaments", '  useAmbientMotion(ref, "ornament", profile !== "still");\n', "")],
    ["mascot blink outside the budget", "AMBIENT_LOOP_UNREGISTERED", B, () => m(base, "mascot", '  useAmbientMotion(blinkRef, "mascot", showBlink);\n', "")],
    ["chest glow outside the budget", "AMBIENT_LOOP_UNREGISTERED", B, () => m(base, "chest", "        ref={glowRef}\n", "")],
    ["typing caret blinks offscreen", "AMBIENT_LOOP_UNREGISTERED", B, () => m(base, "guide", "              <TypingCaret />", '              <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-accent align-middle" />')],
    ["global pause rule removed", "AMBIENT_BUDGET_EXCEEDED", B, () => m(base, "css", "  animation-play-state: paused !important;", "  animation-play-state: running;")],
    ["scene drift back outside the band", "AMBIENT_OUT_OF_BAND", B, () => m(base, "css", "animation: journey-scene-drift var(--motion-ambient-slow)", "animation: journey-scene-drift 30s")],
    ["evidence: ten loops on screen", "AMBIENT_BUDGET_EXCEEDED", B, row("390x844-light", (r) => (r.maxRunningAmbient = 10))],
    ["evidence: loops offscreen", "AMBIENT_RUNS_OFFSCREEN", B, row("390x844-light", (r) => (r.offscreenRunning = 3))],
    ["evidence: loops while hidden", "AMBIENT_RUNS_WHILE_HIDDEN", B, row("390x844-light", (r) => (r.hiddenRunning = 2))],
    ["evidence: loops under reduced motion", "REDUCED_MOTION_IGNORED", B, row("390x844-reduced-motion", (r) => (r.maxRunningAmbient = 1))],

    // ── 5 Performance ─────────────────────────────────────────────────
    ["height animation (layout jank)", "LAYOUT_PROPERTY_ANIMATION", P, () => m(base, "css", "@keyframes living-snap {\n  from {\n    transform: scale(0.9);", "@keyframes living-snap {\n  from {\n    height: 0;\n    transform: scale(0.9);")],
    ["top/left continuous animation", "LAYOUT_PROPERTY_ANIMATION", P, () => m(base, "css", "@keyframes living-rec-bar {\n  0%,\n  100% {\n    transform: scaleY(0.4);", "@keyframes living-rec-bar {\n  0%,\n  100% {\n    top: 2px;\n    left: 1px;\n    transform: scaleY(0.4);")],
    ["transition: all", "LAYOUT_PROPERTY_ANIMATION", P, () => m(base, "css", ".living-press {\n  transition: transform var(--motion-instant)", ".living-press {\n  transition: all var(--motion-instant)")],
    ["blur animation", "HEAVY_FILTER_ANIMATION", P, () => m(base, "css", "@keyframes living-check-pop {\n  from {\n    opacity: 0;", "@keyframes living-check-pop {\n  from {\n    filter: blur(4px);\n    opacity: 0;")],
    ["box-shadow pulse", "HEAVY_FILTER_ANIMATION", P, () => m(base, "css", "@keyframes living-audio-breathe {\n  0%,\n  100% {\n    opacity: 0.25;", "@keyframes living-audio-breathe {\n  0%,\n  100% {\n    box-shadow: 0 0 12px red;\n    opacity: 0.25;")],
    ["scroll handler re-renders", "SCROLL_HANDLER_RERENDER", P, () => m(base, "ambientBudget", '  document.addEventListener("visibilitychange", schedule);', '  document.addEventListener("visibilitychange", schedule);\n  window.addEventListener("scroll", schedule);')],
    ["one observer per element", "OBSERVER_PER_ELEMENT", P, () => m(base, "ambientBudget", "  observer?.observe(el);", "  new IntersectionObserver(() => schedule()).observe(el);")],
    ["ambient manager drives React state", "SCROLL_HANDLER_RERENDER", P, () => m(base, "ambientBudget", 'import { useEffect, type RefObject } from "react";', 'import { useEffect, useState, type RefObject } from "react";\nvoid useState;')],
    ["parallax via scroll state in scenes", "SCROLL_HANDLER_RERENDER", P, () => m(base, "journeyScene", "  const driftRef = useRef<HTMLDivElement>(null);", '  const driftRef = useRef<HTMLDivElement>(null);\n  useEffect(() => { window.addEventListener("scroll", () => setReveal("done")); }, []);')],
    ["WAAPI without fallback", "UNSUPPORTED_API_NO_FALLBACK", P, () => m(base, "animatedCounter", '    if (!key || !el || typeof el.animate !== "function") return;', "    if (!key || !el) return;")],
    ["IntersectionObserver without fallback", "UNSUPPORTED_API_NO_FALLBACK", P, () => m(base, "ambientBudget", '  if (typeof IntersectionObserver === "function") {', "  {")],
    ["WebKit reduced-motion regression (no addListener)", "UNSUPPORTED_API_NO_FALLBACK", P, () => m(base, "livingUiMotion", "  mq.addListener?.(onChange);\n", "")],
    ["scroll timeline without @supports", "UNSUPPORTED_API_NO_FALLBACK", P, () => m(base, "css", "/* end Living UI */", ".journey-scene-reveal { animation-timeline: view(); }\n/* end Living UI */")],
    ["heavy motion library", "HEAVY_MOTION_LIBRARY", P, () => m(base, "packageJson", '"dependencies": {', '"dependencies": {\n    "framer-motion": "11.0.0",')],
    ["30-minute session too short", "PERF_SESSION_TOO_SHORT", P, () => withJson(base, "perfEvidence", (o) => (o.durationMinutes = 5))],
    ["memory runaway", "PERF_MEMORY_RUNAWAY", P, () => withJson(base, "perfEvidence", (o) => (o.heapGrowthMb = 120))],
    ["emulated session claimed physical", "PHYSICAL_PASS_FROM_EMULATOR", P, () => withJson(base, "perfEvidence", (o) => (o.physical = true))],

    // ── 6 Accessibility ───────────────────────────────────────────────
    ["motion carries correctness alone", "MOTION_CARRIES_CORRECTNESS_ALONE", Y, () => m(base, "steps", '          {correct ? t("player.correct") : t("player.almost")}\n        </div>\n        <MandarinText\n          hanzi={hanzi}\n          pinyin={pinyin}\n          meaning={meaning}\n          size="md"', '        </div>\n        <MandarinText\n          hanzi={hanzi}\n          pinyin={pinyin}\n          meaning={meaning}\n          size="md"')],
    ["recording shown by motion alone", "MOTION_CARRIES_STATE_ALONE", Y, () => m(base, "selfCompare", '          {t("player.selfCompareRecording")}\n        </p>', "        </p>")],
    ["recording bars announced", "DECORATION_ANNOUNCED", Y, () => m(base, "selfCompare", 'aria-hidden className="living-rec-bars"', 'className="living-rec-bars"')],
    ["halo announced (TalkBack noise)", "DECORATION_ANNOUNCED", Y, () => m(base, "bubble", '      aria-hidden\n      data-testid="progression-current-pulse"', '      data-testid="progression-current-pulse"')],
    ["burst announced", "DECORATION_ANNOUNCED", Y, () => m(base, "completionBurst", '      aria-hidden="true"\n      data-ornament-surface="victory"', '      data-ornament-surface="victory"')],
    ["focus order altered by a wrapper", "FOCUS_ORDER_WRAPPER", Y, () => m(base, "corner", '    </span>\n  );\n}', "      {children}\n    </span>\n  );\n}")],
    ["reduced motion hides the halo", "REDUCED_MOTION_REMOVES_STATE", Y, () => m(base, "css", "  .living-halo,\n  .lyo-frame", "  .living-halo {\n    display: none;\n  }\n  .living-halo,\n  .lyo-frame")],
    ["reduced motion drops the halo element", "REDUCED_MOTION_REMOVES_STATE", Y, () => m(base, "bubble", "      {isCurrent ? <CurrentNodeHalo /> : null}", "      {isCurrent && !reduced ? <CurrentNodeHalo /> : null}")],
    ["audio playing state carried by motion only", "REDUCED_MOTION_REMOVES_STATE", Y, () => m(base, "speakButton", 'playing ? "ring-4 ring-accent-soft" : ""', '""')],
    ["large-font corner scales with text", "LARGE_FONT_ORNAMENT_COLLISION", Y, () => m(base, "css", ".lyo[data-ornament-surface=\"journey-milestone\"] { --lyo-corner-size: 20px; }", ".lyo[data-ornament-surface=\"journey-milestone\"] { --lyo-corner-size: 3rem; }")],
    ["evidence: large-font ornament collision", "LARGE_FONT_ORNAMENT_COLLISION", Y, row("360x640-large-font", (r) => (r.decorationTextOverlap = 2))],
    ["evidence: border overlaps text", "ORNAMENT_OVERLAPS_TEXT", Y, row("390x844-light", (r) => (r.decorationTextOverlap = 1))],
    ["evidence: border obscures CTA", "ORNAMENT_OBSCURES_CTA", Y, row("360x640-light", (r) => (r.decorationCtaOverlap = 1))],
    ["evidence: focusable decoration", "DECORATION_FOCUSABLE", Y, row("390x844-light", (r) => (r.focusableDecorations = 1))],
    ["evidence: decoration announced", "DECORATION_ANNOUNCED", Y, row("390x844-dark", (r) => (r.announcedDecorations = 3))],
    ["evidence: frame resizes its host", "ORNAMENT_FRAME_CHANGES_LAYOUT", Y, row("tablet-834x1112-light", (r) => (r.frameHostSizeDelta = 4))],
    ["evidence: focus lands in decoration", "FOCUS_ORDER_WRAPPER", Y, row("desktop-1280x900-light", (r) => (r.focusInsideDecoration = 1))],
    ["evidence: reduced motion loses the halo", "REDUCED_MOTION_REMOVES_STATE", Y, row("390x844-reduced-motion", (r) => (r.haloVisible = false))],

    // ── 7 Theme / contrast ────────────────────────────────────────────
    ["dark-mode ornament invisible", "ORNAMENT_INVISIBLE_DARK", T, () => m(base, "css", "  --lyo-thread: var(--accent);\n  --lyo-stitch: var(--gold);", "  --lyo-thread: var(--surface-2);\n  --lyo-stitch: var(--gold);")],
    ["milestone ornament too faint", "ORNAMENT_INVISIBLE_LIGHT", T, () => m(base, "css", '.lyo[data-intensity="milestone"] {\n  opacity: 0.55;', '.lyo[data-intensity="milestone"] {\n  opacity: 0.05;')],
    ["locked looks like current", "STATE_AMBIGUOUS", T, () => m(base, "css", '.lyo[data-tone="muted"] {\n  --lyo-thread: var(--text-faint);', '.lyo[data-tone="muted"] {\n  --lyo-thread: var(--accent);')],
    ["completed looks like current", "STATE_AMBIGUOUS", T, () => m(base, "css", '.lyo[data-tone="gold"] {\n  --lyo-thread: var(--gold);', '.lyo[data-tone="gold"] {\n  --lyo-thread: var(--accent-strong);')],
    ["blinding gold in dark mode", "DARK_ORNAMENT_BLINDING", T, () => m(base, "css", "  --lyo-stitch-a: 0.62;", "  --lyo-stitch-a: 1;")],
    ["random foreign palette (hex)", "FOREIGN_PALETTE", T, () => m(base, "css", '.lyo[data-tone="gold"] {\n  --lyo-thread: var(--gold);', '.lyo[data-tone="gold"] {\n  --lyo-thread: #d4af37;')],
    ["role rule hard-coded", "FOREIGN_PALETTE", T, () => m(base, "css", ".lyo .lyo-s-thread-soft { stroke: rgb(var(--lyo-thread) / 0.42); }", ".lyo .lyo-s-thread-soft { stroke: rgb(212 175 55 / 0.42); }")],
    ["asset palette off-token", "FOREIGN_PALETTE", T, () => mf(base, X, ".lyo-s-stitch{stroke:rgb(138 90 23 / 0.8)}", ".lyo-s-stitch{stroke:rgb(212 175 55 / 0.8)}")],
    ["evidence: dark ornament invisible", "ORNAMENT_INVISIBLE_DARK", T, row("390x844-dark", (r) => (r.ornamentMinContrast = 1.01))],

    // ── 8 Evidence binding ────────────────────────────────────────────
    ["evidence stale after a runtime edit", "LIVING_EVIDENCE_STALE", E, () => m(base, "completionBurst", "  { x: -58, y: -6, rot: -70, delay: 140 },", "  { x: -60, y: -6, rot: -70, delay: 140 },")],
    ["evidence row missing", "LIVING_EVIDENCE_INCOMPLETE", E, () => withJson(base, "evidence", (o) => (o.rows = o.rows.filter((r) => r.name !== "360x640-large-font")))],
    ["evidence measured nothing", "LIVING_EVIDENCE_INCOMPLETE", E, row("375x667-light", (r) => (r.ornamentsMeasured = 0))],
    ["evidence: horizontal overflow", "HORIZONTAL_OVERFLOW", E, row("360x640-light", (r) => (r.horizontalOverflowPx = 6))],
    ["evidence: decoration layout shift", "DECORATION_LAYOUT_SHIFT", E, row("390x844-light", (r) => (r.decorationLayoutShift = 0.05))],
    ["evidence: burst too long", "CELEBRATION_TOO_LONG", E, () => withJson(base, "evidence", (o) => (o.burst.maxEndMs = 2400))],
    ["evidence: burst loops", "CELEBRATION_TOO_LONG", E, () => withJson(base, "evidence", (o) => (o.burst.infinite = 2))],
    ["transition queues on rapid switching", "TRANSITION_QUEUES_ON_RAPID_SWITCH", E, () => withJson(base, "evidence", (o) => (o.rapidSwitch.maxThumbAnimations = 4))],
    ["rapid switching ends on a stale page", "TRANSITION_QUEUES_ON_RAPID_SWITCH", E, () => withJson(base, "evidence", (o) => (o.rapidSwitch.finalPath = "/cultura"))],
    ["modal unclickable while entering", "MODAL_UNCLICKABLE_DURING_ANIMATION", E, () => withJson(base, "evidence", (o) => (o.modal.clickDuringEnterMs = 900))],
    ["sheet option not the hit target while entering", "MODAL_UNCLICKABLE_DURING_ANIMATION", E, () => withJson(base, "evidence", (o) => (o.modal.takesTap = false))],
    ["evidence: progress replays from zero", "PROGRESS_REPLAYS_FROM_ZERO", E, () => withJson(base, "evidence", (o) => (o.progress.replayedOnMount = true))],
    ["evidence: counters animate on mount", "COUNTER_ANIMATES_ON_MOUNT", E, () => withJson(base, "evidence", (o) => (o.counters.animatedOnMount = 2))],
    ["evidence missing", "LIVING_EVIDENCE_MISSING", E, () => ({ ...clone(base), evidence: "" })],

    // ── 9 Release honesty ─────────────────────────────────────────────
    ["learnerRuntimeSha unchanged", "LEARNER_RUNTIME_NOT_ADVANCED", R, cert((o) => (o.runtime.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["rc runtime not stamped", "LEARNER_RUNTIME_NOT_ADVANCED", R, () => withJson(base, "rc", (o) => (o.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["parent cert runtime pin stale", "PARENT_RUNTIME_PIN_STALE", R, () => withJson(base, "parentCert", (o) => (o.runtime.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["R.3.2.2 gate pin stale", "PARENT_RUNTIME_PIN_STALE", R, () => m(base, "r322Gates", /EXPECTED_LEARNER_RUNTIME_SHA =\s*"[0-9a-f]{40}"/, `EXPECTED_LEARNER_RUNTIME_SHA = "${PREVIOUS_LEARNER_RUNTIME_SHA}"`)],
    ["old APK accepted", "OLD_APK_ACCEPTED", R, cert((o) => (o.artifact.apkSha256 = STALE_APK_SHA256[0]))],
    ["prior Device-QA not stale", "OLD_APK_ACCEPTED", R, cert((o) => (o.priorDeviceQa = "CURRENT"))],
    ["red hosted source accepted", "RED_HOSTED_SOURCE_ACCEPTED", R, cert((o) => Object.assign(o.artifact, { status: "BUILT", artifactSourceSha: "a".repeat(40), learnerRuntimeSha: o.runtime.learnerRuntimeSha, apkSha256: "b".repeat(64), workflowRunId: 1, artifactId: 2 }))],
    ["hosted PASS with red Firefox", "RED_HOSTED_SOURCE_ACCEPTED", R, cert((o) => Object.assign(o.hosted, { overall: "PASS", headSha: "c".repeat(40), workflowRunIds: { ci: 1 }, releaseTruth: "PASS", security: "PASS", betaSuites: "PASS", qualityBuild: "PASS", androidFoundation: "PASS", androidRuntime: "PASS", chromium: "PASS", firefox: "FAILURE", webkit: "PASS_WITH_ALLOWLISTED_ENGINE_SKIP" }))],
    ["red parent accepted", "RED_PARENT_ACCEPTED", R, cert((o) => (o.parentHosted.overall = "FAILURE"))],
    ["physical PASS from emulator", "PHYSICAL_PASS_FROM_EMULATOR", R, cert((o) => Object.assign(o.physical, { MOTION_PHYSICAL: "PASS", emulator: true, device: "sdk_gphone64_x86_64" }))],
    ["physical PASS on a stale APK", "PHYSICAL_STALE_APK", R, cert((o) => Object.assign(o.physical, { status: "PASS", emulator: false, device: "Pixel 7", artifactSha256: STALE_APK_SHA256[1] }))],
    ["Public Beta GO", "PUBLIC_BETA_GO", R, cert((o) => (o.entry.PUBLIC_BETA_ENTRY = "GO"))],
    ["debug AAB Play-ready", "DEBUG_AAB_PLAY_READY", R, cert((o) => (o.play.debugAabPlayReady = true))],
    ["owner visual acceptance without the APK hash", "OWNER_ACCEPTANCE_WITHOUT_APK_HASH", R, cert((o) => Object.assign(o.uiFreeze, { LONGYU_UI_UX_FREEZE: "OWNER_ACCEPTED", FINAL_UI_OWNER_ACCEPTANCE: "PASS", boundApkSha256: null }))],
    ["Firefox failure hidden", "CROSS_ENGINE_FAILURE_HIDDEN", R, cert((o) => (o.crossEngine.failures = o.crossEngine.failures.filter((f) => f.engine !== "firefox")))],
    ["WebKit failure hidden", "CROSS_ENGINE_FAILURE_HIDDEN", R, cert((o) => (o.crossEngine.failures = o.crossEngine.failures.filter((f) => f.engine !== "webkit")))],
    ["Firefox reported as allowlisted skip", "FIREFOX_FAILURE_HIDDEN", R, cert((o) => (o.hosted.firefox = "PASS_WITH_ALLOWLISTED_ENGINE_SKIP"))],
    ["WebKit broad skip", "WEBKIT_BROAD_SKIP", R, () => m(base, "builderSpec", WEBKIT_SKIP.narrow, `${DESCRIBE_SKIP} ${WEBKIT_SKIP.narrow}`)],
    ["new test added to the LEGIT skip list without evidence", "NEW_SKIP_WITHOUT_EVIDENCE", R, () => withJson(base, "skipAllowlist", (o) => o.entries.push({ file: "e2e/rc2-3-13r3-2-4-living-ui.spec.ts", pattern: "test.skip", classification: "LEGIT", snippet: `${SKIP_CALL}browserName === "webkit", "motion"` }))],
    ["Living UI spec skips an engine", "FIREFOX_FAILURE_HIDDEN", R, () => m(base, "e2eSpec", 'test.describe("RC2.3.13R.3.2.4', `${SKIP_CALL}browserName === "firefox");\ntest.describe("RC2.3.13R.3.2.4`)],
    ["WebKit reported as plain PASS", "WEBKIT_DISHONEST", R, cert((o) => (o.hosted.webkit = "PASS"))],
    ["new skips counted", "NEW_SKIP_WITHOUT_EVIDENCE", R, cert((o) => (o.crossEngine.newSkips = 1))],
    ["second WebKit skip added to an already-skipping file", "NEW_SKIP_WITHOUT_EVIDENCE", R, () => withJson(base, "skipAllowlist", (o) => o.entries.push({ file: "e2e/guided-journey-culture.spec.ts", pattern: "test.skip", classification: "LEGIT", snippet: `${SKIP_CALL}browserName === "webkit", "ornaments"` }))],
    ["fingerprint forced", "FINGERPRINT_DRIFT", R, cert((o) => (o.runtime.fingerprint = "000000000000"))],
    ["freeze exception missing", "FREEZE_EXCEPTION_MISSING", R, () => m(base, "freeze", "OWNER_APPROVED_LIVING_UI_ORNAMENTAL_POLISH", "OWNER_APPROVED_SOMETHING")],
    ["economy change sneaked in", "SCOPE_CREEP", R, cert((o) => (o.scope.economyChange = true))],
    ["wrong parent", "WRONG_PARENT_PR", R, cert((o) => (o.parentHeadSha = "0".repeat(40)))],
    ["inventory stale", "INVENTORY_STALE", R, () => withJson(base, "inventory", (o) => (o.assets[0].bytes += 1))],
    ["design doc missing", "DESIGN_DOC_MISSING", R, () => ({ ...clone(base), ornamentDoc: "", motionDoc: "" })],
    ["gate not in hosted suite", "GATE_NOT_IN_HOSTED_SUITE", R, () => m(base, "suites", '      "validate:living-ui-motion",\n', "")],
    ["gate script missing", "GATE_SCRIPT_MISSING", R, () => m(base, "packageJson", '"validate:theme-ornament-contrast"', '"validate:theme-ornament-x"')],
    ["handoff DO NOT USE list incomplete", "HANDOFF_STALE_LIST_INCOMPLETE", R, () => m(base, "handoff", STALE_APK_SHA256[0], "deadbeef")],
    ["ornament system state dishonest", "SYSTEM_STATE_DISHONEST", R, cert((o) => (o.ornamentalSystem.state = "PASS"))],
    ["Owner QA GO without an APK", "OWNER_QA_WITHOUT_APK", R, cert((o) => (o.entry.OWNER_QA_ENTRY = "GO"))],
    ["Wave 1 invited early", "WAVE1_INVITED_EARLY", R, cert((o) => (o.wave1.invited = 3))],
    ["APK runtime mismatch", "APK_RUNTIME_MISMATCH", R, cert((o) => {
      Object.assign(o.hosted, { overall: "PASS", headSha: "d".repeat(40), workflowRunIds: { ci: 1 }, releaseTruth: "PASS", security: "PASS", betaSuites: "PASS", qualityBuild: "PASS", androidFoundation: "PASS", androidRuntime: "PASS", chromium: "PASS", firefox: "PASS", webkit: "PASS_WITH_ALLOWLISTED_ENGINE_SKIP" });
      Object.assign(o.artifact, { status: "BUILT", artifactSourceSha: "d".repeat(40), learnerRuntimeSha: PREVIOUS_LEARNER_RUNTIME_SHA, apkSha256: "e".repeat(64), workflowRunId: 1, artifactId: 2 });
    })],
    ["cert section missing", "CERT_SECTION_MISSING", R, cert((o) => delete o.performance)],
    ["parent head not the green #354 head", "WRONG_PARENT_PR", R, cert((o) => (o.parentHeadSha = PARENT_HEAD_SHA.replace(/^6/, "7")))],
  ];
}

function test() {
  const base = loadLivingUiSources();
  const list = cases(base);
  const baselines = new Map();
  let killed = 0;
  let n = 0;
  for (const [label, code, checker, make] of list) {
    n += 1;
    if (!baselines.has(checker)) baselines.set(checker, checker(base));
    const clean = baselines.get(checker);
    if (clean.length) {
      console.error(`BLOCKED ${n} ${label} → baseline of its checker is not clean: [${clean.join(", ")}]`);
      process.exitCode = 1;
      continue;
    }
    let mutant;
    try {
      mutant = make();
    } catch (error) {
      console.error(`MISS ${n} ${label} → ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    let errors;
    try {
      errors = checker(mutant);
    } catch (error) {
      console.error(`MISS ${n} ${label} → checker threw ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    if (!errors.includes(code)) {
      console.error(`MISS ${n} ${label} → expected ${code}, got [${errors.join(", ")}]`);
      process.exitCode = 1;
      continue;
    }
    killed += 1;
    console.log(`KILL OK ${n} ${label} → ${code}`);
  }
  if (killed < MIN_KILLS || process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-2-4-living-ui-ornamental-polish (${killed}/${list.length} kills)`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-2-4-living-ui-ornamental-polish (${killed} kills)`);
}

/* ------------------------------------------------------------------ */

const src = MODE === "test" ? null : loadLivingUiSources();
switch (MODE) {
  case "assets": {
    const { errors, stats } = checkOrnamentAssets(src);
    report("validate:chinese-ornamental-assets", errors, ` · ${JSON.stringify(stats)}`);
    break;
  }
  case "system":
    report("validate:chinese-ornamental-system", checkSystemGate(src));
    break;
  case "motion":
    report("validate:living-ui-motion", checkMotionGate(src));
    break;
  case "budget":
    report("validate:ambient-motion-budget", checkBudgetGate(src));
    break;
  case "performance":
    report("validate:motion-performance-contract", checkPerformanceGate(src));
    break;
  case "a11y":
    report("validate:ui-effect-accessibility", checkA11yGate(src));
    break;
  case "theme":
    report("validate:theme-ornament-contrast", checkThemeGate(src));
    break;
  case "validate":
    report("validate:rc2-3-13r3-2-4-living-ui-ornamental-polish", checkAll(src));
    break;
  case "test":
    test();
    break;
  case "inventory": {
    const inv = buildInventory(src);
    const text = `${JSON.stringify(inv, null, 2)}\n`;
    if (process.argv.includes("--write")) {
      fs.writeFileSync(INVENTORY, text);
      console.log(`wrote ${INVENTORY} · ${inv.assets.length} assets`);
    } else if (!fs.existsSync(INVENTORY) || fs.readFileSync(INVENTORY, "utf8") !== text) {
      console.error(`FAIL ${INVENTORY} is stale — run with --write`);
      process.exitCode = 1;
    } else console.log(`PASS ${INVENTORY}`);
    break;
  }
  case "digest":
    console.log(runtimeDigest(src));
    break;
  default:
    console.error(`unknown mode ${MODE}`);
    process.exitCode = 2;
}
