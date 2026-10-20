/**
 * RC2.3.13R.3.2.6 — Chinese Living Canvas: animated scenic SVGs, the Chinese
 * frame system and UX closure.
 *
 * Validators (pure functions of the loaded sources, so the mutation runner can
 * corrupt one input and prove the specific error fires):
 *
 *   scenic-motion-profiles · animated-svg-role-contract · ambient-scene-ownership
 *   chinese-frame-system · chinese-visual-density · guidance-arbitration
 *   typography-icon-audit
 *
 * plus release honesty (checkRelease). Behaviour is executed wherever it can be
 * (the motion registry, the ambient budget allocation and slot release, token
 * contrast, keyframe neutral poses and amplitudes, CSS duration tokens); the
 * rest is structural.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { evalSource } from "./rc2-3-13r3-2-4-living-ui-gates.mjs";
import { journeyFingerprint } from "./report-meta.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
};

export const WAVE = "RC2.3.13R.3.2.6";
export const PARENT_PR = 356;
export const PARENT_WAVE = "RC2.3.13R.3.2.5";
export const FREEZE_REASON = "OWNER_REQUESTED_CHINESE_LIVING_CANVAS";
export const UI_FREEZE_ACCEPTED = "OWNER_ACCEPTED_R326";
export const MIN_KILLS = 180;
/** The R.3.2.5 learner runtime this wave must move past. */
export const PREVIOUS_LEARNER_RUNTIME_SHA = "3b1bb08c36c6ad51129bc7022a8064f6a5c720a7";
/** Stale APKs (R.3.2.3 and before) that can never be accepted for this runtime. */
export const STALE_APK_SHA256 = [
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af",
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8",
];
export const CERT_SECTIONS = [
  "parent", "runtime", "fingerprint",
  "guidanceClosure", "typographyAudit", "iconAudit",
  "scenicMotion", "frames", "visualDensity",
  "performance", "reducedMotion", "accessibility", "themes",
  "hosted", "android", "artifact", "physical", "entry",
];
export const GATE_SCRIPTS = [
  "validate:scenic-motion-profiles",
  "validate:animated-svg-role-contract",
  "validate:ambient-scene-ownership",
  "validate:chinese-frame-system",
  "validate:chinese-visual-density",
  "validate:guidance-arbitration",
  "validate:typography-icon-audit",
  "validate:progression-living",
  "test:rc2-3-13r3-2-6-chinese-living-canvas",
  "gate:rc2-3-13r3-2-6-chinese-living-canvas",
];

/** Owners that may loop at once (R.3.2.4 law, unchanged). */
export const EXPECTED_MAX_OWNERS = 4;
/** Per-kind owner caps inside those 4. */
export const EXPECTED_KIND_CAP = { scene: 2, ornament: 2 };
/** Looping parts one owner may animate. */
export const EXPECTED_PARTS_PER_OWNER = 4;
/** Token values (index.css) used to evaluate loop durations. */
export const MOTION_TOKENS_MS = {
  "--motion-instant": 80,
  "--motion-fast": 140,
  "--motion-normal": 220,
  "--motion-emphasis": 280,
  "--motion-ambient-current": 5000,
  "--motion-ambient": 7000,
  "--motion-ambient-slow": 10000,
};
/** Surfaces each frame level may sit on (docs/ux/chinese-frame-system.md). */
export const FRAME_LEVEL_SURFACES = {
  heritage: ["journey-milestone", "culture-topic-hero", "review-header", "review-summary"],
  ceremony: ["victory", "reward-hero"],
};

const uniq = (errors) => [...new Set(errors)];
export function stripComments(text) {
  return String(text ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}
const count = (text, re) => (String(text ?? "").match(re) ?? []).length;
function j(text) {
  try {
    return JSON.parse(text || "null");
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Sources                                                            */
/* ------------------------------------------------------------------ */

export const FILES = {
  css: "src/index.css",
  livingCanvasCss: "src/styles/living-canvas.css",
  framesCss: "src/styles/chinese-frames.css",
  tailwind: "tailwind.config.js",
  main: "src/main.tsx",
  visualProfiles: "src/lib/motion/visualMotionProfiles.ts",
  sceneProfiles: "src/features/journey/scenes/sceneMotionProfiles.ts",
  sceneRegistry: "src/features/journey/scenes/journeySceneRegistry.ts",
  journeyScene: "src/features/journey/scenes/JourneyScene.tsx",
  cultureHeroScene: "src/features/culture/CultureHeroScene.tsx",
  cultureVisualTheme: "src/features/culture/cultureVisualTheme.ts",
  cultureTopicDetail: "src/features/culture/CultureTopicDetailPage.tsx",
  cultureJourney: "src/features/culture/CultureJourneyPage.tsx",
  cultureTopicCard: "src/features/culture/CultureTopicCard.tsx",
  symbolicOrnaments: "src/components/progression/symbolicOrnaments.tsx",
  progressionPath: "src/components/progression/ProgressionPath.tsx",
  livingUiMotion: "src/lib/motion/livingUiMotion.ts",
  ambientBudget: "src/lib/motion/ambientBudget.ts",
  frame: "src/components/ornaments/chinese/ChineseOrnamentalFrame.tsx",
  ornamentRegistry: "src/components/ornaments/chinese/chineseOrnamentRegistry.ts",
  journeyPage: "src/features/journey/JourneyPage.tsx",
  victory: "src/features/lesson/LessonVictory.tsx",
  revisao: "src/features/revisao/RevisaoPage.tsx",
  lessonPlayer: "src/features/lesson/LessonPlayer.tsx",
  ritual: "src/components/chests/ChestOpeningRitual.tsx",
  steps: "src/features/lesson/steps.tsx",
  hanziBuilder: "src/components/hanzi/HanziBuilderExercise.tsx",
  primitives: "src/components/ui/primitives.tsx",
  modalOverlay: "src/components/ui/ModalOverlay.tsx",
  freeze: "src/lib/curriculumFreeze.ts",
  rc: "docs/release/final-pre-beta-rc.json",
  cert: "docs/release/rc2-3-13r3-2-6-certification.json",
  parentCert: "docs/release/rc2-3-13r3-2-5-certification.json",
  scenicRegistryJson: "docs/release/scenic-motion-registry.json",
  frameContractJson: "docs/release/chinese-frame-contract.json",
  docCanvas: "docs/ux/chinese-living-canvas.md",
  docProfiles: "docs/ux/scenic-motion-profiles.md",
  docFrames: "docs/ux/chinese-frame-system.md",
  report: "docs/reports/rc2-3-13r3-2-6-chinese-living-canvas.md",
  handoff: "docs/release/OWNER_R32_6_LIVING_CANVAS_HANDOFF.md",
  e2e: "e2e/rc2-3-13r3-2-6-living-canvas.spec.ts",
  guideStart: "src/lib/motion/guideStart.ts",
  progressionConnector: "src/components/progression/ProgressionConnector.tsx",
  progressionBubble: "src/components/progression/ProgressionNodeBubble.tsx",
  progressionCss: "src/styles/progression-living.css",
  completionMoment: "src/lib/motion/completionMoment.ts",
  sessionOnce: "src/lib/motion/sessionOnce.ts",
  journeyAxisDone: "src/features/journey/JourneyAxisDone.tsx",
  guidanceOrchestrator: "src/lib/guidanceOrchestrator.ts",
  guidanceHost: "src/components/guidance/GuidanceHost.tsx",
  guideDialogue: "src/components/guide/GuideDialogue.tsx",
  teacherBubble: "src/features/lesson/TeacherSpeechBubble.tsx",
  indexHtml: "index.html",
  icon: "src/components/ui/Icon.tsx",
  nav: "src/components/layout/nav.tsx",
  tabBar: "src/components/layout/TabBar.tsx",
  sidebar: "src/components/layout/Sidebar.tsx",
  topBar: "src/components/layout/TopBar.tsx",
  morePage: "src/features/more/MorePage.tsx",
  cultureCard: "src/features/culture/CultureCard.tsx",
  cultureAtlas: "src/features/culture/CultureAtlasPage.tsx",
  cultureTopicIcon: "src/features/culture/CultureTopicIcon.tsx",
  mandarinToken: "src/components/hanzi/MandarinToken.tsx",
  immersion: "src/features/immersion/ImmersionPage.tsx",
  packageJson: "package.json",
  canonicalSuites: "scripts/release/canonical-suites.mjs",
  gateRegistry: "docs/release/gate-registry.json",
  skipAllowlist: "docs/release/skip-allowlist.json",
};

const SCENE_DIR = "src/assets/journey/scenes";

export function loadLivingCanvasSources() {
  const src = { liveFingerprint: journeyFingerprint(ROOT) };
  for (const [key, rel] of Object.entries(FILES)) src[key] = read(rel);
  src.scenes = {};
  try {
    for (const name of fs.readdirSync(path.join(ROOT, SCENE_DIR)).sort()) {
      if (name.endsWith(".svg")) src.scenes[name] = read(`${SCENE_DIR}/${name}`);
    }
  } catch {
    /* empty library is reported below */
  }
  // Every .tsx that may place a frame level or a living scene; every .tsx for the type audit.
  src.tsx = {};
  src.allTsx = {};
  const walk = (dir) => {
    let entries = [];
    try {
      entries = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (entry.name.endsWith(".tsx")) {
        const text = read(rel);
        src.allTsx[rel] = text;
        if (/\blevel="|<CultureHeroScene\b|<JourneyScene\b|<ChineseOrnamentalFrame\b/.test(text)) src.tsx[rel] = text;
      }
    }
  };
  walk("src");
  return src;
}

/* ------------------------------------------------------------------ */
/* Module evaluation                                                  */
/* ------------------------------------------------------------------ */

function profilesModule(src) {
  const visual = evalSource(src.visualProfiles);
  return evalSource(src.sceneProfiles, { requires: { "../../../lib/motion/visualMotionProfiles": visual } });
}

function registryModule(src) {
  return evalSource(src.sceneRegistry);
}

function motionModule(src) {
  return evalSource(src.livingUiMotion);
}

/* ------------------------------------------------------------------ */
/* CSS helpers                                                        */
/* ------------------------------------------------------------------ */

/** Top-level and @media rules: [{ selector, body, media }]. Keyframes are excluded. */
export function cssRules(css) {
  const text = stripComments(css);
  const out = [];
  const walk = (chunk, media) => {
    let i = 0;
    while (i < chunk.length) {
      const open = chunk.indexOf("{", i);
      if (open < 0) break;
      const head = chunk.slice(i, open).trim();
      let depth = 1;
      let k = open + 1;
      while (k < chunk.length && depth > 0) {
        if (chunk[k] === "{") depth += 1;
        else if (chunk[k] === "}") depth -= 1;
        k += 1;
      }
      const body = chunk.slice(open + 1, k - 1);
      if (head.startsWith("@media")) walk(body, head);
      else if (!head.startsWith("@keyframes")) out.push({ selector: head, body, media });
      i = k;
    }
  };
  walk(text, null);
  return out;
}

/** @keyframes name → [{ stops: ["0%", "100%"], body }]. */
export function cssKeyframes(css) {
  const text = stripComments(css);
  const out = {};
  const re = /@keyframes\s+([\w-]+)\s*\{/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1;
    let k = re.lastIndex;
    while (k < text.length && depth > 0) {
      if (text[k] === "{") depth += 1;
      else if (text[k] === "}") depth -= 1;
      k += 1;
    }
    const inner = text.slice(re.lastIndex, k - 1);
    const frames = [];
    const fr = /([^{}]+)\{([^{}]*)\}/g;
    let f;
    while ((f = fr.exec(inner))) {
      frames.push({ stops: f[1].split(",").map((s) => s.trim()), body: f[2] });
    }
    out[m[1]] = frames;
  }
  return out;
}

function declaration(body, prop) {
  const m = new RegExp(`(?:^|;|\\s)${prop}\\s*:\\s*([^;]+)`).exec(body ?? "");
  return m ? m[1].trim() : null;
}

/** Evaluate a duration like `var(--motion-ambient)` or `calc(var(--motion-ambient-slow) * 1.2)` to ms. */
export function evalDurationMs(expr) {
  const v = String(expr ?? "").trim();
  const plain = /^var\((--motion-[\w-]+)\)$/.exec(v);
  if (plain) return MOTION_TOKENS_MS[plain[1]] ?? null;
  const calc = /^calc\(\s*var\((--motion-[\w-]+)\)\s*([*/])\s*([\d.]+)\s*\)$/.exec(v);
  if (calc) {
    const base = MOTION_TOKENS_MS[calc[1]];
    if (base === undefined) return null;
    return calc[2] === "*" ? base * Number(calc[3]) : base / Number(calc[3]);
  }
  return null;
}

/** `animation: name duration easing delay infinite …` → { name, duration, infinite }. */
export function parseAnimation(value) {
  const v = String(value ?? "").trim();
  if (!v || v === "none") return null;
  const tokens = [];
  let depth = 0;
  let cur = "";
  for (const ch of v) {
    if (ch === "(") depth += 1;
    if (ch === ")") depth -= 1;
    if (ch === " " && depth === 0) {
      if (cur) tokens.push(cur);
      cur = "";
    } else cur += ch;
  }
  if (cur) tokens.push(cur);
  return { name: tokens[0], duration: tokens[1] ?? null, infinite: tokens.includes("infinite"), tokens };
}

const IDENTITY_TRANSFORM = /^(?:none|translate3d\(\s*0(?:px)?\s*,\s*0(?:px)?\s*,\s*0(?:px)?\s*\)(?:\s*rotate\(\s*0deg\s*\))?|rotate\(\s*0deg\s*\)(?:\s*scale\(\s*1\s*\))?|scale\(\s*1\s*\)|scaleX\(\s*1\s*\)\s*skewY\(\s*0deg\s*\))$/;

function isNeutralFrame(body) {
  const transform = declaration(body, "transform");
  const opacity = declaration(body, "opacity");
  const transformOk = transform === null || IDENTITY_TRANSFORM.test(transform);
  const opacityOk = opacity === null || Number(opacity) === 1;
  return transformOk && opacityOk;
}

function frameAt(frames, stop) {
  return frames.find((f) => f.stops.includes(stop) || (stop === "0%" && f.stops.includes("from")) || (stop === "100%" && f.stops.includes("to")));
}

/** Max |rotate| (deg) and |translate| (px) across a keyframe set. */
function amplitude(frames) {
  let rot = 0;
  let move = 0;
  for (const f of frames) {
    const t = declaration(f.body, "transform") ?? "";
    for (const m of t.matchAll(/rotate\(\s*(-?[\d.]+)deg\s*\)/g)) rot = Math.max(rot, Math.abs(Number(m[1])));
    for (const m of t.matchAll(/translate3d\(\s*(-?[\d.]+)(?:px)?\s*,\s*(-?[\d.]+)(?:px)?/g)) move = Math.max(move, Math.abs(Number(m[1])), Math.abs(Number(m[2])));
  }
  return { rot, move };
}

const FORBIDDEN_KEYFRAME_PROPS = /(?:^|[;\s{])(?:width|height|top|left|right|bottom|margin[\w-]*|padding[\w-]*|inset|font-size|border-width|stroke-dash\w*|d)\s*:/;
const HEAVY_KEYFRAME_PROPS = /(?:filter|blur\(|box-shadow|backdrop)/;

/* ------------------------------------------------------------------ */
/* 1. Scenic motion profiles (validate:scenic-motion-profiles)        */
/* ------------------------------------------------------------------ */

export function checkScenicMotionProfiles(src) {
  const errors = [];
  let prof;
  let reg;
  try {
    prof = profilesModule(src);
    reg = registryModule(src);
  } catch {
    return ["SCENE_PROFILES_UNLOADABLE"];
  }
  const profiles = new Set(prof.SCENIC_MOTION_PROFILES ?? []);
  const parts = new Set(prof.SCENE_PARTS ?? []);
  const ids = reg.JOURNEY_SCENE_IDS ?? [];
  const motion = prof.SCENE_MOTION ?? {};
  if (profiles.size < 11) errors.push("SCENE_PROFILE_INVALID");
  for (const id of ids) {
    const spec = motion[id];
    if (!spec) {
      errors.push("SCENE_PROFILE_MISSING");
      continue;
    }
    if (!profiles.has(spec.profile)) errors.push("SCENE_PROFILE_INVALID");
    if (!["subtle", "normal", "hero"].includes(spec.intensity)) errors.push("SCENE_INTENSITY_INVALID");
    if (spec.intensity === "hero") errors.push("SCENE_INTENSITY_HERO");
    const all = [...(spec.loops ?? []), ...(spec.oneShot ?? [])];
    for (const part of all) {
      if (!parts.has(part)) errors.push("SCENE_PART_UNKNOWN");
      if (!String(prof.SCENE_PART_NEUTRAL?.[part] ?? "").trim()) errors.push("PART_NEUTRAL_MISSING");
    }
    if (spec.profile === "still" && (spec.loops ?? []).length > 0) errors.push("STILL_PROFILE_LOOPS");
    if (spec.profile !== "still" && all.length === 0) errors.push("PROFILE_WITHOUT_PARTS");
  }
  for (const id of Object.keys(motion)) if (!ids.includes(id)) errors.push("SCENE_PROFILE_ORPHAN");
  for (const part of parts) if (!String(prof.SCENE_PART_NEUTRAL?.[part] ?? "").trim()) errors.push("PART_NEUTRAL_MISSING");

  // Animation must correspond to the subject: no one profile everywhere.
  const used = ids.map((id) => motion[id]?.profile).filter(Boolean);
  const share = Math.max(0, ...[...new Set(used)].map((p) => used.filter((u) => u === p).length));
  if (new Set(used).size < 6 || share > 5) errors.push("SAME_PROFILE_EVERYWHERE");

  // Deterministic: a phase comes from the ordinal, never from chance.
  for (const key of ["sceneProfiles", "journeyScene", "cultureHeroScene", "cultureVisualTheme", "symbolicOrnaments"]) {
    if (/Math\.random|Date\.now|performance\.now|crypto\./.test(stripComments(src[key]))) errors.push("MOTION_RANDOM");
  }

  const css = src.livingCanvasCss ?? "";
  const rules = cssRules(css);
  const frames = cssKeyframes(css);
  // The whole-scene bob is retired: a profiled scene never floats as a block.
  if (!/\.journey-scene-drift\[data-scene-profile\]\s*\{\s*animation:\s*none;/.test(stripComments(css))) errors.push("WHOLE_SCENE_FLOAT");
  if (!/data-scene-profile=\{motion\.profile\}/.test(src.journeyScene ?? "")) errors.push("WHOLE_SCENE_FLOAT");
  if (!/import\s+"\.\/styles\/living-canvas\.css"/.test(src.main ?? "")) errors.push("LIVING_CANVAS_NOT_LOADED");

  const loopRules = rules.filter((r) => /infinite/.test(r.body));
  const usedLoopParts = new Set(ids.flatMap((id) => motion[id]?.loops ?? []));
  for (const rule of loopRules) {
    if (!/\[data-ambient="run"\]/.test(rule.selector)) errors.push("AMBIENT_LOOP_UNGATED");
    const anim = parseAnimation(declaration(rule.body, "animation"));
    if (!anim) continue;
    const ms = evalDurationMs(anim.duration);
    if (ms === null) errors.push("ARBITRARY_DURATION");
    else if (ms < 5000) errors.push("MOTION_TOO_FAST");
    else if (ms > 14000) errors.push("MOTION_TOO_SLOW");
    const kf = frames[anim.name];
    if (!kf) {
      errors.push("KEYFRAMES_MISSING");
      continue;
    }
    const first = frameAt(kf, "0%");
    const last = frameAt(kf, "100%");
    if (!first || !last || !isNeutralFrame(first.body) || !isNeutralFrame(last.body)) errors.push("NEUTRAL_FRAME_INVALID");
    if (first && last && first !== last && first.body.replace(/\s+/g, "") !== last.body.replace(/\s+/g, "")) errors.push("LOOP_NOT_SEAMLESS");
  }
  for (const part of usedLoopParts) {
    if (!loopRules.some((r) => new RegExp(`\\.scene-${part}\\b`).test(r.selector))) errors.push("PART_MOTION_MISSING");
  }
  for (const rule of rules) {
    for (const m of rule.selector.matchAll(/\.scene-([a-z]+)/g)) {
      if (m[1] !== "phase" && !parts.has(m[1])) errors.push("SCENE_PART_UNKNOWN");
    }
  }
  for (const [name, kf] of Object.entries(frames)) {
    const bodies = kf.map((f) => f.body).join(";");
    if (FORBIDDEN_KEYFRAME_PROPS.test(` ${bodies}`)) errors.push("LAYOUT_PROPERTY_ANIMATION");
    if (HEAVY_KEYFRAME_PROPS.test(bodies)) errors.push("HEAVY_FILTER_ANIMATION");
    const amp = amplitude(kf);
    if (name.startsWith("scene-") && (amp.rot > 8 || amp.move > 16)) errors.push("MOTION_AMPLITUDE_EXCESSIVE");
  }
  // Subject-specific bands from the owner's brief.
  const lantern = frames["scene-lantern-sway"];
  if (!lantern || amplitude(lantern).rot > 1.5 || amplitude(lantern).rot === 0) errors.push("LANTERN_SWAY_EXCESSIVE");
  const leaf = frames["scene-leaf-sway"];
  if (!leaf || amplitude(leaf).rot > 1.2 || amplitude(leaf).rot < 0.5) errors.push("BAMBOO_WINDSTORM");
  const cloud = frames["scene-cloud-drift"];
  if (!cloud) errors.push("CLOUD_RESET_JUMPS");
  else {
    const a = frameAt(cloud, "0%");
    const b = frameAt(cloud, "100%");
    if (!a || !b || a.body.replace(/\s+/g, "") !== b.body.replace(/\s+/g, "")) errors.push("CLOUD_RESET_JUMPS");
    const move = amplitude(cloud).move;
    if (move < 8 || move > 16) errors.push("CLOUD_DRIFT_OUT_OF_BAND");
  }
  // The train passes softly and rests most of the cycle; it never races.
  const train = frames["scene-train-pass"];
  if (!train) errors.push("TRAIN_LOOPS_AGGRESSIVELY");
  else {
    const stop = (s) => (s === "from" ? 0 : s === "to" ? 100 : parseFloat(s));
    const rest = train.filter((f) => isNeutralFrame(f.body)).flatMap((f) => f.stops.map(stop));
    const moving = train.filter((f) => !isNeutralFrame(f.body)).flatMap((f) => f.stops.map(stop));
    // The train holds its rest pose until at least half the cycle, then glides.
    const firstMove = moving.length ? Math.min(...moving) : 100;
    const restUntil = Math.max(-1, ...rest.filter((v) => v < firstMove));
    if (!moving.length || restUntil < 50) errors.push("TRAIN_LOOPS_AGGRESSIVELY");
  }
  // Character scenes breathe, they never bounce.
  const float = frames["scene-float-breathe"];
  if (!float || amplitude(float).move > 4 || amplitude(float).rot > 0) errors.push("CHARACTER_BOUNCES");

  // Entrance: once, from the lane's own side, 280–420 ms.
  const left = rules.find((r) => /data-scene-side="left"\]\[data-reveal="pending"\]/.test(r.selector));
  const right = rules.find((r) => /data-scene-side="right"\]\[data-reveal="pending"\]/.test(r.selector));
  const lx = /translate3d\(\s*(-?[\d.]+)px/.exec(declaration(left?.body, "transform") ?? "");
  const rx = /translate3d\(\s*(-?[\d.]+)px/.exec(declaration(right?.body, "transform") ?? "");
  if (!lx || !rx || !(Number(lx[1]) < 0) || !(Number(rx[1]) > 0)) errors.push("ENTRANCE_SIDE_REVERSED");
  const entrance = rules.find((r) => r.selector === ".journey-scene-reveal" && /transition-duration/.test(r.body));
  const entranceMs = evalDurationMs(declaration(entrance?.body, "transition-duration"));
  if (entranceMs === null || entranceMs < 280 || entranceMs > 420) errors.push("ENTRANCE_DURATION_OUT_OF_BAND");

  // One-shot ink: only for the mount that revealed the scene; never a loop.
  const ink = rules.find((r) => /\.scene-ink\b/.test(r.selector) && !r.media);
  if (!ink || !/\[data-scene-entered="now"\]/.test(ink.selector) || /infinite/.test(ink.body)) errors.push("INK_REDRAWS");
  if (!/data-scene-entered=\{enteredNow \? "now" : undefined\}/.test(src.journeyScene ?? "")) errors.push("INK_REDRAWS");

  // Reduced motion: the art stays, nothing moves.
  const reduced = rules.filter((r) => /prefers-reduced-motion:\s*reduce/.test(r.media ?? ""));
  const stillsParts = reduced.some((r) => /\.journey-scene g\[class\*="scene-"\]/.test(r.selector) && /animation:\s*none/.test(r.body));
  const stillsOrnaments = reduced.some((r) => /\.symbolic-ornament\b/.test(r.selector) && /animation:\s*none/.test(r.body));
  if (!stillsParts || !stillsOrnaments) errors.push("REDUCED_MOTION_IGNORED");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 2. SVG role contract (validate:animated-svg-role-contract)         */
/* ------------------------------------------------------------------ */

const PART_GROUP = /<g class="(scene-[^"]*)"([^>]*)>/g;

/** Inner markup of the <g> opening at `start` (balanced). */
function groupInner(svg, start) {
  const openEnd = svg.indexOf(">", start) + 1;
  let depth = 1;
  const re = /<(\/?)g\b[^>]*?(\/?)>/g;
  re.lastIndex = openEnd;
  let m;
  while ((m = re.exec(svg))) {
    if (m[2]) continue;
    depth += m[1] ? -1 : 1;
    if (depth === 0) return svg.slice(openEnd, m.index);
  }
  return "";
}

export function checkAnimatedSvgRoles(src) {
  const errors = [];
  let prof;
  let reg;
  try {
    prof = profilesModule(src);
    reg = registryModule(src);
  } catch {
    return ["SCENE_PROFILES_UNLOADABLE"];
  }
  const parts = new Set(prof.SCENE_PARTS ?? []);
  const max = motionModule(src).MAX_AMBIENT_PARTS_PER_OWNER ?? EXPECTED_PARTS_PER_OWNER;
  const files = src.scenes ?? {};
  if (Object.keys(files).length === 0) errors.push("SVG_LIBRARY_EMPTY");
  for (const id of reg.JOURNEY_SCENE_IDS ?? []) {
    const svg = files[`journey-${id}.svg`] ?? "";
    const spec = prof.SCENE_MOTION?.[id] ?? { loops: [], oneShot: [] };
    if (/<svg\b[^>]*\bclass="[^"]*scene-/.test(svg)) errors.push("ROOT_PART");
    const found = [];
    for (const m of svg.matchAll(PART_GROUP)) {
      const classes = m[1].split(/\s+/);
      const part = classes[0].slice("scene-".length);
      for (const extra of classes.slice(1)) if (!/^scene-phase-[23]$/.test(extra)) errors.push("SVG_ROLE_UNKNOWN");
      if (!parts.has(part)) errors.push("SVG_ROLE_UNKNOWN");
      if (/\stransform="/.test(m[2])) errors.push("PART_TRANSFORM_CONFLICT");
      if (/\sstyle="/.test(m[2])) errors.push("PART_INLINE_STYLE");
      found.push({ part, inner: groupInner(svg, m.index) });
    }
    const foundParts = new Set(found.map((f) => f.part));
    for (const part of spec.loops ?? []) if (!foundParts.has(part)) errors.push("SVG_ROLE_MISSING");
    for (const part of spec.oneShot ?? []) if (!foundParts.has(part)) errors.push("SVG_ROLE_MISSING");
    for (const part of foundParts) if (![...(spec.loops ?? []), ...(spec.oneShot ?? [])].includes(part)) errors.push("SVG_ROLE_UNREGISTERED");
    const loopElements = found.filter((f) => (spec.loops ?? []).includes(f.part)).length;
    if (loopElements > max) errors.push("TOO_MANY_PARTS");
    // A lantern part is one lantern (glow + cord + body + tassel), never the street.
    for (const f of found.filter((x) => x.part === "lantern")) {
      const drawables = count(f.inner, /<(?:path|rect|circle|ellipse|line|polyline|polygon)\b/g);
      if (drawables > 6 || !/<ellipse class="lys-f-accent/.test(f.inner)) errors.push("WHOLE_STREET_SWINGS");
    }
    // Architecture stays put: no part may wrap the signature disc or a building wall.
    for (const f of found) if (/url\(#[\w-]+-disc\)/.test(f.inner)) errors.push("ARCHITECTURE_WOBBLES");
  }

  // Culture / lane ornaments: every motif has a profile and one animated wrapper.
  const orn = src.symbolicOrnaments ?? "";
  const motifs = [...(/ORNAMENT_MOTIFS = \[([\s\S]*?)\] as const/.exec(orn)?.[1] ?? "").matchAll(/"([\w-]+)"/g)].map((m) => m[1]);
  const table = /ORNAMENT_MOTION_PROFILE[^=]*=\s*\{([\s\S]*?)\};/.exec(orn)?.[1] ?? "";
  const profiles = new Set(evalSource(src.visualProfiles).SCENIC_MOTION_PROFILES ?? []);
  for (const motif of motifs) {
    const m = new RegExp(`(?:"${motif}"|\\b${motif.replace("-", "_")})\\s*:\\s*"([\\w-]+)"`).exec(table);
    if (!m) errors.push("ORNAMENT_PROFILE_MISSING");
    else if (!profiles.has(m[1])) errors.push("ORNAMENT_PROFILE_INVALID");
  }
  if (!/<g className="orn-part">\{motifPath\(motif\)\}<\/g>/.test(orn)) errors.push("ORNAMENT_PART_MISSING");
  // A still motif never loops: it never takes one of the two ornament slots.
  if (!/useAmbientMotion\(ref, "ornament", profile !== "still"\)/.test(orn)) errors.push("STILL_ORNAMENT_TAKES_SLOT");
  if (!/data-ornament-profile=\{profile\}/.test(orn)) errors.push("ORNAMENT_PROFILE_MISSING");
  const css = stripComments(src.livingCanvasCss ?? "");
  if (!/\.symbolic-ornament\[data-ornament-profile\]\s*\{\s*animation:\s*none;/.test(css)) errors.push("ORNAMENT_WHOLE_FLOAT");
  for (const rule of cssRules(src.livingCanvasCss).filter((r) => /\.orn-part/.test(r.selector) && /infinite/.test(r.body))) {
    if (!/\.symbolic-ornament\[data-ambient="run"\]/.test(rule.selector)) errors.push("AMBIENT_LOOP_UNGATED");
  }
  // The entrance plays on the slot wrapper: on the ambient host the budget's
  // pause would hold it half-faded.
  for (const rule of cssRules(src.livingCanvasCss).filter((r) => /ornament-enter/.test(r.body) && !r.media)) {
    if (!/\[data-ornament-side="(?:left|right)"\]:has\(> \.symbolic-ornament\)/.test(rule.selector)) errors.push("ORNAMENT_ENTRANCE_ON_HOST");
  }
  // Culture topics open on their own motif.
  if (!/motifOffset/.test(orn) || !/ornamentOffset=\{/.test(src.cultureTopicDetail ?? "")) errors.push("CULTURE_MOTIFS_UNIFORM");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 3. Ambient ownership (validate:ambient-scene-ownership)            */
/* ------------------------------------------------------------------ */

export function checkAmbientOwnership(src) {
  const errors = [];
  let motion;
  try {
    motion = motionModule(src);
  } catch {
    return ["AMBIENT_BUDGET_UNLOADABLE"];
  }
  if (motion.MAX_VISIBLE_AMBIENT_ANIMATIONS !== EXPECTED_MAX_OWNERS) errors.push("AMBIENT_OWNERS_EXCEED_4");
  const cap = motion.AMBIENT_KIND_CAP ?? {};
  if (!(cap.scene >= 1 && cap.scene <= EXPECTED_KIND_CAP.scene) || !(cap.ornament >= 1 && cap.ornament <= EXPECTED_KIND_CAP.ornament)) errors.push("KIND_CAP_MISSING");
  if (motion.MAX_AMBIENT_PARTS_PER_OWNER !== EXPECTED_PARTS_PER_OWNER) errors.push("PARTS_PER_OWNER_DRIFT");
  if (motion.MAX_AMBIENT_LOOPS !== motion.MAX_VISIBLE_AMBIENT_ANIMATIONS * motion.MAX_AMBIENT_PARTS_PER_OWNER) errors.push("LOOP_CEILING_DRIFT");

  // Execute the real allocation and scheduler with a fake document.
  const timers = [];
  let visibility = "visible";
  let observe = null;
  class FakeObserver {
    constructor(cb) {
      observe = cb;
    }
    observe() {}
    unobserve() {}
  }
  const makeEl = () => ({
    attrs: {},
    setAttribute(k, v) {
      this.attrs[k] = String(v);
    },
    getAttribute(k) {
      return this.attrs[k] ?? null;
    },
  });
  let budget;
  try {
    budget = evalSource(src.ambientBudget, {
      requires: {
        react: { useEffect() {} },
        "./livingUiMotion": {
          ...motion,
          documentHidden: () => visibility === "hidden",
          prefersReducedMotion: () => false,
          subscribeReducedMotion: () => () => {},
        },
      },
      globals: {
        document: {
          get visibilityState() {
            return visibility;
          },
          addEventListener() {},
        },
        IntersectionObserver: FakeObserver,
        requestAnimationFrame: () => 1,
        cancelAnimationFrame: () => {},
        setTimeout: (fn) => timers.push(fn),
        clearTimeout: () => {},
      },
    });
  } catch {
    return uniq([...errors, "AMBIENT_BUDGET_UNLOADABLE"]);
  }
  const flush = () => {
    for (let guard = 0; timers.length && guard < 50; guard += 1) timers.shift()();
  };
  // Pure allocation: 1 current node, 6 scenes, 6 ornaments, all visible.
  const crowd = [
    { id: 1, priority: 0, visible: true, kind: "currentNode" },
    ...Array.from({ length: 6 }, (_, i) => ({ id: 10 + i, priority: 2, visible: true, kind: "scene" })),
    ...Array.from({ length: 6 }, (_, i) => ({ id: 30 + i, priority: 3, visible: true, kind: "ornament" })),
  ];
  try {
    const granted = budget.allocateAmbientSlots(crowd);
    const scenes = [...granted].filter((id) => id >= 10 && id < 30).length;
    const ornaments = [...granted].filter((id) => id >= 30).length;
    if (granted.size > EXPECTED_MAX_OWNERS) errors.push("AMBIENT_OWNERS_EXCEED_4");
    if (scenes > EXPECTED_KIND_CAP.scene || ornaments > EXPECTED_KIND_CAP.ornament) errors.push("KIND_CAP_IGNORED");
    if (!granted.has(1)) errors.push("AMBIENT_PRIORITY_INVERTED");
    if (scenes !== EXPECTED_KIND_CAP.scene || ornaments !== 1) errors.push("KIND_CAP_IGNORED");
    const offscreen = budget.allocateAmbientSlots(crowd.map((c) => ({ ...c, visible: c.kind !== "scene" })));
    if ([...offscreen].some((id) => id >= 10 && id < 30)) errors.push("AMBIENT_RUNS_OFFSCREEN");
    if (budget.allocateAmbientSlots(crowd, undefined, true).size !== 0) errors.push("AMBIENT_RUNS_WHILE_HIDDEN");
  } catch {
    errors.push("AMBIENT_BUDGET_UNLOADABLE");
  }
  // Scheduler: three scenes register; only two run; one unmounts → its slot
  // is released to the waiting scene and its own element rests (neutral pose).
  try {
    const els = [makeEl(), makeEl(), makeEl()];
    const offs = els.map((el) => budget.registerAmbient(el, "scene"));
    observe?.(els.map((el) => ({ target: el, isIntersecting: true })));
    flush();
    const runningBefore = els.filter((el) => el.getAttribute("data-ambient") === "run").length;
    if (runningBefore !== EXPECTED_KIND_CAP.scene) errors.push("KIND_CAP_IGNORED");
    const firstRunning = els.findIndex((el) => el.getAttribute("data-ambient") === "run");
    offs[firstRunning]();
    flush();
    if (els[firstRunning].getAttribute("data-ambient") !== "rest") errors.push("SCENE_FREEZES_INVALID");
    const after = els.filter((el, i) => i !== firstRunning && el.getAttribute("data-ambient") === "run").length;
    if (after !== EXPECTED_KIND_CAP.scene) errors.push("AMBIENT_SLOT_LEAK");
    const snap = budget.ambientSnapshot();
    if (snap.registered !== 2 || (snap.byKind?.scene ?? 0) !== 2) errors.push("AMBIENT_SLOT_LEAK");
    visibility = "hidden";
    observe?.([]);
    flush();
    if (els.some((el) => el.getAttribute("data-ambient") === "run")) errors.push("AMBIENT_RUNS_WHILE_HIDDEN");
    visibility = "visible";
    for (const [i, off] of offs.entries()) if (i !== firstRunning) off();
    flush();
    if (budget.ambientSnapshot().registered !== 0) errors.push("AMBIENT_SLOT_LEAK");
  } catch {
    errors.push("AMBIENT_BUDGET_UNLOADABLE");
  }
  // Every living drawing registers as one owner; parts never register alone.
  if (!/useAmbientMotion\(driftRef, "scene"/.test(src.journeyScene ?? "")) errors.push("SCENE_UNBUDGETED");
  if (!/useAmbientMotion\(ref, "scene", markup !== null\)/.test(src.cultureHeroScene ?? "")) errors.push("HERO_SCENE_UNBUDGETED");
  if (count(src.journeyScene, /useAmbientMotion\(/g) !== 1 || count(src.cultureHeroScene, /useAmbientMotion\(/g) !== 1) errors.push("PART_REGISTERED_ALONE");
  if (/new IntersectionObserver\(/.test(src.cultureHeroScene ?? "")) errors.push("OBSERVER_PER_ELEMENT");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 4. Chinese frame system (validate:chinese-frame-system)            */
/* ------------------------------------------------------------------ */

function themeBlock(css, header) {
  const i = css.indexOf(header);
  if (i < 0) return "";
  const open = css.indexOf("{", i);
  return css.slice(open + 1, css.indexOf("}", open));
}
function tokenRgb(block, name) {
  const m = new RegExp(`--${name}:\\s*(\\d+)\\s+(\\d+)\\s+(\\d+)`).exec(block);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
}
function lum([r, g, b]) {
  const c = (v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
}
export function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const over = (fg, bg, alpha) => fg.map((v, i) => Math.round(v * alpha + bg[i] * (1 - alpha)));

export function checkChineseFrameSystem(src) {
  const errors = [];
  const frame = stripComments(src.frame ?? "");
  const levels = /type ChineseFrameLevel = ([^;]+);/.exec(src.frame ?? "")?.[1] ?? "";
  if (!/"embroidered"/.test(levels) || !/"heritage"/.test(levels) || !/"ceremony"/.test(levels) || count(levels, /"/g) !== 6) errors.push("FRAME_LEVEL_UNKNOWN");
  if (!/data-frame-level=\{structural \? level : undefined\}/.test(frame)) errors.push("FRAME_LEVEL_UNKNOWN");
  if (!/corners && !structural/.test(frame)) errors.push("CORNER_DOUBLED");
  if (!/aria-hidden="true"/.test(frame)) errors.push("FRAME_ANNOUNCED");

  // Where each level may sit.
  for (const [file, text] of Object.entries(src.tsx ?? {})) {
    const clean = stripComments(text);
    for (const m of clean.matchAll(/<ChineseOrnamentalFrame\b([^>]*?)\/>/g)) {
      const props = m[1];
      const level = /\blevel="(\w+)"/.exec(props)?.[1] ?? "embroidered";
      const surface = /\bsurface="([\w-]+)"/.exec(props)?.[1] ?? "";
      if (level === "embroidered") continue;
      if (!["heritage", "ceremony"].includes(level)) errors.push("FRAME_LEVEL_UNKNOWN");
      else if (!FRAME_LEVEL_SURFACES[level].includes(surface) && surface !== "qa-gallery") {
        errors.push(level === "ceremony" ? "CEREMONY_ON_ORDINARY" : "FRAME_LEVEL_SURFACE");
      }
    }
    void file;
  }
  for (const key of ["cultureTopicCard", "steps", "hanziBuilder", "primitives", "modalOverlay"]) {
    if (/\blevel="(?:heritage|ceremony)"|<ChineseOrnamentalFrame\b/.test(stripComments(src[key] ?? ""))) errors.push("EVERY_CARD_FRAMED");
  }

  const css = src.framesCss ?? "";
  const clean = stripComments(css);
  if (!/import\s+"\.\/styles\/chinese-frames\.css"/.test(src.main ?? "")) errors.push("FRAMES_NOT_LOADED");
  if (/box-shadow/.test(clean)) errors.push("FRAME_SHADOW");
  if (/infinite/.test(clean)) errors.push("FRAME_LOOPS");
  if (/#[0-9a-f]{3,8}\b/i.test(clean.replace(/%23000/g, ""))) errors.push("FRAME_HEX");
  if (!/\.lyo-frame\[data-frame-level\] \.lyo-edge \{\s*opacity: 1;\s*border-color: rgb\(var\(--gilt\)\);/.test(clean)) errors.push("FRAME_TOKEN_MISSING");
  if (!/\.lyo-frame\[data-frame-level\]::after \{[^}]*background: rgb\(var\(--gilt\)\);/.test(clean)) errors.push("FRAME_TOKEN_MISSING");
  // The hooks never take taps: explicitly none, and never re-enabled by any frame rule.
  if (!/\.lyo-frame\[data-frame-level\]::after \{[^}]*pointer-events: none;/.test(clean)) errors.push("FRAME_INTERCEPTS_POINTER");
  if (/\.lyo-frame[^{]*\{[^}]*pointer-events:\s*(?:auto|all|visible\w*|painted|fill|stroke)/.test(clean)) errors.push("FRAME_INTERCEPTS_POINTER");
  // Hooks stay clear of host padding: per-surface hooks never exceed the default size.
  for (const m of clean.matchAll(/\.lyo-frame\[data-frame-level\]\[data-ornament-surface="([\w-]+)"\] \{[^}]*--cframe-hook: (\d+)px;/g)) {
    if (!FRAME_LEVEL_SURFACES.heritage.includes(m[1]) && !FRAME_LEVEL_SURFACES.ceremony.includes(m[1]) && m[1] !== "qa-gallery") errors.push("FRAME_LEVEL_SURFACE");
    if (Number(m[2]) < 10 || Number(m[2]) > 24) errors.push("CORNER_DISCONNECTED");
  }
  // The rule meets the hooks: edges stop exactly at the hook size, hooks are drawn at that size.
  if (!/\.lyo-edge-top,\s*\.lyo-frame\[data-frame-level\] \.lyo-edge-bottom \{\s*left: var\(--cframe-hook\);\s*right: var\(--cframe-hook\);/.test(clean)) errors.push("CORNER_DISCONNECTED");
  if (count(clean, /var\(--cframe-hook\) var\(--cframe-hook\) no-repeat/g) < 8) errors.push("CORNER_DISCONNECTED");
  // Every hook's first stroke is the L that lies on the rule (M<size> .5H.5V<size>, mirrored).
  const tl = /--cframe-hook-tl: url\("data:image\/svg\+xml,[^"]*?d='M(\d+) \.5H\.5V(\d+)/.exec(clean);
  if (!tl || tl[1] !== tl[2]) errors.push("CORNER_DISCONNECTED");
  // Outer and inner rule align: the rule sits on the overlay's own inset.
  for (const edge of ["top", "bottom", "left", "right"]) {
    if (!new RegExp(`\\.lyo-frame\\[data-frame-level\\] \\.lyo-edge-${edge} \\{\\s*${edge}: 0;`).test(clean)) errors.push("BORDERS_MISALIGNED");
  }
  if (!/\.lyo-frame\[data-frame-level\] \.lyo-edge::after \{\s*display: none;/.test(clean)) errors.push("STITCH_UNDER_RULE");
  // One entrance (with the existing once-per-session draw), never a loop; still under reduced motion.
  if (!/\.lyo-frame\[data-frame-level\]\[data-animate="once"\]::after \{\s*animation: cframe-settle calc\(var\(--motion-emphasis\) \* 1\.5\) var\(--ease-enter\) backwards;/.test(clean)) errors.push("FRAME_DRAW_LOOPS");
  if (!/@media \(prefers-reduced-motion: reduce\) \{\s*\.lyo-frame\[data-frame-level\]::after \{\s*animation: none !important;/.test(clean)) errors.push("FRAME_REDUCED_MOTION");

  // Tokens exist in every theme and stay visible but never blinding.
  const index = src.css ?? "";
  const clay = themeBlock(index, ':root,\n[data-theme="clay"]');
  const china = themeBlock(index, '[data-theme="china"] {');
  const dark = themeBlock(index, '[data-theme="dark"] {');
  for (const block of [clay, china, dark]) for (const name of ["gilt", "frame-line", "line-strong"]) if (!tokenRgb(block, name)) errors.push("FRAME_TOKEN_MISSING");
  for (const name of ["gilt", "frame-line", "line-strong"]) if (!new RegExp(`"?${name}"?: "rgb\\(var\\(--${name}\\) / <alpha-value>\\)"`).test(src.tailwind ?? "")) errors.push("FRAME_TOKEN_MISSING");
  const milestone = 0.55;
  for (const [block, name, fallback] of [[clay, "clay", clay], [china, "china", clay], [dark, "dark", dark]]) {
    const gilt = tokenRgb(block, "gilt");
    const surface = tokenRgb(block, "surface") ?? tokenRgb(fallback, "surface");
    if (!gilt || !surface) continue;
    const ratio = contrast(over(gilt, surface, milestone), surface);
    if (ratio < 1.6) errors.push(name === "dark" ? "FRAME_INVISIBLE_DARK" : "FRAME_INVISIBLE_LIGHT");
    if (name === "dark" && ratio > 6) errors.push("FRAME_BLINDING_DARK");
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 5. Visual density (validate:chinese-visual-density)                */
/* ------------------------------------------------------------------ */

export function checkChineseVisualDensity(src) {
  const errors = [];
  const structuralIn = (text) => count(stripComments(text), /<ChineseOrnamentalFrame\b[^>]*\blevel="(?:heritage|ceremony)"/g);
  if (structuralIn(src.journeyPage) > 1) errors.push("FRAME_DENSITY_EXCEEDED");
  if (structuralIn(src.cultureTopicDetail) > 1) errors.push("FRAME_DENSITY_EXCEEDED");
  if (count(stripComments(src.victory), /\blevel="ceremony"/g) > 1) errors.push("FRAME_DENSITY_EXCEEDED");
  // One living scene per Culture topic page, only in its hero.
  const detail = stripComments(src.cultureTopicDetail ?? "");
  if (count(detail, /<CultureHeroScene\b/g) !== 1) errors.push("CULTURE_SCENE_DENSITY");
  const header = /<header[\s\S]*?data-testid="culture-topic-header"[\s\S]*?<\/header>/.exec(detail)?.[0] ?? "";
  if (!/<CultureHeroScene\b/.test(header)) errors.push("HERO_SCENE_ON_SUBTOPIC");
  for (const [file, text] of Object.entries(src.tsx ?? {})) {
    if (/<CultureHeroScene\b/.test(stripComments(text)) && !/CultureTopicDetailPage\.tsx$|features\/qa\//.test(file)) errors.push("CULTURE_SCENE_DENSITY");
    // Ceremony + a living scene + the mascot on one screen is an overload.
    const clean = stripComments(text);
    if (/\blevel="ceremony"/.test(clean) && /<(?:JourneyScene|CultureHeroScene)\b/.test(clean) && /<Mascot\b/.test(clean)) errors.push("VISUAL_OVERLOAD");
  }
  // Ambience never enters learning tasks or auth.
  for (const key of ["steps", "hanziBuilder"]) if (/<(?:JourneyScene|CultureHeroScene|ChineseOrnamentalFrame)\b/.test(stripComments(src[key] ?? ""))) errors.push("AMBIENCE_IN_TASK");
  // Culture keeps editorial calm: topic cards carry no living scene.
  if (/<(?:JourneyScene|CultureHeroScene)\b/.test(stripComments(src.cultureTopicCard ?? "")) || /<(?:JourneyScene|CultureHeroScene)\b/.test(stripComments(src.cultureJourney ?? ""))) errors.push("CULTURE_SCENE_DENSITY");
  // The hero map covers every topic exactly once with a registered scene.
  let theme;
  try {
    theme = evalSource(src.cultureVisualTheme).CULTURE_TOPIC_VISUAL;
  } catch {
    theme = null;
  }
  const ids = registryIds(src);
  if (!theme || Object.keys(theme).length < 7) errors.push("CULTURE_THEME_INCOMPLETE");
  else for (const v of Object.values(theme)) if (!ids.includes(v.heroScene) || !Number.isInteger(v.ornamentOffset)) errors.push("CULTURE_THEME_INCOMPLETE");
  return uniq(errors);
}

function registryIds(src) {
  try {
    return registryModule(src).JOURNEY_SCENE_IDS ?? [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* 6. Typography + icons (validate:typography-icon-audit)             */
/* ------------------------------------------------------------------ */

/** Bundled or system families only; nothing proprietary, nothing fetched beyond the two web fonts. */
export const FONT_ALLOWLIST = ["Inter", "Segoe UI", "system-ui", "sans-serif", "Noto Serif SC", "Songti SC", "Georgia", "serif"];
export const WEB_FONT_FAMILIES = ["Inter", "Noto Serif SC"];
/** Below this an arbitrary size is unreadable on a phone; above the ceiling it is a layout accident. */
export const TEXT_PX_FLOOR = 10;
export const TEXT_REM_CEILING = 12;
/** A Hanzi glyph on a learning surface is never caption-sized. */
export const HANZI_LEARNING_MIN_PX = 14;
export const MANDARIN_EXAMPLE_MIN_REM = 1.25;
export const MANDARIN_PRIMARY_MIN_REM = 1.5;

const TW_REM = { xs: 0.75, sm: 0.875, base: 1, lg: 1.125, xl: 1.25, "2xl": 1.5, "3xl": 1.875, "4xl": 2.25, "5xl": 3 };
const EMOJI = /\p{Extended_Pictographic}/u;
const EMOJI_EXEMPT = /[©®™↔↕]/u;

export function hasEmoji(text) {
  for (const ch of stripComments(text)) if (EMOJI.test(ch) && !EMOJI_EXEMPT.test(ch)) return true;
  return false;
}

/** Tailwind size class → rem (named or arbitrary px/rem); null when not a size. */
export function sizeRem(cls) {
  const named = /^text-(xs|sm|base|lg|xl|[2-5]xl)$/.exec(cls);
  if (named) return TW_REM[named[1]];
  const px = /^text-\[(\d+(?:\.\d+)?)px\]$/.exec(cls);
  if (px) return Number(px[1]) / 16;
  const rem = /^text-\[(\d*\.?\d+)rem\]$/.exec(cls);
  if (rem) return Number(rem[1]);
  return null;
}

function roleApply(css, role) {
  return new RegExp(`\\.${role}\\s*\\{\\s*@apply ([^;]+);`).exec(css)?.[1]?.split(/\s+/) ?? null;
}

function classNames(text) {
  return [...stripComments(text).matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)].map((m) => m[1] ?? m[2]);
}

function families(list) {
  return list
    .split(",")
    .map((f) => f.trim().replace(/^['"]|['"]$/g, ""))
    .filter(Boolean);
}

const LEARNING_SURFACES = ["steps", "hanziBuilder", "mandarinToken", "revisao", "immersion"];

export function checkTypographyIconAudit(src) {
  const errors = [];

  // Canonical navigation speaks one icon family: Longyu line icons, never emoji.
  for (const key of ["nav", "tabBar", "sidebar", "topBar", "morePage"]) {
    if (hasEmoji(src[key] ?? "")) errors.push("NAV_EMOJI_ICON");
  }
  const nav = stripComments(src.nav ?? "");
  const navIcons = new Set((/import \{([^}]*)\} from "\.\.\/ui\/Icon"/.exec(nav)?.[1] ?? "").split(",").map((n) => n.trim()).filter(Boolean));
  const used = [...nav.matchAll(/\bto: "[^"]*",[^\n]*?\bicon: ([^,}\s]+)/g)].map((m) => m[1]);
  if (used.length < 10 || used.some((name) => !navIcons.has(name))) errors.push("NAV_ICON_FAMILY");
  const icon = stripComments(src.icon ?? "");
  if (!/strokeWidth: 1\.8,/.test(icon)) errors.push("ICON_FAMILY_DRIFT");
  const iconExports = [...icon.matchAll(/export const (Icon\w+) = \(p: P\) => \(\s*<svg \{\.\.\.base\(p\)\}>/g)].map((m) => m[1]);
  const allIconExports = [...icon.matchAll(/export const (Icon\w+) =/g)].map((m) => m[1]);
  if (iconExports.length !== allIconExports.length) errors.push("ICON_FAMILY_DRIFT");
  for (const name of ["IconMoon", "IconPagoda", "IconBrush", "IconSeal", "IconTrain"]) if (!iconExports.includes(name)) errors.push("CHINESE_ICON_MISSING");

  // Culture cards: one line family inside the icon tile, no emoji next to it.
  const card = stripComments(src.cultureTopicCard ?? "");
  const tile = /data-topic-icon-family="longyu-line"\s*>([\s\S]*?)<\/span>/.exec(card)?.[1] ?? "";
  if (!tile || /<(?!CultureTopicIcon\b|IconLock\b|\/)[A-Za-z]/.test(tile.replace(/\{[^{}]*\?/g, "")) || hasEmoji(tile)) errors.push("TOPIC_ICON_MIXED");
  const topicIcons = stripComments(src.cultureTopicIcon ?? "");
  if (!/strokeWidth: 1\.6,/.test(topicIcons) || count(topicIcons, /<svg\b/g) !== count(topicIcons, /<svg \{\.\.\.base\(p\)\}/g)) errors.push("TOPIC_ICON_MIXED");
  if (hasEmoji(src.cultureCard ?? "") || hasEmoji(src.cultureTopicCard ?? "")) errors.push("TOPIC_ICON_MIXED");
  const collection = /const COLLECTION_ICON[^=]*= \{([^}]*)\}/.exec(stripComments(src.cultureAtlas ?? ""))?.[1] ?? "";
  const collectionValues = [...collection.matchAll(/:\s*([^,\n]+)/g)].map((m) => m[1].trim());
  if (collectionValues.length < 5 || collectionValues.some((v) => !/^Icon[A-Z]\w*$/.test(v))) errors.push("COLLECTION_ICON_EMOJI");

  // Rogue sizes: nothing below the floor, nothing absurd above the ceiling.
  for (const text of Object.values(src.allTsx ?? {})) {
    for (const m of stripComments(text).matchAll(/\btext-\[(\d*\.?\d+)(px|rem)\]/g)) {
      const rem = m[2] === "px" ? Number(m[1]) / 16 : Number(m[1]);
      if (rem < TEXT_PX_FLOOR / 16 || rem > TEXT_REM_CEILING) errors.push("TEXT_SIZE_EXTREME");
    }
  }

  // Hanzi stays learning content: canonical roles keep their size, pinyin stays beneath.
  const css = src.css ?? "";
  const remOf = (classes) => (classes ?? []).map((c) => sizeRem(c.replace(/^sm:/, "--"))).find((v) => v != null) ?? null;
  const example = remOf(roleApply(css, "type-mandarin-example"));
  const primary = remOf(roleApply(css, "type-mandarin-primary"));
  const pinyinRole = roleApply(css, "type-pinyin");
  const pinyin = remOf(pinyinRole);
  if (example == null || example < MANDARIN_EXAMPLE_MIN_REM) errors.push("HANZI_METADATA_SIZED");
  if (primary == null || primary < MANDARIN_PRIMARY_MIN_REM) errors.push("HANZI_METADATA_SIZED");
  if (pinyin == null || example == null || pinyin >= example) errors.push("PINYIN_OVER_HANZI");
  if ((pinyinRole ?? []).some((c) => /^font-(semibold|bold|extrabold|black)$/.test(c))) errors.push("PINYIN_OVER_HANZI");
  if (!/\.hanzi \{\s*font-family: "Noto Serif SC", "Songti SC", serif;/.test(css)) errors.push("HANZI_FONT_FALLBACK");
  for (const key of LEARNING_SURFACES) {
    for (const cls of classNames(src[key] ?? "")) {
      const list = cls.split(/\s+/);
      const size = list.map(sizeRem).find((v) => v != null);
      if (list.includes("hanzi") && size != null && size * 16 < HANZI_LEARNING_MIN_PX) errors.push("HANZI_METADATA_SIZED");
      if (list.includes("type-pinyin") && size != null && example != null && size >= example) errors.push("PINYIN_OVER_HANZI");
    }
  }

  // Fonts: the declared stacks only.
  const fontBlock = /fontFamily: \{([\s\S]*?)\}/.exec(src.tailwind ?? "")?.[1] ?? "";
  const twFamilies = [...fontBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1].replace(/^'|'$/g, ""));
  if (!twFamilies.length || twFamilies.some((f) => !FONT_ALLOWLIST.includes(f))) errors.push("FONT_UNSUPPORTED");
  for (const sheet of [src.css, src.livingCanvasCss, src.framesCss]) {
    const clean = stripComments(sheet ?? "");
    if (/@font-face/.test(clean) || /@import\s+url/.test(clean)) errors.push("FONT_UNSUPPORTED");
    for (const m of clean.matchAll(/font-family:\s*([^;}]+)/g)) if (families(m[1]).some((f) => !FONT_ALLOWLIST.includes(f))) errors.push("FONT_UNSUPPORTED");
  }
  const webFonts = [...(src.indexHtml ?? "").matchAll(/family=([^&":]+)/g)].map((m) => decodeURIComponent(m[1]).replace(/\+/g, " "));
  if (webFonts.some((f) => !WEB_FONT_FAMILIES.includes(f))) errors.push("FONT_UNSUPPORTED");
  for (const text of Object.values(src.allTsx ?? {})) {
    for (const m of stripComments(text).matchAll(/fontFamily[=:]\s*["'{]+([^"'}]+)/g)) if (families(m[1]).some((f) => !FONT_ALLOWLIST.includes(f))) errors.push("FONT_UNSUPPORTED");
  }

  // Uppercase metadata on Culture cards goes through the eyebrow roles.
  for (const key of ["cultureCard", "cultureTopicCard", "cultureAtlas"]) {
    if (classNames(src[key] ?? "").some((cls) => /\buppercase\b/.test(cls))) errors.push("UPPERCASE_ROGUE");
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 6b. Progression polish (validate:progression-living)               */
/* ------------------------------------------------------------------ */

export const COMPLETION_MOMENT_BUDGET_MS = 1100;

function runCompletionMoment(src, { reduced = false } = {}) {
  const sessionOnce = evalSource(src.sessionOnce ?? "");
  const mod = evalSource(src.completionMoment ?? "", {
    requires: {
      react: { useEffect() {}, useLayoutEffect() {}, useRef: (v) => ({ current: v }), useState: (v) => [typeof v === "function" ? v() : v, () => {}] },
      "../celebrationLock": { isCelebrationActive: () => false, useOtherCelebrationActive: () => false },
      "./livingUiMotion": { prefersReducedMotion: () => reduced },
      "./sessionOnce": sessionOnce,
    },
  });
  return { mod, sessionOnce };
}

export function checkProgressionPolish(src) {
  const errors = [];
  // Connector states, executed.
  try {
    const connector = evalSource(src.progressionConnector ?? "", { jsx: true, requires: {} });
    const st = connector.progressionConnectorState;
    const expect = [
      ["COMPLETED", "COMPLETED", "complete"],
      ["COMPLETED", "CURRENT", "lead"],
      ["COMPLETED", "AVAILABLE", "lead"],
      ["CURRENT", "LOCKED", "locked"],
      ["AVAILABLE", "LOCKED", "locked"],
      ["CURRENT", "AVAILABLE", "open"],
      ["AVAILABLE", "AVAILABLE", "open"],
    ];
    for (const [from, to, want] of expect) if (st(from, to) !== want) errors.push("CONNECTOR_STATE_WRONG");
  } catch {
    errors.push("CONNECTOR_STATE_WRONG");
  }
  const conn = stripComments(src.progressionConnector ?? "");
  const tone = (state) => new RegExp(`${state}: "bg-([a-z-]+)/(\\d+)"`).exec(conn);
  const complete = tone("complete");
  const lead = tone("lead");
  const locked = tone("locked");
  if (!complete || !lead || !locked || complete[1] !== "accent" || lead[1] !== "accent" || !(Number(complete[2]) > Number(lead[2])) || locked[1] !== "line") errors.push("CONNECTOR_TONE_DRIFT");
  if (!/data-connector-state=\{connector\}/.test(conn)) errors.push("CONNECTOR_STATE_WRONG");

  // Motion: one-shots only, tokens, transform/opacity, ≤ 1.1 s, reduced motion.
  const css = src.progressionCss ?? "";
  const clean = stripComments(css);
  if (!/import\s+"\.\/styles\/progression-living\.css"/.test(src.main ?? "")) errors.push("PROGRESSION_CSS_NOT_LOADED");
  if (/infinite/.test(clean)) errors.push("COMPLETED_NODE_LOOPS");
  const frames = cssKeyframes(css);
  for (const kf of Object.values(frames)) {
    const bodies = kf.map((f) => f.body).join(";");
    if (FORBIDDEN_KEYFRAME_PROPS.test(` ${bodies}`)) errors.push("LAYOUT_PROPERTY_ANIMATION");
    if (HEAVY_KEYFRAME_PROPS.test(bodies)) errors.push("HEAVY_FILTER_ANIMATION");
  }
  for (const rule of cssRules(css).filter((r) => !r.media)) {
    const value = declaration(rule.body, "animation");
    if (value) {
      const tokens = parseAnimation(value)?.tokens ?? [];
      const times = tokens.filter((t) => /^(?:calc\(|var\(--motion|\d)/.test(t)).map(evalDurationMs);
      if (times.some((t) => t === null)) errors.push("ARBITRARY_DURATION");
      const [duration = 0, delay = 0] = times.map((t) => t ?? 0);
      if (duration + delay > COMPLETION_MOMENT_BUDGET_MS) errors.push("MOMENT_TOO_LONG");
    }
    const transition = declaration(rule.body, "transition");
    if (transition) {
      const [property, duration] = parseAnimation(transition)?.tokens ?? [];
      if (property !== "transform") errors.push("AXIS_FILL_REFLOWS");
      const ms = evalDurationMs(duration);
      if (ms === null) errors.push("ARBITRARY_DURATION");
      else if (ms > COMPLETION_MOMENT_BUDGET_MS) errors.push("MOMENT_TOO_LONG");
    }
  }
  if (!/\.journey-axis-done \{[^}]*position: absolute;[^}]*inset: 0;[^}]*transform-origin: 50% 0;/.test(clean)) errors.push("AXIS_MOVED");
  const reduced = cssRules(css).filter((r) => /prefers-reduced-motion:\s*reduce/.test(r.media ?? ""));
  if (!reduced.some((r) => /\.journey-axis-done/.test(r.selector) && /transition:\s*none/.test(r.body)) || !reduced.some((r) => /progression-node-core/.test(r.selector) && /animation:\s*none/.test(r.body))) errors.push("REDUCED_MOTION_IGNORED");

  // The moment: only a completion this session saw, on the first path view after a Victory, once,
  // never on a cold start, never under reduced motion, never stuck in its starting pose.
  try {
    const { mod } = runCompletionMoment(src);
    const t0 = 1_000_000;
    if (!(mod.COMPLETION_MOMENT_MS > 0 && mod.COMPLETION_MOMENT_MS <= COMPLETION_MOMENT_BUDGET_MS)) errors.push("MOMENT_TOO_LONG");
    if (!(mod.COMPLETION_PENDING_MAX_MS >= 1000 && mod.COMPLETION_PENDING_MAX_MS <= 30000)) errors.push("MOMENT_STUCK_PENDING");
    if (!(mod.COMPLETION_WINDOW_MS > 0 && mod.COMPLETION_WINDOW_MS <= 10000)) errors.push("MOMENT_OUT_OF_CONTEXT");
    mod.armCompletionMoments(t0);
    if (mod.peekCompletionMoment("n1", "COMPLETED", t0)) errors.push("MOMENT_ON_COLD_START");
    mod.noteNodeState("n1", "CURRENT");
    if (!mod.peekCompletionMoment("n1", "COMPLETED", t0)) errors.push("MOMENT_NEVER_PLAYS");
    if (mod.peekCompletionMoment("n1", "CURRENT", t0)) errors.push("MOMENT_ON_INCOMPLETE");
    // A module expanded long after the first path view stays still.
    mod.openCompletionWindow(t0 + 10);
    if (!mod.peekCompletionMoment("n1", "COMPLETED", t0 + 10 + mod.COMPLETION_WINDOW_MS - 1)) errors.push("MOMENT_NEVER_PLAYS");
    if (mod.peekCompletionMoment("n1", "COMPLETED", t0 + 10 + mod.COMPLETION_WINDOW_MS + 1)) errors.push("MOMENT_OUT_OF_CONTEXT");
  } catch {
    errors.push("MOMENT_UNLOADABLE");
  }
  try {
    // Never armed (no Victory this session): nothing plays.
    const { mod } = runCompletionMoment(src);
    mod.noteNodeState("n0", "CURRENT");
    if (mod.peekCompletionMoment("n0", "COMPLETED", 5)) errors.push("MOMENT_OUT_OF_CONTEXT");
  } catch {
    errors.push("MOMENT_UNLOADABLE");
  }
  try {
    const { mod, sessionOnce } = runCompletionMoment(src);
    mod.armCompletionMoments(1);
    mod.noteNodeState("n2", "CURRENT");
    sessionOnce.claimSessionOnce("progression-complete:n2");
    if (mod.peekCompletionMoment("n2", "COMPLETED", 2)) errors.push("MOMENT_REPLAYS");
    const reducedRun = runCompletionMoment(src, { reduced: true });
    reducedRun.mod.armCompletionMoments(1);
    reducedRun.mod.noteNodeState("n3", "CURRENT");
    if (reducedRun.mod.peekCompletionMoment("n3", "COMPLETED", 2)) errors.push("REDUCED_MOTION_IGNORED");
  } catch {
    errors.push("MOMENT_UNLOADABLE");
  }
  const moment = stripComments(src.completionMoment ?? "");
  const init = /useState<CompletionMomentPhase>\(\(\) => ([^\n]*)\);/.exec(moment)?.[1] ?? "";
  if (!/^\(peekCompletionMoment\(id, state\) \? "pending" : null\)$/.test(init) || /claim/.test(init)) errors.push("MOMENT_EATEN_BY_STRICTMODE");
  if (!/if \(ceremonyOrModalOnScreen\(\)\) \{/.test(moment) || !/isCelebrationActive\(COMPLETION_MOMENT_CEREMONY_ID\)/.test(moment) || !/document\.querySelector\('\[aria-modal="true"\]'\) !== null/.test(moment)) errors.push("MOMENT_UNDER_MODAL");
  // Starts from a passive effect, a macrotask later (a ceremony mounting in the same commit registers first).
  if (/useLayoutEffect/.test(moment) || !/timer = window\.setTimeout\(attempt, 60\);/.test(moment)) errors.push("MOMENT_UNDER_MODAL");
  if (!/setPhase\("done"\), COMPLETION_MOMENT_MS\)/.test(moment)) errors.push("COMPLETED_NODE_LOOPS");
  if (!/now - startedWaiting > COMPLETION_PENDING_MAX_MS/.test(moment)) errors.push("MOMENT_STUCK_PENDING");
  if (!/useEffect\(\(\) => armCompletionMoments\(\), \[\]\);/.test(stripComments(src.victory ?? ""))) errors.push("MOMENT_NEVER_PLAYS");
  // The pending pose is the moment's first frame: no jump when it starts.
  const pendingScale = /\[data-completion-moment="pending"\] \.progression-node-core \{\s*transform: scale\(([\d.]+)\);/.exec(clean)?.[1];
  const settleFrom = /@keyframes progression-node-settle \{\s*from \{\s*transform: scale\(([\d.]+)\);/.exec(clean)?.[1];
  if (!pendingScale || pendingScale !== settleFrom) errors.push("PENDING_POSE_JUMPS");

  // Bubble: the current node stays the only continuous emphasis; the sparkle is decoration.
  const bubble = stripComments(src.progressionBubble ?? "");
  if (!/export function progressionOffsetForIndex\(_index: number\): number \{\s*return 0;/.test(bubble)) errors.push("AXIS_MOVED");
  if (count(bubble, /useAmbientMotion\(/g) !== 1 || !/useAmbientMotion\(ref, "currentNode"\)/.test(bubble)) errors.push("CURRENT_NODE_NOT_ONLY");
  if (/animate-(?:bounce|spin|ping|pulse)/.test(bubble)) errors.push("CURRENT_NODE_NOT_ONLY");
  if (!/const completionMoment = useCompletionMoment\(id, state\);/.test(bubble) || !/data-completion-moment=\{completionMoment \?\? undefined\}/.test(bubble)) errors.push("MOMENT_NEVER_PLAYS");
  if (!/\{completionMoment === "play" \? <CompletionSparkle \/> : null\}/.test(bubble)) errors.push("COMPLETED_NODE_LOOPS");
  const spark = /function CompletionSparkle\(\)[\s\S]*?<\/svg>/.exec(bubble)?.[0] ?? "";
  if (!/pointer-events-none/.test(spark) || !/aria-hidden/.test(spark) || !/focusable="false"/.test(spark)) errors.push("DECORATION_INTERACTIVE");
  // The Journey axis fill lives inside the axis line and scales, never reflows.
  const journey = stripComments(src.journeyPage ?? "");
  if (!/data-progression-axis-line="true"\s*>\s*(?:\{\s*\}\s*)?<JourneyAxisDone unitId=\{unit\.id\}/.test(journey)) errors.push("AXIS_MOVED");
  const axis = stripComments(src.journeyAxisDone ?? "");
  if (!/style=\{\{ transform: `scaleY\(\$\{scale\}\)` \}\}/.test(axis) || /height:/.test(axis)) errors.push("AXIS_FILL_REFLOWS");
  if (!/next > previous \+ 0\.001/.test(axis)) errors.push("AXIS_FILL_REPLAYS");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* Machine registries (docs/release/*.json mirror the code)           */
/* ------------------------------------------------------------------ */

export function buildScenicRegistry(src) {
  const prof = profilesModule(src);
  const reg = registryModule(src);
  const motion = motionModule(src);
  const orn = src.symbolicOrnaments ?? "";
  const table = /ORNAMENT_MOTION_PROFILE[^=]*=\s*\{([\s\S]*?)\};/.exec(orn)?.[1] ?? "";
  const ornaments = Object.fromEntries([...table.matchAll(/"?([\w-]+)"?:\s*"([\w-]+)"/g)].map((m) => [m[1], m[2]]));
  let theme = {};
  try {
    theme = evalSource(src.cultureVisualTheme).CULTURE_TOPIC_VISUAL ?? {};
  } catch {
    theme = {};
  }
  return {
    schema: "longyu.scenic-motion-registry.v1",
    wave: WAVE,
    source: "src/features/journey/scenes/sceneMotionProfiles.ts",
    profiles: [...(prof.SCENIC_MOTION_PROFILES ?? [])],
    parts: Object.fromEntries((prof.SCENE_PARTS ?? []).map((part) => [part, prof.SCENE_PART_NEUTRAL?.[part] ?? null])),
    budget: {
      maxOwners: motion.MAX_VISIBLE_AMBIENT_ANIMATIONS,
      kindCap: { ...(motion.AMBIENT_KIND_CAP ?? {}) },
      partsPerOwner: motion.MAX_AMBIENT_PARTS_PER_OWNER,
      maxLoops: motion.MAX_AMBIENT_LOOPS,
      offscreen: 0,
      hiddenTab: 0,
      reducedMotion: 0,
    },
    scenes: (reg.JOURNEY_SCENE_IDS ?? []).map((id) => {
      const spec = prof.SCENE_MOTION?.[id] ?? {};
      return { id, profile: spec.profile ?? null, intensity: spec.intensity ?? null, loops: [...(spec.loops ?? [])], oneShot: [...(spec.oneShot ?? [])] };
    }),
    ornaments,
    cultureHeroes: Object.fromEntries(Object.entries(theme).map(([topic, v]) => [topic, v.heroScene])),
  };
}

export function buildFrameContract(src) {
  const css = stripComments(src.framesCss ?? "");
  const hook = (sel) => Number(new RegExp(`${sel} \\{\\s*--cframe-hook: (\\d+)px;`).exec(css)?.[1] ?? 0);
  return {
    schema: "longyu.chinese-frame-contract.v1",
    wave: WAVE,
    component: "src/components/ornaments/chinese/ChineseOrnamentalFrame.tsx",
    stylesheet: "src/styles/chinese-frames.css",
    levels: {
      whisper: { drawnBy: "ChineseCornerMotif", frame: false, surfaces: ["home-continue"] },
      heritage: { drawnBy: "ChineseOrnamentalFrame level=heritage", corner: "huiwen key-fret hook", hookPx: hook("\\.lyo-frame\\[data-frame-level\\]"), surfaces: [...FRAME_LEVEL_SURFACES.heritage], surfaceHookPx: Object.fromEntries([...css.matchAll(/\.lyo-frame\[data-frame-level\]\[data-ornament-surface="([\w-]+)"\] \{\s*--cframe-hook: (\d+)px;/g)].map((m) => [m[1], Number(m[2])])) },
      ceremony: { drawnBy: "ChineseOrnamentalFrame level=ceremony", corner: "ruyi cloud hook", hookPx: hook('\\.lyo-frame\\[data-frame-level="ceremony"\\]'), surfaces: [...FRAME_LEVEL_SURFACES.ceremony] },
    },
    tokens: ["--gilt", "--frame-line", "--line-strong"],
    rules: {
      pointerEvents: "none",
      focusable: false,
      extraText: false,
      boxShadow: false,
      entrance: "once (data-animate=once)",
      loops: 0,
      reducedMotion: "static",
      ordinaryCards: "never",
    },
  };
}

/* ------------------------------------------------------------------ */
/* 7. Guidance arbitration (validate:guidance-arbitration)            */
/* ------------------------------------------------------------------ */

/** Executes guideStart.ts with a fake IntersectionObserver and document. */
function runGuideStart(src) {
  const observers = [];
  let visibility = "visible";
  const listeners = new Set();
  class FakeIO {
    constructor(cb, opts) {
      this.cb = cb;
      this.opts = opts;
      this.disconnected = false;
      this.targets = [];
      observers.push(this);
    }
    observe(el) {
      this.targets.push(el);
    }
    disconnect() {
      this.disconnected = true;
    }
    fire(isIntersecting, intersectionRatio) {
      if (!this.disconnected) this.cb(this.targets.map((target) => ({ target, isIntersecting, intersectionRatio })));
    }
  }
  const document = {
    get visibilityState() {
      return visibility;
    },
    addEventListener: (type, fn) => type === "visibilitychange" && listeners.add(fn),
    removeEventListener: (type, fn) => type === "visibilitychange" && listeners.delete(fn),
  };
  const mod = evalSource(src.guideStart ?? "", {
    requires: {
      react: { useEffect() {}, useState: (v) => [typeof v === "function" ? v() : v, () => {}] },
      "./livingUiMotion": { documentHidden: () => visibility === "hidden" },
    },
    globals: { IntersectionObserver: FakeIO, document },
  });
  const setVisibility = (v) => {
    visibility = v;
    for (const fn of [...listeners]) fn();
  };
  return { mod, observers, setVisibility, listeners };
}

export function checkGuidanceArbitration(src) {
  const errors = [];
  const orch = stripComments(src.guidanceOrchestrator ?? "");
  const host = stripComments(src.guidanceHost ?? "");
  const culture = stripComments(src.cultureJourney ?? "");
  // The ladder: critical onboarding > the page's own first-visit guide > optional guidance.
  const rank = /GUIDE_SURFACE_TIER_RANK[^=]*=\s*\{([^}]*)\}/.exec(orch)?.[1] ?? "";
  const tier = (name) => Number(new RegExp(`${name}:\\s*(\\d+)`).exec(rank)?.[1] ?? NaN);
  if (!(tier("CRITICAL_ONBOARDING") < tier("PAGE_FIRST_VISIT") && tier("PAGE_FIRST_VISIT") < tier("OPTIONAL_CONTEXTUAL"))) errors.push("GUIDANCE_LADDER_INVERTED");
  if (!/definition\.priority === "CRITICAL_UX" \|\| definition\.essential \? "CRITICAL_ONBOARDING" : "OPTIONAL_CONTEXTUAL"/.test(orch)) errors.push("GUIDANCE_LADDER_INVERTED");
  if (!/return GUIDE_SURFACE_TIER_RANK\[guidanceSurfaceTier\(definition\)\] > GUIDE_SURFACE_TIER_RANK\.PAGE_FIRST_VISIT;/.test(orch)) errors.push("GUIDANCE_LADDER_INVERTED");
  // Coachmark + Culture guide together = FAIL: the page marks its visit, the host reads the mark, selection yields.
  if (!/PAGE_FIRST_VISIT_GUIDE_ATTR = "data-first-visit-guide"/.test(orch)) errors.push("COACHMARK_AND_CULTURE_GUIDE_TOGETHER");
  if (count(orch, /ctx\.pageFirstVisitGuide && yieldsToPageFirstVisitGuide\(definition\)/g) < 2) errors.push("COACHMARK_AND_CULTURE_GUIDE_TOGETHER");
  if (!/document\.querySelector\(`\[\$\{PAGE_FIRST_VISIT_GUIDE_ATTR\}\]`\) !== null/.test(host) || count(host, /pageFirstVisitGuide: (?:pageGuide|pageFirstVisitGuideOwnsVisit\(\))/g) < 2) errors.push("COACHMARK_AND_CULTURE_GUIDE_TOGETHER");
  if (!/data-first-visit-guide=\{ownsVisit \? "culture-root" : undefined\}/.test(culture)) errors.push("COACHMARK_AND_CULTURE_GUIDE_TOGETHER");
  // The page guide never preempts a surface already on screen, and steps aside for critical onboarding.
  if (!/!guidanceSurfaceOnScreen\(getCurrentGuidance\(\), routePath\)/.test(culture) || !/showGuide && !guidanceSurfaceOnScreen\(hostGuidance, routePath\)/.test(culture)) errors.push("COACHMARK_AND_CULTURE_GUIDE_TOGETHER");
  // Persisted per account (not per tab), written when shown: the queue drains.
  if (/readCultureFirstGuideSeen|sessionStorage/.test(culture) || !/readCultureGuideSeen\(accountId\)/.test(culture)) errors.push("GUIDE_REPLAYS_EVERY_START");
  if (!/if \(showGuide\) markCultureRootGuideSeen\(accountId\);/.test(culture)) errors.push("GUIDANCE_QUEUE_DEADLOCK");
  // The guide's Continue only dismisses it: never a second primary over the page's CTA.
  const guideBlock = /data-testid="culture-first-guide"[\s\S]*?<\/div>/.exec(culture)?.[0] ?? "";
  if (!/actionVariant="outline"/.test(guideBlock)) errors.push("GUIDE_BLOCKS_CTA");

  // Visibility-aware typewriter, executed.
  try {
    const { mod, observers, setVisibility } = runGuideStart(src);
    if (!(mod.GUIDE_ON_SCREEN_RATIO >= 0.5)) errors.push("OFFSCREEN_TYPEWRITER");
    let seen = 0;
    const stop = mod.observeOnScreenOnce({}, () => (seen += 1));
    const io = observers.at(-1);
    io?.fire(false, 0);
    if (seen !== 0) errors.push("OFFSCREEN_TYPEWRITER");
    io?.fire(true, 0.2);
    if (seen !== 0) errors.push("OFFSCREEN_TYPEWRITER");
    setVisibility("hidden");
    io?.fire(true, 1);
    if (seen !== 0) errors.push("OFFSCREEN_TYPEWRITER");
    setVisibility("visible");
    if (seen !== 1) errors.push("TYPEWRITER_NEVER_STARTS");
    if (!io?.disconnected) errors.push("TYPEWRITER_RESTARTS");
    io?.fire(false, 0);
    io?.fire(true, 1);
    if (seen !== 1) errors.push("TYPEWRITER_RESTARTS");
    stop();
    // No observer support (old WebView, node runners): the guide is never stuck silent.
    let fallback = 0;
    mod.observeOnScreenOnce(null, () => (fallback += 1));
    if (fallback !== 1) errors.push("TYPEWRITER_NEVER_STARTS");
    // One speaker: the latest claim types; the one under it resumes on release.
    const a = mod.claimGuideFloor();
    const b = mod.claimGuideFloor();
    if (mod.guideFloorOwner() !== b) errors.push("GUIDE_FLOOR_SHARED");
    mod.releaseGuideFloor(b);
    if (mod.guideFloorOwner() !== a) errors.push("GUIDANCE_QUEUE_DEADLOCK");
    mod.releaseGuideFloor(a);
    if (mod.guideFloorOwner() !== null) errors.push("GUIDANCE_QUEUE_DEADLOCK");
  } catch {
    errors.push("GUIDE_START_UNLOADABLE");
  }
  // Both guides use the shared start rule and gate their timers on it.
  const dialogue = stripComments(src.guideDialogue ?? "");
  const bubble = stripComments(src.teacherBubble ?? "");
  if (!/useOnScreenOnce\(rootRef, !reduced && state\.phase === "idle", messageIdentity\)/.test(dialogue) || !/ref=\{rootRef\}/.test(dialogue)) errors.push("OFFSCREEN_TYPEWRITER");
  if (!/if \(state\.phase !== "typing" \|\| !mayType\) return;/.test(dialogue) || !/useGuideFloor\(state\.phase === "typing"\)/.test(dialogue)) errors.push("OFFSCREEN_TYPEWRITER");
  if (!/instant\s*\?\s*reduceGuideDialogue\(createGuideDialogueState\(\), \{ type: "START", instant \}/.test(dialogue)) errors.push("REDUCED_MOTION_WAITS");
  if (!/: createGuideDialogueState\(\)\s*\)/.test(dialogue)) errors.push("OFFSCREEN_TYPEWRITER");
  if (!/data-guide-continue=\{isTyping \|\| waiting \? "complete-text" : "advance"\}/.test(dialogue)) errors.push("CONTINUE_SWALLOWED");
  if (!/useOnScreenOnce\(rootRef, !reduced && state === "ENTER", text\)/.test(bubble) || !/ref=\{rootRef\}/.test(bubble)) errors.push("OFFSCREEN_TYPEWRITER");
  if (!/if \(reduced \|\| !onScreen \|\| state !== "ENTER"\) return;/.test(bubble) || !/if \(state !== "TYPING" \|\| !mayType\) return;/.test(bubble)) errors.push("OFFSCREEN_TYPEWRITER");
  if (!/state === "TYPING" \|\| \(state === "ENTER" && !reduced\)/.test(bubble)) errors.push("CONTINUE_SWALLOWED");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 8. Release honesty                                                 */
/* ------------------------------------------------------------------ */

const stable = (value) => JSON.stringify(value);

export function checkRelease(src) {
  const errors = [];
  const cert = j(src.cert);
  const rc = j(src.rc);
  if (!cert) return ["CERT_MISSING"];
  if (!rc) return ["RC_MISSING"];
  if (cert.wave !== WAVE || rc.wave !== WAVE) errors.push("WAVE_IDENTITY_DRIFT");
  for (const section of CERT_SECTIONS) if (!cert[section] || typeof cert[section] !== "object") errors.push("CERT_SECTION_MISSING");
  const pkg = src.packageJson ?? "";
  for (const script of GATE_SCRIPTS) {
    if (!pkg.includes(`"${script}"`)) errors.push("GATE_SCRIPT_MISSING");
    if (!(src.gateRegistry ?? "").includes(`"gateId": "${script}"`)) errors.push("GATE_REGISTRY_MISSING");
  }
  for (const step of ["validate:scenic-motion-profiles", "validate:chinese-frame-system", "validate:guidance-arbitration", "validate:typography-icon-audit", "test:rc2-3-13r3-2-6-chinese-living-canvas"]) {
    if (!new RegExp(`\\n\\s+"${step}",\\n`).test(src.canonicalSuites ?? "")) errors.push("GATE_NOT_IN_HOSTED_SUITE");
  }
  // Parent: #356 / R.3.2.5, merged, exact head.
  const parent = cert.parent ?? {};
  if (parent.pr !== PARENT_PR || parent.wave !== PARENT_WAVE || !/^[0-9a-f]{40}$/.test(parent.headSha ?? "") || !/^[0-9a-f]{40}$/.test(parent.mergeSha ?? "")) errors.push("WRONG_PARENT_PR");
  const parentCert = j(src.parentCert);
  if (parentCert?.wave !== PARENT_WAVE) errors.push("WRONG_PARENT_PR");
  // Runtime identity: advanced, stamped everywhere, fingerprint from the generator.
  const lr = cert.runtime?.learnerRuntimeSha;
  if (!lr || lr === PREVIOUS_LEARNER_RUNTIME_SHA || !/^[0-9a-f]{40}$/.test(lr)) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (rc.learnerRuntimeSha !== lr) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (cert.runtime?.previousLearnerRuntimeSha !== PREVIOUS_LEARNER_RUNTIME_SHA) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (parentCert?.runtime?.learnerRuntimeSha !== lr) errors.push("PARENT_RUNTIME_PIN_STALE");
  if (!src.liveFingerprint || cert.fingerprint?.value !== src.liveFingerprint || rc.fingerprint !== src.liveFingerprint || cert.fingerprint?.source !== "generator") errors.push("FINGERPRINT_DRIFT");
  // Machine registries mirror the code exactly.
  try {
    if (stable(j(src.scenicRegistryJson)) !== stable(buildScenicRegistry(src))) errors.push("REGISTRY_DRIFT");
    if (stable(j(src.frameContractJson)) !== stable(buildFrameContract(src))) errors.push("REGISTRY_DRIFT");
  } catch {
    errors.push("REGISTRY_DRIFT");
  }
  for (const section of ["guidanceClosure", "typographyAudit", "iconAudit", "scenicMotion", "frames", "visualDensity", "reducedMotion", "accessibility", "themes"]) {
    if (cert[section]?.state !== "CODE_PASS") errors.push("SYSTEM_STATE_DISHONEST");
  }
  const sm = cert.scenicMotion ?? {};
  if (sm.maxOwners !== EXPECTED_MAX_OWNERS || stable(sm.kindCap) !== stable(EXPECTED_KIND_CAP) || sm.partsPerOwner !== EXPECTED_PARTS_PER_OWNER) errors.push("AMBIENT_CLAIM_DISHONEST");
  for (const k of ["unbudgetedLoops", "offscreenLoops", "hiddenTabLoops", "reducedMotionLoops"]) if (sm[k] !== 0) errors.push("AMBIENT_CLAIM_DISHONEST");
  const perf = cert.performance?.thirtyMinute ?? {};
  if (!(perf.minutes >= 30) || perf.maxOwners > EXPECTED_MAX_OWNERS || perf.unbudgetedRunning !== 0) errors.push("PERF_SESSION_MISSING");
  // Freeze exception + scope.
  if (!new RegExp(`PRE_BETA_FREEZE_EXCEPTION_R326[\\s\\S]*${FREEZE_REASON}`).test(src.freeze ?? "")) errors.push("FREEZE_EXCEPTION_MISSING");
  if (cert.freezeException !== FREEZE_REASON) errors.push("FREEZE_EXCEPTION_MISSING");
  for (const k of ["navigationRedesign", "curriculumExpansion", "pedagogyChange", "masteryChange", "economyChange", "srsChange", "unlockRuleChange", "schemaChange", "jevRuntimeChange", "billingChange"]) {
    if (cert.scope?.[k] !== false) errors.push("SCOPE_CREEP");
  }
  // Cross-engine: classified, no new skips.
  const ce = cert.crossEngine ?? {};
  if (ce.newSkips !== 0) errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  for (const f of ce.failures ?? []) if (!f.classification || !f.fixedIn || !f.test) errors.push("CROSS_ENGINE_FAILURE_HIDDEN");
  const entries = j(src.skipAllowlist)?.entries ?? [];
  if (entries.some((e) => /rc2-3-13r3-2-6/.test(e.file ?? ""))) errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  const e2e = src.e2e ?? "";
  if (!e2e) errors.push("E2E_MISSING");
  if (/test\.skip\(|test\.fixme|\.only\(|browserName\s*===|\|\| true/.test(e2e)) errors.push("E2E_HIDES_ENGINE");
  // Hosted / artifact / physical / entry honesty.
  const hosted = cert.hosted ?? {};
  const artifact = cert.artifact ?? {};
  const physical = cert.physical ?? {};
  const ui = cert.uiFreeze ?? {};
  const rejected = cert.rejectedApkSha256List ?? [];
  for (const h of STALE_APK_SHA256) if (!rejected.includes(h)) errors.push("OLD_APK_ACCEPTED");
  if (artifact.apkSha256 && rejected.includes(artifact.apkSha256)) errors.push("OLD_APK_ACCEPTED");
  for (const key of ["releaseTruth", "security", "betaSuites", "qualityBuild", "androidFoundation", "androidRuntime", "chromium", "firefox", "webkit"]) {
    if (hosted.overall === "PASS" && !["PASS", "PASS_WITH_ALLOWLISTED_ENGINE_SKIP"].includes(hosted[key])) errors.push("RED_HOSTED_SOURCE_ACCEPTED");
  }
  if (hosted.overall === "PASS" && (!/^[0-9a-f]{40}$/.test(hosted.headSha ?? "") || !hosted.workflowRunIds?.ci)) errors.push("RED_HOSTED_SOURCE_ACCEPTED");
  if (artifact.status === "BUILT") {
    if (hosted.overall !== "PASS" || hosted.headSha !== artifact.artifactSourceSha) errors.push("RED_HOSTED_SOURCE_ACCEPTED");
    if (artifact.learnerRuntimeSha !== lr) errors.push("APK_RUNTIME_MISMATCH");
    if (!/^[0-9a-f]{64}$/.test(artifact.apkSha256 ?? "")) errors.push("APK_HASH_ABSENT");
    if (artifact.channel !== "DEVICE_QA") errors.push("WRONG_CHANNEL");
    if (!artifact.workflowRunId || !artifact.artifactId) errors.push("MISSING_PROVENANCE");
    if (!(src.handoff ?? "").includes(String(artifact.apkSha256))) errors.push("HANDOFF_MISSING_NEW_HASH");
  }
  const physicalPass = physical.status === "PASS" || Object.values(physical).includes("PASS");
  if (physicalPass) {
    if (physical.emulator !== false || !physical.device || /emulator|sdk_gphone|generic/i.test(String(physical.device))) errors.push("PHYSICAL_PASS_FROM_EMULATOR");
    if (!artifact.apkSha256 || physical.artifactSha256 !== artifact.apkSha256) errors.push("PHYSICAL_STALE_APK");
  }
  if (ui.LONGYU_UI_UX_FREEZE === UI_FREEZE_ACCEPTED) {
    if (!artifact.apkSha256 || ui.boundApkSha256 !== artifact.apkSha256 || ui.FINAL_UI_OWNER_ACCEPTANCE !== "PASS" || physical.status !== "PASS") errors.push("FREEZE_WITHOUT_OWNER_ACCEPTANCE");
  } else if (ui.LONGYU_UI_UX_FREEZE !== "PENDING_OWNER_ACCEPTANCE") errors.push("FREEZE_WITHOUT_OWNER_ACCEPTANCE");
  if (artifact.playReady === true || cert.play?.debugAabPlayReady === true) errors.push("DEBUG_AAB_PLAY_READY");
  if (rc.entry?.PUBLIC_BETA_ENTRY !== "HOLD" || cert.entry?.PUBLIC_BETA_ENTRY !== "HOLD") errors.push("PUBLIC_BETA_GO");
  if (cert.entry?.PLAY_CLOSED_BETA_ENTRY !== "HOLD" && cert.play?.signedAab !== "BUILT") errors.push("PLAY_GO_WITHOUT_SIGNED_AAB");
  if (cert.entry?.OWNER_QA_ENTRY === "GO" && artifact.status !== "BUILT") errors.push("OWNER_QA_WITHOUT_APK");
  if (!(src.report ?? "").includes(WAVE)) errors.push("REPORT_MISSING");
  for (const doc of ["docCanvas", "docProfiles", "docFrames"]) if (!(src[doc] ?? "").includes(WAVE)) errors.push("UX_DOC_MISSING");
  if (!/DO NOT USE/.test(src.handoff ?? "")) errors.push("OWNER_HANDOFF_MISSING");
  for (const h of STALE_APK_SHA256) if (!(src.handoff ?? "").includes(h)) errors.push("HANDOFF_STALE_LIST_INCOMPLETE");
  return uniq(errors);
}

export const checkAll = (src) =>
  uniq([
    ...checkScenicMotionProfiles(src),
    ...checkAnimatedSvgRoles(src),
    ...checkAmbientOwnership(src),
    ...checkChineseFrameSystem(src),
    ...checkChineseVisualDensity(src),
    ...checkGuidanceArbitration(src),
    ...checkTypographyIconAudit(src),
    ...checkProgressionPolish(src),
    ...checkRelease(src),
  ]);

export const PART_ONE = { checkScenicMotionProfiles, checkAnimatedSvgRoles, checkAmbientOwnership, checkChineseFrameSystem, checkChineseVisualDensity, checkTypographyIconAudit, checkProgressionPolish };
void j;
