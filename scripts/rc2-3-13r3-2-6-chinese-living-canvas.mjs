#!/usr/bin/env node
/**
 * RC2.3.13R.3.2.6 — Chinese Living Canvas, animated scenic SVGs & ornamental
 * frame system gate.
 *
 *   node scripts/rc2-3-13r3-2-6-chinese-living-canvas.mjs profiles|svg|ownership|frames|density|guidance|type|progression|release|validate
 *   node scripts/rc2-3-13r3-2-6-chinese-living-canvas.mjs registry [--write]   # docs/release registries from the code
 *   node scripts/rc2-3-13r3-2-6-chinese-living-canvas.mjs test                 # mutation kills (≥180)
 *
 * Every mutation names the checker it targets; that checker must be clean on
 * the real sources first, so each kill proves the corruption fired the error.
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildFrameContract,
  buildScenicRegistry,
  checkAll,
  checkAmbientOwnership,
  checkAnimatedSvgRoles,
  checkChineseFrameSystem,
  checkChineseVisualDensity,
  checkGuidanceArbitration,
  checkRelease,
  checkScenicMotionProfiles,
  checkTypographyIconAudit,
  checkProgressionPolish,
  FILES,
  loadLivingCanvasSources,
  MIN_KILLS,
  PREVIOUS_LEARNER_RUNTIME_SHA,
  STALE_APK_SHA256,
} from "./lib/rc2-3-13r3-2-6-living-canvas-gates.mjs";

const MODE = process.argv[2] ?? "validate";

function report(name, errors) {
  if (errors.length) {
    console.error(`FAIL ${name}\n${errors.map((e) => `- ${e}`).join("\n")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${name}`);
}

/* ------------------------------------------------------------------ */
/* Mutation helpers                                                   */
/* ------------------------------------------------------------------ */

const clone = (src) => ({ ...src, scenes: { ...src.scenes }, tsx: { ...src.tsx }, allTsx: { ...src.allTsx } });

/** Replace `find` (string or RegExp) in src[key]; a miss is a MISS, never a silent no-op. */
function m(base, key, find, replace) {
  const next = clone(base);
  const text = next[key] ?? "";
  const hit = typeof find === "string" ? text.includes(find) : find.test(text);
  if (!hit) throw new Error(`anchor not found in ${key}: ${String(find).slice(0, 80)}`);
  next[key] = text.replace(find, replace);
  return next;
}

/** Edit one bundled scene SVG. */
function scene(base, id, find, replace) {
  const next = clone(base);
  const name = `journey-${id}.svg`;
  const text = next.scenes[name] ?? "";
  const hit = typeof find === "string" ? text.includes(find) : find.test(text);
  if (!hit) throw new Error(`anchor not found in ${name}: ${String(find).slice(0, 80)}`);
  next.scenes[name] = text.replace(find, replace);
  return next;
}

/** Add or edit a .tsx in both scan maps (frame/scene placements and the type audit). */
function tsx(base, rel, edit) {
  const next = clone(base);
  const text = edit(next.allTsx[rel] ?? next.tsx[rel] ?? "");
  next.allTsx[rel] = text;
  next.tsx[rel] = text;
  return next;
}

function withJson(base, key, edit) {
  const next = clone(base);
  const obj = JSON.parse(next[key]);
  edit(obj);
  next[key] = JSON.stringify(obj, null, 2);
  return next;
}

function themeToken(base, header, name, value) {
  const next = clone(base);
  const css = next.css;
  const i = css.indexOf(header);
  const end = css.indexOf("}", i);
  const block = css.slice(i, end);
  const re = new RegExp(`--${name}:\\s*[^;]+;`);
  if (i < 0 || !re.test(block)) throw new Error(`token ${name} not found under ${header}`);
  next.css = css.slice(0, i) + block.replace(re, value == null ? "" : `--${name}: ${value};`) + css.slice(end);
  return next;
}
const CLAY = ':root,\n[data-theme="clay"]';
const DARK = '[data-theme="dark"] {';

const P = checkScenicMotionProfiles;
const V = checkAnimatedSvgRoles;
const O = checkAmbientOwnership;
const F = checkChineseFrameSystem;
const D = checkChineseVisualDensity;
const G = checkGuidanceArbitration;
const T = checkTypographyIconAudit;
const PR = checkProgressionPolish;
const REL = checkRelease;

const LC = "livingCanvasCss";
const FR = "framesCss";
const cert = (base, edit) => () => withJson(base, "cert", edit);
const PROBE = "src/features/probe/Probe.tsx";
const JOURNEY = "src/features/journey/JourneyPage.tsx";

function cases(base) {
  return [
    // ── 1 Scenic motion profiles ──────────────────────────────────────
    ["scene without a profile", "SCENE_PROFILE_MISSING", P, () => m(base, "sceneProfiles", /  "great-wall": \{[^\n]*\n/, "")],
    ["unknown profile name", "SCENE_PROFILE_INVALID", P, () => m(base, "sceneProfiles", '"tea-table": { profile: "steam"', '"tea-table": { profile: "bounce"')],
    ["profile list truncated", "SCENE_PROFILE_INVALID", P, () => m(base, "visualProfiles", /"ink-reveal",?/, "")],
    ["intensity typo", "SCENE_INTENSITY_INVALID", P, () => m(base, "sceneProfiles", '"market": { profile: "lantern-sway", intensity: "subtle"', '"market": { profile: "lantern-sway", intensity: "loud"')],
    ["hero intensity in a lane", "SCENE_INTENSITY_HERO", P, () => m(base, "sceneProfiles", '"moon-gate": { profile: "sway", intensity: "subtle"', '"moon-gate": { profile: "sway", intensity: "hero"')],
    ["unknown loop part", "SCENE_PART_UNKNOWN", P, () => m(base, "sceneProfiles", 'loops: ["lantern", "cloud"], oneShot: [] },\n  "tea-table"', 'loops: ["lantern", "smoke"], oneShot: [] },\n  "tea-table"')],
    ["part loses its neutral pose", "PART_NEUTRAL_MISSING", P, () => m(base, "sceneProfiles", 'lantern: "hangs vertical from its cord",', 'lantern: "",')],
    ["still profile that loops", "STILL_PROFILE_LOOPS", P, () => m(base, "sceneProfiles", '"great-wall": { profile: "cloud-drift"', '"great-wall": { profile: "still"')],
    ["profiled scene without parts", "PROFILE_WITHOUT_PARTS", P, () => m(base, "sceneProfiles", 'loops: ["paw", "lantern", "cloud"], oneShot: []', "loops: [], oneShot: []")],
    ["orphan profile for a removed scene", "SCENE_PROFILE_ORPHAN", P, () => m(base, "sceneProfiles", '  "great-wall": {', '  "pagoda": { profile: "sway", intensity: "subtle", loops: ["leaf"], oneShot: [] },\n  "great-wall": {')],
    ["one profile everywhere", "SAME_PROFILE_EVERYWHERE", P, () => m(base, "sceneProfiles", /profile: "(?:steam|train-pass|city-glow|water|ink-reveal|float|cloud-drift)"/g, 'profile: "sway"')],
    ["phase from Math.random", "MOTION_RANDOM", P, () => m(base, "journeyScene", "export function", "const jitter = Math.random();\nexport function")],
    ["phase from Date.now", "MOTION_RANDOM", P, () => m(base, "cultureHeroScene", "export function", "const seed = Date.now();\nexport function")],
    ["ornament motif from chance", "MOTION_RANDOM", P, () => m(base, "symbolicOrnaments", "export function", "const pick = Math.random();\nexport function")],
    ["whole-scene float back", "WHOLE_SCENE_FLOAT", P, () => m(base, LC, ".journey-scene-drift[data-scene-profile] {\n  animation: none;\n}", ".journey-scene-drift[data-scene-profile] {\n  opacity: 1;\n}")],
    ["profile not on the drift host", "WHOLE_SCENE_FLOAT", P, () => m(base, "journeyScene", "data-scene-profile={motion.profile}", "data-scene-kind={motion.profile}")],
    ["living canvas stylesheet not loaded", "LIVING_CANVAS_NOT_LOADED", P, () => m(base, "main", 'import "./styles/living-canvas.css";', "")],
    ["loop without the ambient gate", "AMBIENT_LOOP_UNGATED", P, () => m(base, LC, '.journey-scene-drift[data-ambient="run"] .scene-water {', ".journey-scene-drift .scene-water {")],
    ["literal duration", "ARBITRARY_DURATION", P, () => m(base, LC, "animation: scene-water-glide var(--motion-ambient) var(--ease-ambient)", "animation: scene-water-glide 7.3s var(--ease-ambient)")],
    ["frantic loop", "MOTION_TOO_FAST", P, () => m(base, LC, "animation: scene-star-twinkle var(--motion-ambient-current)", "animation: scene-star-twinkle var(--motion-normal)")],
    ["glacial loop", "MOTION_TOO_SLOW", P, () => m(base, LC, "animation: scene-bird-glide var(--motion-ambient-slow)", "animation: scene-bird-glide calc(var(--motion-ambient-slow) * 3)")],
    ["loop names missing keyframes", "KEYFRAMES_MISSING", P, () => m(base, LC, "animation: scene-boat-rock var(--motion-ambient)", "animation: scene-boat-sway var(--motion-ambient)")],
    ["loop starts tilted", "NEUTRAL_FRAME_INVALID", P, () => m(base, LC, "@keyframes scene-cloth-sway {\n  0%,\n  100% {\n    transform: rotate(0deg);", "@keyframes scene-cloth-sway {\n  0%,\n  100% {\n    transform: rotate(2deg);")],
    ["loop ends faded", "NEUTRAL_FRAME_INVALID", P, () => m(base, LC, "@keyframes scene-light-breathe {\n  0%,\n  100% {\n    opacity: 1;", "@keyframes scene-light-breathe {\n  0%,\n  100% {\n    opacity: 0.6;")],
    ["loop seam jumps", "LOOP_NOT_SEAMLESS", P, () => m(base, LC, "@keyframes scene-accent-bob {\n  0%,\n  100% {\n    transform: translate3d(0, 0, 0);\n  }", "@keyframes scene-accent-bob {\n  0% {\n    transform: translate3d(0, 0, 0);\n  }\n  100% {\n    transform: none;\n    opacity: 1;\n  }")],
    ["used part without motion", "PART_MOTION_MISSING", P, () => m(base, LC, /\.journey-scene-drift\[data-ambient="run"\] \.scene-paw \{[^}]*\}/, "")],
    ["rule animates an unknown part", "SCENE_PART_UNKNOWN", P, () => m(base, LC, "/* Several lanterns", '.journey-scene-drift[data-ambient="run"] .scene-smoke {\n  opacity: 1;\n}\n\n/* Several lanterns')],
    ["keyframes animate height", "LAYOUT_PROPERTY_ANIMATION", P, () => m(base, LC, "  50% {\n    transform: translate3d(6px, 0, 0);\n    opacity: 0.7;", "  50% {\n    transform: translate3d(6px, 0, 0);\n    height: 12px;\n    opacity: 0.7;")],
    ["keyframes animate top", "LAYOUT_PROPERTY_ANIMATION", P, () => m(base, LC, "  50% {\n    transform: translate3d(10px, -4px, 0);\n  }", "  50% {\n    top: -4px;\n  }")],
    ["keyframes animate blur", "HEAVY_FILTER_ANIMATION", P, () => m(base, LC, "  50% {\n    opacity: 0.55;\n  }", "  50% {\n    opacity: 0.55;\n    filter: blur(2px);\n  }")],
    ["paw swings wildly", "MOTION_AMPLITUDE_EXCESSIVE", P, () => m(base, LC, "transform: rotate(-7deg);", "transform: rotate(-24deg);")],
    ["bird flies off the lane", "MOTION_AMPLITUDE_EXCESSIVE", P, () => m(base, LC, "transform: translate3d(10px, -4px, 0);", "transform: translate3d(40px, -4px, 0);")],
    ["lantern swings like a pendulum", "LANTERN_SWAY_EXCESSIVE", P, () => m(base, LC, "  25% {\n    transform: rotate(-1.5deg);", "  25% {\n    transform: rotate(-5deg);")],
    ["lantern never moves", "LANTERN_SWAY_EXCESSIVE", P, () => m(base, LC, /  25% \{\n    transform: rotate\(-1\.5deg\);\n  \}\n  75% \{\n    transform: rotate\(1\.5deg\);/, "  25% {\n    transform: rotate(0deg);\n  }\n  75% {\n    transform: rotate(0deg);")],
    ["bamboo windstorm", "BAMBOO_WINDSTORM", P, () => m(base, LC, "  30% {\n    transform: rotate(1deg);", "  30% {\n    transform: rotate(4deg);")],
    ["cloud reset jumps", "CLOUD_RESET_JUMPS", P, () => m(base, LC, "@keyframes scene-cloud-drift {\n  0%,\n  100% {\n    transform: translate3d(0, 0, 0);\n    opacity: 1;\n  }", "@keyframes scene-cloud-drift {\n  0% {\n    transform: translate3d(0, 0, 0);\n    opacity: 1;\n  }\n  100% {\n    transform: translate3d(0, 0, 0);\n    opacity: 1;\n    visibility: visible;\n  }")],
    ["cloud drifts too far", "CLOUD_DRIFT_OUT_OF_BAND", P, () => m(base, LC, "transform: translate3d(14px, 0, 0);\n    opacity: 0.75;", "transform: translate3d(22px, 0, 0);\n    opacity: 0.75;")],
    ["cloud barely drifts", "CLOUD_DRIFT_OUT_OF_BAND", P, () => m(base, LC, "transform: translate3d(14px, 0, 0);\n    opacity: 0.75;", "transform: translate3d(3px, 0, 0);\n    opacity: 0.75;")],
    ["train races", "TRAIN_LOOPS_AGGRESSIVELY", P, () => m(base, LC, "  0%,\n  64%,\n  100% {\n    transform: translate3d(0, 0, 0);\n  }\n  78%", "  0%,\n  100% {\n    transform: translate3d(0, 0, 0);\n  }\n  78%")],
    ["character bounces", "CHARACTER_BOUNCES", P, () => m(base, LC, "transform: translate3d(0, -3px, 0);", "transform: translate3d(0, -12px, 0);")],
    ["entrance from the wrong side", "ENTRANCE_SIDE_REVERSED", P, () => m(base, LC, "transform: translate3d(-6px, 4px, 0);", "transform: translate3d(6px, 4px, 0);")],
    ["entrance too long", "ENTRANCE_DURATION_OUT_OF_BAND", P, () => m(base, LC, "transition-duration: calc(var(--motion-emphasis) * 1.3);", "transition-duration: calc(var(--motion-emphasis) * 3);")],
    ["ink redraws on every visit", "INK_REDRAWS", P, () => m(base, LC, '.journey-scene[data-scene-entered="now"] .scene-ink {', ".journey-scene .scene-ink {")],
    ["ink entered flag dropped", "INK_REDRAWS", P, () => m(base, "journeyScene", 'data-scene-entered={enteredNow ? "now" : undefined}', 'data-scene-entered="now"')],
    ["reduced motion keeps parts moving", "REDUCED_MOTION_IGNORED", P, () => m(base, LC, '  .journey-scene g[class*="scene-"],\n  .symbolic-ornament,', "  .symbolic-ornament,")],

    // ── 2 Animated SVG role contract ──────────────────────────────────
    ["scene library missing", "SVG_LIBRARY_EMPTY", V, () => ({ ...clone(base), scenes: {} })],
    ["part class on the root svg", "ROOT_PART", V, () => scene(base, "tea-table", "<svg ", '<svg class="scene-float" ')],
    ["unknown part class in an SVG", "SVG_ROLE_UNKNOWN", V, () => scene(base, "great-wall", '<g class="scene-bird">', '<g class="scene-dragon">')],
    ["unknown phase modifier", "SVG_ROLE_UNKNOWN", V, () => scene(base, "lantern-street", '<g class="scene-lantern scene-phase-3">', '<g class="scene-lantern scene-phase-9">')],
    ["part group carries a transform", "PART_TRANSFORM_CONFLICT", V, () => scene(base, "great-wall", '<g class="scene-flag">', '<g class="scene-flag" transform="translate(2 0)">')],
    ["part group carries an inline style", "PART_INLINE_STYLE", V, () => scene(base, "great-wall", '<g class="scene-flag">', '<g class="scene-flag" style="opacity:.9">')],
    ["registered part missing in the SVG", "SVG_ROLE_MISSING", V, () => scene(base, "great-wall", '<g class="scene-flag">', "<g>")],
    ["one-shot ink missing in the SVG", "SVG_ROLE_MISSING", V, () => scene(base, "brush-seal", '<g class="scene-ink">', "<g>")],
    ["SVG part not in the registry", "SVG_ROLE_UNREGISTERED", V, () => m(base, "sceneProfiles", '"great-wall": { profile: "cloud-drift", intensity: "subtle", loops: ["cloud", "flag", "bird"]', '"great-wall": { profile: "cloud-drift", intensity: "subtle", loops: ["cloud", "flag"]')],
    ["five looping parts in one scene", "TOO_MANY_PARTS", V, () => scene(base, "lantern-street", '<g class="scene-cloud">', '<g class="scene-lantern"><ellipse class="lys-f-accent" cx="1" cy="1" rx="1" ry="1"/></g><g class="scene-cloud">')],
    ["the whole street swings", "WHOLE_STREET_SWINGS", V, () => scene(base, "lantern-street", '<g class="scene-lantern"><circle class="lys-f-glow"', '<g class="scene-lantern"><rect width="1" height="1"/><rect width="1" height="1"/><rect width="1" height="1"/><rect width="1" height="1"/><rect width="1" height="1"/><circle class="lys-f-glow"')],
    ["architecture wobbles", "ARCHITECTURE_WOBBLES", V, () => scene(base, "lantern-street", '<g class="scene-cloud">', '<g class="scene-cloud"><circle fill="url(#ls-disc)" r="2"/>')],
    ["ornament motif without a profile", "ORNAMENT_PROFILE_MISSING", V, () => m(base, "symbolicOrnaments", '  knot: "still",\n', "")],
    ["ornament profile unknown", "ORNAMENT_PROFILE_INVALID", V, () => m(base, "symbolicOrnaments", '  cloud: "cloud-drift",', '  cloud: "spin",')],
    ["ornament part wrapper removed", "ORNAMENT_PART_MISSING", V, () => m(base, "symbolicOrnaments", '<g className="orn-part">{motifPath(motif)}</g>', "{motifPath(motif)}")],
    ["ornament profile attribute dropped", "ORNAMENT_PROFILE_MISSING", V, () => m(base, "symbolicOrnaments", "data-ornament-profile={profile}", "")],
    ["ornament floats whole again", "ORNAMENT_WHOLE_FLOAT", V, () => m(base, LC, ".symbolic-ornament[data-ornament-profile] {\n  animation: none;", ".symbolic-ornament[data-ornament-profile] {\n  animation-play-state: running;")],
    ["ornament loop without the budget", "AMBIENT_LOOP_UNGATED", V, () => m(base, LC, '.symbolic-ornament[data-ambient="run"][data-ornament-profile="sway"] .orn-part {', '.symbolic-ornament[data-ornament-profile="sway"] .orn-part {')],
    ["ornament entrance on the ambient host", "ORNAMENT_ENTRANCE_ON_HOST", V, () => m(base, LC, '[data-ornament-side="left"]:has(> .symbolic-ornament) {', ".symbolic-ornament[data-ornament-side-left] {")],
    ["every Culture topic opens on one motif", "CULTURE_MOTIFS_UNIFORM", V, () => m(base, "cultureTopicDetail", "ornamentOffset={", "data-offset={")],

    // ── 3 Ambient ownership ───────────────────────────────────────────
    ["five ambient owners", "AMBIENT_OWNERS_EXCEED_4", O, () => m(base, "livingUiMotion", "export const MAX_VISIBLE_AMBIENT_ANIMATIONS = 4;", "export const MAX_VISIBLE_AMBIENT_ANIMATIONS = 5;")],
    ["no scene cap", "KIND_CAP_MISSING", O, () => m(base, "livingUiMotion", "  scene: 2,\n  ornament: 2,", "  ornament: 2,")],
    ["three scenes allowed", "KIND_CAP_MISSING", O, () => m(base, "livingUiMotion", "  scene: 2,\n  ornament: 2,", "  scene: 3,\n  ornament: 2,")],
    ["kind cap filter skipped", "KIND_CAP_IGNORED", O, () => m(base, "ambientBudget", "      .filter(withinKindCap(kindCap))\n", "")],
    ["kind cap applied after the slice", "KIND_CAP_IGNORED", O, () => m(base, "ambientBudget", "      .filter(withinKindCap(kindCap))\n      .slice(0, max)", "      .slice(0, max)\n      .filter(withinKindCap(kindCap))")],
    ["kind cap off by one", "KIND_CAP_IGNORED", O, () => m(base, "ambientBudget", "if (count >= cap) return false;", "if (count > cap) return false;")],
    ["scheduler ignores the kind cap", "KIND_CAP_IGNORED", O, () => m(base, "ambientBudget", "allocateAmbientSlots([...entries.values()], MAX_VISIBLE_AMBIENT_ANIMATIONS, paused);", "allocateAmbientSlots([...entries.values()], MAX_VISIBLE_AMBIENT_ANIMATIONS, paused, {});")],
    ["parts per owner drift", "PARTS_PER_OWNER_DRIFT", O, () => m(base, "livingUiMotion", "export const MAX_AMBIENT_PARTS_PER_OWNER = 4;", "export const MAX_AMBIENT_PARTS_PER_OWNER = 6;")],
    ["loop ceiling literal", "LOOP_CEILING_DRIFT", O, () => m(base, "livingUiMotion", "export const MAX_AMBIENT_LOOPS = MAX_VISIBLE_AMBIENT_ANIMATIONS * MAX_AMBIENT_PARTS_PER_OWNER;", "export const MAX_AMBIENT_LOOPS = 24;")],
    ["priority order inverted", "AMBIENT_PRIORITY_INVERTED", O, () => m(base, "ambientBudget", ".sort((a, b) => a.priority - b.priority || a.id - b.id)", ".sort((a, b) => b.priority - a.priority || a.id - b.id)")],
    ["offscreen scenes keep running", "AMBIENT_RUNS_OFFSCREEN", O, () => m(base, "ambientBudget", "      .filter((candidate) => candidate.visible)\n", "")],
    ["hidden tab keeps running", "AMBIENT_RUNS_WHILE_HIDDEN", O, () => m(base, "ambientBudget", "if (paused || max <= 0) return new Set();", "if (max <= 0) return new Set();")],
    ["unmounted scene keeps its run pose", "SCENE_FREEZES_INVALID", O, () => m(base, "ambientBudget", '    entries.delete(el);\n    el.setAttribute("data-ambient", "rest");', "    entries.delete(el);")],
    ["slot never released", "AMBIENT_SLOT_LEAK", O, () => m(base, "ambientBudget", "    entries.delete(el);\n", "")],
    ["Journey scene leaves the budget", "SCENE_UNBUDGETED", O, () => m(base, "journeyScene", 'useAmbientMotion(driftRef, "scene", markup !== null);', 'useAmbientMotion(driftRef, "ornament", markup !== null);')],
    ["Culture hero leaves the budget", "HERO_SCENE_UNBUDGETED", O, () => m(base, "cultureHeroScene", 'useAmbientMotion(ref, "scene", markup !== null);', "")],
    ["a part registers on its own", "PART_REGISTERED_ALONE", O, () => m(base, "journeyScene", 'useAmbientMotion(driftRef, "scene", markup !== null);', 'useAmbientMotion(driftRef, "scene", markup !== null);\n  useAmbientMotion(partRef, "scene");')],
    ["observer per hero", "OBSERVER_PER_ELEMENT", O, () => m(base, "cultureHeroScene", "export function", "const io = new IntersectionObserver(() => {});\nexport function")],

    // ── 4 Chinese frame system ────────────────────────────────────────
    ["unknown frame level", "FRAME_LEVEL_UNKNOWN", F, () => tsx(base, JOURNEY, (t) => t.replace('surface="journey-milestone" level="heritage"', 'surface="journey-milestone" level="imperial"'))],
    ["ceremony on the Journey module", "CEREMONY_ON_ORDINARY", F, () => tsx(base, JOURNEY, (t) => t.replace('surface="journey-milestone" level="heritage"', 'surface="journey-milestone" level="ceremony"'))],
    ["heritage on an unnamed surface", "FRAME_LEVEL_SURFACE", F, () => tsx(base, PROBE, () => '<ChineseOrnamentalFrame motif="huiwen" surface="settings-row" level="heritage" />')],
    ["topic card framed", "EVERY_CARD_FRAMED", F, () => m(base, "cultureTopicCard", "    <Link\n", '    <Link\n      data-frame={<ChineseOrnamentalFrame level="heritage" />}\n')],
    ["lesson step framed", "EVERY_CARD_FRAMED", F, () => m(base, "steps", "export function", 'const X = () => <ChineseOrnamentalFrame motif="huiwen" />;\nexport function')],
    ["frame stylesheet not loaded", "FRAMES_NOT_LOADED", F, () => m(base, "main", 'import "./styles/chinese-frames.css";', "")],
    ["frame drawn as a shadow", "FRAME_SHADOW", F, () => m(base, FR, "  opacity: 1;\n  border-color: rgb(var(--gilt));", "  opacity: 1;\n  border-color: rgb(var(--gilt));\n  box-shadow: 0 0 0 1px rgb(var(--gilt));")],
    ["frame hooks loop", "FRAME_LOOPS", F, () => m(base, FR, "var(--ease-enter) backwards;", "var(--ease-enter) infinite;")],
    ["frame hex colour", "FRAME_HEX", F, () => m(base, FR, "  background: rgb(var(--gilt));", "  background: #b8860b;")],
    ["inner rule loses the gilt token", "FRAME_TOKEN_MISSING", F, () => m(base, FR, "  opacity: 1;\n  border-color: rgb(var(--gilt));", "  opacity: 1;\n  border-color: currentColor;")],
    ["hooks lose the gilt token", "FRAME_TOKEN_MISSING", F, () => m(base, FR, "  background: rgb(var(--gilt));", "  background: currentColor;")],
    ["hooks lose their explicit pointer-events", "FRAME_INTERCEPTS_POINTER", F, () => m(base, FR, '  content: "";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;', '  content: "";\n  position: absolute;\n  inset: 0;')],
    ["hooks take taps", "FRAME_INTERCEPTS_POINTER", F, () => m(base, FR, '  content: "";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;', '  content: "";\n  position: absolute;\n  inset: 0;\n  pointer-events: none;\n}\n.lyo-frame[data-frame-level] .lyo-edge {\n  pointer-events: auto;')],
    ["module hook grows into the padding", "CORNER_DISCONNECTED", F, () => m(base, FR, '[data-ornament-surface="journey-milestone"] {\n  --cframe-hook: 12px;', '[data-ornament-surface="journey-milestone"] {\n  --cframe-hook: 40px;')],
    ["still ornaments take a slot", "STILL_ORNAMENT_TAKES_SLOT", V, () => m(base, "symbolicOrnaments", 'useAmbientMotion(ref, "ornament", profile !== "still");', 'useAmbientMotion(ref, "ornament");')],
    ["rule detached from the hooks", "CORNER_DISCONNECTED", F, () => m(base, FR, "  left: var(--cframe-hook);\n  right: var(--cframe-hook);", "  left: 4px;\n  right: 4px;")],
    ["hook drawn at a fixed size", "CORNER_DISCONNECTED", F, () => m(base, FR, "var(--cframe-hook-tl) top left / var(--cframe-hook) var(--cframe-hook) no-repeat", "var(--cframe-hook-tl) top left / 12px 12px no-repeat")],
    ["hook L leaves the rule", "CORNER_DISCONNECTED", F, () => m(base, FR, "d='M16 .5H.5V16M4 13V4h9v5H8V7'", "d='M16 .5H.5V12M4 13V4h9v5H8V7'")],
    ["inner rule misaligned", "BORDERS_MISALIGNED", F, () => m(base, FR, ".lyo-frame[data-frame-level] .lyo-edge-top {\n  top: 0;", ".lyo-frame[data-frame-level] .lyo-edge-top {\n  top: 3px;")],
    ["stitch shows under the rule", "STITCH_UNDER_RULE", F, () => m(base, FR, ".lyo-frame[data-frame-level] .lyo-edge::after {\n  display: none;", ".lyo-frame[data-frame-level] .lyo-edge::after {\n  opacity: 0.5;")],
    ["frame entrance replays", "FRAME_DRAW_LOOPS", F, () => m(base, FR, '.lyo-frame[data-frame-level][data-animate="once"]::after {', ".lyo-frame[data-frame-level]::after {\n  opacity: 1;\n}\n.lyo-frame[data-frame-level][data-animate]::after {")],
    ["frame ignores reduced motion", "FRAME_REDUCED_MOTION", F, () => m(base, FR, "    animation: none !important;", "    animation-duration: 1ms;")],
    ["dark gilt token removed", "FRAME_TOKEN_MISSING", F, () => themeToken(base, DARK, "gilt", null)],
    ["clay frame-line token removed", "FRAME_TOKEN_MISSING", F, () => themeToken(base, CLAY, "frame-line", null)],
    ["gilt colour unmapped", "FRAME_TOKEN_MISSING", F, () => m(base, "tailwind", 'gilt: "rgb(var(--gilt) / <alpha-value>)",', "")],
    ["gilt vanishes on clay", "FRAME_INVISIBLE_LIGHT", F, () => themeToken(base, CLAY, "gilt", "246 241 233")],
    ["gilt vanishes on dark", "FRAME_INVISIBLE_DARK", F, () => themeToken(base, DARK, "gilt", "40 38 36")],
    ["gilt blinding on dark", "FRAME_BLINDING_DARK", F, () => themeToken(base, DARK, "gilt", "255 255 255")],

    // ── 5 Visual density ──────────────────────────────────────────────
    ["two heritage frames on Journey", "FRAME_DENSITY_EXCEEDED", D, () => m(base, "journeyPage", 'surface="journey-milestone" level="heritage" />', 'surface="journey-milestone" level="heritage" />\n<ChineseOrnamentalFrame motif="huiwen" surface="journey-milestone" level="heritage" />')],
    ["two heritage frames on a Culture topic", "FRAME_DENSITY_EXCEEDED", D, () => m(base, "cultureTopicDetail", 'surface="culture-topic-hero" level="heritage" />', 'surface="culture-topic-hero" level="heritage" />\n<ChineseOrnamentalFrame motif="huiwen" surface="culture-topic-hero" level="heritage" />')],
    ["two ceremony frames on Victory", "FRAME_DENSITY_EXCEEDED", D, () => m(base, "victory", 'surface="victory" level="ceremony" />', 'surface="victory" level="ceremony" />\n<ChineseOrnamentalFrame motif="ruyi" surface="victory" level="ceremony" />')],
    ["two hero scenes on a topic", "CULTURE_SCENE_DENSITY", D, () => m(base, "cultureTopicDetail", "<CultureHeroScene topicId={topic.id} />", "<CultureHeroScene topicId={topic.id} />\n<CultureHeroScene topicId={topic.id} />")],
    ["hero scene moved to a subtopic", "HERO_SCENE_ON_SUBTOPIC", D, () => m(base, "cultureTopicDetail", 'data-testid="culture-topic-header"', 'data-testid="culture-topic-banner"')],
    ["hero scene on another page", "CULTURE_SCENE_DENSITY", D, () => tsx(base, "src/features/culture/CultureAtlasPage.tsx", (t) => `${t}\nexport const Extra = () => <CultureHeroScene topicId="vida_cotidiana" />;\n`)],
    ["ceremony + scene + mascot together", "VISUAL_OVERLOAD", D, () => tsx(base, PROBE, () => '<ChineseOrnamentalFrame surface="victory" level="ceremony" />\n<JourneyScene id="market" />\n<Mascot />')],
    ["scene inside a lesson task", "AMBIENCE_IN_TASK", D, () => m(base, "hanziBuilder", "export function", "const S = () => <JourneyScene id=\"market\" />;\nexport function")],
    ["scene on a topic card", "CULTURE_SCENE_DENSITY", D, () => m(base, "cultureTopicCard", "    <Link\n", '    <Link\n      data-art={<JourneyScene id="market" />}\n')],
    ["topic without a hero scene", "CULTURE_THEME_INCOMPLETE", D, () => m(base, "cultureVisualTheme", /  china_contemporanea: \{[^\n]*\n/, "")],
    ["hero scene not in the library", "CULTURE_THEME_INCOMPLETE", D, () => m(base, "cultureVisualTheme", 'heroScene: "tea-table"', 'heroScene: "dim-sum"')],
    ["ornament offset not an integer", "CULTURE_THEME_INCOMPLETE", D, () => m(base, "cultureVisualTheme", 'heroScene: "courtyard", ornamentOffset: 7', 'heroScene: "courtyard", ornamentOffset: 1.5')],

    // ── 6 Typography + icons ──────────────────────────────────────────
    ["nav icon becomes emoji", "NAV_EMOJI_ICON", T, () => m(base, "nav", 'label: "Missões", labelKey: "navigation.missions", icon: IconFlame', 'label: "🔥 Missões", labelKey: "navigation.missions", icon: IconFlame')],
    ["More hub lock back to emoji", "NAV_EMOJI_ICON", T, () => m(base, "morePage", "status: <IconLock", 'status: "🔒" ?? <IconLock')],
    ["tab bar badge emoji", "NAV_EMOJI_ICON", T, () => m(base, "tabBar", '{badge > 9 ? "9+" : badge}', '{badge > 9 ? "🔥" : badge}')],
    ["nav icon from another family", "NAV_ICON_FAMILY", T, () => m(base, "nav", "icon: IconLantern, matches: [\"/cultura\"]", 'icon: LanternEmoji, matches: ["/cultura"]')],
    ["Longyu icon stroke drifts", "ICON_FAMILY_DRIFT", T, () => m(base, "icon", "strokeWidth: 1.8,", "strokeWidth: 2.4,")],
    ["icon outside the family base", "ICON_FAMILY_DRIFT", T, () => m(base, "icon", "export const IconMoon = (p: P) => (\n  <svg {...base(p)}>", 'export const IconMoon = (p: P) => (\n  <svg viewBox="0 0 24 24" {...p}>')],
    ["Chinese icon removed", "CHINESE_ICON_MISSING", T, () => m(base, "icon", "export const IconPagoda", "export const IconTower")],
    ["topic tile mixes an emoji", "TOPIC_ICON_MIXED", T, () => m(base, "cultureTopicCard", '<CultureTopicIcon name={topic.icon as CultureTopicIconKey | undefined} />', "<span>🏮</span>")],
    ["topic icon stroke drifts", "TOPIC_ICON_MIXED", T, () => m(base, "cultureTopicIcon", "strokeWidth: 1.6,", "strokeWidth: 2.2,")],
    ["topic icon outside the base", "TOPIC_ICON_MIXED", T, () => m(base, "cultureTopicIcon", '<svg {...base(p)} data-topic-icon="home">', '<svg width="18" data-topic-icon="home">')],
    ["culture card dragon emoji back", "TOPIC_ICON_MIXED", T, () => m(base, "cultureCard", "<IconSeal className=\"h-3.5 w-3.5 text-accent\" aria-hidden />", "🐉")],
    ["collection icon becomes emoji", "COLLECTION_ICON_EMOJI", T, () => m(base, "cultureAtlas", "festivals_calendar: IconMoon,", 'festivals_calendar: "🌕",')],
    ["8px text", "TEXT_SIZE_EXTREME", T, () => tsx(base, PROBE, () => '<span className="text-[8px]">x</span>')],
    ["absurd 14rem text", "TEXT_SIZE_EXTREME", T, () => tsx(base, PROBE, () => '<span className="text-[14rem]">x</span>')],
    ["Hanzi example metadata-sized", "HANZI_METADATA_SIZED", T, () => m(base, "css", "@apply font-serif text-[1.375rem] leading-8 text-ink;", "@apply font-serif text-xs leading-8 text-ink;")],
    ["Hanzi primary shrinks", "HANZI_METADATA_SIZED", T, () => m(base, "css", "@apply font-serif text-[1.5rem] leading-9 text-ink sm:text-[1.625rem];", "@apply font-serif text-base leading-9 text-ink;")],
    ["Hanzi help chip caption-sized", "HANZI_METADATA_SIZED", T, () => m(base, "steps", '<span className="hanzi text-lg font-semibold text-ink">{item.hanzi}</span>', '<span className="hanzi text-xs font-semibold text-ink">{item.hanzi}</span>')],
    ["immersion cast Hanzi caption-sized", "HANZI_METADATA_SIZED", T, () => m(base, "immersion", '<span className="hanzi ml-1.5 text-sm font-normal text-ink-soft">', '<span className="hanzi ml-1.5 text-[11px] font-normal text-ink-soft">')],
    ["pinyin overtakes Hanzi", "PINYIN_OVER_HANZI", T, () => m(base, "css", ".type-pinyin {\n    @apply text-sm leading-5 text-ink-soft;", ".type-pinyin {\n    @apply text-2xl leading-5 text-ink-soft;")],
    ["pinyin bolder than Hanzi", "PINYIN_OVER_HANZI", T, () => m(base, "css", ".type-pinyin {\n    @apply text-sm leading-5 text-ink-soft;", ".type-pinyin {\n    @apply text-sm font-bold leading-5 text-ink-soft;")],
    ["pinyin oversized in a task", "PINYIN_OVER_HANZI", T, () => m(base, "steps", "export function", 'const PY = () => <span className="type-pinyin text-3xl">pīnyīn</span>;\nexport function')],
    ["Hanzi font fallback lost", "HANZI_FONT_FALLBACK", T, () => m(base, "css", '.hanzi {\n  font-family: "Noto Serif SC", "Songti SC", serif;', '.hanzi {\n  font-family: "Noto Serif SC";')],
    ["random font in Tailwind", "FONT_UNSUPPORTED", T, () => m(base, "tailwind", 'sans: ["Inter", "system-ui", "sans-serif"],', 'sans: ["Inter", "system-ui", "sans-serif"],\n        display: ["Papyrus", "fantasy"],')],
    ["random font in CSS", "FONT_UNSUPPORTED", T, () => m(base, LC, ".culture-hero-scene {\n  flex: none;", ".culture-hero-scene {\n  font-family: \"Comic Sans MS\", cursive;\n  flex: none;")],
    ["unbundled font-face", "FONT_UNSUPPORTED", T, () => m(base, FR, ".lyo-frame[data-frame-level] {\n  --cframe-hook: 16px;", "@font-face { font-family: Brush; src: url(https://example.com/brush.woff2); }\n.lyo-frame[data-frame-level] {\n  --cframe-hook: 16px;")],
    ["extra web font fetched", "FONT_UNSUPPORTED", T, () => m(base, "indexHtml", "family=Inter:wght@400;500;600;700", "family=Ma+Shan+Zheng&family=Inter:wght@400;500;600;700")],
    ["inline fontFamily in a component", "FONT_UNSUPPORTED", T, () => tsx(base, PROBE, () => '<span style={{ fontFamily: "Impact" }}>x</span>')],
    ["rogue uppercase on a Culture card", "UPPERCASE_ROGUE", T, () => m(base, "cultureCard", '<p className="type-eyebrow">', '<p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent">')],

    // ── 6b Progression polish ─────────────────────────────────────────
    ["completed→current connector not a lead-in", "CONNECTOR_STATE_WRONG", PR, () => m(base, "progressionConnector", 'if (fromState === "COMPLETED" && (toState === "CURRENT" || toState === "AVAILABLE")) return "lead";', "")],
    ["segment after the current node filled", "CONNECTOR_STATE_WRONG", PR, () => m(base, "progressionConnector", 'if (fromState === "COMPLETED" && toState === "COMPLETED") return "complete";', 'if (fromState === "COMPLETED" || fromState === "CURRENT") return "complete";')],
    ["locked segment looks open", "CONNECTOR_STATE_WRONG", PR, () => m(base, "progressionConnector", '  if (toState === "LOCKED") return "locked";\n', "")],
    ["connector state not exposed", "CONNECTOR_STATE_WRONG", PR, () => m(base, "progressionConnector", "data-connector-state={connector}", "")],
    ["lead-in as strong as complete", "CONNECTOR_TONE_DRIFT", PR, () => m(base, "progressionConnector", 'lead: "bg-accent/35",', 'lead: "bg-accent/55",')],
    ["locked segment in accent", "CONNECTOR_TONE_DRIFT", PR, () => m(base, "progressionConnector", 'locked: "bg-line/35",', 'locked: "bg-accent/20",')],
    ["progression stylesheet not loaded", "PROGRESSION_CSS_NOT_LOADED", PR, () => m(base, "main", 'import "./styles/progression-living.css";', "")],
    ["completed nodes animate forever", "COMPLETED_NODE_LOOPS", PR, () => m(base, "progressionCss", "calc(var(--motion-emphasis) * 2) var(--ease-enter) both;\n}\n\n[data-completion-moment=\"play\"] [data-testid", "calc(var(--motion-emphasis) * 2) var(--ease-enter) infinite both;\n}\n\n[data-completion-moment=\"play\"] [data-testid")],
    ["connector flows", "COMPLETED_NODE_LOOPS", PR, () => m(base, "progressionCss", "/* end progression living */", ".progression-connector { animation: progression-connector-fill var(--motion-ambient) linear infinite; }\n/* end progression living */")],
    ["moment keyframes animate height", "LAYOUT_PROPERTY_ANIMATION", PR, () => m(base, "progressionCss", "  to {\n    transform: scaleY(1);\n  }", "  to {\n    height: 24px;\n  }")],
    ["sparkle blurs", "HEAVY_FILTER_ANIMATION", PR, () => m(base, "progressionCss", "    opacity: 1;\n    transform: scale(1) rotate(20deg);", "    opacity: 1;\n    filter: blur(1px);\n    transform: scale(1) rotate(20deg);")],
    ["literal moment duration", "ARBITRARY_DURATION", PR, () => m(base, "progressionCss", "animation: progression-node-settle calc(var(--motion-emphasis) * 2)", "animation: progression-node-settle 0.55s")],
    ["sparkle outlasts 1.1 s", "MOMENT_TOO_LONG", PR, () => m(base, "progressionCss", "animation: progression-spark calc(var(--motion-emphasis) * 2.5)", "animation: progression-spark calc(var(--motion-emphasis) * 4)")],
    ["axis fill outlasts 1.1 s", "MOMENT_TOO_LONG", PR, () => m(base, "progressionCss", "transition: transform calc(var(--motion-emphasis) * 2) var(--ease-enter);", "transition: transform calc(var(--motion-emphasis) * 5) var(--ease-enter);")],
    ["moment window over budget", "MOMENT_TOO_LONG", PR, () => m(base, "completionMoment", "export const COMPLETION_MOMENT_MS = 1100;", "export const COMPLETION_MOMENT_MS = 2400;")],
    ["axis fill animates height", "AXIS_FILL_REFLOWS", PR, () => m(base, "progressionCss", "transition: transform calc(var(--motion-emphasis) * 2)", "transition: height calc(var(--motion-emphasis) * 2)")],
    ["axis fill sized by height", "AXIS_FILL_REFLOWS", PR, () => m(base, "journeyAxisDone", "style={{ transform: `scaleY(${scale})` }}", "style={{ height: `${scale * 100}%` }}")],
    ["axis fill replays on every mount", "AXIS_FILL_REPLAYS", PR, () => m(base, "journeyAxisDone", "next > previous + 0.001", "next >= 0")],
    ["axis fill leaves the line", "AXIS_MOVED", PR, () => m(base, "progressionCss", "  position: absolute;\n  inset: 0;\n  background: rgb(var(--accent) / 0.45);", "  position: relative;\n  margin-left: 2px;\n  background: rgb(var(--accent) / 0.45);")],
    ["axis fill outside the axis line", "AXIS_MOVED", PR, () => m(base, "journeyPage", "<JourneyAxisDone unitId={unit.id}", "<span /><JourneyAxisDone unitId={unit.id}")],
    ["nodes offset off the axis", "AXIS_MOVED", PR, () => m(base, "progressionBubble", "export function progressionOffsetForIndex(_index: number): number {\n  return 0;", "export function progressionOffsetForIndex(_index: number): number {\n  return _index % 2 ? 12 : -12;")],
    ["reduced motion still fills the axis", "REDUCED_MOTION_IGNORED", PR, () => m(base, "progressionCss", "  .journey-axis-done,\n", "")],
    ["moment on a cold start", "MOMENT_ON_COLD_START", PR, () => m(base, "completionMoment", "    seenIncomplete.has(id) &&\n", "")],
    ["moment replays after its claim", "MOMENT_REPLAYS", PR, () => m(base, "completionMoment", "    !sessionOnceClaimed(momentKey(id)) &&\n", "")],
    ["moment under reduced motion", "REDUCED_MOTION_IGNORED", PR, () => m(base, "completionMoment", "    !sessionOnceClaimed(momentKey(id)) &&\n    !prefersReducedMotion()", "    !sessionOnceClaimed(momentKey(id))")],
    ["moment never recorded as incomplete", "MOMENT_NEVER_PLAYS", PR, () => m(base, "completionMoment", '  if (state !== "COMPLETED") seenIncomplete.add(id);', "")],
    ["claim inside the StrictMode initializer", "MOMENT_EATEN_BY_STRICTMODE", PR, () => m(base, "completionMoment", 'useState<CompletionMomentPhase>(() => (peekCompletionMoment(id, state) ? "pending" : null));', 'useState<CompletionMomentPhase>(() => (claimSessionOnce(momentKey(id)) && peekCompletionMoment(id, state) ? "pending" : null));')],
    ["moment plays under a ceremony", "MOMENT_UNDER_MODAL", PR, () => m(base, "completionMoment", "      if (ceremonyOrModalOnScreen()) {", "      if (false) {")],
    ["moment blind to the streak modal", "MOMENT_UNDER_MODAL", PR, () => m(base, "completionMoment", `return document.querySelector('[aria-modal="true"]') !== null;`, "return false;")],
    ["moment starts before same-commit ceremonies register", "MOMENT_UNDER_MODAL", PR, () => m(base, "completionMoment", "timer = window.setTimeout(attempt, 60);", "attempt();")],
    ["moment plays when a module opens minutes later", "MOMENT_OUT_OF_CONTEXT", PR, () => m(base, "completionMoment", "return windowOpenedAt === null || now - windowOpenedAt <= COMPLETION_WINDOW_MS;", "return true;")],
    ["moment without any Victory", "MOMENT_OUT_OF_CONTEXT", PR, () => m(base, "completionMoment", "  if (armedAt === null) return false;\n", "")],
    ["Victory never arms the moment", "MOMENT_NEVER_PLAYS", PR, () => m(base, "victory", "useEffect(() => armCompletionMoments(), []);", "")],
    ["moment can wait forever", "MOMENT_STUCK_PENDING", PR, () => m(base, "completionMoment", "export const COMPLETION_PENDING_MAX_MS = 20000;", "export const COMPLETION_PENDING_MAX_MS = Infinity;")],
    ["pending pose jumps when the moment starts", "PENDING_POSE_JUMPS", PR, () => m(base, "progressionCss", '[data-completion-moment="pending"] .progression-node-core {\n  transform: scale(0.9);', '[data-completion-moment="pending"] .progression-node-core {\n  transform: scale(0.75);')],
    ["moment styles never leave", "COMPLETED_NODE_LOOPS", PR, () => m(base, "completionMoment", 'setPhase("done"), COMPLETION_MOMENT_MS)', 'setPhase("play"), COMPLETION_MOMENT_MS)')],
    ["sparkle stays after the moment", "COMPLETED_NODE_LOOPS", PR, () => m(base, "progressionBubble", '{completionMoment === "play" ? <CompletionSparkle /> : null}', "{completionMoment ? <CompletionSparkle /> : null}")],
    ["bubble ignores the moment", "MOMENT_NEVER_PLAYS", PR, () => m(base, "progressionBubble", "data-completion-moment={completionMoment ?? undefined}", "")],
    ["sparkle takes taps", "DECORATION_INTERACTIVE", PR, () => m(base, "progressionBubble", "progression-complete-spark pointer-events-none absolute", "progression-complete-spark absolute")],
    ["completed nodes join the ambient budget", "CURRENT_NODE_NOT_ONLY", PR, () => m(base, "progressionBubble", "function CompletionSparkle() {", 'function CompletionSparkle() {\n  useAmbientMotion(useRef(null), "ornament");')],
    ["current node bounces", "CURRENT_NODE_NOT_ONLY", PR, () => m(base, "progressionBubble", '"progression-node-core",', '"progression-node-core animate-bounce",')],

    ...guidanceCases(base),
    ...releaseCases(base),
  ];
}

/* Guidance arbitration and release cases live below so the list reads by checker. */
function guidanceCases(base) {
  return [
    ["page guide ranked under optional guidance", "GUIDANCE_LADDER_INVERTED", G, () => m(base, "guidanceOrchestrator", "  PAGE_FIRST_VISIT: 1,\n  OPTIONAL_CONTEXTUAL: 2,", "  PAGE_FIRST_VISIT: 2,\n  OPTIONAL_CONTEXTUAL: 1,")],
    ["critical onboarding demoted", "GUIDANCE_LADDER_INVERTED", G, () => m(base, "guidanceOrchestrator", "  CRITICAL_ONBOARDING: 0,", "  CRITICAL_ONBOARDING: 3,")],
    ["essential guidance treated as optional", "GUIDANCE_LADDER_INVERTED", G, () => m(base, "guidanceOrchestrator", 'definition.priority === "CRITICAL_UX" || definition.essential ? "CRITICAL_ONBOARDING"', 'definition.priority === "CRITICAL_UX" ? "CRITICAL_ONBOARDING"')],
    ["critical onboarding yields to the page guide", "GUIDANCE_LADDER_INVERTED", G, () => m(base, "guidanceOrchestrator", "> GUIDE_SURFACE_TIER_RANK.PAGE_FIRST_VISIT;", ">= GUIDE_SURFACE_TIER_RANK.CRITICAL_ONBOARDING;")],
    ["coachmark + Culture guide together (marker renamed)", "COACHMARK_AND_CULTURE_GUIDE_TOGETHER", G, () => m(base, "guidanceOrchestrator", 'PAGE_FIRST_VISIT_GUIDE_ATTR = "data-first-visit-guide"', 'PAGE_FIRST_VISIT_GUIDE_ATTR = "data-page-guide"')],
    ["selection ignores the page guide", "COACHMARK_AND_CULTURE_GUIDE_TOGETHER", G, () => m(base, "guidanceOrchestrator", "  if (ctx.pageFirstVisitGuide && yieldsToPageFirstVisitGuide(definition)) return false;", "")],
    ["host never reads the page marker", "COACHMARK_AND_CULTURE_GUIDE_TOGETHER", G, () => m(base, "guidanceHost", "pageFirstVisitGuide: pageFirstVisitGuideOwnsVisit(),", "pageFirstVisitGuide: false,")],
    ["Culture page drops the marker", "COACHMARK_AND_CULTURE_GUIDE_TOGETHER", G, () => m(base, "cultureJourney", 'data-first-visit-guide={ownsVisit ? "culture-root" : undefined}', "")],
    ["page guide preempts a coachmark on screen", "COACHMARK_AND_CULTURE_GUIDE_TOGETHER", G, () => m(base, "cultureJourney", "!guidanceSurfaceOnScreen(getCurrentGuidance(), routePath) &&", "")],
    ["page guide stays over critical onboarding", "COACHMARK_AND_CULTURE_GUIDE_TOGETHER", G, () => m(base, "cultureJourney", "showGuide && !guidanceSurfaceOnScreen(hostGuidance, routePath)", "showGuide")],
    ["guide replays every cold start", "GUIDE_REPLAYS_EVERY_START", G, () => m(base, "cultureJourney", "readCultureGuideSeen(accountId).has(CULTURE_ROOT_GUIDE_KEY)", 'sessionStorage.getItem("culture-root-guide") === "1"')],
    ["seen never written: the queue never drains", "GUIDANCE_QUEUE_DEADLOCK", G, () => m(base, "cultureJourney", "if (showGuide) markCultureRootGuideSeen(accountId);", "")],
    ["guide Continue becomes a second primary", "GUIDE_BLOCKS_CTA", G, () => m(base, "cultureJourney", 'actionVariant="outline"', 'actionVariant="primary"')],
    ["guide types below the fold (ratio 0)", "OFFSCREEN_TYPEWRITER", G, () => m(base, "guideStart", "export const GUIDE_ON_SCREEN_RATIO = 0.6;", "export const GUIDE_ON_SCREEN_RATIO = 0;")],
    ["guide types in a hidden tab", "OFFSCREEN_TYPEWRITER", G, () => m(base, "guideStart", "if (done || !inView || documentHidden()) return;", "if (done || !inView) return;")],
    ["guide types before it is seen", "OFFSCREEN_TYPEWRITER", G, () => m(base, "guideStart", "if (done || !inView || documentHidden()) return;", "if (done) return;")],
    ["guide restarts after a minor intersection", "TYPEWRITER_RESTARTS", G, () => m(base, "guideStart", "    done = true;\n    stop();\n", "")],
    ["guide stuck silent without an observer", "TYPEWRITER_NEVER_STARTS", G, () => m(base, "guideStart", "  if (!el || !canObserveOnScreen()) {\n    onSeen();", "  if (!el || !canObserveOnScreen()) {")],
    ["two guides type at once", "GUIDE_FLOOR_SHARED", G, () => m(base, "guideStart", "return floor.length ? floor[floor.length - 1] : null;", "return floor.length ? floor[0] : null;")],
    ["dialogue starts typing at mount", "OFFSCREEN_TYPEWRITER", G, () => m(base, "guideDialogue", 'useOnScreenOnce(rootRef, !reduced && state.phase === "idle", messageIdentity)', "true")],
    ["dialogue ticks without the floor", "OFFSCREEN_TYPEWRITER", G, () => m(base, "guideDialogue", 'if (state.phase !== "typing" || !mayType) return;', 'if (state.phase !== "typing") return;')],
    ["reduced motion waits to be seen", "REDUCED_MOTION_WAITS", G, () => m(base, "guideDialogue", 'reduceGuideDialogue(createGuideDialogueState(), { type: "START", instant }', 'reduceGuideDialogue(createGuideDialogueState(), { type: "IDLE", instant }')],
    ["Continue swallowed while waiting", "CONTINUE_SWALLOWED", G, () => m(base, "guideDialogue", 'data-guide-continue={isTyping || waiting ? "complete-text" : "advance"}', 'data-guide-continue={isTyping ? "complete-text" : "advance"}')],
    ["teacher bubble types offscreen", "OFFSCREEN_TYPEWRITER", G, () => m(base, "teacherBubble", 'if (reduced || !onScreen || state !== "ENTER") return;', 'if (reduced || state !== "ENTER") return;')],
    ["teacher bubble ticks without the floor", "OFFSCREEN_TYPEWRITER", G, () => m(base, "teacherBubble", 'if (state !== "TYPING" || !mayType) return;', 'if (state !== "TYPING") return;')],
    ["teacher tap before start swallowed", "CONTINUE_SWALLOWED", G, () => m(base, "teacherBubble", 'state === "TYPING" || (state === "ENTER" && !reduced)', 'state === "TYPING"')],
  ];
}

function releaseCases(base) {
  return [
    ["cert missing", "CERT_MISSING", REL, () => ({ ...clone(base), cert: "" })],
    ["wave identity drift", "WAVE_IDENTITY_DRIFT", REL, cert(base, (o) => (o.wave = "RC2.3.13R.3.2.5"))],
    ["cert section missing", "CERT_SECTION_MISSING", REL, cert(base, (o) => delete o.scenicMotion)],
    ["wrong parent", "WRONG_PARENT_PR", REL, cert(base, (o) => (o.parent.pr = 355))],
    ["parent head not a sha", "WRONG_PARENT_PR", REL, cert(base, (o) => (o.parent.headSha = "main"))],
    ["learner runtime not advanced", "LEARNER_RUNTIME_NOT_ADVANCED", REL, cert(base, (o) => (o.runtime.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["rc runtime pin stale", "LEARNER_RUNTIME_NOT_ADVANCED", REL, () => withJson(base, "rc", (o) => (o.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["parent cert runtime pin stale", "PARENT_RUNTIME_PIN_STALE", REL, () => withJson(base, "parentCert", (o) => (o.runtime.learnerRuntimeSha = "f".repeat(40)))],
    ["fingerprint typed by hand", "FINGERPRINT_DRIFT", REL, cert(base, (o) => (o.fingerprint.source = "manual"))],
    ["fingerprint value drift", "FINGERPRINT_DRIFT", REL, cert(base, (o) => (o.fingerprint.value = "000000000000"))],
    ["scenic registry drift", "REGISTRY_DRIFT", REL, () => withJson(base, "scenicRegistryJson", (o) => (o.scenes[0].profile = "sway-x"))],
    ["frame contract drift", "REGISTRY_DRIFT", REL, () => withJson(base, "frameContractJson", (o) => o.levels.heritage.surfaces.push("settings-row"))],
    ["living scenes state dishonest", "SYSTEM_STATE_DISHONEST", REL, cert(base, (o) => (o.scenicMotion.state = "PHYSICAL_PASS"))],
    ["frames state dishonest", "SYSTEM_STATE_DISHONEST", REL, cert(base, (o) => (o.frames.state = "DONE"))],
    ["ambient budget claim exceeds 4", "AMBIENT_CLAIM_DISHONEST", REL, cert(base, (o) => (o.scenicMotion.maxOwners = 6))],
    ["offscreen loops claimed away", "AMBIENT_CLAIM_DISHONEST", REL, cert(base, (o) => (o.scenicMotion.offscreenLoops = 2))],
    ["30-minute session missing", "PERF_SESSION_MISSING", REL, cert(base, (o) => (o.performance.thirtyMinute.minutes = 5))],
    ["freeze exception missing", "FREEZE_EXCEPTION_MISSING", REL, () => m(base, "freeze", "PRE_BETA_FREEZE_EXCEPTION_R326", "PRE_BETA_FREEZE_EXCEPTION_R32X")],
    ["scope creep: economy", "SCOPE_CREEP", REL, cert(base, (o) => (o.scope.economyChange = true))],
    ["scope creep: navigation", "SCOPE_CREEP", REL, cert(base, (o) => (o.scope.navigationRedesign = true))],
    ["new skip hidden", "NEW_SKIP_WITHOUT_EVIDENCE", REL, cert(base, (o) => (o.crossEngine.newSkips = 1))],
    ["e2e hides an engine", "E2E_HIDES_ENGINE", REL, () => m(base, "e2e", "test(", "test.fixme(")],
    ["red hosted source accepted", "RED_HOSTED_SOURCE_ACCEPTED", REL, cert(base, (o) => Object.assign(o.hosted, { overall: "PASS", webkit: "FAIL", headSha: "a".repeat(40), workflowRunIds: { ci: 1 } }))],
    ["APK from a red head", "RED_HOSTED_SOURCE_ACCEPTED", REL, cert(base, (o) => Object.assign(o.artifact, { status: "BUILT", channel: "DEVICE_QA", artifactSourceSha: "d".repeat(40), learnerRuntimeSha: o.runtime.learnerRuntimeSha, apkSha256: "e".repeat(64), workflowRunId: 1, artifactId: 2 }))],
    ["stale APK accepted", "OLD_APK_ACCEPTED", REL, cert(base, (o) => (o.rejectedApkSha256List = o.rejectedApkSha256List.slice(1)))],
    ["physical PASS from an emulator", "PHYSICAL_PASS_FROM_EMULATOR", REL, cert(base, (o) => Object.assign(o.physical, { status: "PASS", emulator: true, device: "sdk_gphone64_x86_64" }))],
    ["UI freeze accepted without the owner", "FREEZE_WITHOUT_OWNER_ACCEPTANCE", REL, cert(base, (o) => (o.uiFreeze.LONGYU_UI_UX_FREEZE = "OWNER_ACCEPTED_R326"))],
    ["Public Beta GO", "PUBLIC_BETA_GO", REL, cert(base, (o) => (o.entry.PUBLIC_BETA_ENTRY = "GO"))],
    ["Play GO without a signed AAB", "PLAY_GO_WITHOUT_SIGNED_AAB", REL, cert(base, (o) => (o.entry.PLAY_CLOSED_BETA_ENTRY = "GO"))],
    ["gate script missing", "GATE_SCRIPT_MISSING", REL, () => m(base, "packageJson", '"validate:chinese-frame-system"', '"validate:chinese-frame-x"')],
    ["gate not in a hosted suite", "GATE_NOT_IN_HOSTED_SUITE", REL, () => m(base, "canonicalSuites", '      "validate:scenic-motion-profiles",\n', "")],
    ["gate not registered", "GATE_REGISTRY_MISSING", REL, () => m(base, "gateRegistry", '"gateId": "validate:typography-icon-audit"', '"gateId": "validate:typography-x"')],
    ["report missing", "REPORT_MISSING", REL, () => ({ ...clone(base), report: "" })],
    ["handoff DO NOT USE list incomplete", "HANDOFF_STALE_LIST_INCOMPLETE", REL, () => m(base, "handoff", STALE_APK_SHA256[0], "deadbeef")],
  ];
}

function test() {
  const base = loadLivingCanvasSources();
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
    console.error(`FAIL test:rc2-3-13r3-2-6-chinese-living-canvas (${killed}/${list.length} kills)`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-2-6-chinese-living-canvas (${killed} kills)`);
}

function registry(write) {
  const src = loadLivingCanvasSources();
  const outputs = [
    [FILES.scenicRegistryJson, buildScenicRegistry(src)],
    [FILES.frameContractJson, buildFrameContract(src)],
  ];
  for (const [rel, data] of outputs) {
    const text = `${JSON.stringify(data, null, 2)}\n`;
    if (write) {
      fs.writeFileSync(path.join(process.cwd(), rel), text);
      console.log(`wrote ${rel}`);
    } else {
      const current = fs.existsSync(rel) ? fs.readFileSync(rel, "utf8") : "";
      report(`registry ${rel}`, current === text ? [] : ["REGISTRY_DRIFT"]);
    }
  }
}

const src = MODE === "test" || MODE === "registry" ? null : loadLivingCanvasSources();
switch (MODE) {
  case "profiles":
    report("validate:scenic-motion-profiles", checkScenicMotionProfiles(src));
    break;
  case "svg":
    report("validate:animated-svg-role-contract", checkAnimatedSvgRoles(src));
    break;
  case "ownership":
    report("validate:ambient-scene-ownership", checkAmbientOwnership(src));
    break;
  case "frames":
    report("validate:chinese-frame-system", checkChineseFrameSystem(src));
    break;
  case "density":
    report("validate:chinese-visual-density", checkChineseVisualDensity(src));
    break;
  case "guidance":
    report("validate:guidance-arbitration", checkGuidanceArbitration(src));
    break;
  case "type":
    report("validate:typography-icon-audit", checkTypographyIconAudit(src));
    break;
  case "progression":
    report("validate:progression-living", checkProgressionPolish(src));
    break;
  case "release":
    report("validate:rc2-3-13r3-2-6-release", checkRelease(src));
    break;
  case "registry":
    registry(process.argv.includes("--write"));
    break;
  case "validate":
    report("validate:rc2-3-13r3-2-6-chinese-living-canvas", checkAll(src));
    break;
  case "test":
    test();
    break;
  default:
    console.error(`unknown mode ${MODE}`);
    process.exitCode = 2;
}
