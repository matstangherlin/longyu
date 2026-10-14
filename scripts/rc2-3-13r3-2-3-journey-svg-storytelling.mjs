#!/usr/bin/env node
/**
 * RC2.3.13R.3.2.3 — Journey SVG visual storytelling gate.
 *
 *   node scripts/rc2-3-13r3-2-3-journey-svg-storytelling.mjs assets|style|registry|layout|validate
 *   node scripts/rc2-3-13r3-2-3-journey-svg-storytelling.mjs test        # mutation kills (≥80)
 *   node scripts/rc2-3-13r3-2-3-journey-svg-storytelling.mjs inventory [--write]
 *   node scripts/rc2-3-13r3-2-3-journey-svg-storytelling.mjs digest      # layout-evidence runtime digest
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import {
  checkAll,
  checkAssetsGate,
  checkLayoutGate,
  checkRegistryGate,
  checkRelease,
  checkStyleGate,
  checkSvgAssets,
  evaluateSceneModules,
  loadJourneySvgSources,
  MAX_BYTES,
  PREVIOUS_LEARNER_RUNTIME_SHA,
  runtimeDigest,
  STALE_APK_SHA256,
  VIEWBOX,
  WEBKIT_SKIP,
} from "./lib/rc2-3-13r3-2-3-journey-svg-gates.mjs";

// Weakened-skip fixtures, assembled so the convergence skip scanner (which
// hunts real skips in scripts/) never mistakes a detector fixture for a skip.
const NARROW_SKIP = WEBKIT_SKIP.narrow;
const DESCRIBE_SKIP = `${["test", "describe", "skip"].join(".")}();`;
const OR_TRUE = ["|", "| true"].join("");

const MODE = process.argv[2] ?? "validate";
const INVENTORY = "docs/release/journey-svg-assets.json";

function report(name, errors, extra = "") {
  if (errors.length) {
    console.error(`FAIL ${name}\n${errors.map((e) => `- ${e}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}${extra}`);
}

function buildInventory(src) {
  const evald = evaluateSceneModules(src);
  if (!evald.ok) throw new Error(evald.error);
  const { registry, plan: planMod } = evald;
  const plan = planMod.planJourneyScenes(planMod.journeyPlanUnits(), planMod.canonicalLessonStops);
  return {
    version: registry.JOURNEY_SCENE_PACK_VERSION,
    wave: "RC2.3.13R.3.2.3",
    viewBox: VIEWBOX,
    decorative: true,
    planDigest: plan.digest,
    sceneSlots: plan.scenes.length,
    ornamentSlots: plan.ornaments.length,
    assets: registry.JOURNEY_SCENES.map((scene) => {
      const text = src.files[scene.file] ?? "";
      return {
        id: scene.id,
        file: scene.src,
        viewBox: VIEWBOX,
        maxBytes: MAX_BYTES,
        bytes: Buffer.byteLength(text, "utf8"),
        sha256: createHash("sha256").update(text).digest("hex"),
        decorative: true,
        semanticTheme: scene.semanticTheme,
        regions: [...scene.regions],
        density: scene.density,
        ownerRequested: ["buddhist-temple", "sun-wukong", "lucky-cat", "great-wall"].includes(scene.id),
        placements: plan.scenes.filter((s) => s.sceneId === scene.id).length,
      };
    }),
  };
}

/* ------------------------------------------------------------------ */

const clone = (src) => ({ ...src, files: { ...src.files } });

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

function withJson(base, key, fn) {
  const next = clone(base);
  const obj = JSON.parse(base[key]);
  fn(obj);
  next[key] = JSON.stringify(obj, null, 2);
  return next;
}

function evidence(base, name, patch) {
  return withJson(base, "layoutEvidence", (o) => {
    const row = o.rows.find((r) => r.name === name);
    if (!row) throw new Error(`evidence row ${name} missing`);
    Object.assign(row, patch);
  });
}

const GOOD_APK = "a".repeat(64);
function built(base, patch = {}) {
  return withJson(base, "cert", (o) => {
    o.hosted = {
      ...o.hosted,
      overall: "PASS",
      headSha: "b".repeat(40),
      releaseTruth: "PASS",
      security: "PASS",
      betaSuites: "PASS",
      qualityBuild: "PASS",
      androidFoundation: "PASS",
      androidRuntime: "PASS",
      chromium: "PASS",
      firefox: "PASS",
      webkit: "PASS_WITH_ALLOWLISTED_ENGINE_SKIP",
      webkitSkipPolicy: "PASS_WITH_ALLOWLISTED_ENGINE_SKIP",
    };
    o.artifact = {
      ...o.artifact,
      status: "BUILT",
      apkSha256: GOOD_APK,
      artifactSourceSha: "b".repeat(40),
      learnerRuntimeSha: o.runtime.learnerRuntimeSha,
      channel: "DEVICE_QA",
      workflowRunId: 1,
      artifactId: 2,
      playReady: false,
    };
    patch.cert?.(o);
  });
}

function builtWithHandoff(base, patch) {
  const next = built(base, patch);
  next.handoff = `${base.handoff}\nUSE THIS APK\n${GOOD_APK}\n`;
  return next;
}

function physicalPass(base, physicalPatch = {}) {
  return builtWithHandoff(base, {
    cert: (o) => {
      o.physical = {
        status: "PASS",
        device: "owner-android",
        emulator: false,
        artifactSha256: GOOD_APK,
        audioX20Count: 20,
        svg: Object.fromEntries(
          ["loads", "crispness", "theme", "sideAlternation", "nodeCollision", "textCollision", "animation", "reducedMotion"].map((k) => [k, "PASS"]),
        ),
        ...physicalPatch,
      };
    },
  });
}

function test() {
  const base = loadJourneySvgSources();
  const baseline = checkAll(base);
  if (baseline.length) {
    console.error(`FAIL test baseline is not clean: ${baseline.join(", ")}`);
    process.exitCode = 1;
    return;
  }
  const MG = "journey-moon-gate.svg";
  const LS = "journey-lantern-street.svg";
  const cases = [
    // ── SVG asset integrity / safety (spec 91 · 1–12) ─────────────────
    ["missing SVG file", "REGISTRY_SRC_MISSING", () => { const n = clone(base); delete n.files[MG]; return n; }],
    ["broken registry src", "REGISTRY_ID_FILE_MISMATCH", () => m(base, "registry", "const file = `journey-${id}.svg`;", "const file = `journey-${id}-v2.svg`;")],
    ["remote SVG <use> URL", "SVG_EXTERNAL_REF", () => mf(base, MG, "</svg>", '<use href="https://cdn.example/x.svg#a"/></svg>')],
    ["remote url() paint", "SVG_EXTERNAL_REF", () => mf(base, MG, 'fill="url(#mg-disc)"', 'fill="url(https://cdn.example/x.svg#d)"')],
    ["embedded raster", "SVG_EMBEDDED_RASTER", () => mf(base, MG, "</svg>", '<image href="data:image/png;base64,iVBORw0KGgo="/></svg>')],
    ["script element", "SVG_SCRIPT", () => mf(base, MG, "</svg>", "<script>alert(1)</script></svg>")],
    ["javascript: URL", "SVG_SCRIPT", () => mf(base, MG, 'data-lys-scene="moon-gate"', 'data-lys-scene="moon-gate" data-x="javascript:void(0)"')],
    ["foreignObject", "SVG_FOREIGN_OBJECT", () => mf(base, MG, "</svg>", "<foreignObject><div/></foreignObject></svg>")],
    ["missing viewBox", "SVG_MISSING_VIEWBOX", () => mf(base, MG, ' viewBox="0 0 320 240"', "")],
    ["wrong viewBox", "SVG_WRONG_VIEWBOX", () => mf(base, MG, 'viewBox="0 0 320 240"', 'viewBox="0 0 240 320"')],
    ["gigantic asset", "SVG_OVERSIZE", () => mf(base, MG, "</svg>", `<!--${"x".repeat(40_000)}--></svg>`)],
    ["duplicate id in asset", "SVG_DUPLICATE_ID", () => mf(base, MG, "</defs>", '</defs><defs><clipPath id="mg-gate"><circle cx="1" cy="1" r="1"/></clipPath></defs>')],
    ["dangling url(#ref)", "SVG_DANGLING_REF", () => mf(base, MG, 'clip-path="url(#mg-gate)"', 'clip-path="url(#mg-missing)"')],
    ["event handler", "SVG_EVENT_HANDLER", () => mf(base, MG, '<circle class="lys-s-clay"', '<circle onload="alert(1)" class="lys-s-clay"')],
    ["malformed XML", "SVG_PARSE_FAILED", () => mf(base, MG, "</g>", "")],
    ["SMIL as motion", "SVG_SMIL_MOTION", () => mf(base, MG, "</svg>", '<animate attributeName="opacity" dur="2s"/></svg>')],
    ["embedded font", "SVG_EMBEDDED_FONT", () => mf(base, MG, "</style>", "@font-face{font-family:x}</style>")],
    ["visible text in scene", "SVG_VISIBLE_TEXT", () => mf(base, MG, "</svg>", '<text x="10" y="10">Portal</text></svg>')],
    ["emoji in scene", "SVG_NON_ASCII_OR_EMOJI", () => mf(base, MG, "</svg>", "<!-- \u{1F409} --></svg>")],
    ["decorative title exposed", "DECORATIVE_TEXT_EXPOSED", () => mf(base, MG, "<defs>", "<title>Moon gate</title><defs>")],
    ["duplicated scene ID", "DUPLICATE_SCENE_ID", () => m(base, "registry", 'scene("market",', 'scene("tea-table",')],
    ["unregistered scene file", "UNREGISTERED_SCENE", () => { const n = clone(base); n.files["journey-dragon.svg"] = base.files[MG]; return n; }],
    ["random mapping (Math.random)", "RANDOM_MAPPING", () => m(base, "plan", 'return ordinal % 2 === 0 ? "left" : "right";', 'return Math.random() < 0.5 ? "left" : "right";')],
    ["hidden-state mapping (call counter)", "PLAN_NONDETERMINISTIC", () => m(m(m(base, "plan", "export function planJourneyScenes(", "let planCalls = 0;\nexport function planJourneyScenes("), "plan", "  const scenes: JourneySceneSlot[] = [];\n  const ornaments", "  planCalls += 1;\n  const scenes: JourneySceneSlot[] = [];\n  const ornaments"), "plan", "side: sideForOrdinal(ordinal),", "side: sideForOrdinal(ordinal + planCalls),")],
    ["clock mapping", "RANDOM_MAPPING", () => m(base, "plan", "let pick = unitScenes.length;", "let pick = unitScenes.length + new Date().getDay();")],
    ["library above 16", "LIBRARY_SIZE_OUT_OF_RANGE", () => { const n = m(base, "registry", '  scene("great-wall",', '  scene("festival-lanterns" as JourneySceneId, "x", ["MODERN"], "normal"),\n  scene("great-wall",'); n.files["journey-festival-lanterns.svg"] = base.files[MG]; return n; }],
    ["pack version dropped", "PACK_VERSION_MISSING", () => m(base, "registry", "JOURNEY_SCENE_PACK_VERSION = 1", "JOURNEY_SCENE_PACK_VERSION = 0")],

    // ── Style / palette ───────────────────────────────────────────────
    ["hardcoded hex color", "HARDCODED_COLOR", () => mf(base, MG, '<circle class="lys-f-accent" cx="140"', '<circle fill="#ff0000" class="lys-f-accent" cx="140"')],
    ["inline style paint", "HARDCODED_COLOR", () => mf(base, MG, '<circle class="lys-f-accent" cx="140"', '<circle style="fill:red" class="lys-f-accent" cx="140"')],
    ["alien standalone palette", "ALIEN_PALETTE", () => mf(base, MG, ".lys-f-accent{fill:rgb(185 65 46)}", ".lys-f-accent{fill:rgb(0 120 255)}")],
    ["opaque canvas", "SVG_OPAQUE_CANVAS", () => mf(base, MG, "<defs>", '<rect class="lys-f-paper" x="0" y="0" width="320" height="240"/><defs>')],
    ["unroled paint (default black)", "UNROLED_PAINT", () => mf(base, MG, "</svg>", '<path d="M10 10H40"/></svg>')],
    ["unknown palette role", "UNKNOWN_ROLE", () => mf(base, MG, '<circle class="lys-f-accent" cx="140"', '<circle class="lys-f-neon" cx="140"')],
    ["stroke too thin for 96px", "STROKE_TOO_THIN", () => mf(base, MG, '<circle class="lys-s-clay" stroke-width="4.5"', '<circle class="lys-s-clay" stroke-width="1"')],
    ["square caps (not Longyu)", "STYLE_NOT_LONGYU", () => mf(base, MG, 'stroke-linecap="round"', 'stroke-linecap="butt"')],
    ["signature moon disc removed", "SIGNATURE_DISC_MISSING", () => mf(base, MG, '<circle cx="160" cy="110" r="96" fill="url(#mg-disc)"/>', "")],
    ["coral focal removed", "FOCAL_ACCENT_MISSING", () => { const n = clone(base); n.files[MG] = base.files[MG].replace(/(class="[^"]*)lys-([fs])-accent/g, "$1lys-$2-clay"); return n; }],
    ["dark scheme dropped from asset", "SVG_DARK_SCHEME_MISSING", () => mf(base, MG, "@media (prefers-color-scheme:dark)", "@media (min-width:1px)")],
    ["scene id attribute mismatch", "SCENE_ID_ATTR_MISMATCH", () => mf(base, MG, 'data-lys-scene="moon-gate"', 'data-lys-scene="moon"')],
    ["standalone style drift", "SVG_STYLE_CONTRACT_DRIFT", () => mf(base, LS, ".lys-f-ink{", ".lys-f-ink2{")],

    // ── Registry / plan / inventory ───────────────────────────────────
    ["asset edited without inventory", "INVENTORY_DRIFT", () => mf(base, MG, 'cx="140" cy="110" r="9"', 'cx="141" cy="110" r="9"')],
    ["mapping changed without inventory", "INVENTORY_DRIFT", () => m(base, "plan", '"u5-1": ["lucky-cat"],', '"u5-1": ["market"],')],
    ["advanced scene in foundation", "REGION_CONTRACT_BROKEN", () => m(base, "plan", '"u1-1": ["moon-gate",', '"u1-1": ["modern-city", "moon-gate",')],
    ["stale module mapping", "STALE_UNIT_MAPPING", () => m(base, "plan", '"u5-2": ["high-speed-rail"],', '"u5-2": ["high-speed-rail"],\n  "u9-9": ["market"],')],
    ["scene left unused", "SCENE_UNUSED", () => m(m(base, "plan", '"u7-2": ["modern-city", ', '"u7-2": ['), "plan", 'MODERN: ["modern-city", ', "MODERN: [")],
    ["unregistered id in mapping", "PLAN_UNREGISTERED_SCENE", () => m(base, "plan", '"u5-2": ["high-speed-rail"],', '"u5-2": ["red-dragon" as JourneySceneId],')],
    ["inventory deleted", "INVENTORY_MISSING", () => ({ ...clone(base), inventory: "" })],

    // ── Layout (spec 92 · 13–22) ──────────────────────────────────────
    ["scene overlaps node (measured)", "SCENE_NODE_OVERLAP", () => evidence(base, "390x844-light", { sceneNodeOverlap: 1 })],
    ["scene positioned over path", "SCENE_ABSOLUTE_POSITION", () => m(base, "css", "  flex: none;\n  width: min(100%, var(--journey-scene-max));", "  position: absolute;\n  flex: none;\n  width: min(100%, var(--journey-scene-max));")],
    ["scene overlaps label", "SCENE_LABEL_OVERLAP", () => evidence(base, "360x640-light", { sceneLabelOverlap: 2 })],
    ["scene overlaps CTA", "SCENE_CTA_OVERLAP", () => evidence(base, "390x844-light", { sceneCtaOverlap: 1 })],
    ["scene overlaps culture card", "SCENE_CARD_OVERLAP", () => evidence(base, "375x667-light", { sceneCardOverlap: 1 })],
    ["horizontal overflow (measured)", "HORIZONTAL_OVERFLOW", () => evidence(base, "360x640-light", { horizontalOverflowPx: 12 })],
    ["lane loses min-width:0", "HORIZONTAL_OVERFLOW", () => m(base, "css", "  display: flex;\n  min-width: 0;\n  align-items: center;\n  pointer-events: none;", "  display: flex;\n  align-items: center;\n  pointer-events: none;")],
    ["node axis moves (measured)", "AXIS_MOVED", () => evidence(base, "390x844-light", { axisDeltaPx: 6 })],
    ["asymmetric lane tracks", "LANE_GRID_ASYMMETRIC", () => m(base, "css", "grid-template-columns: minmax(0, 1fr) minmax(var(--journey-node-lane), auto) minmax(0, 1fr);", "grid-template-columns: minmax(0, 2fr) minmax(var(--journey-node-lane), auto) minmax(0, 1fr);")],
    ["center lane translated", "AXIS_MOVED", () => m(base, "laneRow", '<div className="journey-lane-center" data-journey-lane="center">', '<div className="journey-lane-center" style={{ transform: "translateX(8px)" }} data-journey-lane="center">')],
    ["bubble zigzag reintroduced", "AXIS_MOVED", () => m(base, "bubble", "return 0;", "return Math.sin(_index) * 24;")],
    ["connector/axis line shifts", "CONNECTOR_SHIFTED", () => evidence(base, "390x844-light", { axisLineDeltaPx: 4 })],
    ["node lane narrower than label", "NODE_LANE_WIDTH_DRIFT", () => m(base, "css", "--journey-node-lane: 8.75rem;", "--journey-node-lane: 7rem;")],
    ["alternation breaks (plan)", "ALTERNATION_BROKEN", () => m(base, "plan", 'return ordinal % 2 === 0 ? "left" : "right";', 'return ordinal >= 0 ? "left" : "right";')],
    ["alternation breaks (measured)", "ALTERNATION_BROKEN", () => evidence(base, "desktop-1280x900-light", { alternationBreaks: 3 })],
    ["scene appears every node", "SCENE_EVERY_NODE", () => m(m(base, "plan", "minStopsBetween: 4,", "minStopsBetween: 1,"), "plan", "minLessonsBetween: 2,", "minLessonsBetween: 1,")],
    ["scenes far too sparse", "SCENES_TOO_SPARSE", () => m(base, "plan", "minStopsBetween: 4,", "minStopsBetween: 30,")],
    ["scene consumes viewport (css)", "SCENE_TOO_TALL", () => m(base, "css", "--journey-scene-max: 6.75rem;", "--journey-scene-max: 14rem;")],
    ["scene consumes viewport (measured)", "SCENE_TOO_TALL", () => evidence(base, "tablet-834x1112-light", { maxSceneHeightPx: 220 })],
    ["scene size unbounded", "SCENE_SIZE_UNBOUNDED", () => m(base, "css", "width: min(100%, var(--journey-scene-max));", "width: 160px;")],
    ["box not reserved (no aspect)", "LAYOUT_SHIFT_RISK", () => m(base, "css", "  aspect-ratio: 4 / 3;\n  pointer-events: none;", "  pointer-events: none;")],
    ["async scene load", "LAYOUT_SHIFT_RISK", () => m(base, "component", "eager: true,", "eager: false,")],
    ["layout jump after load (measured)", "LAYOUT_SHIFT", () => evidence(base, "390x844-light", { nodeJumpPx: 9 })],
    ["layout evidence stale", "LAYOUT_EVIDENCE_STALE", () => m(base, "css", "--journey-lane-gap: 0.375rem;", "--journey-lane-gap: 0.5rem;")],
    ["layout matrix incomplete", "LAYOUT_MATRIX_INCOMPLETE", () => withJson(base, "layoutEvidence", (o) => { o.rows = o.rows.filter((r) => r.name !== "390x844-dark"); })],
    ["vacuous layout evidence", "LAYOUT_EVIDENCE_VACUOUS", () => evidence(base, "375x667-light", { scenesMeasured: 0 })],
    ["scene too wide at 360px", "SCENE_WIDTH_OUT_OF_RANGE", () => evidence(base, "360x640-light", { maxSceneWidthPx: 140 })],
    ["scene rendered outside lanes", "SCENE_NOT_IN_LANE", () => m(base, "journeyPage", "{lessonNode}\n            </JourneyLaneRow>", '{lessonNode}\n              <JourneyScene sceneId="market" side="left" ordinal={0} />\n            </JourneyLaneRow>')],
    ["scene renders broken", "SCENE_RENDER_BROKEN", () => evidence(base, "390x844-dark", { brokenScenes: 1 })],
    ["scenes not integrated", "SCENES_NOT_INTEGRATED", () => m(base, "journeyPage", "journeyLaneDecorFor(lesson.id)", "undefined")],

    // ── Accessibility (spec 93 · 23–27) ───────────────────────────────
    ["svg focusable", "SCENE_FOCUSABLE", () => m(base, "markup", ' focusable="false"', "")],
    ["scene wrapper focusable", "SCENE_FOCUSABLE", () => m(base, "component", 'data-testid="journey-scene"', 'data-testid="journey-scene"\n      tabIndex={0}')],
    ["scene announced (wrapper)", "SCENE_ANNOUNCED", () => m(base, "component", '      aria-hidden="true"\n      data-testid="journey-scene"', '      data-testid="journey-scene"')],
    ["scene announced (svg)", "SCENE_ANNOUNCED", () => m(base, "markup", ' aria-hidden="true" focusable', " focusable")],
    ["alt text as lesson content", "DECORATIVE_TEXT_EXPOSED", () => m(base, "component", 'data-testid="journey-scene"', 'data-testid="journey-scene"\n      aria-label={sceneId}')],
    ["reduced motion ignored (css)", "REDUCED_MOTION_IGNORED", () => m(base, "css", "  .symbolic-ornament,\n  .journey-scene-drift {", "  .symbolic-ornament {")],
    ["reduced motion ignored (reveal)", "REDUCED_MOTION_IGNORED", () => m(base, "component", "  if (prefersReducedMotion()) return \"done\";\n", "")],
    ["reduced motion ignored (measured)", "REDUCED_MOTION_IGNORED", () => evidence(base, "390x844-reduced-motion", { animatingScenes: 2 })],
    ["large-font lane squeeze", "LARGE_FONT_COLLISION", () => m(base, "css", "@container (max-width: 47px) {", "@supports (display: none) {")],
    ["large-font label collision", "SCENE_LABEL_OVERLAP", () => evidence(base, "360x640-large-font", { sceneLabelOverlap: 1 })],
    ["markup guard drops <script>", "MARKUP_GUARD_WEAKENED", () => m(base, "markup", "  /<script/i,\n", "")],
    ["markup guard bypassed", "MARKUP_GUARD_BYPASSED", () => m(base, "component", "return raw ? prepareSceneMarkup(raw, `${sceneId}-${instance}`) : null;", "return raw ?? null;")],
    ["ids shared across instances", "SVG_ID_COLLISION_RISK", () => m(base, "markup", '.replace(/\\sid="([^"]+)"/g, ` id="$1-${key}"`)', "")],
    ["standalone palette leaks", "STANDALONE_STYLE_LEAKS", () => m(base, "markup", '.replace(/<style>[\\s\\S]*?<\\/style>/g, "")', "")],
    ["lanes intercept taps", "SCENE_INTERACTIVE", () => m(base, "css", "  align-items: center;\n  pointer-events: none;\n  container-type", "  align-items: center;\n  container-type")],
    ["entrance replays on remount", "REVEAL_REPLAYS", () => m(m(m(base, "component", "  if (revealedThisSession.has(ordinal)) return \"done\";\n", ""), "component", "      revealedThisSession.add(ordinal);\n", ""), "component", "const revealedThisSession = new Set<number>();", "")],
    ["filter/blur animation", "HEAVY_MOTION", () => m(base, "css", "    opacity: 0.94;\n  }\n  to {", "    opacity: 0.94;\n    filter: blur(2px);\n  }\n  to {")],
    ["drift beyond 3px", "MOTION_OUT_OF_RANGE", () => m(base, "css", "translate3d(0, -2px, 0)", "translate3d(0, -12px, 0)")],

    // ── Theme (spec 94 · 28–31) ───────────────────────────────────────
    ["dark scene invisible (moon = page)", "DARK_SCENE_INVISIBLE", () => m(base, "css", "  --scene-moon: 244 230 226;", "  --scene-moon: 247 246 243;\n  --scene-ink: 247 246 243;")],
    ["dark scene too faint", "DARK_SCENE_INVISIBLE", () => m(base, "css", "  opacity: 0.86;\n}", "  opacity: 0.3;\n}")],
    ["dark moon fades to mud", "DARK_MOON_FADES", () => m(base, "css", '[data-theme="dark"] .journey-scene .lys-stop-wash {\n  stop-opacity: 1;\n}', "")],
    ["dark scene outshines nodes", "DARK_SCENE_TOO_BRIGHT", () => m(base, "css", "  opacity: 0.86;\n}", "  opacity: 1;\n}")],
    ["light scene invisible", "LIGHT_SCENE_INVISIBLE", () => m(base, "css", ".journey-scene .lys-s-ink { stroke: rgb(var(--scene-ink) / 0.78); }", ".journey-scene .lys-s-ink { stroke: rgb(var(--scene-ink) / 0.06); }")],
    ["alien dark palette", "ALIEN_PALETTE", () => m(base, "css", "  --scene-accent: 185 65 46;", "  --scene-accent: 0 200 255;")],
    ["alien light token", "ALIEN_PALETTE", () => m(base, "css", "  --scene-ink: var(--text);", "  --scene-ink: var(--neon);")],
    ["role hardcoded in app css", "APP_ROLE_HARDCODED", () => m(base, "css", ".journey-scene .lys-f-accent { fill: rgb(var(--scene-accent) / 0.9); }", ".journey-scene .lys-f-accent { fill: #00c8ff; }")],
    ["role missing in app css", "APP_ROLE_CSS_MISSING", () => m(base, "css", ".journey-scene .lys-f-glow { fill: rgb(var(--scene-gold) / 0.22); }\n", "")],

    // ── Ornaments, Culture, isolation, medallion ──────────────────────
    ["ornament beside scene (plan)", "ORNAMENT_SCENE_COLLISION", () => m(base, "plan", "JOURNEY_ORNAMENT_SCENE_CLEARANCE = 2", "JOURNEY_ORNAMENT_SCENE_CLEARANCE = 0")],
    ["ornament + scene on one row", "ORNAMENT_SCENE_COLLISION", () => m(base, "laneRow", "if (!scene && ornament?.side === side)", "if (ornament?.side === side)")],
    ["journey ornaments dropped (plan)", "ORNAMENTS_REMOVED", () => m(base, "plan", "      if (lessonIndex < 2) return;\n", "      return;\n")],
    ["journey ornaments dropped (lane)", "ORNAMENTS_REMOVED", () => m(base, "laneRow", "<SymbolicOrnament motif={motif} />", "null")],
    ["scenes leak into Culture", "CULTURE_SCENES_LEAKED", () => m(base, "cultureJourney", "import ", 'import { JourneyLaneRow } from "../journey/scenes/JourneyLaneRow";\nimport ')],
    ["Culture ornaments removed", "CULTURE_ORNAMENTS_REMOVED", () => ({ ...clone(base), pathComp: base.pathComp.replace(/SymbolicOrnamentRail/g, "Fragment") })],
    ["presentation reads progress", "PRESENTATION_TOUCHES_LOGIC", () => m(base, "plan", 'import { JOURNEY } from "../../../data/journey";', 'import { JOURNEY } from "../../../data/journey";\nimport { useStore } from "../../../lib/store";')],
    ["medallion announced", "MEDALLION_EXPOSED", () => m(base, "medallion", '      aria-hidden="true"\n', "")],
    ["locked medallion in accent", "MEDALLION_LOCKED_ACCENT", () => m(base, "medallion", 'LOCKED: { line: "rgb(var(--text-faint) / 0.55)"', 'LOCKED: { line: "rgb(var(--accent) / 0.8)"')],
    ["medallion on every node", "MEDALLION_EVERY_NODE", () => m(base, "journeyPage", 'frame={isReview ? "review" : undefined}', 'frame="review"')],
    ["medallion crowds the label", "MEDALLION_CROWDS_LABEL", () => m(base, "bubble", '? "h-[84px] w-[84px]"', '? "h-[64px] w-[64px]"')],
    ["scene fetched at runtime", "SCENE_NETWORK_DEPENDENCY", () => m(base, "component", "function rawSceneFor(", "void fetch(\"/scenes.json\");\nfunction rawSceneFor(")],
    ["scene not bundled as raw", "SCENE_NOT_BUNDLED", () => m(base, "component", 'query: "?raw",', 'query: "?url",')],
    ["lookup bypasses registry", "UNREGISTERED_LOOKUP", () => m(base, "component", "const entry = JOURNEY_SCENE_BY_ID.get(id);", "const entry = { file: `journey-${id}.svg` };")],

    // ── Release honesty (spec 95 · 32–38) ─────────────────────────────
    ["old APK accepted", "OLD_APK_ACCEPTED", () => builtWithHandoff(base, { cert: (o) => { o.artifact.apkSha256 = STALE_APK_SHA256[0]; } })],
    ["prior Device-QA not stale", "OLD_APK_ACCEPTED", () => withJson(base, "cert", (o) => { o.priorDeviceQa = "CERTIFIED"; })],
    ["stale hash list trimmed", "STALE_HASH_REJECTION_MISSING", () => withJson(base, "cert", (o) => { o.rejectedApkSha256List = [STALE_APK_SHA256[0]]; })],
    ["learnerRuntimeSha unchanged", "LEARNER_RUNTIME_NOT_ADVANCED", () => withJson(withJson(base, "cert", (o) => { o.runtime.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA; }), "rc", (o) => { o.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA; })],
    ["rc / cert runtime disagree", "LEARNER_RUNTIME_NOT_ADVANCED", () => withJson(base, "rc", (o) => { o.learnerRuntimeSha = "c".repeat(40); })],
    ["APK from red head", "APK_FROM_RED_HEAD", () => builtWithHandoff(base, { cert: (o) => { o.hosted.overall = "FAIL"; } })],
    ["APK from another head", "APK_FROM_RED_HEAD", () => builtWithHandoff(base, { cert: (o) => { o.artifact.artifactSourceSha = "d".repeat(40); } })],
    ["APK runtime mismatch", "APK_RUNTIME_MISMATCH", () => builtWithHandoff(base, { cert: (o) => { o.artifact.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA; } })],
    ["APK without provenance", "MISSING_PROVENANCE", () => builtWithHandoff(base, { cert: (o) => { o.artifact.workflowRunId = null; } })],
    ["handoff lacks new hash", "HANDOFF_MISSING_NEW_HASH", () => built(base)],
    ["physical PASS from emulator", "PHYSICAL_PASS_FROM_EMULATOR", () => physicalPass(base, { emulator: true })],
    ["physical PASS, SVG checks skipped", "PHYSICAL_SVG_INCOMPLETE", () => physicalPass(base, { svg: { loads: "PASS" } })],
    ["physical PASS on another APK", "PHYSICAL_STALE_APK", () => physicalPass(base, { artifactSha256: "e".repeat(64) })],
    ["audio x20 short", "AUDIO_X20_BELOW_20", () => physicalPass(base, { audioX20Count: 12 })],
    ["debug AAB marked Play-ready", "DEBUG_AAB_PLAY_READY", () => withJson(base, "cert", (o) => { o.play.debugAabPlayReady = true; })],
    ["Public Beta changed to GO", "PUBLIC_BETA_GO", () => withJson(base, "rc", (o) => { o.entry.PUBLIC_BETA_ENTRY = "GO"; })],
    ["Wave1 invited before certification", "WAVE1_INVITED_EARLY", () => withJson(base, "rc", (o) => { o.wave1.invited = 3; })],
    ["Wave1 beyond 10 testers", "WAVE1_OVER_TARGET", () => withJson(base, "cert", (o) => { o.wave1.invited = 25; })],
    ["Play GO without signed AAB", "PLAY_GO_WITHOUT_SIGNED_AAB", () => withJson(base, "cert", (o) => { o.entry.PLAY_CLOSED_BETA_ENTRY = "GO"; })],
    ["WebKit LEGIT skip sold as PASS", "WEBKIT_DISHONEST", () => withJson(base, "cert", (o) => { o.hosted.webkit = "PASS"; })],
    ["WebKit skip widened to describe", "WEBKIT_SKIP_WEAKENED", () => m(base, "builderSpec", NARROW_SKIP, `${DESCRIBE_SKIP} ${NARROW_SKIP}`)],
    ["WebKit skip silently removed", "WEBKIT_SKIP_WEAKENED", () => withJson(base, "skipAllowlist", (o) => { o.entries = o.entries.filter((e) => e.file !== "e2e/v494-builder-ux.spec.ts"); })],
    ["WebKit skip swallowed by an always-true guard", "WEBKIT_SKIP_WEAKENED", () => m(base, "builderSpec", NARROW_SKIP, `void (process.env.X ${OR_TRUE}); ${NARROW_SKIP}`)],
    ["hosted PASS with pending engine", "HOSTED_PASS_DISHONEST", () => built(base, { cert: (o) => { o.hosted.chromium = "PENDING"; } })],
    ["visual freeze without physical", "VISUAL_FREEZE_WITHOUT_PHYSICAL", () => withJson(base, "cert", (o) => { o.visualFreeze.JOURNEY_SVG_VISUAL_SYSTEM = "OWNER_ACCEPTED"; })],
    ["visual freeze unbound to APK", "VISUAL_FREEZE_UNBOUND", () => { const n = physicalPass(base); return withJson(n, "cert", (o) => { o.visualFreeze.JOURNEY_SVG_VISUAL_SYSTEM = "OWNER_ACCEPTED"; o.visualFreeze.boundApkSha256 = "f".repeat(64); }); }],
    ["SVG system state overclaimed", "SVG_SYSTEM_STATE_DISHONEST", () => withJson(base, "cert", (o) => { o.journeySvgSystem = "OWNER_ACCEPTED"; })],
    ["freeze exception missing", "FREEZE_EXCEPTION_MISSING", () => m(base, "freeze", "OWNER_APPROVED_JOURNEY_SVG_VISUAL_STORYTELLING", "VISUAL")],
    ["scope creep: navigation redesign", "SCOPE_CREEP", () => withJson(base, "cert", (o) => { o.scope.navigationRedesign = true; })],
    ["fingerprint drift", "FINGERPRINT_DRIFT", () => withJson(base, "rc", (o) => { o.fingerprint = "000000000000"; })],
    ["wrong parent PR", "WRONG_PARENT_PR", () => withJson(base, "cert", (o) => { o.parentPr = 352; })],
    ["gate absent from hosted suite", "GATE_NOT_IN_HOSTED_SUITE", () => m(base, "suites", '"validate:journey-scene-layout",', "")],
    ["gate absent from registry", "GATE_REGISTRY_MISSING", () => m(base, "gateRegistry", '"gateId": "validate:journey-svg-assets"', '"gateId": "validate:journey-svg-assets-x"')],
    ["owner handoff missing", "OWNER_HANDOFF_MISSING", () => ({ ...clone(base), handoff: "" })],
    ["handoff digest stale", "HANDOFF_DIGEST_STALE", () => m(base, "handoff", `digest ${JSON.parse(base.inventory).planDigest}`, "digest 00000000")],
    ["handoff DO NOT USE list incomplete", "HANDOFF_STALE_LIST_INCOMPLETE", () => m(base, "handoff", STALE_APK_SHA256[1], "")],
    ["design doc missing", "DESIGN_DOC_MISSING", () => ({ ...clone(base), designDoc: "" })],
  ];

  let killed = 0;
  let n = 0;
  for (const [label, code, make] of cases) {
    n += 1;
    let mutant;
    try {
      mutant = make();
    } catch (error) {
      console.error(`MISS ${n} ${label} → ${error.message}`);
      process.exitCode = 1;
      continue;
    }
    const errors = checkAll(mutant);
    if (!errors.includes(code)) {
      console.error(`MISS ${n} ${label} → expected ${code}, got [${errors.join(", ")}]`);
      process.exitCode = 1;
      continue;
    }
    killed += 1;
    console.log(`KILL OK ${n} ${label} → ${code}`);
  }
  if (killed < 80 || process.exitCode) {
    console.error(`FAIL test:rc2-3-13r3-2-3-journey-svg-storytelling (${killed}/${cases.length} kills)`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-2-3-journey-svg-storytelling (${killed} kills)`);
}

/* ------------------------------------------------------------------ */

const src = MODE === "test" ? null : loadJourneySvgSources();
switch (MODE) {
  case "assets": {
    const { errors, stats } = checkSvgAssets(src);
    report("validate:journey-svg-assets", errors, ` · ${JSON.stringify(stats)}`);
    break;
  }
  case "style":
    report("validate:journey-svg-style", checkStyleGate(src));
    break;
  case "registry":
    report("validate:journey-scene-registry", checkRegistryGate(src));
    break;
  case "layout":
    report("validate:journey-scene-layout", checkLayoutGate(src));
    break;
  case "validate":
    report("validate:rc2-3-13r3-2-3-journey-svg-storytelling", [
      ...new Set([...checkAssetsGate(src), ...checkStyleGate(src), ...checkRegistryGate(src), ...checkLayoutGate(src), ...checkRelease(src)]),
    ]);
    break;
  case "test":
    test();
    break;
  case "inventory": {
    const inv = buildInventory(src);
    const text = `${JSON.stringify(inv, null, 2)}\n`;
    if (process.argv.includes("--write")) {
      fs.writeFileSync(INVENTORY, text);
      console.log(`wrote ${INVENTORY} · ${inv.assets.length} assets · ${inv.sceneSlots} scene slots · digest ${inv.planDigest}`);
    } else if (fs.readFileSync(INVENTORY, "utf8") !== text) {
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
