/**
 * RC2.3.13R.3.2.4 — Living UI, Chinese ornamental embroidery & motion delight.
 *
 *   validate:chinese-ornamental-assets  — parse, safety, size, roles (per asset)
 *   validate:chinese-ornamental-system  — registry ↔ files, surfaces, density, decoration
 *   validate:living-ui-motion           — tokens, durations, reduced motion, no business-on-animation
 *   validate:ambient-motion-budget      — ≤ MAX loops, offscreen / hidden / reduced pause
 *   validate:motion-performance-contract— transform/opacity only, no blur, no scroll-driven state
 *   validate:ui-effect-accessibility    — decorative a11y, state never motion-only, focus order
 *   validate:theme-ornament-contrast    — light/dark × current/completed/locked visibility
 *   validate:rc2-3-13r3-2-4-…           — all of the above + E2E evidence + release honesty
 *
 * Every checker is a pure function over a `sources` object so the mutation
 * runner can corrupt one input and prove the matching error fires. Motion
 * libraries are not regex-parsed for behaviour: their (possibly mutated)
 * TypeScript is transpiled and run against a tiny React-hook runtime.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { journeyFingerprint } from "./report-meta.mjs";
import { contrast, darkTokens, lightTokens, parseSvg, WEBKIT_SKIP } from "./rc2-3-13r3-2-3-journey-svg-gates.mjs";

const ROOT = process.cwd();
const read = (rel) => (fs.existsSync(path.join(ROOT, rel)) ? fs.readFileSync(path.join(ROOT, rel), "utf8") : "");

export const ORNAMENT_DIR = "src/assets/ornaments/chinese";
export const ORNAMENT_MAX_BYTES = 8 * 1024;
export const ORNAMENT_LIBRARY_MIN = 10;
export const ORNAMENT_LIBRARY_MAX = 14;
export const ORNAMENT_ROLES = ["thread", "thread-soft", "stitch", "knot", "wash", "petal", "sage"];
export const MAX_AMBIENT = 4;

export const PARENT_PR = 354;
export const PARENT_HEAD_SHA = "64a06df8c1d7579e53a585ab25b1c9452dfe4d29";
export const PREVIOUS_LEARNER_RUNTIME_SHA = "d166361490ce100f595f30af47d7fdeaad650a79";
export const EXPECTED_FINGERPRINT = "29bb02ec0336";
export const FREEZE_REASON = "OWNER_APPROVED_LIVING_UI_ORNAMENTAL_POLISH";
export const STALE_APK_SHA256 = [
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af",
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8",
];
/** The two #354 cross-engine failures and how each was closed. */
export const CROSS_ENGINE_CLASSIFICATION = [
  { engine: "firefox", head: "aa801dabbdacac2216b3b2ea9d7de2ad33b20536", classification: "TEST_CONTRACT_STALE", fixedIn: "a1c5605" },
  { engine: "webkit", head: "a1c5605b26b8ddc8ffad99fb21976bebac0c3175", classification: "TEST_CONTRACT_STALE", fixedIn: "64a06df" },
];

/** WebKit-only LEGIT skips already allowlisted on the parent head (#354 @ 64a06df). No new ones. */
export const EXISTING_WEBKIT_SKIP_FILES = [
  "e2e/rc2-3-5-speech-contrast.spec.ts",
  "e2e/v494-builder-ux.spec.ts",
  "e2e/guided-journey-culture.spec.ts",
];

/** Files allowed to place an ornament, and the surfaces each may use. */
export const ORNAMENT_HOSTS = {
  "src/features/journey/JourneyPage.tsx": ["journey-milestone"],
  "src/features/culture/CultureTopicDetailPage.tsx": ["culture-topic-hero"],
  "src/components/progression/ProgressionShell.tsx": ["culture-root-header"],
  "src/features/lesson/LessonVictory.tsx": ["victory"],
  "src/features/revisao/RevisaoPage.tsx": ["review-header"],
  "src/features/journey/HomeCognitiveBlocks.tsx": ["home-continue"],
  "src/features/qa/LivingUiQaPanel.tsx": ["qa-gallery"],
};

/** Looping status indicators tied to real state (not ambient decoration). */
export const STATUS_LOOPS = ['[data-audio-playing="true"]::after', ".living-rec-dot", ".living-rec-bars > span"];

export const REQUIRED_EVIDENCE_ROWS = [
  "360x640-light",
  "375x667-light",
  "390x844-light",
  "390x844-dark",
  "tablet-834x1112-light",
  "desktop-1280x900-light",
  "360x640-large-font",
  "390x844-reduced-motion",
];

const CSS_START = "RC2.3.13R.3.2.4 — Living UI";
const CSS_END = "/* end Living UI */";

export const RUNTIME_FILES = {
  livingUiMotion: "src/lib/motion/livingUiMotion.ts",
  ambientBudget: "src/lib/motion/ambientBudget.ts",
  valueDelta: "src/lib/motion/valueDelta.ts",
  sessionOnce: "src/lib/motion/sessionOnce.ts",
  animatedCounter: "src/components/motion/AnimatedCounter.tsx",
  progressFill: "src/components/motion/ProgressFill.tsx",
  completionBurst: "src/components/motion/CompletionBurst.tsx",
  registry: "src/components/ornaments/chinese/chineseOrnamentRegistry.ts",
  markup: "src/components/ornaments/chinese/chineseOrnamentMarkup.ts",
  ornament: "src/components/ornaments/chinese/ChineseOrnament.tsx",
  frame: "src/components/ornaments/chinese/ChineseOrnamentalFrame.tsx",
  divider: "src/components/ornaments/chinese/ChineseOrnamentalDivider.tsx",
  corner: "src/components/ornaments/chinese/ChineseCornerMotif.tsx",
  bubble: "src/components/progression/ProgressionNodeBubble.tsx",
  shell: "src/components/progression/ProgressionShell.tsx",
  symbolicOrnaments: "src/components/progression/symbolicOrnaments.tsx",
  journeyScene: "src/features/journey/scenes/JourneyScene.tsx",
  journeyPage: "src/features/journey/JourneyPage.tsx",
  homeBlocks: "src/features/journey/HomeCognitiveBlocks.tsx",
  cultureCard: "src/features/culture/CultureTopicCard.tsx",
  cultureDetail: "src/features/culture/CultureTopicDetailPage.tsx",
  victory: "src/features/lesson/LessonVictory.tsx",
  review: "src/features/revisao/RevisaoPage.tsx",
  topBar: "src/components/layout/TopBar.tsx",
  tabBar: "src/components/layout/TabBar.tsx",
  modal: "src/components/ui/ModalOverlay.tsx",
  primitives: "src/components/ui/primitives.tsx",
  speakButton: "src/components/ui/SpeakButton.tsx",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  hanziWriting: "src/features/hanzi/writing/HanziWritingExercise.tsx",
  qaPanel: "src/features/qa/LivingUiQaPanel.tsx",
  mascot: "src/components/brand/Mascot.tsx",
  chest: "src/components/chests/LongyuChest.tsx",
  guide: "src/components/guide/GuideDialogue.tsx",
};

/* ------------------------------------------------------------------ */
/* Sources                                                            */
/* ------------------------------------------------------------------ */

export function livingCssSection(css) {
  const a = String(css).indexOf(CSS_START);
  const b = String(css).indexOf(CSS_END);
  return a >= 0 && b > a ? css.slice(a, b + CSS_END.length) : "";
}

export function loadOrnamentFiles(dir = ORNAMENT_DIR) {
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

/** Every src file that renders an ornament component (for the surface scan). */
function ornamentUsers() {
  const out = {};
  const walkDir = (rel) => {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) walkDir(child);
      else if (/\.tsx$/.test(entry.name) && !child.startsWith("src/components/ornaments/")) {
        const text = fs.readFileSync(path.join(ROOT, child), "utf8");
        if (/<(?:ChineseOrnamentalFrame|ChineseOrnamentalDivider|ChineseCornerMotif|ChineseOrnament|CompletionBurst)\b/.test(text)) out[child] = text;
      }
    }
  };
  walkDir("src");
  return out;
}

export function loadLivingUiSources() {
  const src = {
    files: loadOrnamentFiles(),
    css: read("src/index.css"),
    steps: read("src/features/lesson/steps.tsx"),
    users: ornamentUsers(),
    e2eSpec: read("e2e/rc2-3-13r3-2-4-living-ui.spec.ts"),
    evidence: read("docs/release/evidence/rc2-3-13r3-2-4/living-ui-evidence.json"),
    perfEvidence: read("docs/release/evidence/rc2-3-13r3-2-4/living-ui-30min-session.json"),
    inventory: read("docs/release/chinese-ornamental-assets.json"),
    motionDoc: read("docs/ux/living-ui-motion-system.md"),
    ornamentDoc: read("docs/ux/chinese-ornamental-system.md"),
    cert: read("docs/release/rc2-3-13r3-2-4-certification.json"),
    parentCert: read("docs/release/rc2-3-13r3-2-3-certification.json"),
    rc: read("docs/release/final-pre-beta-rc.json"),
    report: read("docs/reports/rc2-3-13r3-2-4-living-ui-ornamental-polish.md"),
    handoff: read("docs/release/OWNER_R32_4_LIVING_UI_HANDOFF.md"),
    freeze: read("src/lib/curriculumFreeze.ts"),
    packageJson: read("package.json"),
    gateRegistry: read("docs/release/gate-registry.json"),
    suites: read("scripts/release/canonical-suites.mjs"),
    skipAllowlist: read("docs/release/skip-allowlist.json"),
    builderSpec: read("e2e/v494-builder-ux.spec.ts"),
    r322Gates: read("scripts/lib/rc2-3-13r3-2-2-final-visual-candidate-gates.mjs"),
    r3221Gates: read("scripts/lib/rc2-3-13r3-2-2-1-terminal-artifact-physical-gates.mjs"),
    liveFingerprint: journeyFingerprint(ROOT),
  };
  for (const [key, rel] of Object.entries(RUNTIME_FILES)) src[key] = read(rel);
  return src;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

function j(text) {
  try {
    return JSON.parse(text || "null");
  } catch {
    return null;
  }
}

const uniq = (errors) => [...new Set(errors)];

function stripComments(text) {
  return String(text)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1")
    .replace(/\{\s*\}/g, "{}");
}

function walk(node, fn) {
  fn(node);
  for (const child of node.children ?? []) if (child.name !== "#text") walk(child, fn);
}

function transpile(source, jsx = false) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      ...(jsx ? { jsx: ts.JsxEmit.React } : {}),
    },
  }).outputText;
}

/**
 * Minimal React for running hooks deterministically: useRef/useState persist
 * per slot, effects run after each render when deps change, and a render
 * repeats while a state setter fired (like a real commit loop).
 */
export function makeHookRuntime() {
  const slots = [];
  let cursor = 0;
  let dirty = false;
  let pending = [];
  const React = {
    useRef(init) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { current: init };
      return slots[i];
    },
    useState(init) {
      const i = cursor++;
      if (!(i in slots)) slots[i] = { value: typeof init === "function" ? init() : init };
      const slot = slots[i];
      return [
        slot.value,
        (next) => {
          const value = typeof next === "function" ? next(slot.value) : next;
          if (!Object.is(value, slot.value)) {
            slot.value = value;
            dirty = true;
          }
        },
      ];
    },
    useEffect(fn, deps) {
      const i = cursor++;
      const prev = slots[i];
      const changed = !prev || !deps || deps.length !== prev.deps.length || deps.some((d, k) => !Object.is(d, prev.deps[k]));
      if (!changed) return;
      pending.push(() => {
        if (prev?.cleanup) prev.cleanup();
        const cleanup = fn();
        slots[i] = { deps: deps ?? [], cleanup: typeof cleanup === "function" ? cleanup : null };
      });
      if (!prev) slots[i] = { deps: [], cleanup: null, placeholder: true };
    },
    createElement(type, props, ...children) {
      return { type, props: { ...(props ?? {}), children } };
    },
    Fragment: "Fragment",
  };
  React.useLayoutEffect = React.useEffect;
  React.useId = () => "id";
  React.useMemo = (fn) => fn();
  React.useCallback = (fn) => fn;
  function render(Component, props) {
    let out = null;
    for (let pass = 0; pass < 8; pass += 1) {
      cursor = 0;
      dirty = false;
      pending = [];
      out = Component(props);
      const effects = pending;
      pending = [];
      for (const run of effects) run();
      if (!dirty) break;
    }
    return out;
  }
  function unmount() {
    for (const slot of slots) if (slot?.cleanup) slot.cleanup();
  }
  return { React, render, unmount };
}

/** Evaluate (possibly mutated) module source with explicit require overrides. */
export function evalSource(source, { jsx = false, requires = {}, globals = {} } = {}) {
  const mod = { exports: {} };
  const req = (spec) => {
    if (spec in requires) return requires[spec];
    throw new Error(`unresolved import ${spec}`);
  };
  const names = ["exports", "require", "module", ...Object.keys(globals)];
  // eslint-disable-next-line no-new-func
  new Function(...names, transpile(source, jsx))(mod.exports, req, mod, ...Object.values(globals));
  return mod.exports;
}

function motionModule(src) {
  return evalSource(src.livingUiMotion);
}

function findElement(tree, predicate) {
  if (!tree || typeof tree !== "object") return null;
  if (predicate(tree)) return tree;
  for (const child of [tree.props?.children ?? []].flat(Infinity)) {
    const hit = findElement(child, predicate);
    if (hit) return hit;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 1. Assets (validate:chinese-ornamental-assets)                      */
/* ------------------------------------------------------------------ */

const ORNAMENT_ELEMENTS = new Set(["svg", "g", "style", "path", "circle", "ellipse", "rect", "line", "polyline", "polygon"]);

export function checkOrnamentAssets(src) {
  const errors = [];
  const stats = { files: 0, parsed: 0, parseErrors: 0, scripts: 0, externalRefs: 0, foreignObject: 0, embeddedRaster: 0, missingViewBox: 0, oversizeAssets: 0 };
  const files = src.files ?? {};
  const count = Object.keys(files).length;
  if (count < ORNAMENT_LIBRARY_MIN || count > ORNAMENT_LIBRARY_MAX) errors.push("ORNAMENT_LIBRARY_SIZE");
  const styles = new Set();
  for (const [file, text] of Object.entries(files)) {
    stats.files += 1;
    if (!/^ornament-[a-z]+(?:-[a-z]+)*\.svg$/.test(file)) errors.push("ORNAMENT_FILE_NAME");
    if (Buffer.byteLength(text, "utf8") > ORNAMENT_MAX_BYTES) {
      stats.oversizeAssets += 1;
      errors.push("ORNAMENT_OVERSIZE");
    }
    if (/<script/i.test(text) || /javascript:/i.test(text)) {
      stats.scripts += 1;
      errors.push("ORNAMENT_SCRIPT");
    }
    if (/<foreignObject/i.test(text)) {
      stats.foreignObject += 1;
      errors.push("ORNAMENT_FOREIGN_OBJECT");
    }
    if (/<image\b/i.test(text) || /data:|;base64,/i.test(text)) {
      stats.embeddedRaster += 1;
      errors.push("ORNAMENT_EMBEDDED_RASTER");
    }
    if (
      /\b(?:href|xlink:href)\s*=/i.test(text) ||
      /url\(/i.test(text) ||
      /https?:|\/\/[a-z]/i.test(text.replace('xmlns="http://www.w3.org/2000/svg"', "")) ||
      /@import/i.test(text)
    ) {
      stats.externalRefs += 1;
      errors.push("ORNAMENT_EXTERNAL_REF");
    }
    if (/@font-face|<font\b|font-family/i.test(text)) errors.push("ORNAMENT_EMBEDDED_FONT");
    if (/<(?:text|tspan|textPath)\b/i.test(text)) errors.push("ORNAMENT_TEXT");
    if (/<(?:animate|animateTransform|animateMotion|set)\b/i.test(text)) errors.push("ORNAMENT_SMIL");
    if (/<!--|<\?|<!\[CDATA\[/.test(text)) errors.push("ORNAMENT_COMMENT_OR_PROLOG");
    if (/\sid="/.test(text)) errors.push("ORNAMENT_HAS_IDS");
    if (/\son[a-z]+\s*=/i.test(text)) errors.push("ORNAMENT_EVENT_HANDLER");
    const parsed = parseSvg(text);
    if (!parsed.ok) {
      stats.parseErrors += 1;
      errors.push("ORNAMENT_PARSE_FAILED");
      continue;
    }
    stats.parsed += 1;
    const root = parsed.root;
    if (!root.attrs.viewBox) {
      stats.missingViewBox += 1;
      errors.push("ORNAMENT_MISSING_VIEWBOX");
    }
    if (root.attrs.fill !== "none") errors.push("ORNAMENT_NOT_TRANSPARENT");
    const id = file.replace(/^ornament-/, "").replace(/\.svg$/, "");
    if (root.attrs["data-lyo-ornament"] !== id) errors.push("ORNAMENT_ID_MISMATCH");
    let draws = 0;
    walk(root, (node) => {
      if (!ORNAMENT_ELEMENTS.has(node.name)) errors.push("ORNAMENT_FORBIDDEN_ELEMENT");
      if (node.name === "rect" && node.attrs.width && node.attrs.height && Number(node.attrs.width) >= 0.95 * Number(root.attrs.viewBox?.split(/\s+/)[2])) {
        errors.push("ORNAMENT_NOT_TRANSPARENT");
      }
      if (node.name !== "svg" && node.name !== "style" && node.name !== "g") {
        draws += 1;
        const cls = node.attrs.class ?? "";
        const role = cls.match(/^lyo-[fs]-([a-z-]+)$/)?.[1];
        if (!role || !ORNAMENT_ROLES.includes(role)) errors.push("ORNAMENT_UNKNOWN_ROLE");
        if (node.attrs.fill || node.attrs.stroke || node.attrs.style) errors.push("ORNAMENT_HARDCODED_COLOR");
      }
    });
    if (draws === 0) errors.push("ORNAMENT_EMPTY");
    styles.add(text.match(/<style>[\s\S]*?<\/style>/)?.[0] ?? "");
  }
  if (styles.size > 1) errors.push("ORNAMENT_PALETTE_DRIFT");
  return { errors: uniq(errors), stats };
}

/* ------------------------------------------------------------------ */
/* 2. System (validate:chinese-ornamental-system)                     */
/* ------------------------------------------------------------------ */

export function evaluateOrnamentModules(src) {
  try {
    const registry = evalSource(src.registry);
    const sceneMarkup = evalSource(read("src/features/journey/scenes/journeySceneMarkup.ts"));
    const markup = evalSource(src.markup, { requires: { "../../../features/journey/scenes/journeySceneMarkup": sceneMarkup } });
    return { ok: true, registry, markup };
  } catch (error) {
    return { ok: false, error: String(error?.message ?? error) };
  }
}

/** Hostile inputs the preparer must refuse whole. */
export const HOSTILE_ORNAMENTS = [
  '<svg viewBox="0 0 10 10" fill="none"><script>alert(1)</script></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><path class="lyo-s-thread" d="M0 0" onload="x()"/></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><image href="https://x.test/a.png"/></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><foreignObject></foreignObject></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><!-- <script> --><path class="lyo-s-thread" d="M0 0"/></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><style>@import url(https://x.test/a.css)</style></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><path id="a" class="lyo-s-thread" d="M0 0"/></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><style>.a{}</style><style>.b{}</style></svg>',
  '<svg viewBox="0 0 10 10" fill="none"><style>.a{}<path d="M0 0"/></svg>',
];

function usagesIn(text) {
  const out = [];
  const re = /<(ChineseOrnamentalFrame|ChineseOrnamentalDivider|ChineseCornerMotif|CompletionBurst|ChineseOrnament)\b([^>]*?)\/?>/g;
  for (const m of String(text).matchAll(re)) {
    const attrs = m[2];
    const pick = (name) => attrs.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? null;
    out.push({ component: m[1], index: m.index, surface: pick("surface"), motif: pick("motif"), id: pick("id"), intensity: pick("intensity") });
  }
  return out;
}

const DIVIDER_IDS = { xiangyun: "xiangyun-divider", knot: "knot-divider", lattice: "lattice-divider", huiwen: "huiwen-strip" };
const CORNER_IDS = { xiangyun: "xiangyun-corner", ruyi: "ruyi-corner", plum: "plum-corner", bamboo: "bamboo-corner", lattice: "lattice-frame", huiwen: "huiwen-frame" };

export function checkOrnamentSystem(src) {
  const errors = [];
  const evaluated = evaluateOrnamentModules(src);
  if (!evaluated.ok) return ["ORNAMENT_REGISTRY_UNLOADABLE"];
  const { registry, markup } = evaluated;
  const ids = registry.CHINESE_ORNAMENT_IDS ?? [];
  const entries = registry.CHINESE_ORNAMENTS ?? [];
  const surfaces = registry.ORNAMENT_SURFACES ?? [];
  if (new Set(ids).size !== ids.length || ids.length !== entries.length) errors.push("ORNAMENT_REGISTRY_DRIFT");
  if (ids.length < ORNAMENT_LIBRARY_MIN || ids.length > ORNAMENT_LIBRARY_MAX) errors.push("ORNAMENT_LIBRARY_SIZE");
  const files = src.files ?? {};
  for (const entry of entries) {
    if (!ids.includes(entry.id) || entry.file !== `ornament-${entry.id}.svg`) errors.push("ORNAMENT_REGISTRY_DRIFT");
    const text = files[entry.file];
    if (!text) {
      errors.push("ORNAMENT_ASSET_MISSING");
      continue;
    }
    const vb = text.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    const aspect = vb ? Number(vb[1]) / Number(vb[2]) : NaN;
    if (!(Math.abs(aspect - entry.aspect) < 0.01)) errors.push("ORNAMENT_STRETCHED");
    for (const s of entry.surfaces ?? []) if (!surfaces.includes(s)) errors.push("ORNAMENT_SURFACE_UNKNOWN");
    for (const i of entry.intensities ?? []) if (!["subtle", "medium", "milestone"].includes(i)) errors.push("ORNAMENT_INTENSITY_UNKNOWN");
  }
  for (const file of Object.keys(files)) {
    if (!entries.some((e) => e.file === file)) errors.push("ORNAMENT_UNREGISTERED");
  }
  const opacity = registry.ORNAMENT_OPACITY ?? {};
  if (!(opacity.subtle >= 0.08 && opacity.subtle <= 0.18)) errors.push("ORNAMENT_OPACITY_BAND");
  if (!(opacity.medium >= 0.16 && opacity.medium <= 0.3)) errors.push("ORNAMENT_OPACITY_BAND");
  if (!(opacity.milestone >= 0.35 && opacity.milestone <= 0.6)) errors.push("ORNAMENT_OPACITY_BAND");
  const density = registry.ORNAMENT_DENSITY ?? {};
  for (const s of surfaces) {
    const cap = s === "qa-gallery" ? ORNAMENT_LIBRARY_MAX : 3;
    if (!(density[s] >= 1 && density[s] <= cap)) errors.push("ORNAMENT_DENSITY_BUDGET");
  }
  for (const forbidden of ["answer-option", "settings", "form-field", "account", "list-row", "button", "modal"]) {
    if (!(registry.ORNAMENT_FORBIDDEN_SURFACES ?? []).includes(forbidden) || surfaces.includes(forbidden)) errors.push("ORNAMENT_FORBIDDEN_SURFACE");
  }
  const frameCorner = registry.FRAME_CORNER ?? {};
  for (const motif of ["xiangyun", "huiwen", "lattice", "ruyi", "plum", "seal"]) {
    const id = frameCorner[motif];
    const entry = entries.find((e) => e.id === id);
    if (!entry || !["corner", "medallion"].includes(entry.kind)) errors.push("FRAME_MOTIF_UNMAPPED");
  }
  // CSS intensities mirror the registry bands.
  const section = livingCssSection(src.css);
  for (const [name, value] of Object.entries(opacity)) {
    const m = section.match(new RegExp(`\\.lyo\\[data-intensity="${name}"\\] \\{\\s*opacity: ([\\d.]+);`));
    if (!m || Math.abs(Number(m[1]) - value) > 1e-9) errors.push("ORNAMENT_OPACITY_BAND");
  }

  // Markup preparer: refuses unsafe input whole; marks decoration.
  for (const sample of HOSTILE_ORNAMENTS) {
    if (markup.prepareOrnamentMarkup(sample) !== null) errors.push("ORNAMENT_UNSAFE_MARKUP_ACCEPTED");
  }
  const sampleFile = files["ornament-knot-divider.svg"] ?? Object.values(files)[0] ?? "";
  const prepared = sampleFile ? markup.prepareOrnamentMarkup(sampleFile) : null;
  if (!prepared) errors.push("ORNAMENT_SAFE_MARKUP_REFUSED");
  else {
    if (!/aria-hidden="true"/.test(prepared)) errors.push("ORNAMENT_ANNOUNCED");
    if (!/focusable="false"/.test(prepared)) errors.push("ORNAMENT_FOCUSABLE");
    if (/<style/.test(prepared)) errors.push("ORNAMENT_PALETTE_LEAKS");
    if (/<svg[^>]*\s(?:width|height)="/.test(prepared)) errors.push("ORNAMENT_FIXED_SIZE");
    if (!/preserveAspectRatio="xMidYMid meet"/.test(prepared)) errors.push("ORNAMENT_STRETCHED");
  }
  if (!/isSceneMarkupSafe\(raw\)/.test(src.markup)) errors.push("ORNAMENT_SANITIZER_FORKED");
  if (/\.replace\(\/<(?:script|foreignObject|!--)/i.test(src.markup)) errors.push("ORNAMENT_REGEX_SANITIZING");

  // Components: decorative, never focusable, never a wrapper.
  for (const key of ["ornament", "frame", "divider", "corner", "completionBurst"]) {
    const code = stripComments(src[key]);
    if (!/aria-hidden="true"/.test(code)) errors.push("ORNAMENT_ANNOUNCED");
    if (/tabIndex|role=|aria-label|onClick|<button|<a\s|href=/.test(code)) errors.push("ORNAMENT_FOCUSABLE");
  }
  if (!/dangerouslySetInnerHTML=\{\{ __html: markup \}\}/.test(src.ornament) || !/ornamentMarkupFor\(id\)/.test(src.ornament)) {
    errors.push("ORNAMENT_UNPREPARED_MARKUP");
  }
  if (/children/.test(stripComments(src.frame)) || /children/.test(stripComments(src.corner))) errors.push("ORNAMENT_WRAPS_CONTENT");
  if (/fetch\(|https?:\/\/|new Image\(|<img/.test(stripComments(src.ornament + src.markup))) errors.push("ORNAMENT_EXTERNAL_REF");
  if (!/import\.meta\.glob<string>\("\.\.\/\.\.\/\.\.\/assets\/ornaments\/chinese\/\*\.svg"[\s\S]{0,120}eager: true/.test(src.ornament)) {
    errors.push("ORNAMENT_NOT_BUNDLED");
  }

  // CSS: layout-neutral overlay, reserved divider height, no taps.
  if (!/\.lyo-frame \{\s*position: absolute;\s*inset: 0;\s*z-index: -1;/.test(section)) errors.push("ORNAMENT_FRAME_CHANGES_LAYOUT");
  if (!/\.lyo-corner-motif \{\s*position: absolute;\s*inset: 0;\s*z-index: -1;/.test(section)) errors.push("ORNAMENT_FRAME_CHANGES_LAYOUT");
  if (!/\.lyo-divider \{[^}]*height: 12px;/.test(section)) errors.push("ORNAMENT_DIVIDER_SHIFTS_LAYOUT");
  if (!/\.lyo \{[^}]*pointer-events: none;/.test(section)) errors.push("ORNAMENT_INTERACTIVE");
  for (const m of section.matchAll(/--lyo-corner-size: ([\d.]+)px/g)) if (Number(m[1]) > 48) errors.push("ORNAMENT_OBSCURES_CONTENT");

  // Surfaces: only meaningful hosts, within density, asset allowed there.
  const users = src.users ?? {};
  for (const [file, text] of Object.entries(users)) {
    if (file.startsWith("src/components/motion/")) continue;
    const allowed = ORNAMENT_HOSTS[file];
    if (!allowed) {
      errors.push("ORNAMENT_SURFACE_FORBIDDEN");
      continue;
    }
    const perSurface = {};
    for (const use of usagesIn(text)) {
      const surface = use.component === "CompletionBurst" ? (file.endsWith("LivingUiQaPanel.tsx") ? "qa-gallery" : "victory") : use.surface;
      if (use.component === "ChineseOrnament" && file.endsWith("LivingUiQaPanel.tsx")) continue;
      if (!surface || !allowed.includes(surface)) {
        errors.push("ORNAMENT_SURFACE_FORBIDDEN");
        continue;
      }
      perSurface[surface] = (perSurface[surface] ?? 0) + 1;
      let assetId = null;
      if (use.component === "ChineseOrnamentalFrame") assetId = frameCorner[use.motif];
      if (use.component === "ChineseOrnamentalDivider") assetId = DIVIDER_IDS[use.motif];
      if (use.component === "ChineseCornerMotif") assetId = CORNER_IDS[use.motif];
      if (use.component === "CompletionBurst") assetId = "seal-medallion";
      const entry = entries.find((e) => e.id === assetId);
      if (!entry || !entry.surfaces.includes(surface)) errors.push("ORNAMENT_SURFACE_NOT_ALLOWED_FOR_ASSET");
      if (use.intensity && entry && !entry.intensities.includes(use.intensity)) errors.push("ORNAMENT_INTENSITY_NOT_ALLOWED");
      if (use.component === "ChineseOrnamentalFrame" || use.component === "ChineseCornerMotif" || use.component === "CompletionBurst") {
        const before = text.slice(Math.max(0, use.index - 900), use.index);
        if (!/\bisolate\b/.test(before)) errors.push("ORNAMENT_HOST_NOT_ISOLATED");
      }
    }
    for (const [surface, n] of Object.entries(perSurface)) if (n > (density[surface] ?? 0)) errors.push("ORNAMENT_DENSITY_EXCEEDED");
  }
  // Ordinary cards/lists/controls never carry ornaments.
  for (const key of ["cultureCard", "primitives", "modal", "steps", "tabBar", "topBar"]) {
    if (/Chinese(?:OrnamentalFrame|OrnamentalDivider|CornerMotif|Ornament)\b|lyo-frame/.test(stripComments(src[key] ?? ""))) {
      errors.push("ORNAMENT_EVERY_CARD");
    }
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 3. Motion (validate:living-ui-motion)                              */
/* ------------------------------------------------------------------ */

function tokenMs(css, name) {
  const m = String(css).match(new RegExp(`--${name}:\\s*([\\d.]+)(ms|s);`));
  if (!m) return NaN;
  return m[2] === "s" ? Number(m[1]) * 1000 : Number(m[1]);
}

/** Resolves `var(--x)`, `calc(var(--x) * n)` and plain values to milliseconds. */
function durationMs(expr, css) {
  const e = String(expr).trim();
  const v = e.match(/^var\(--([\w-]+)\)$/);
  if (v) return tokenMs(css, v[1]);
  const c = e.match(/^calc\(var\(--([\w-]+)\) \* ([\d.]+)\)$/);
  if (c) return tokenMs(css, c[1]) * Number(c[2]);
  const raw = e.match(/^([\d.]+)(ms|s)$/);
  if (raw) return raw[2] === "s" ? Number(raw[1]) * 1000 : Number(raw[1]);
  return NaN;
}

const noCssComments = (css) => String(css).replace(/\/\*[\s\S]*?\*\//g, "");

function stripReduced(section) {
  const clean = noCssComments(section);
  const i = clean.indexOf("@media (prefers-reduced-motion: reduce)");
  return i < 0 ? clean : clean.slice(0, i);
}

function reducedBlock(section) {
  const i = section.indexOf("@media (prefers-reduced-motion: reduce)");
  return i < 0 ? "" : section.slice(i);
}

/** `selector { ... animation: ... }` rules outside the reduced block. */
function animationRules(section) {
  const out = [];
  const body = stripReduced(section);
  for (const m of body.matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, " ");
    const decl = m[2];
    const anim = decl.match(/(?:^|[;\s])animation:\s*([^;]+);/);
    if (anim && !/^\s*(?:from|to|\d+%)/.test(selector)) out.push({ selector, animation: anim[1].trim(), decl });
  }
  return out;
}

export function checkLivingMotion(src) {
  const errors = [];
  const section = livingCssSection(src.css);
  if (!section) return ["LIVING_CSS_SECTION_MISSING"];
  let motion;
  try {
    motion = motionModule(src);
  } catch {
    return ["MOTION_MODULE_UNLOADABLE"];
  }
  const ms = motion.MOTION_MS ?? {};
  if (!(ms.instant >= 80 && ms.instant <= 120)) errors.push("MOTION_TOKEN_OUT_OF_BAND");
  if (!(ms.fast >= 130 && ms.fast <= 170)) errors.push("MOTION_TOKEN_OUT_OF_BAND");
  if (!(ms.normal >= 190 && ms.normal <= 240)) errors.push("MOTION_TOKEN_OUT_OF_BAND");
  if (!(ms.emphasis >= 260 && ms.emphasis <= 360)) errors.push("MOTION_TOKEN_OUT_OF_BAND");
  if (!(ms.celebrate > 0 && ms.celebrate <= 1200)) errors.push("CELEBRATION_TOO_LONG");
  if (!(motion.AMBIENT_MS?.min >= 5000 && motion.AMBIENT_MS?.max <= 10000)) errors.push("MOTION_TOKEN_OUT_OF_BAND");
  if (!(motion.COMPLETION_PARTICLES >= 4 && motion.COMPLETION_PARTICLES <= 8)) errors.push("INFINITE_CONFETTI");
  // TS mirrors CSS.
  const css = src.css ?? "";
  for (const k of ["instant", "fast", "normal", "emphasis"]) if (tokenMs(css, `motion-${k}`) !== ms[k]) errors.push("MOTION_TOKEN_DRIFT");
  if (Math.abs(tokenMs(section, "motion-celebrate") - ms.celebrate) > 0.5) errors.push("MOTION_TOKEN_DRIFT");
  for (const name of ["motion-ambient", "motion-ambient-slow"]) {
    const v = tokenMs(section, name);
    if (!(v >= 5000 && v <= 10000)) errors.push("MOTION_TOKEN_OUT_OF_BAND");
  }
  const current = tokenMs(section, "motion-ambient-current");
  if (!(current >= 3500 && current <= 5000)) errors.push("CURRENT_NODE_PULSE_TOO_FAST");
  if (!/--ease-ambient:\s*cubic-bezier/.test(section) || !/--ease-spring-soft:\s*cubic-bezier/.test(section)) errors.push("EASING_ROLE_MISSING");

  // Durations come from tokens; nothing arbitrary or long.
  const body = stripReduced(section);
  const noRoot = body.replace(/:root \{[^}]*\}/, "");
  for (const m of noRoot.matchAll(/(?:animation|transition)(?:-duration)?:\s*([^;]+);/g)) {
    const value = m[1];
    if (/\b\d+(?:\.\d+)?m?s\b/.test(value.replace(/var\([^)]*\)/g, "").replace(/calc\([^)]*\)/g, ""))) errors.push("ARBITRARY_DURATION");
  }
  for (const rule of animationRules(section)) {
    const parts = rule.animation.split(/\s+(?![^(]*\))/);
    const duration = durationMs(parts[1] ?? "", css + section);
    const infinite = /\binfinite\b/.test(rule.animation);
    if (!infinite && !(duration > 0 && duration <= 1200)) errors.push("ARBITRARY_LONG_TRANSITION");
    if (infinite && !/\[data-ambient="run"\]/.test(rule.selector) && !STATUS_LOOPS.includes(rule.selector)) errors.push("AMBIENT_OUTSIDE_BUDGET");
  }
  // Victory burst ends within the celebration budget.
  for (const rule of animationRules(section).filter((r) => /lyo-burst/.test(r.selector))) {
    const parts = rule.animation.split(/\s+(?![^(]*\))/);
    const duration = durationMs(parts[1], css + section);
    const delayExpr = parts.find((p, i) => i > 2 && /var\(--|calc\(|ms$/.test(p) && !/ease/.test(p));
    const delay = /petal-delay/.test(delayExpr ?? "") ? 300 : durationMs(delayExpr ?? "0ms", css + section) || 0;
    if (!(duration + delay <= ms.celebrate)) errors.push("CELEBRATION_TOO_LONG");
  }
  if (/infinite/.test(animationRules(section).filter((r) => /lyo-burst/.test(r.selector)).map((r) => r.animation).join(" "))) errors.push("INFINITE_CONFETTI");
  const petals = (src.completionBurst.match(/\{ x: -?\d+, y: -?\d+, rot: -?\d+, delay: \d+ \}/g) ?? []).length;
  if (petals < 4 || petals > 8 || !/PETALS\.slice\(0, COMPLETION_PARTICLES\)/.test(src.completionBurst)) errors.push("INFINITE_CONFETTI");

  // Reduced motion: every animated selector in the block is stilled.
  const reduced = reducedBlock(section);
  if (!reduced) errors.push("REDUCED_MOTION_IGNORED");
  for (const rule of animationRules(section)) {
    if (rule.selector.startsWith(":where(.living-overlay)")) continue;
    const names = rule.selector.split(",").map((s) => s.trim());
    for (const name of names) {
      const base = name.replace(/\[data-ambient="run"\]/, "").replace(/\[data-play="true"\]/, "").trim();
      const candidates = [name, base, base.split(" ").pop()];
      if (!candidates.some((c) => c && reduced.includes(c))) errors.push("REDUCED_MOTION_IGNORED");
    }
  }
  if (!/:where\(\.living-overlay\) > :where\(\*\) \{\s*animation-name: living-fade-in;/.test(reduced)) errors.push("REDUCED_MOTION_IGNORED");
  // The first reduced-motion block (parsed by older gates) stays first.
  const firstReduced = css.indexOf("@media (prefers-reduced-motion: reduce)");
  if (firstReduced < 0 || css.indexOf(CSS_START) < firstReduced) errors.push("REDUCED_MOTION_BLOCK_REORDERED");

  // No business logic bound to animation completion; motion never writes state.
  const motionFiles = ["livingUiMotion", "ambientBudget", "valueDelta", "sessionOnce", "animatedCounter", "progressFill", "completionBurst", "ornament", "frame", "divider", "corner"];
  for (const key of motionFiles) {
    const code = stripComments(src[key]);
    if (/onAnimationEnd|onTransitionEnd|animationend|transitionend|\.finished\b|onfinish/.test(code)) errors.push("BUSINESS_ON_ANIMATION_END");
    if (/lib\/store|useStore|haptic|soundFx|playSoundFx|playMandarin|claimReward|recordDailyTask|setLessonXp|completeLesson|grantXp|finishLessonAttempt/.test(code)) {
      errors.push("MOTION_TOUCHES_BUSINESS");
    }
  }
  // Presentational components never wait on timers (motion follows state).
  for (const key of ["animatedCounter", "progressFill", "completionBurst", "ornament", "frame", "divider", "corner"]) {
    if (/setTimeout\(|setInterval\(/.test(stripComments(src[key]))) errors.push("MOTION_TIMER_GATES_STATE");
  }
  if (/\b(?:on[A-Z]\w*)\??:/.test(src.completionBurst.match(/export function CompletionBurst\(\{[^}]*\}: \{[^}]*\}/)?.[0] ?? "")) {
    errors.push("BUSINESS_ON_ANIMATION_END");
  }
  if (/haptic|soundFx|useStore/.test(stripComments(src.animatedCounter + src.progressFill))) errors.push("MOTION_TOUCHES_BUSINESS");

  // Audio: the playing ring is presentation on the same element — never a remount.
  if (!/data-audio-playing=\{playing \? "true" : undefined\}/.test(src.speakButton) || /key=\{[^}]*playing/.test(src.speakButton)) {
    errors.push("AUDIO_REMOUNT_BY_MOTION");
  }
  if (/playMandarinAudio|scheduleAutoSpeak|cancelAllMandarinSpeech|requestMandarinSpeech/.test(stripComments(src.animatedCounter + src.progressFill + src.completionBurst + src.ambientBudget))) {
    errors.push("AUDIO_REMOUNT_BY_MOTION");
  }

  // Input is never blocked by motion.
  if (/\.living-overlay[^{]*\{[^}]*pointer-events:\s*none/.test(section) || /\[data-button-variant\][^{]*\{[^}]*pointer-events:\s*none/.test(section)) {
    errors.push("MOTION_BLOCKS_INPUT");
  }
  if (!/:where\(\.living-overlay\)/.test(section) || !/living-overlay fixed inset-0/.test(src.modal)) errors.push("MODAL_MOTION_UNSTANDARDIZED");
  if (/\.living-overlay \{|\.living-overlay > \*/.test(section)) errors.push("MODAL_MOTION_OVERRIDES_PANELS");
  for (const m of stripReduced(section).matchAll(/([^{}@]+)\{([^{}]*)\}/g)) {
    if (!/transform:\s*(?:translateY\([^)]*\)\s*)?scale/.test(m[2])) continue;
    for (const part of m[1].split(",")) {
      const positive = part.replace(/:not\([^)]*\)/g, "");
      if (/:disabled|\[disabled\]|aria-disabled/.test(positive)) errors.push("DISABLED_FAKE_PRESS");
    }
  }
  if (!/\[data-button-variant\]:active:not\(:disabled\)/.test(section)) errors.push("BUTTON_MOTION_UNSTANDARDIZED");

  // Current node: slow halo only; the node itself never bounces.
  const halo = section.match(/@keyframes living-halo-breathe \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const scales = [...halo.matchAll(/scale\(([\d.]+)\)/g)].map((m) => Number(m[1]));
  if (!scales.length || Math.max(...scales) > 1.025) errors.push("CURRENT_NODE_AGGRESSIVE_BOUNCE");
  const ops = [...halo.matchAll(/opacity: ([\d.]+)/g)].map((m) => Number(m[1]));
  if (!ops.length || Math.min(...ops) < 0.3 || Math.max(...ops) > 0.6) errors.push("CURRENT_NODE_AGGRESSIVE_BOUNCE");
  if (/animate-(?:bounce|ping|pulse)/.test(stripComments(src.bubble))) errors.push("CURRENT_NODE_AGGRESSIVE_BOUNCE");
  if (!/\.living-halo\[data-ambient="run"\] \{\s*animation: living-halo-breathe var\(--motion-ambient-current\)/.test(section)) {
    errors.push("CURRENT_NODE_AGGRESSIVE_BOUNCE");
  }

  // Learning feedback: restrained wrong cue, continuous steps.
  const shake = css.match(/@keyframes longyu-error-shake \{([\s\S]*?)\n\}/)?.[1] ?? "";
  const amps = [...shake.matchAll(/translateX\((-?[\d.]+)px\)/g)].map((m) => Math.abs(Number(m[1])));
  if (!amps.length || Math.max(...amps) > 3) errors.push("AGGRESSIVE_WRONG_SHAKE");
  const stepFrom = css.match(/@keyframes longyu-step-in \{[\s\S]*?from \{\s*opacity: ([\d.]+);/);
  if (!stepFrom || Number(stepFrom[1]) < 0.3) errors.push("STEP_BLANK_FRAME");
  if (!/\[data-option-index\]\[data-selected="true"\] \{\s*animation: living-select-press var\(--motion-fast\)/.test(section)) errors.push("ANSWER_SELECTION_FEEDBACK_MISSING");
  if (/\[data-option-index\]\[data-selected="true"\][^{]*\{[^}]*(?:wrong|shake)/.test(section)) errors.push("VERDICT_BEFORE_RESULT");

  // Segment indicator slides once (no overshoot) on in-app switches.
  if (!/thumbSlideFrom = mode;/.test(src.shell) || !/thumbMode === "culture" \?/.test(src.shell)) errors.push("SEGMENT_INDICATOR_SNAPS");
  if (!/\[data-motion="segment-indicator"\] \{\s*transition-duration: var\(--motion-normal\);/.test(section)) errors.push("SEGMENT_INDICATOR_SNAPS");
  if (/segment-indicator[^}]*ease-spring/.test(section)) errors.push("SEGMENT_INDICATOR_OVERSHOOT");

  // Counters / progress: real deltas only (behavioural).
  errors.push(...checkDeltaBehaviour(src));
  if (!/delta=\{\{ id: "topbar-streak", value: streak \}\}/.test(src.topBar) || !/<AnimatedCounter id=\{delta\.id\} value=\{delta\.value\}/.test(src.topBar)) {
    errors.push("TOPBAR_DELTA_MISSING");
  }
  if (/transition-\[width\]/.test(src.primitives) || !/<ProgressFill/.test(src.primitives)) errors.push("PROGRESS_REPLAYS_FROM_ZERO");
  // Victory XP counts the earned delta only on a first show.
  if (!/if \(reducedMotion \|\| !firstShow\) \{\s*setShownXp\(xp\);/.test(src.victory)) errors.push("XP_COUNTS_EVERY_OPEN");
  if (!/<CompletionBurst play=\{firstShow && !reducedMotion\} \/>/.test(src.victory)) errors.push("COMPLETION_REPLAYS");
  return uniq(errors);
}

/** Runs valueDelta / AnimatedCounter / ProgressFill against the hook runtime. */
export function checkDeltaBehaviour(src) {
  const errors = [];
  let motion;
  try {
    motion = motionModule(src);
  } catch {
    return ["MOTION_MODULE_UNLOADABLE"];
  }
  // valueDelta
  try {
    const rt = makeHookRuntime();
    const delta = evalSource(src.valueDelta, { requires: { react: rt.React } });
    if (delta.deltaDirection(undefined, 5) !== null) errors.push("COUNTER_ANIMATES_ON_MOUNT");
    if (delta.deltaDirection(5, 5) !== null) errors.push("COUNTER_ANIMATES_EVERY_RENDER");
    if (delta.deltaDirection(5, 7) !== "up" || delta.deltaDirection(7, 5) !== "down") errors.push("COUNTER_DELTA_LOST");
    const Probe = ({ value }) => delta.useValueDelta("xp", value);
    const first = rt.render(Probe, { value: 120 });
    if (first.key !== 0) errors.push("COUNTER_ANIMATES_ON_MOUNT");
    const same = rt.render(Probe, { value: 120 });
    if (same.key !== 0) errors.push("COUNTER_ANIMATES_EVERY_RENDER");
    const changed = rt.render(Probe, { value: 130 });
    if (changed.key !== 1 || changed.direction !== "up") errors.push("COUNTER_DELTA_LOST");
    rt.unmount();
    // Remount (Home opened again) with the same module state: no replay.
    const rt2 = makeHookRuntime();
    const delta2 = evalSource(src.valueDelta, { requires: { react: rt2.React } });
    const Probe2 = ({ value }) => delta2.useValueDelta("xp", value);
    rt2.render(Probe2, { value: 130 });
    const reopened = rt2.render(Probe2, { value: 130 });
    if (reopened.key !== 0) errors.push("COUNTER_ANIMATES_ON_MOUNT");
  } catch {
    errors.push("COUNTER_DELTA_LOST");
  }
  // AnimatedCounter: element.animate only after a real change.
  try {
    const rt = makeHookRuntime();
    const delta = evalSource(src.valueDelta, { requires: { react: rt.React } });
    const counter = evalSource(src.animatedCounter, {
      jsx: true,
      requires: { react: rt.React, "../../lib/motion/livingUiMotion": motion, "../../lib/motion/valueDelta": delta },
      globals: { React: rt.React },
    });
    let animations = 0;
    const el = { animate: () => ((animations += 1), { cancel() {} }) };
    const Wrapped = (props) => {
      const tree = counter.AnimatedCounter(props);
      if (tree?.props?.ref) tree.props.ref.current = el;
      return tree;
    };
    rt.render(Wrapped, { id: "qi", value: 10, children: "10" });
    rt.render(Wrapped, { id: "qi", value: 10, children: "10" });
    if (animations !== 0) errors.push("COUNTER_ANIMATES_EVERY_RENDER");
    rt.render(Wrapped, { id: "qi", value: 11, children: "11" });
    if (animations !== 1) errors.push("COUNTER_DELTA_LOST");
  } catch {
    errors.push("COUNTER_DELTA_LOST");
  }
  // ProgressFill: first paint is the true value; a change moves once.
  try {
    const rt = makeHookRuntime();
    const fill = evalSource(src.progressFill, {
      jsx: true,
      requires: { react: rt.React, "../../lib/motion/livingUiMotion": motion },
      globals: { React: rt.React, requestAnimationFrame: (cb) => (cb(0), 1), cancelAnimationFrame: () => {} },
    });
    const style = (tree) => findElement(tree, (n) => n.props && "data-progress-fill" in n.props)?.props?.style ?? {};
    const first = style(rt.render(fill.ProgressFill, { id: "topic", value: 42 }));
    if (first.transform !== "translateX(-58%)" || first.transition) errors.push("PROGRESS_REPLAYS_FROM_ZERO");
    const again = style(rt.render(fill.ProgressFill, { id: "topic", value: 42 }));
    if (again.transition) errors.push("PROGRESS_REPLAYS_FROM_ZERO");
    const moved = style(rt.render(fill.ProgressFill, { id: "topic", value: 50 }));
    if (moved.transform !== "translateX(-50%)" || !/transform var\(--motion-emphasis\)/.test(moved.transition ?? "")) errors.push("PROGRESS_DELTA_LOST");
    if (/width/.test(String(moved.transition)) || "width" in moved) errors.push("LAYOUT_PROPERTY_ANIMATION");
    // Remount with the same id and value: no movement.
    const rt2 = makeHookRuntime();
    const fill2 = evalSource(src.progressFill, {
      jsx: true,
      requires: { react: rt2.React, "../../lib/motion/livingUiMotion": motion },
      globals: { React: rt2.React, requestAnimationFrame: (cb) => (cb(0), 1), cancelAnimationFrame: () => {} },
    });
    const remount = style(rt2.render(fill2.ProgressFill, { id: "topic2", value: 30 }));
    if (remount.transform !== "translateX(-70%)" || remount.transition) errors.push("PROGRESS_REPLAYS_FROM_ZERO");
  } catch {
    errors.push("PROGRESS_DELTA_LOST");
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 4. Ambient budget (validate:ambient-motion-budget)                 */
/* ------------------------------------------------------------------ */

export function checkAmbientBudget(src) {
  const errors = [];
  let motion;
  let budget;
  try {
    motion = motionModule(src);
    budget = evalSource(src.ambientBudget, { requires: { react: { useEffect() {} }, "./livingUiMotion": motion } });
  } catch {
    return ["AMBIENT_BUDGET_UNLOADABLE"];
  }
  const max = motion.MAX_VISIBLE_AMBIENT_ANIMATIONS;
  if (!(max >= 1 && max <= MAX_AMBIENT)) errors.push("AMBIENT_BUDGET_EXCEEDED");
  const p = motion.AMBIENT_PRIORITY ?? {};
  if (!(p.currentNode < p.scene && p.scene < p.ornament)) errors.push("AMBIENT_PRIORITY_INVERTED");
  // 10 pulsing + 8 floating + 4 glowing, all on screen.
  let id = 1;
  const crowd = [
    ...Array.from({ length: 10 }, () => ({ id: id++, priority: p.currentNode, visible: true })),
    ...Array.from({ length: 8 }, () => ({ id: id++, priority: p.scene, visible: true })),
    ...Array.from({ length: 4 }, () => ({ id: id++, priority: p.ornament, visible: true })),
  ];
  const granted = budget.allocateAmbientSlots(crowd, max, false);
  if (granted.size > MAX_AMBIENT || granted.size > max) errors.push("AMBIENT_BUDGET_EXCEEDED");
  if ([...granted].some((g) => g > 10)) errors.push("AMBIENT_PRIORITY_INVERTED");
  const offscreen = budget.allocateAmbientSlots([{ id: 1, priority: 0, visible: false }, { id: 2, priority: 2, visible: true }], max, false);
  if (offscreen.has(1) || !offscreen.has(2)) errors.push("AMBIENT_RUNS_OFFSCREEN");
  if (budget.allocateAmbientSlots(crowd, max, true).size !== 0) errors.push("AMBIENT_RUNS_WHILE_HIDDEN");
  const scenesOnly = budget.allocateAmbientSlots(
    Array.from({ length: 40 }, (_, i) => ({ id: i + 1, priority: p.scene, visible: true })),
    max,
    false,
  );
  if (scenesOnly.size > max) errors.push("AMBIENT_BUDGET_EXCEEDED");

  const code = stripComments(src.ambientBudget);
  if (!/document\.addEventListener\("visibilitychange", schedule\)/.test(code)) errors.push("AMBIENT_RUNS_WHILE_HIDDEN");
  if (!/const paused = documentHidden\(\) \|\| prefersReducedMotion\(\);/.test(code)) errors.push("AMBIENT_RUNS_WHILE_HIDDEN");
  if (!/new IntersectionObserver\(/.test(code) || !/rootMargin: NEAR_VIEWPORT/.test(code)) errors.push("AMBIENT_RUNS_OFFSCREEN");
  if (!/entry\.visible = record\.isIntersecting;/.test(code)) errors.push("AMBIENT_RUNS_OFFSCREEN");
  if (!/subscribeReducedMotion\(schedule\)/.test(code)) errors.push("REDUCED_MOTION_IGNORED");
  // Registration sites.
  if (!/useAmbientMotion\(ref, "currentNode"\)/.test(src.bubble)) errors.push("AMBIENT_LOOP_UNREGISTERED");
  if (!/useAmbientMotion\(driftRef, "scene"/.test(src.journeyScene)) errors.push("AMBIENT_LOOP_UNREGISTERED");
  if (!/useAmbientMotion\(ref, "ornament"\)/.test(src.symbolicOrnaments)) errors.push("AMBIENT_LOOP_UNREGISTERED");
  if (!/useAmbientMotion\(blinkRef, "mascot", showBlink\)/.test(src.mascot) || !/ref=\{blinkRef\}/.test(src.mascot)) errors.push("AMBIENT_LOOP_UNREGISTERED");
  if (!/useAmbientMotion\(glowRef, "chest", Boolean\(svgClass\)\)/.test(src.chest) || !/ref=\{glowRef\}/.test(src.chest)) errors.push("AMBIENT_LOOP_UNREGISTERED");
  if (!/function TypingCaret\(\)[\s\S]{0,200}useAmbientMotion\(ref, "mascot"\)/.test(src.guide) || /animate-pulse(?![^\n]*ref=\{ref\})/.test(stripComments(src.guide).replace(/<span ref=\{ref\} className="[^"]*animate-pulse[^"]*" \/>/, ""))) {
    errors.push("AMBIENT_LOOP_UNREGISTERED");
  }
  const section = livingCssSection(src.css);
  if (!/\[data-ambient\]:not\(\[data-ambient="run"\]\) \{\s*animation-play-state: paused !important;/.test(section)) errors.push("AMBIENT_BUDGET_EXCEEDED");
  if (!/animation: journey-scene-drift var\(--motion-ambient-slow\)/.test(src.css)) errors.push("AMBIENT_OUT_OF_BAND");

  // Real-browser evidence.
  const ev = j(src.evidence);
  if (!ev) errors.push("LIVING_EVIDENCE_MISSING");
  else {
    for (const row of ev.rows ?? []) {
      if (!(row.maxRunningAmbient <= max)) errors.push("AMBIENT_BUDGET_EXCEEDED");
      if (row.offscreenRunning !== 0) errors.push("AMBIENT_RUNS_OFFSCREEN");
      if (row.hiddenRunning !== 0) errors.push("AMBIENT_RUNS_WHILE_HIDDEN");
      if (row.reducedMotion && row.maxRunningAmbient !== 0) errors.push("REDUCED_MOTION_IGNORED");
    }
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 5. Performance (validate:motion-performance-contract)              */
/* ------------------------------------------------------------------ */

const LAYOUT_PROPS = /(?:^|[\s;{])(?:width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*|font-size|border-width|inset)\s*:/;

export function checkMotionPerformance(src) {
  const errors = [];
  const section = livingCssSection(src.css);
  for (const m of section.matchAll(/@keyframes ([\w-]+) \{([\s\S]*?)\n\}/g)) {
    if (LAYOUT_PROPS.test(m[2])) errors.push("LAYOUT_PROPERTY_ANIMATION");
    if (/filter|blur\(|box-shadow|backdrop/.test(m[2])) errors.push("HEAVY_FILTER_ANIMATION");
    if (/\bd:\s*path|\bd:/.test(m[2])) errors.push("HEAVY_PATH_ANIMATION");
  }
  if (/(?:^|[\s;{])(?:filter|backdrop-filter):/.test(section) || /blur\(/.test(section)) errors.push("HEAVY_FILTER_ANIMATION");
  for (const m of section.matchAll(/transition:\s*([^;]+);/g)) {
    if (/\b(?:width|height|top|left|all)\b/.test(m[1])) errors.push("LAYOUT_PROPERTY_ANIMATION");
  }
  const motionFiles = ["livingUiMotion", "ambientBudget", "valueDelta", "sessionOnce", "animatedCounter", "progressFill", "completionBurst", "ornament", "frame", "divider", "corner"];
  for (const key of motionFiles) {
    const code = stripComments(src[key]);
    if (/addEventListener\(\s*["'](?:scroll|wheel|touchmove|resize)["']/.test(code)) errors.push("SCROLL_HANDLER_RERENDER");
    if (/onScroll|scrollY/.test(code)) errors.push("SCROLL_HANDLER_RERENDER");
  }
  for (const key of ["journeyScene", "bubble", "symbolicOrnaments"]) {
    if (/addEventListener\(\s*["'](?:scroll|wheel)["']/.test(stripComments(src[key]))) errors.push("SCROLL_HANDLER_RERENDER");
  }
  const ambient = stripComments(src.ambientBudget);
  if ((ambient.match(/new IntersectionObserver\(/g) ?? []).length !== 1) errors.push("OBSERVER_PER_ELEMENT");
  if (/useState|setState/.test(ambient)) errors.push("SCROLL_HANDLER_RERENDER");
  if (!/setAttribute\("data-ambient", next\)/.test(ambient)) errors.push("SCROLL_HANDLER_RERENDER");
  if (!/requestAnimationFrame\(apply\)/.test(ambient)) errors.push("SCROLL_HANDLER_RERENDER");
  if (!/translateX\(\$\{shown - 100\}%\)/.test(src.progressFill) || /width:\s*`/.test(src.progressFill)) errors.push("LAYOUT_PROPERTY_ANIMATION");
  // Unsupported APIs always have a fallback.
  if (!/typeof el\.animate !== "function"/.test(src.animatedCounter)) errors.push("UNSUPPORTED_API_NO_FALLBACK");
  if (!/typeof IntersectionObserver === "function"/.test(src.ambientBudget)) errors.push("UNSUPPORTED_API_NO_FALLBACK");
  if (!/typeof window\.matchMedia === "function"/.test(src.livingUiMotion) || !/mq\.addListener\?\.\(onChange\)/.test(src.livingUiMotion)) {
    errors.push("UNSUPPORTED_API_NO_FALLBACK");
  }
  if (/animation-timeline/.test(section) && !/@supports \(animation-timeline/.test(section)) errors.push("UNSUPPORTED_API_NO_FALLBACK");
  for (const key of motionFiles) if (/startViewTransition/.test(src[key]) && !/typeof document\.startViewTransition/.test(src[key])) errors.push("UNSUPPORTED_API_NO_FALLBACK");
  // No heavy motion library.
  if (/"(?:framer-motion|motion|gsap|animejs|react-spring|@react-spring\/web)"\s*:/.test(src.packageJson)) errors.push("HEAVY_MOTION_LIBRARY");

  // 30-minute emulated session evidence (when recorded).
  const perf = j(src.perfEvidence);
  if (perf) {
    if (!(perf.durationMinutes >= 30)) errors.push("PERF_SESSION_TOO_SHORT");
    if (!(perf.maxRunningAmbient <= MAX_AMBIENT)) errors.push("AMBIENT_BUDGET_EXCEEDED");
    if (perf.heapGrowthMb !== null && perf.heapGrowthMb > 40) errors.push("PERF_MEMORY_RUNAWAY");
    if (perf.physical === true) errors.push("PHYSICAL_PASS_FROM_EMULATOR");
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 6. Accessibility (validate:ui-effect-accessibility)                */
/* ------------------------------------------------------------------ */

export function checkEffectAccessibility(src) {
  const errors = [];
  const section = livingCssSection(src.css);
  // Motion never carries meaning alone.
  const steps = src.steps ?? "";
  const fbStart = steps.indexOf("function AnswerFeedback(");
  const feedback = fbStart < 0 ? "" : steps.slice(fbStart, steps.indexOf("function ToneAnswerFeedback(", fbStart));
  if (!/IconCheck/.test(feedback) || !/IconX/.test(feedback) || !/t\("player\.correct"\)/.test(feedback) || !/t\("player\.almost"\)/.test(feedback)) {
    errors.push("MOTION_CARRIES_CORRECTNESS_ALONE");
  }
  if (!/role="status"/.test(feedback)) errors.push("MOTION_CARRIES_CORRECTNESS_ALONE");
  if (!/role="status" data-testid="self-compare-recording-label"/.test(src.selfCompare) || !/t\("player\.selfCompareRecording"\)/.test(src.selfCompare)) {
    errors.push("MOTION_CARRIES_STATE_ALONE");
  }
  if (!/aria-hidden className="living-rec-dot/.test(src.selfCompare) || !/aria-hidden className="living-rec-bars"/.test(src.selfCompare)) errors.push("DECORATION_ANNOUNCED");
  if (!/playing \? "ring-4 ring-accent-soft" : ""/.test(src.speakButton)) errors.push("REDUCED_MOTION_REMOVES_STATE");
  // Decorations are invisible to TalkBack and never focusable.
  if (!/aria-hidden\s+data-testid="progression-current-pulse"/.test(src.bubble)) errors.push("DECORATION_ANNOUNCED");
  if (!/aria-hidden="true"\s+data-ornament-surface="victory"/.test(src.completionBurst)) errors.push("DECORATION_ANNOUNCED");
  if (/tabIndex|aria-label=/.test(stripComments(src.completionBurst + src.frame + src.corner + src.divider))) errors.push("DECORATION_FOCUSABLE");
  // Overlays never wrap content (focus order and reading order stay the host's).
  if (/\{children\}|props\.children/.test(src.frame + src.corner + src.divider)) errors.push("FOCUS_ORDER_WRAPPER");
  // Reduced motion keeps state visible: the halo stays, only its loop stops.
  const haloBase = section.match(/\.living-halo \{([^}]*)\}/)?.[1] ?? "";
  if (!/opacity: 0\.[3-9]/.test(haloBase)) errors.push("REDUCED_MOTION_REMOVES_STATE");
  const reduced = reducedBlock(section);
  if (/\.living-halo[^{]*\{[^}]*(?:display:\s*none|opacity:\s*0[;\s]|visibility:\s*hidden)/.test(reduced)) errors.push("REDUCED_MOTION_REMOVES_STATE");
  if (/isCurrent \? <CurrentNodeHalo \/> : null/.test(src.bubble) === false) errors.push("REDUCED_MOTION_REMOVES_STATE");
  if (/prefersReducedMotion\(\)\s*\?\s*null/.test(src.bubble + src.completionBurst)) errors.push("REDUCED_MOTION_REMOVES_STATE");
  // Large text: decoration yields to content (fixed small corners, reserved divider).
  if (/--lyo-corner-size:\s*[\d.]+rem/.test(section)) errors.push("LARGE_FONT_ORNAMENT_COLLISION");
  const ev = j(src.evidence);
  if (ev) {
    for (const row of ev.rows ?? []) {
      if (row.focusableDecorations !== 0) errors.push("DECORATION_FOCUSABLE");
      if (row.announcedDecorations !== 0) errors.push("DECORATION_ANNOUNCED");
      if (row.decorationTextOverlap !== 0) errors.push(row.name.includes("large-font") ? "LARGE_FONT_ORNAMENT_COLLISION" : "ORNAMENT_OVERLAPS_TEXT");
      if (row.decorationCtaOverlap !== 0) errors.push("ORNAMENT_OBSCURES_CTA");
      if (row.frameHostSizeDelta !== 0) errors.push("ORNAMENT_FRAME_CHANGES_LAYOUT");
      if (row.focusInsideDecoration !== 0) errors.push("FOCUS_ORDER_WRAPPER");
      if (row.reducedMotion && !(row.haloVisible === true)) errors.push("REDUCED_MOTION_REMOVES_STATE");
    }
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 7. Theme contrast (validate:theme-ornament-contrast)               */
/* ------------------------------------------------------------------ */

const over = (fg, alpha, bg) => fg.map((c, i) => c * alpha + bg[i] * (1 - alpha));
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
function lum(rgb) {
  const f = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/** `--lyo-x: var(--token)` maps per tone block. */
function lyoVars(section, selector) {
  const i = section.indexOf(`${selector} {`);
  if (i < 0) return {};
  const block = section.slice(section.indexOf("{", i) + 1, section.indexOf("}", i));
  const out = {};
  for (const m of block.matchAll(/--(lyo-[\w-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
}

export function ornamentThreadColor(section, tokens, tone, intensity, bgToken = "surface") {
  const base = lyoVars(section, ".lyo");
  const toneVars = tone === "accent" ? {} : lyoVars(section, `.lyo[data-tone="${tone}"]`);
  const ref = (toneVars["lyo-thread"] ?? base["lyo-thread"] ?? "").match(/^var\(--([\w-]+)\)$/)?.[1];
  const rgb = ref ? tokens[ref] : null;
  const role = section.match(/\.lyo \.lyo-s-thread \{ stroke: rgb\(var\(--lyo-thread\) \/ ([\d.]+)\); \}/);
  const op = section.match(new RegExp(`\\.lyo\\[data-intensity="${intensity}"\\] \\{\\s*opacity: ([\\d.]+);`));
  const bg = tokens[bgToken];
  if (!rgb || !role || !op || !bg) return null;
  return { color: over(rgb, Number(role[1]) * Number(op[1]), bg), bg, raw: rgb };
}

export function checkOrnamentContrast(src) {
  const errors = [];
  const section = livingCssSection(src.css);
  const themes = { light: lightTokens(src.css), dark: darkTokens(src.css) };
  const MIN = { milestone: 1.5, medium: 1.2, subtle: 1.05 };
  for (const [name, tokens] of Object.entries(themes)) {
    for (const tone of ["accent", "gold", "muted"]) {
      for (const intensity of ["subtle", "medium", "milestone"]) {
        const c = ornamentThreadColor(section, tokens, tone, intensity);
        if (!c) {
          errors.push("ORNAMENT_THEME_UNRESOLVED");
          continue;
        }
        if (contrast(c.color.map(Math.round), c.bg) < MIN[intensity] * (tone === "muted" ? 0.85 : 1)) errors.push(`ORNAMENT_INVISIBLE_${name.toUpperCase()}`);
      }
    }
    // Locked / current / completed stay distinguishable at milestone strength.
    const current = ornamentThreadColor(section, tokens, "accent", "milestone");
    const completed = ornamentThreadColor(section, tokens, "gold", "milestone");
    const locked = ornamentThreadColor(section, tokens, "muted", "milestone");
    if (current && completed && locked) {
      if (dist(current.color, locked.color) < 28 || dist(completed.color, locked.color) < 20 || dist(current.color, completed.color) < 20) {
        errors.push("STATE_AMBIGUOUS");
      }
      const sat = (rgb) => Math.max(...rgb) - Math.min(...rgb);
      if (sat(locked.raw) >= sat(current.raw)) errors.push("STATE_AMBIGUOUS");
    }
  }
  // Dark mode never blinds: gold stitches step down and stay below cream.
  const darkStitch = section.match(/\[data-theme="dark"\] \.lyo \{[^}]*--lyo-stitch-a: ([\d.]+);/);
  if (!darkStitch || Number(darkStitch[1]) > 0.7) errors.push("DARK_ORNAMENT_BLINDING");
  if (themes.dark.gold && darkStitch) {
    const glow = over(themes.dark.gold, Number(darkStitch[1]) * 0.55, themes.dark.surface);
    if (lum(glow) > 0.3) errors.push("DARK_ORNAMENT_BLINDING");
  }
  // Longyu palette only: tone vars map to real tokens; assets' standalone palette uses token triples.
  for (const sel of [".lyo", '.lyo[data-tone="gold"]', '.lyo[data-tone="muted"]']) {
    for (const v of Object.values(lyoVars(section, sel))) {
      if (/^#|rgb\(|hsl\(|\d+\s+\d+\s+\d+/.test(v)) errors.push("FOREIGN_PALETTE");
    }
  }
  for (const m of section.matchAll(/\.lyo[^{]*\.lyo-[fs]-[\w-]+ \{ (?:fill|stroke): ([^;]+); \}/g)) {
    if (!/^rgb\(var\(--lyo-[\w-]+\)(?: \/ (?:[\d.]+|var\(--lyo-stitch-a\)))?\)$/.test(m[1])) errors.push("FOREIGN_PALETTE");
  }
  const triples = new Set(Object.values(themes).flatMap((t) => Object.values(t).map((rgb) => rgb.join(" "))));
  for (const text of Object.values(src.files ?? {})) {
    for (const m of (text.match(/<style>[\s\S]*?<\/style>/)?.[0] ?? "").matchAll(/rgb\((\d+ \d+ \d+)/g)) {
      if (!triples.has(m[1])) errors.push("FOREIGN_PALETTE");
    }
    if (/#[0-9a-f]{3,8}\b/i.test(text)) errors.push("FOREIGN_PALETTE");
  }
  const ev = j(src.evidence);
  if (ev) {
    const dark = (ev.rows ?? []).find((r) => r.name === "390x844-dark");
    if (!dark || !(dark.ornamentMinContrast >= 1.3)) errors.push("ORNAMENT_INVISIBLE_DARK");
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* Evidence binding + release honesty                                 */
/* ------------------------------------------------------------------ */

export function runtimeDigest(sources) {
  const h = createHash("sha256");
  for (const [file, text] of Object.entries(sources.files ?? {}).sort()) h.update(`${file}\n${text}\n`);
  for (const key of Object.keys(RUNTIME_FILES)) h.update(`${key}\n${sources[key] ?? ""}\n`);
  h.update(livingCssSection(sources.css ?? ""));
  return h.digest("hex").slice(0, 16);
}

export function checkEvidence(src) {
  const errors = [];
  const ev = j(src.evidence);
  if (!ev) return ["LIVING_EVIDENCE_MISSING"];
  if (ev.runtimeDigest !== runtimeDigest(src)) errors.push("LIVING_EVIDENCE_STALE");
  const names = (ev.rows ?? []).map((r) => r.name);
  for (const row of REQUIRED_EVIDENCE_ROWS) if (!names.includes(row)) errors.push("LIVING_EVIDENCE_INCOMPLETE");
  for (const row of ev.rows ?? []) {
    if (!(row.ornamentsMeasured > 0)) errors.push("LIVING_EVIDENCE_INCOMPLETE");
    if (row.horizontalOverflowPx !== 0) errors.push("HORIZONTAL_OVERFLOW");
    if (row.decorationLayoutShift !== null && row.decorationLayoutShift > 0.001) errors.push("DECORATION_LAYOUT_SHIFT");
  }
  if (!(ev.burst?.maxEndMs <= 1100) || ev.burst?.infinite !== 0) errors.push("CELEBRATION_TOO_LONG");
  if (!(ev.rapidSwitch?.finalPath === "/jornada") || ev.rapidSwitch?.errors !== 0 || !(ev.rapidSwitch?.maxThumbAnimations <= 1)) {
    errors.push("TRANSITION_QUEUES_ON_RAPID_SWITCH");
  }
  if (!(ev.modal?.clickDuringEnterMs <= 400) || ev.modal?.takesTap !== true) errors.push("MODAL_UNCLICKABLE_DURING_ANIMATION");
  if (ev.progress?.replayedOnMount !== false) errors.push("PROGRESS_REPLAYS_FROM_ZERO");
  if (ev.counters?.animatedOnMount !== 0) errors.push("COUNTER_ANIMATES_ON_MOUNT");
  return uniq(errors);
}

const SKIP_CALL = ["test", "skip("].join(".");

export function checkRelease(src) {
  const errors = [];
  const cert = j(src.cert);
  const rc = j(src.rc);
  if (!cert) return ["CERT_MISSING"];
  if (!rc) return ["RC_MISSING"];
  if (cert.wave !== "RC2.3.13R.3.2.4" || rc.wave !== "RC2.3.13R.3.2.4") errors.push("WAVE_IDENTITY_DRIFT");
  for (const section of ["runtime", "crossEngine", "ornamentalSystem", "motionSystem", "performance", "accessibility", "hosted", "artifact", "physical", "entry"]) {
    if (!cert[section] || typeof cert[section] !== "object") errors.push("CERT_SECTION_MISSING");
  }
  const pkg = src.packageJson ?? "";
  const scripts = [
    "validate:chinese-ornamental-assets",
    "validate:chinese-ornamental-system",
    "validate:living-ui-motion",
    "validate:ambient-motion-budget",
    "validate:motion-performance-contract",
    "validate:ui-effect-accessibility",
    "validate:theme-ornament-contrast",
    "validate:rc2-3-13r3-2-4-living-ui-ornamental-polish",
    "test:rc2-3-13r3-2-4-living-ui-ornamental-polish",
    "gate:rc2-3-13r3-2-4-living-ui-ornamental-polish",
  ];
  for (const script of scripts) {
    if (!pkg.includes(`"${script}"`)) errors.push("GATE_SCRIPT_MISSING");
    if (!(src.gateRegistry ?? "").includes(`"gateId": "${script}"`)) errors.push("GATE_REGISTRY_MISSING");
  }
  for (const step of ["validate:chinese-ornamental-assets", "validate:living-ui-motion", "validate:ambient-motion-budget", "test:rc2-3-13r3-2-4-living-ui-ornamental-polish"]) {
    if (!new RegExp(`\\n\\s+"${step}",\\n`).test(src.suites ?? "")) errors.push("GATE_NOT_IN_HOSTED_SUITE");
  }
  // Docs + inventory.
  for (const heading of ["Philosophy", "Motifs", "Surfaces", "Density", "Motion", "Accessibility", "Theme", "Performance", "Do / don't"]) {
    if (!(src.ornamentDoc ?? "").includes(`## ${heading}`) && !(src.motionDoc ?? "").includes(`## ${heading}`)) errors.push("DESIGN_DOC_MISSING");
  }
  if (!/MAX_VISIBLE_AMBIENT_ANIMATIONS/.test(src.motionDoc ?? "")) errors.push("DESIGN_DOC_MISSING");
  const inventory = j(src.inventory);
  const evaluated = evaluateOrnamentModules(src);
  if (!inventory || !evaluated.ok) errors.push("INVENTORY_STALE");
  else {
    const entries = evaluated.registry.CHINESE_ORNAMENTS;
    const assets = inventory.assets ?? [];
    if (assets.length !== entries.length) errors.push("INVENTORY_STALE");
    for (const e of entries) {
      const a = assets.find((x) => x.id === e.id);
      if (!a || a.motif !== e.motif || a.file !== `${ORNAMENT_DIR}/${e.file}` || a.decorative !== true || JSON.stringify(a.surfaces) !== JSON.stringify(e.surfaces) || JSON.stringify(a.intensities) !== JSON.stringify(e.intensities)) {
        errors.push("INVENTORY_STALE");
      }
      const bytes = Buffer.byteLength(src.files?.[e.file] ?? "", "utf8");
      if (a && a.bytes !== bytes) errors.push("INVENTORY_STALE");
    }
  }
  if (!/RC2\.3\.13R\.3\.2\.4/.test(src.report ?? "")) errors.push("REPORT_MISSING");
  if (!/USE THIS APK/.test(src.handoff ?? "") || !/DO NOT USE/.test(src.handoff ?? "")) errors.push("OWNER_HANDOFF_MISSING");
  for (const h of STALE_APK_SHA256) if (!(src.handoff ?? "").includes(h)) errors.push("HANDOFF_STALE_LIST_INCOMPLETE");

  // Freeze exception + scope.
  if (!new RegExp(`PRE_BETA_FREEZE_EXCEPTION_R324[\\s\\S]*${FREEZE_REASON}`).test(src.freeze ?? "")) errors.push("FREEZE_EXCEPTION_MISSING");
  if (cert.freezeException !== FREEZE_REASON) errors.push("FREEZE_EXCEPTION_MISSING");
  for (const k of ["navigationRedesign", "curriculumExpansion", "pedagogyChange", "masteryChange", "economyChange", "srsChange", "unlockRuleChange", "schemaChange", "jevRuntimeChange"]) {
    if (cert.scope?.[k] !== false) errors.push("SCOPE_CREEP");
  }

  // Runtime identity.
  const lr = cert.runtime?.learnerRuntimeSha;
  if (!lr || lr === PREVIOUS_LEARNER_RUNTIME_SHA || !/^[0-9a-f]{40}$/.test(lr)) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (rc.learnerRuntimeSha !== lr) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (cert.runtime?.previousLearnerRuntimeSha !== PREVIOUS_LEARNER_RUNTIME_SHA) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  const parent = j(src.parentCert);
  if (parent?.runtime?.learnerRuntimeSha !== lr) errors.push("PARENT_RUNTIME_PIN_STALE");
  for (const lib of [src.r322Gates, src.r3221Gates]) {
    if (!new RegExp(`EXPECTED_LEARNER_RUNTIME_SHA =\\s*"${lr}"`).test(lib ?? "")) errors.push("PARENT_RUNTIME_PIN_STALE");
  }
  if (cert.parentPr !== PARENT_PR || cert.parentHeadSha !== PARENT_HEAD_SHA) errors.push("WRONG_PARENT_PR");
  if (cert.parentHosted?.overall !== "PASS" || cert.parentHosted?.headSha !== PARENT_HEAD_SHA || !cert.parentHosted?.workflowRunIds?.ci) errors.push("RED_PARENT_ACCEPTED");
  if (src.liveFingerprint !== EXPECTED_FINGERPRINT || rc.fingerprint !== src.liveFingerprint || cert.runtime?.fingerprint !== src.liveFingerprint) {
    errors.push("FINGERPRINT_DRIFT");
  }

  // Cross-engine: classified, fixed, narrow.
  const ce = cert.crossEngine ?? {};
  for (const expected of CROSS_ENGINE_CLASSIFICATION) {
    const row = (ce.failures ?? []).find((f) => f.engine === expected.engine && f.head === expected.head);
    if (!row || row.classification !== expected.classification || !row.fixedIn || !row.test) errors.push("CROSS_ENGINE_FAILURE_HIDDEN");
  }
  if (ce.webkit !== "PASS_WITH_NARROW_EXISTING_ALLOWLISTED_ENGINE_SKIP" && ce.webkit !== "PASS") errors.push("WEBKIT_DISHONEST");
  if (ce.newSkips !== 0) errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  const allow = j(src.skipAllowlist);
  const entries = allow?.entries ?? [];
  const webkitEntries = entries.filter((e) => /webkit/i.test(e.snippet ?? "") && e.pattern === "test.skip");
  const legit = webkitEntries.find((e) => e.file === WEBKIT_SKIP.file && String(e.snippet).startsWith(WEBKIT_SKIP.narrow));
  if (!legit || legit.classification !== "LEGIT") errors.push("WEBKIT_BROAD_SKIP");
  if (webkitEntries.some((e) => !EXISTING_WEBKIT_SKIP_FILES.includes(e.file)) || webkitEntries.length > EXISTING_WEBKIT_SKIP_FILES.length) {
    errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  }
  if (entries.some((e) => /rc2-3-13r3-2-4/.test(e.file ?? ""))) errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  const spec = src.builderSpec ?? "";
  if (!spec.includes(WEBKIT_SKIP.narrow) || /test\.describe\.skip|test\.skip\(\)|\|\| true/.test(spec)) errors.push("WEBKIT_BROAD_SKIP");
  const e2e = src.e2eSpec ?? "";
  if (!e2e) errors.push("LIVING_E2E_MISSING");
  if (e2e.includes(SKIP_CALL) || /test\.fixme|\.only\(|browserName\s*===|\|\| true/.test(e2e)) errors.push("FIREFOX_FAILURE_HIDDEN");

  // Hosted / artifact / physical honesty.
  const hosted = cert.hosted ?? {};
  const artifact = cert.artifact ?? {};
  const physical = cert.physical ?? {};
  const ui = cert.uiFreeze ?? {};
  const rejected = cert.rejectedApkSha256List ?? [];
  for (const h of STALE_APK_SHA256) if (!rejected.includes(h)) errors.push("OLD_APK_ACCEPTED");
  if (cert.priorDeviceQa !== "STALE_FOR_CURRENT_RUNTIME") errors.push("OLD_APK_ACCEPTED");
  if (artifact.apkSha256 && rejected.includes(artifact.apkSha256)) errors.push("OLD_APK_ACCEPTED");
  for (const key of ["releaseTruth", "security", "betaSuites", "qualityBuild", "androidFoundation", "androidRuntime", "chromium", "firefox", "webkit"]) {
    if (hosted.overall === "PASS" && !["PASS", "PASS_WITH_ALLOWLISTED_ENGINE_SKIP"].includes(hosted[key])) errors.push("RED_HOSTED_SOURCE_ACCEPTED");
  }
  if (hosted.overall === "PASS" && (!hosted.headSha || !hosted.workflowRunIds?.ci)) errors.push("RED_HOSTED_SOURCE_ACCEPTED");
  if (hosted.firefox === "PASS_WITH_ALLOWLISTED_ENGINE_SKIP" || hosted.chromium === "PASS_WITH_ALLOWLISTED_ENGINE_SKIP") errors.push("FIREFOX_FAILURE_HIDDEN");
  if (hosted.webkit === "PASS") errors.push("WEBKIT_DISHONEST");
  if (artifact.status === "BUILT") {
    if (hosted.overall !== "PASS" || hosted.headSha !== artifact.artifactSourceSha) errors.push("RED_HOSTED_SOURCE_ACCEPTED");
    if (artifact.learnerRuntimeSha !== lr) errors.push("APK_RUNTIME_MISMATCH");
    if (!/^[0-9a-f]{64}$/.test(artifact.apkSha256 ?? "")) errors.push("APK_HASH_ABSENT");
    if (artifact.channel !== "DEVICE_QA") errors.push("WRONG_CHANNEL");
    if (!artifact.workflowRunId || !artifact.artifactId) errors.push("MISSING_PROVENANCE");
    if (!(src.handoff ?? "").includes(String(artifact.apkSha256))) errors.push("HANDOFF_MISSING_NEW_HASH");
  }
  if (artifact.playReady === true || cert.play?.debugAabPlayReady === true) errors.push("DEBUG_AAB_PLAY_READY");
  if (cert.play?.signedAab === "BUILT" && cert.play?.signingSource === "debug") errors.push("DEBUG_AAB_PLAY_READY");
  const physicalKeys = ["MOTION_PHYSICAL", "ORNAMENT_PHYSICAL", "JOURNEY_VISUAL", "CULTURE_VISUAL", "LEARNING_FEEDBACK", "THIRTY_MIN_SESSION", "PREVIOUS_P1"];
  const anyPhysicalPass = physical.status === "PASS" || physicalKeys.some((k) => physical[k] === "PASS");
  if (anyPhysicalPass) {
    if (physical.emulator !== false || !physical.device || /emulator|sdk_gphone|generic/i.test(String(physical.device))) errors.push("PHYSICAL_PASS_FROM_EMULATOR");
    if (!artifact.apkSha256 || physical.artifactSha256 !== artifact.apkSha256) errors.push("PHYSICAL_STALE_APK");
  }
  if (ui.LONGYU_UI_UX_FREEZE === "OWNER_ACCEPTED") {
    if (!artifact.apkSha256 || ui.boundApkSha256 !== artifact.apkSha256) errors.push("OWNER_ACCEPTANCE_WITHOUT_APK_HASH");
    if (ui.FINAL_UI_OWNER_ACCEPTANCE !== "PASS" || physical.status !== "PASS") errors.push("OWNER_ACCEPTANCE_WITHOUT_APK_HASH");
  }
  if (cert.ornamentalSystem?.state !== "CODE_PASS" || cert.motionSystem?.state !== "CODE_PASS") errors.push("SYSTEM_STATE_DISHONEST");
  if (cert.motionSystem?.reducedMotion !== "PASS" || cert.performance?.contract !== "PASS") errors.push("SYSTEM_STATE_DISHONEST");

  // Entry.
  if (rc.entry?.PUBLIC_BETA_ENTRY !== "HOLD" || cert.entry?.PUBLIC_BETA_ENTRY !== "HOLD") errors.push("PUBLIC_BETA_GO");
  if (cert.entry?.PLAY_CLOSED_BETA_ENTRY === "GO" && cert.play?.signedAab !== "BUILT") errors.push("PLAY_GO_WITHOUT_SIGNED_AAB");
  if (cert.entry?.OWNER_QA_ENTRY === "GO" && artifact.status !== "BUILT") errors.push("OWNER_QA_WITHOUT_APK");
  if ((cert.wave1?.invited ?? 0) > 0 && (physical.status !== "PASS" || cert.ownerReleaseAcceptance !== "PASS")) errors.push("WAVE1_INVITED_EARLY");
  if ((cert.wave1?.invited ?? 0) > 10) errors.push("WAVE1_OVER_TARGET");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */

export const checkAssetsGate = (src) => checkOrnamentAssets(src).errors;
export const checkSystemGate = (src) => checkOrnamentSystem(src);
export const checkMotionGate = (src) => checkLivingMotion(src);
export const checkBudgetGate = (src) => checkAmbientBudget(src);
export const checkPerformanceGate = (src) => checkMotionPerformance(src);
export const checkA11yGate = (src) => checkEffectAccessibility(src);
export const checkThemeGate = (src) => checkOrnamentContrast(src);

export function checkAll(src) {
  return uniq([
    ...checkAssetsGate(src),
    ...checkSystemGate(src),
    ...checkMotionGate(src),
    ...checkBudgetGate(src),
    ...checkPerformanceGate(src),
    ...checkA11yGate(src),
    ...checkThemeGate(src),
    ...checkEvidence(src),
    ...checkRelease(src),
  ]);
}
