/**
 * RC2.3.13R.3.2.5 — Premium surface hierarchy, reward rituals, resilient
 * states & UX closure.
 *
 * Seven validators, each a pure function of the loaded sources so the
 * mutation runner can corrupt one input and prove the specific error fires:
 *
 *   premium-surface-system · interactive-state-consistency · resilient-ui-states
 *   reward-ux-contract · guide-ux-contract · mobile-ergonomics
 *   ux-closure-accessibility
 *
 * plus release honesty (checkRelease). Behaviour is executed wherever it can
 * be (the chest ritual, the transient toast hook, the economy pending helper,
 * the error localizer, Card class merging, Button state classes, the lesson Qi
 * formula against the store's, topic transitions, the teacher bubble, the
 * Android boundary detector, token contrast); the rest is structural.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { evalSource, makeHookRuntime } from "./rc2-3-13r3-2-4-living-ui-gates.mjs";
import { findCapacitorAccess } from "./android-foundation-gates.mjs";
import { journeyFingerprint } from "./report-meta.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
};

export const WAVE = "RC2.3.13R.3.2.5";
export const PARENT_PR = 355;
export const PARENT_WAVE = "RC2.3.13R.3.2.4";
/** The R.3.2.4 learner runtime this wave must move past. */
export const PREVIOUS_LEARNER_RUNTIME_SHA = "2618683e105bdb9be9185acd8b4ded9d30c61eee";
export const FREEZE_REASON = "OWNER_APPROVED_PREMIUM_UX_CLOSURE";
export const UI_FREEZE_ACCEPTED = "OWNER_ACCEPTED_R325";
export const MIN_KILLS = 160;
/** Arbitrary `rounded-[Npx]` left after the radius codemod (two 2px hairlines). Ratchet: never up. */
export const RADIUS_BASELINE = 2;
/** Arbitrary `shadow-[…]` box-shadows left in src (all replaced by elevation tokens). Ratchet. */
export const SHADOW_BASELINE = 0;
/** The R.3.2.4 follow-ups this wave had to close, each with root cause, fix and regression. */
export const KNOWN_FOLLOWUPS = ["CULTURE_TOPIC_DIRECTION_STALE", "MASCOT_BLINK_REST_POSE", "VICTORY_BURST_UNDER_FADE", "EDGE_DRAW_RESTING_POSE"];
/** Stale APKs (R.3.2.3 and before) that can never be accepted for this runtime. */
export const STALE_APK_SHA256 = [
  "fc72f9e3d33311401dfdf74bd7169185768cbdef3b92ddad0713cbd89e4251af",
  "fb835ce82e7989e2c46087c4aaf0b02771b7b0f194e6893bd63701e271c745c8",
];

const uniq = (errors) => [...new Set(errors)];
function j(text) {
  try {
    return JSON.parse(text || "null");
  } catch {
    return null;
  }
}
function stripComments(text) {
  return String(text ?? "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, "")
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
}
const count = (text, re) => (String(text ?? "").match(re) ?? []).length;

/* ------------------------------------------------------------------ */
/* Sources                                                            */
/* ------------------------------------------------------------------ */

export const FILES = {
  css: "src/index.css",
  indexHtml: "index.html",
  tailwind: "tailwind.config.js",
  primitives: "src/components/ui/primitives.tsx",
  ritual: "src/components/chests/ChestOpeningRitual.tsx",
  chestModal: "src/components/chests/ChestRewardModal.tsx",
  chest: "src/components/chests/LongyuChest.tsx",
  chestMeta: "src/components/chests/chestMeta.tsx",
  rewardReveal: "src/components/chests/RewardReveal.tsx",
  journeyPage: "src/features/journey/JourneyPage.tsx",
  missoes: "src/features/missoes/MissoesPage.tsx",
  loja: "src/features/loja/LojaPage.tsx",
  transientHook: "src/hooks/useTransientMessage.ts",
  lessonQi: "src/lib/lessonQi.ts",
  economy: "src/data/economy.ts",
  store: "src/lib/store.ts",
  lessonPlayer: "src/features/lesson/LessonPlayer.tsx",
  victory: "src/features/lesson/LessonVictory.tsx",
  steps: "src/features/lesson/steps.tsx",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  hanziBuilder: "src/components/hanzi/HanziBuilderExercise.tsx",
  pieceAssembly: "src/features/lesson/PieceAssembly.tsx",
  verdictMark: "src/features/lesson/TileVerdictMark.tsx",
  nodeBubble: "src/components/progression/ProgressionNodeBubble.tsx",
  guidanceSettings: "src/components/guidance/GuidanceSettingsCard.tsx",
  requireCloud: "src/components/auth/RequireCloudSession.tsx",
  sessionAudience: "src/lib/auth/sessionAudience.ts",
  signOutHook: "src/hooks/useCloudSignOut.ts",
  economyPending: "src/lib/economyPending.ts",
  errors: "src/i18n/errors.ts",
  ligas: "src/features/ligas/LigasPage.tsx",
  conta: "src/features/conta/ContaPage.tsx",
  dangerZone: "src/components/account/DangerZone.tsx",
  cloudSyncBoot: "src/components/auth/CloudSyncBootstrap.tsx",
  economyBoot: "src/components/economy/EconomyBootstrap.tsx",
  errorBoundary: "src/components/system/ErrorBoundary.tsx",
  pageFallback: "src/components/system/PageFallback.tsx",
  pwaBanner: "src/components/system/PwaUpdateBanner.tsx",
  syncChip: "src/components/auth/SyncStatusChip.tsx",
  syncBanner: "src/components/economy/EconomySyncBanner.tsx",
  imageGrid: "src/components/hanzi/ImageChoiceGrid.tsx",
  family: "src/features/familia/FamilyPage.tsx",
  revisao: "src/features/revisao/RevisaoPage.tsx",
  teacherBubble: "src/features/lesson/TeacherSpeechBubble.tsx",
  guideDialogue: "src/components/guide/GuideDialogue.tsx",
  guideMachine: "src/lib/guideDialogueMachine.ts",
  backNav: "src/lib/platform/backNavigation.ts",
  journeyGuide: "src/features/journey/JourneyGuideExplanation.tsx",
  cultureGate: "src/features/journey/JourneyCultureGate.tsx",
  soundFx: "src/lib/soundFx.ts",
  sealReveal: "src/features/culture/CultureSealReveal.tsx",
  guidanceHost: "src/components/guidance/GuidanceHost.tsx",
  cultureJourney: "src/features/culture/CultureJourneyPage.tsx",
  mascot: "src/components/brand/Mascot.tsx",
  inlineTip: "src/components/guidance/PedagogicalInlineTip.tsx",
  passwordField: "src/components/auth/PasswordField.tsx",
  loginForm: "src/components/auth/CloudLoginForm.tsx",
  socialAuth: "src/components/auth/SocialAuthButtons.tsx",
  oauthCallback: "src/features/auth/OAuthCallbackPage.tsx",
  authError: "src/lib/auth/authError.ts",
  signOutControl: "src/components/account/SignOutControl.tsx",
  topBar: "src/components/layout/TopBar.tsx",
  forgotPassword: "src/features/auth/ForgotPasswordPage.tsx",
  topicTransition: "src/lib/motion/topicTransition.ts",
  cultureCard: "src/features/culture/CultureTopicCard.tsx",
  modalOverlay: "src/components/ui/ModalOverlay.tsx",
  qaPanel: "src/features/qa/PremiumUxQaPanel.tsx",
  qaPage: "src/features/qa/QaDevicePage.tsx",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
  e2eSpec: "e2e/rc2-3-13r3-2-5-premium-ux.spec.ts",
  surfaceDoc: "docs/ux/premium-surface-system.md",
  stateDoc: "docs/ux/resilient-state-system.md",
  rewardDoc: "docs/ux/reward-experience.md",
  cert: "docs/release/rc2-3-13r3-2-5-certification.json",
  parentCert: "docs/release/rc2-3-13r3-2-4-certification.json",
  rc: "docs/release/final-pre-beta-rc.json",
  report: "docs/reports/rc2-3-13r3-2-5-premium-ux-closure.md",
  handoff: "docs/release/OWNER_R32_5_PREMIUM_UX_HANDOFF.md",
  freeze: "src/lib/curriculumFreeze.ts",
  packageJson: "package.json",
  gateRegistry: "docs/release/gate-registry.json",
  suites: "scripts/release/canonical-suites.mjs",
  skipAllowlist: "docs/release/skip-allowlist.json",
};

/** Every src/ .ts/.tsx file (for ratchets that must see the whole app). */
function srcTree() {
  const out = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.(tsx?|css)$/.test(entry.name)) out[rel] = read(rel);
    }
  };
  walk("src");
  return out;
}

export function loadPremiumUxSources() {
  const src = { tree: srcTree(), liveFingerprint: journeyFingerprint(ROOT) };
  for (const [key, rel] of Object.entries(FILES)) src[key] = read(rel);
  return src;
}

/* ------------------------------------------------------------------ */
/* Tokens & contrast                                                  */
/* ------------------------------------------------------------------ */

function cssBlock(css, selectorStart) {
  const i = css.indexOf(selectorStart);
  if (i < 0) return "";
  const open = css.indexOf("{", i);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

function blockVars(block) {
  const vars = {};
  for (const m of block.matchAll(/--([a-z0-9-]+):\s*([^;]+);/gi)) vars[m[1]] = m[2].trim();
  return vars;
}

export function themeTokens(css) {
  const root = blockVars(cssBlock(css, ':root,\n[data-theme="clay"]'));
  const china = { ...root, ...blockVars(cssBlock(css, '[data-theme="china"] {')) };
  const dark = { ...root, ...blockVars(cssBlock(css, '[data-theme="dark"] {')) };
  return { clay: root, china, dark };
}

function resolveRgb(vars, name, depth = 0) {
  const raw = vars[name];
  if (raw == null || depth > 6) return null;
  const ref = raw.match(/^var\(--([a-z0-9-]+)\)$/i);
  if (ref) return resolveRgb(vars, ref[1], depth + 1);
  const parts = raw.split(/\s+/).map(Number);
  return parts.length === 3 && parts.every((n) => Number.isFinite(n)) ? parts : null;
}

function luminance([r, g, b]) {
  const c = [r, g, b].map((v) => {
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** [foreground token, background token, minimum ratio, why] — checked in clay, china and dark. */
export const CONTRAST_PAIRS = [
  ["on-good", "good", 4.5, "label on a green fill (lesson Continuar after a correct answer)"],
  ["on-wrong", "wrong", 3, "label on the danger fill (large/bold button text)"],
  ["on-gold", "gold", 4.5, "label on the premium fill"],
  ["accent-on-soft", "accent-soft", 4.5, "soft button / selected tile label"],
  ["focus-ring", "surface", 3, "focus ring on a card"],
  ["focus-ring", "bg", 3, "focus ring on the page"],
  ["gold", "gold-soft", 4.5, "reward pill and chest-ready label"],
  ["good", "good-soft", 3, "success tint label"],
  ["text-faint", "bg", 4.5, "small state labels"],
];

export const REQUIRED_TOKENS = [
  "scrim", "good-soft", "gold-soft", "on-good", "on-wrong", "on-gold", "accent-on-soft", "focus-ring",
  "shadow-rest", "shadow-raised", "shadow-overlay", "shadow-reward", "shadow-dock", "shadow-current",
];

/* ------------------------------------------------------------------ */
/* 1 · Premium surface system                                         */
/* ------------------------------------------------------------------ */

export function cardMergeModule(primitives) {
  const start = primitives.indexOf("const CARD_FAMILIES");
  const end = primitives.indexOf("export function Card(");
  if (start < 0 || end < 0) return null;
  try {
    return evalSource(primitives.slice(start, end));
  } catch {
    return null;
  }
}

/** [base, override, must contain, must not contain] */
const CARD_MERGE_CASES = [
  ["border-line/55 bg-surface shadow-card", "border-accent/15", ["border-accent/15", "bg-surface", "shadow-card"], ["border-line/55"]],
  ["border-line/55 bg-surface shadow-card", "bg-accent-soft", ["bg-accent-soft", "border-line/55"], ["bg-surface"]],
  ["border-line/55 bg-surface shadow-card", "shadow-none", ["shadow-none"], ["shadow-card"]],
  ["border-line/55 bg-surface shadow-card hover:border-accent/25", "border-gold/30", ["hover:border-accent/25", "border-gold/30"], ["border-line/55"]],
  ["border-line/55 bg-surface shadow-card", "border-2 rounded-xl", ["border-line/55", "bg-surface"], []],
  ["border-line/55 bg-surface shadow-card", "bg-gradient-to-b", ["bg-surface"], []],
  ["border-line/55 bg-surface shadow-card", "hover:bg-surface-2", ["bg-surface", "hover:bg-surface-2"], []],
];

export function checkPremiumSurfaceSystem(src) {
  const errors = [];
  const css = src.css ?? "";
  const themes = themeTokens(css);
  const darkOwn = blockVars(cssBlock(css, '[data-theme="dark"] {'));
  for (const name of REQUIRED_TOKENS) {
    if (themes.clay[name] == null) errors.push("SURFACE_TOKEN_MISSING");
    // Dark must restate every token whose clay value would be wrong on a dark
    // surface (shadow-current is accent-relative and carries over).
    if (name !== "shadow-current" && darkOwn[name] == null) errors.push("SURFACE_TOKEN_MISSING");
  }
  for (const [theme, vars] of Object.entries(themes)) {
    for (const [fg, bg, min] of CONTRAST_PAIRS) {
      const a = resolveRgb(vars, fg);
      const b = resolveRgb(vars, bg);
      if (!a || !b) {
        errors.push("SURFACE_TOKEN_MISSING");
        continue;
      }
      if (contrast(a, b) < min) errors.push(`CONTRAST_BELOW_AA:${theme}:${fg}/${bg}`.split(":")[0]);
    }
    const scrim = resolveRgb(vars, "scrim");
    const surface = resolveRgb(vars, "surface");
    if (scrim && surface && luminance(scrim) >= luminance(surface)) errors.push("SCRIM_LIGHTER_THAN_SURFACE");
  }
  const tw = src.tailwind ?? "";
  for (const color of ["good-soft", "gold-soft", "on-good", "on-wrong", "on-gold", "accent-on-soft", "focus-ring", "scrim"]) {
    if (!new RegExp(`"?${color}"?:\\s*"rgb\\(var\\(--${color}\\)`).test(tw)) errors.push("TAILWIND_TOKEN_UNMAPPED");
  }
  for (const [name, token] of [["card", "shadow-rest"], ["lift", "shadow-raised"], ["overlay", "shadow-overlay"], ["reward", "shadow-reward"], ["dock", "shadow-dock"], ["current", "shadow-current"]]) {
    if (!new RegExp(`${name}:\\s*"var\\(--${token}\\)"`).test(tw)) errors.push("TAILWIND_TOKEN_UNMAPPED");
  }
  if (!/"4xl":\s*"28px"/.test(tw)) errors.push("TAILWIND_TOKEN_UNMAPPED");
  if (/\[data-theme="dark"\]\s+\.shadow-(card|lift)\s*\{/.test(css.replace(/\/\*[\s\S]*?\*\//g, ""))) errors.push("DARK_SHADOW_OVERRIDE_ERASES_RINGS");
  if (!/\.surface-emphasis\s*\{[\s\S]*?box-shadow:\s*var\(--shadow-raised\)/.test(css)) errors.push("SURFACE_ROLE_MISSING");
  if (!/\.surface-reward\s*\{[\s\S]*?box-shadow:\s*var\(--shadow-reward\)/.test(css)) errors.push("SURFACE_ROLE_MISSING");

  // One hero moment per screen; reward surface only for real rewards.
  const tree = src.tree ?? {};
  for (const [rel, text] of Object.entries(tree)) {
    if (!rel.endsWith(".tsx")) continue;
    const code = stripComments(text);
    if (count(code, /\bsurface-emphasis\b/g) > 1) errors.push("EMPHASIS_OVERUSED");
    if (/\bsurface-reward\b/.test(code) && !/components\/chests\/|features\/qa\//.test(rel)) errors.push("REWARD_SURFACE_MISUSED");
  }

  // Ratchets over the whole app.
  let radius = 0;
  let shadows = 0;
  for (const [rel, text] of Object.entries(tree)) {
    if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) continue;
    const code = stripComments(text);
    radius += count(code, /rounded(?:-[trbl]{1,2})?-\[\d+px\]/g);
    shadows += count(code, /(?<![a-z-])shadow-\[/g);
    // Theme colours in class strings (SVG art palettes may keep their hexes).
    if (/(?:bg|text|border|ring|from|via|to|fill|stroke|shadow)-\[#(?:B7791F|B42318)/i.test(code)) errors.push("HEX_TOKEN_BYPASS");
    if (/\bbg-ink\/\d+/.test(code)) errors.push("SCRIM_INK");
    if (/text-ink-mute\b|text-danger\b|text-bad\b|var\(--line\)|var\(--danger\)/.test(code)) errors.push("UNDEFINED_TOKEN");
    if (/focus-visible:ring-accent\/\d+/.test(code)) errors.push("FOCUS_RING_WEAK");
  }
  if (radius > RADIUS_BASELINE) errors.push("RADIUS_RATCHET");
  if (shadows > SHADOW_BASELINE) errors.push("SHADOW_RATCHET");

  // Card className wins over the variant per family — executed.
  const merge = cardMergeModule(src.primitives ?? "");
  if (!merge?.mergeCardClasses) errors.push("CARD_OVERRIDE_LOST");
  else {
    for (const [base, override, must, mustNot] of CARD_MERGE_CASES) {
      const out = merge.mergeCardClasses(base, override).split(/\s+/);
      if (must.some((t) => !out.includes(t) && !override.split(/\s+/).includes(t))) errors.push("CARD_OVERRIDE_LOST");
      if (mustNot.some((t) => out.includes(t))) errors.push("CARD_OVERRIDE_LOST");
    }
  }
  if (!/mergeCardClasses\(variants\[variant\], className\)/.test(src.primitives ?? "")) errors.push("CARD_OVERRIDE_LOST");
  const doc = src.surfaceDoc ?? "";
  for (const heading of ["Surface levels", "Tokens", "Elevation", "Borders", "Radii", "Interactive state matrix", "Do / don't"]) {
    if (!doc.includes(`## ${heading}`)) errors.push("SURFACE_DOC_MISSING");
  }
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 2 · Interactive state consistency                                  */
/* ------------------------------------------------------------------ */

export function buttonModule(primitives) {
  const start = primitives.indexOf("const BUTTON_BASE");
  const end = primitives.indexOf("interface BtnProps");
  const cx = "function cx(...parts){return parts.filter(Boolean).join(' ');}\n";
  if (start < 0 || end < 0) return null;
  try {
    return evalSource(cx + primitives.slice(start, end));
  } catch {
    return null;
  }
}

export function checkInteractiveStateConsistency(src) {
  const errors = [];
  const p = src.primitives ?? "";
  // The cognitive-UI gate pins the primary variant byte-for-byte.
  if (!p.includes('primary:\n    "bg-accent text-white shadow-card hover:bg-accent-strong active:scale-[.98]"')) errors.push("PRIMARY_VARIANT_DRIFT");
  const btn = buttonModule(p);
  if (!btn?.buttonClasses) errors.push("BUTTON_STATE_MATRIX_BROKEN");
  else {
    const on = { good: "text-on-good", danger: "text-on-wrong", premium: "text-on-gold", soft: "text-accent-on-soft" };
    for (const [variant, token] of Object.entries(on)) if (!btn.buttonClasses(variant).includes(token)) errors.push("ON_COLOR_MISSING");
    for (const variant of ["primary", "good", "danger", "premium", "soft"]) {
      const idle = btn.buttonClasses(variant);
      const loading = btn.buttonClasses(variant, "md", undefined, { loading: true });
      if (!idle.includes("disabled:bg-line") || !idle.includes("disabled:text-ink-soft")) errors.push("DISABLED_LOOKS_ACTIVE");
      if (loading.includes("disabled:bg-line") || !loading.includes("cursor-progress")) errors.push("LOADING_LOOKS_DISABLED");
    }
    for (const variant of ["secondary", "outline"]) if (!btn.buttonClasses(variant).includes("disabled:border-line")) errors.push("DISABLED_LOOKS_ACTIVE");
    if (!btn.buttonClasses("primary").includes("focus-visible:ring-focus-ring")) errors.push("FOCUS_RING_WEAK");
    for (const size of ["sm", "md", "lg", "icon"]) if (!/min-h-1[12]|h-11/.test(btn.buttonClasses("primary", size))) errors.push("TOUCH_TARGET_SMALL");
  }
  if (!/disabled=\{disabled \|\| loading\}/.test(p) || !/aria-busy=\{loading/.test(p)) errors.push("LOADING_NOT_INERT");
  // Verificar before a verdict is primary, never the verdict's green.
  for (const key of ["steps", "hanziBuilder", "pieceAssembly"]) {
    if (/canCheck \? "good"/.test(stripComments(src[key]))) errors.push("CHECK_GREEN_BEFORE_VERDICT");
  }
  // Verdicts are never colour alone.
  if (!/export function TileVerdictMark/.test(src.verdictMark ?? "") || !/IconCheck/.test(src.verdictMark ?? "") || !/IconX/.test(src.verdictMark ?? "")) errors.push("VERDICT_COLOUR_ONLY");
  for (const key of ["steps", "conversation"]) if (!/<TileVerdictMark\b/.test(stripComments(src[key]))) errors.push("VERDICT_COLOUR_ONLY");
  // Switch OFF track is visible; locked nodes still answer a tap.
  if (!/bg-ink-faint\/55 ring-1 ring-inset ring-ink-faint\/40/.test(src.guidanceSettings ?? "")) errors.push("SWITCH_OFF_INVISIBLE");
  if (!/onClick=\{disabled && !isLocked \? undefined : onSelect\}/.test(src.nodeBubble ?? "")) errors.push("LOCKED_TAP_SWALLOWED");
  if (!/shadow-current/.test(src.nodeBubble ?? "")) errors.push("CURRENT_STATE_UNMARKED");
  // Async submits keep their colour and show progress.
  if (!/<Button type="submit" size="lg" loading=\{loading\}/.test(src.loginForm ?? "")) errors.push("LOADING_LOOKS_DISABLED");
  if (!/loading=\{busy\}/.test(src.dangerZone ?? "")) errors.push("LOADING_LOOKS_DISABLED");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 3 · Resilient UI states                                            */
/* ------------------------------------------------------------------ */

export function economyPendingModule(source, { online = true } = {}) {
  try {
    return evalSource(source, { requires: { "./platform/networkStatus": { readOnline: () => online } } });
  } catch {
    return null;
  }
}

/** [result, online, expectedPending] */
const PENDING_CASES = [
  [{ ok: false, error: "TypeError: Failed to fetch" }, true, true],
  [{ ok: false, error: "Load failed" }, true, true],
  [{ ok: false, error: "rpc_failed", retry_pending: true }, true, true],
  [{ ok: false, error: "attestation_required" }, true, false],
  [{ ok: false, error: "attestation_required" }, false, true],
  [{ ok: true }, false, false],
  [{ ok: false, already_applied: true }, true, false],
];

const CATALOG = { "errors.unknown": "UNKNOWN", "errors.backendUnavailable": "BACKEND" };
export function errorsModule(source) {
  try {
    return evalSource(source, {
      requires: {
        "../../supabase/functions/_shared/accountDeletion": { ACCOUNT_DELETION_CONFIRMATION_TEXT: "EXCLUIR CONTA" },
        "../lib/auth/localAuthPolicy": { BACKEND_UNAVAILABLE_MESSAGE: "Não foi possível conectar ao Longyu agora." },
        "./catalog": { t: (key) => CATALOG[key] ?? key },
      },
    });
  } catch {
    return null;
  }
}

/** [raw, expected] — expected "RAW" means the text must pass through. */
const LOCALIZE_CASES = [
  ["JWT expired", "UNKNOWN"],
  ["AuthApiError: invalid claim", "UNKNOWN"],
  ["permission denied for function get_league_standings", "UNKNOWN"],
  ["already_claimed", "UNKNOWN"],
  ["Load failed", "BACKEND"],
  ["NetworkError when attempting to fetch resource.", "BACKEND"],
  ["Missão concluída!", "RAW"],
  ["+35 Qi resgatados!", "RAW"],
];

export function checkResilientUiStates(src) {
  const errors = [];
  const gate = stripComments(src.requireCloud);
  if (!/previous && canEnterJourney\(previous\) \? previous : null/.test(gate)) errors.push("AUTH_GATE_BLANK_FLASH");
  if (!/data-testid="auth-gate"[\s\S]{0,40}<PageFallback \/>/.test(gate) || /aria-hidden="true" \/>/.test(gate)) errors.push("AUTH_GATE_BLANK_FLASH");
  if (!/subscribeNetworkStatus\(/.test(gate) || !/online && !wasOnline/.test(gate)) errors.push("OFFLINE_AUDIENCE_NEVER_RECHECKED");
  const aud = stripComments(src.sessionAudience);
  if (!/if \(!readOnline\(\)\) \{\s*if \(lastKnownCloudReady\(useStore\.getState\(\)\)\) return "cloud_ready";\s*\} else \{\s*forgetCloudReady\(\);/.test(aud)) errors.push("OFFLINE_COLD_START_LOGOUT");
  if (!/rememberCloudReady\(useStore\.getState\(\)\.currentAccountId\);\s*return "cloud_ready";/.test(aud)) errors.push("OFFLINE_COLD_START_LOGOUT");
  if (!/account\.authMode !== "cloud" \|\| !state\.accountSetupComplete/.test(aud)) errors.push("OFFLINE_FALLBACK_TOO_WIDE");
  if (!/forgetCloudReady\(\);\s*endCloudSession\(\);/.test(src.signOutHook ?? "")) errors.push("OFFLINE_FALLBACK_SURVIVES_SIGN_OUT");

  // Economy: network failures are pending, server answers keep their message — executed.
  for (const [result, online, expected] of PENDING_CASES) {
    const mod = economyPendingModule(src.economyPending ?? "", { online });
    if (!mod?.isPendingNetworkFailure || mod.isPendingNetworkFailure(result) !== expected) errors.push("OFFLINE_FAILURE_AS_REJECTION");
    else if (mod.economyFailureMessage(result, "SERVER") !== (expected ? mod.ECONOMY_PENDING_OFFLINE_MESSAGE : "SERVER")) errors.push("OFFLINE_FAILURE_AS_REJECTION");
  }
  const store = stripComments(src.store);
  if (count(store, /setEconomySyncMessage\(\s*economyFailureMessage\(/g) < 5) errors.push("OFFLINE_FAILURE_AS_REJECTION");
  if (/Conclua a lição de verdade/.test(store)) errors.push("ACCUSATORY_COPY");

  // Error text never reaches the learner raw — executed.
  const errMod = errorsModule(src.errors ?? "");
  if (!errMod?.localizeUserMessage) errors.push("RAW_BACKEND_TEXT");
  else {
    for (const [raw, expected] of LOCALIZE_CASES) {
      const out = errMod.localizeUserMessage(raw);
      if (out !== (expected === "RAW" ? raw : expected)) errors.push("RAW_BACKEND_TEXT");
    }
  }
  const ligas = stripComments(src.ligas);
  if (/demoMessage \?\? "Tente novamente\."/.test(ligas) || !/Verifique a conexão e tente de novo\./.test(ligas)) errors.push("RAW_BACKEND_TEXT");
  if (/bannerKind === "syncing"\) && \(\s*<div className="[^"]*border-wrong/.test(ligas) || !/data-testid="league-syncing-banner"/.test(ligas)) errors.push("LOADING_AS_ERROR");
  if (!/if \(claiming \|\| !lastWeek\?\.week_key/.test(ligas) || !/loading=\{claiming\}/.test(ligas)) errors.push("CLAIM_DOUBLE_SUBMIT");
  if (!/leagueClaimCopy\(result\)/.test(ligas)) errors.push("RAW_BACKEND_TEXT");

  // Sync truth.
  const conta = stripComments(src.conta);
  if (!/withSyncTruth\(statusFor\(authMode, t\), authMode, cloudSyncState\.status, online, t\)/.test(conta)) errors.push("CLOUD_SAVED_CLAIM_UNSYNCED");
  if (!/if \(!online\) return \{ \.\.\.base, tone: "muted"/.test(conta)) errors.push("CLOUD_SAVED_CLAIM_UNSYNCED");
  if (/window\.prompt\(/.test(conta)) errors.push("NATIVE_PROMPT");
  const chip = stripComments(src.syncChip);
  if (!/!online && state !== "synced"/.test(chip) || !/shell\.syncStatusOffline/.test(chip)) errors.push("SYNC_CHIP_LIES_OFFLINE");
  for (const boot of [src.cloudSyncBoot, src.economyBoot]) {
    if (!/subscribeNetworkStatus\(\(online\) => \{\s*if \(online && !wasOnline\)/.test(stripComments(boot))) errors.push("NO_ONLINE_FLUSH");
  }
  if (/addEventListener\("online"/.test(stripComments(src.economyBoot))) errors.push("NO_ONLINE_FLUSH");
  if (!/localizeUserMessage\(message\)/.test(src.syncBanner ?? "")) errors.push("SYNC_TEXT_NOT_LOCALIZED");

  // Offline in a lesson is one line, not a block on every step.
  const player = stripComments(src.lessonPlayer);
  if (!/data-lesson-offline=""/.test(player) || /mb-3 rounded-2xl border border-line bg-surface-2 px-3 py-2\.5 text-sm text-ink-soft sm:px-4">\s*<span className="font-semibold text-ink">\{t\("player\.offline"\)\}/.test(player)) errors.push("OFFLINE_BANNER_BLOCKS_EXERCISE");
  // A failed chunk is retried by a reload; offline the card says so.
  const boundary = stripComments(src.errorBoundary);
  if (!/if \(error && isStaleBundleError\(error\)\) \{[\s\S]{0,200}window\.location\.reload\(\)/.test(boundary) || !/errors\.offlineRetry/.test(boundary)) errors.push("RETRY_NOOP_ON_CHUNK");
  // Loading never flashes.
  if (!/loading-delayed-reveal/.test(src.pageFallback ?? "") || !/role="status"/.test(src.pageFallback ?? "")) errors.push("LOADING_FLASH");
  if (!/\.loading-delayed-reveal \{\s*animation: loading-delayed-reveal 200ms ease-out 320ms backwards;/.test(src.css ?? "")) errors.push("LOADING_FLASH");
  if (!/@media \(prefers-reduced-motion: reduce\) \{\s*\.loading-delayed-reveal,\s*\.animate-pulse,\s*\.animate-ping \{\s*animation: none;/.test(src.css ?? "")) errors.push("UNBUDGETED_PULSE");
  if (/animate-pulse/.test(stripComments(src.hanziBuilder)) || /ring-offset-2 animate-pulse/.test(src.conversation ?? "")) errors.push("UNBUDGETED_PULSE");
  // The update banner waits for the lesson to end.
  if (!/if \(!needRefresh \|\| lessonOpen\) return null;/.test(src.pwaBanner ?? "") || !/attributeFilter: \["data-lesson-player"\]/.test(src.pwaBanner ?? "")) errors.push("PWA_BANNER_OVER_LESSON");
  // Errors and empties are never dead ends.
  if (!/onRetry\?: \(\) => void;/.test(src.primitives ?? "") || !/data-testid="error-state-retry"/.test(src.primitives ?? "")) errors.push("ERROR_DEAD_END");
  if (!/onRetry=\{\(\) => void load\(\)\}/.test(src.family ?? "")) errors.push("ERROR_DEAD_END");
  if (!/to="\/jornada" data-testid="review-empty-journey"/.test(src.revisao ?? "")) errors.push("EMPTY_STATE_DEAD_END");
  // No visible PT loading line that shifts the options.
  if (/Carregando imagens/.test(src.imageGrid ?? "") || !/className="sr-only" role="status"/.test(src.imageGrid ?? "")) errors.push("LOADING_LAYOUT_SHIFT");
  const doc = src.stateDoc ?? "";
  for (const heading of ["Loading", "Empty", "Error", "Offline", "Sync truth", "Rules"]) if (!doc.includes(`## ${heading}`)) errors.push("STATE_DOC_MISSING");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 4 · Reward UX contract                                             */
/* ------------------------------------------------------------------ */

function findAll(node, predicate, out = []) {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const child of node) findAll(child, predicate, out);
    return out;
  }
  if (node.props) {
    if (predicate(node)) out.push(node);
    findAll(node.props.children, predicate, out);
  }
  return out;
}

const textOf = (node) => {
  if (node == null || node === false) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  return textOf(node.props?.children);
};

/**
 * Run ChestOpeningRitual for real (hooks executed, timers captured): a double
 * tap claims once, reduced motion reveals at once with no timer, unmount
 * clears the timer, and an empty claim shows the honest "unavailable" state.
 */
export function runChestRitual(source, { reduced = false, claimResult = [{ kind: "qi", amount: 35, label: "Qi" }], taps = 2 } = {}) {
  const rt = makeHookRuntime();
  const timers = new Map();
  let nextTimer = 1;
  const fakeWindow = {
    setTimeout: (fn, ms) => {
      const id = nextTimer++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  let claims = 0;
  let closed = 0;
  const sounds = [];
  const stub = (name) => Object.assign((props) => ({ type: name, props }), { displayName: name });
  const requires = {
    react: rt.React,
    "../../lib/haptics": { haptic: () => {} },
    "../../lib/store": { useStore: (sel) => sel({ soundEffects: true }) },
    "../../lib/soundFx": { chestOpenSound: () => "chestOpen", playSoundFx: (s) => sounds.push(s) },
    "../ui/primitives": { Button: stub("Button"), Pill: stub("Pill") },
    "../ui/Icon": { IconX: stub("IconX") },
    "../ui/ModalOverlay": { ModalOverlay: stub("ModalOverlay") },
    "./chestMeta": {
      chestRewardName: (kind) => kind.toUpperCase(),
      localizedChestVisual: () => ({ name: "Chest", rarity: "Rare", tagline: "t", contains: "c" }),
    },
    "./LongyuChest": { LongyuChest: stub("LongyuChest") },
    "./RewardReveal": { RewardReveal: stub("RewardReveal") },
    "../../i18n/useTranslation": { useTranslation: () => ({ t: (k) => k }) },
    "../../lib/motion/livingUiMotion": { CHEST_REVEAL_MS: 680, prefersReducedMotion: () => reduced },
  };
  let mod;
  try {
    mod = evalSource(source, { jsx: true, requires, globals: { window: fakeWindow, React: rt.React } });
  } catch (error) {
    return { error: String(error.message ?? error) };
  }
  const props = {
    type: "dragon",
    title: "Chest",
    claim: () => {
      claims += 1;
      return claimResult;
    },
    onClose: () => {
      closed += 1;
    },
  };
  const tree0 = rt.render(mod.ChestOpeningRitual, props);
  const button = findAll(tree0, (n) => n.props?.["data-testid"] === "chest-ritual-chest")[0];
  if (!button?.props?.onClick) return { error: "no chest button" };
  for (let i = 0; i < taps; i += 1) button.props.onClick();
  const tree1 = rt.render(mod.ChestOpeningRitual, props);
  const phase1 = findAll(tree1, (n) => n.props?.["data-chest-ritual"])[0]?.props?.["data-chest-ritual"];
  const pendingTimers = timers.size;
  const revealMs = [...timers.values()][0]?.ms ?? null;
  for (const [id, t] of [...timers]) {
    timers.delete(id);
    t.fn();
  }
  const tree2 = rt.render(mod.ChestOpeningRitual, props);
  const phase2 = findAll(tree2, (n) => n.props?.["data-chest-ritual"])[0]?.props?.["data-chest-ritual"];
  const status = findAll(tree2, (n) => n.props?.role === "status")[0];
  const cont = findAll(tree2, (n) => n.props?.["data-testid"] === "chest-ritual-continue")[0];
  const modal = findAll(tree2, (n) => n.type?.displayName === "ModalOverlay" || n.type === requires["../ui/ModalOverlay"].ModalOverlay)[0];
  const claimsBeforeRemount = claims;
  // Fresh mount, open, unmount mid-ritual: the timer must be cleared.
  const rt2 = makeHookRuntime();
  timers.clear();
  const requires2 = { ...requires, react: rt2.React };
  const mod2 = evalSource(source, { jsx: true, requires: requires2, globals: { window: fakeWindow, React: rt2.React } });
  const t0 = rt2.render(mod2.ChestOpeningRitual, props);
  findAll(t0, (n) => n.props?.["data-testid"] === "chest-ritual-chest")[0]?.props?.onClick?.();
  rt2.render(mod2.ChestOpeningRitual, props);
  const beforeUnmount = timers.size;
  rt2.unmount();
  return {
    claims: claimsBeforeRemount,
    closed,
    phase1,
    phase2,
    pendingTimers,
    revealMs,
    statusText: textOf(status),
    continueLabel: textOf(cont),
    labelledBy: modal?.props?.labelledBy ?? null,
    leakedTimers: timers.size,
    timersBeforeUnmount: beforeUnmount,
    sounds,
  };
}

/** Run useTransientMessage: a second message restarts the clock; unmount clears it. */
export function runTransientHook(source) {
  const rt = makeHookRuntime();
  const timers = new Map();
  let next = 1;
  const fakeWindow = {
    setTimeout: (fn, ms) => {
      const id = next++;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
  };
  let mod;
  try {
    mod = evalSource(source, { requires: { react: rt.React }, globals: { window: fakeWindow } });
  } catch (error) {
    return { error: String(error) };
  }
  let api = null;
  const Host = () => {
    api = mod.useTransientMessage(1000);
    return null;
  };
  rt.render(Host);
  api[1]("first");
  rt.render(Host);
  api[1]("second");
  rt.render(Host);
  const active = timers.size;
  const shown = api[0];
  rt.unmount();
  return { active, shown, afterUnmount: timers.size };
}

export function lessonQiModule(source, economy) {
  const consts = {};
  // QA22 — graduated first-completion Qi (1★/2★) joins the three 3★ constants.
  for (const name of ["LESSON_ONE_STAR_QI", "LESSON_TWO_STAR_QI", "LESSON_THREE_STAR_QI", "LESSON_NO_SKIP_QI", "PRO_LESSON_QI_BONUS"]) {
    const m = economy.match(new RegExp(`export const ${name} = (\\d+);`));
    consts[name] = m ? Number(m[1]) : NaN;
  }
  try {
    return { mod: evalSource(source, { requires: { "../data/economy": consts } }), consts };
  } catch {
    return { mod: null, consts };
  }
}

/**
 * The store's own grant formula, lifted out of grantLessonReward and executed.
 * QA22 — `graduated` is the store's `lessonQiGraduated()`, passed in.
 */
export function storeLessonQi(store, consts) {
  const m = store.match(/grantLessonReward: \(\{ lessonId, attemptId, stars, noSkip \}\) => \{[\s\S]{0,600}?const qiAmount =\s*([\s\S]*?);\n/);
  if (!m) return null;
  const expr = m[1].replace(/hasProAccess\(state\)/g, "pro").replace(/lessonQiGraduated\(\)/g, "graduated");
  try {
    // eslint-disable-next-line no-new-func
    return new Function("stars", "noSkip", "pro", "graduated", ...Object.keys(consts), `return (${expr});`);
  } catch {
    return null;
  }
}

export function checkRewardUxContract(src) {
  const errors = [];
  const ritual = src.ritual ?? "";
  const run = runChestRitual(ritual);
  if (run.error) errors.push("RITUAL_NOT_EXECUTABLE");
  else {
    if (run.claims !== 1) errors.push("CLAIM_NOT_IDEMPOTENT");
    if (run.phase1 !== "opening" || run.revealMs == null || run.revealMs < 500 || run.revealMs > 900) errors.push("RITUAL_NOT_SEQUENCED");
    if (run.phase2 !== "revealed") errors.push("REVEAL_NEVER_HAPPENS");
    if (!/player\.chestYouReceived: \+35 QI/.test(run.statusText)) errors.push("REVEAL_SILENT");
    if (run.continueLabel !== "player.chestContinue") errors.push("CTA_COPY_LIES");
    if (!run.labelledBy) errors.push("REVEAL_SILENT");
    if (run.timersBeforeUnmount < 1 || run.leakedTimers !== 0) errors.push("REVEAL_TIMER_LEAK");
  }
  const reduced = runChestRitual(ritual, { reduced: true, taps: 1 });
  if (!reduced.error && (reduced.phase1 !== "revealed" || reduced.pendingTimers !== 0)) errors.push("REDUCED_MOTION_WAITS");
  const empty = runChestRitual(ritual, { claimResult: null, taps: 1 });
  if (!empty.error && (empty.phase1 !== "unavailable" || empty.closed !== 0)) errors.push("SILENT_UNAVAILABLE");
  // One ritual for every chest.
  if (!/<ChestOpeningRitual\b/.test(src.chestModal ?? "") || !/<ChestOpeningRitual\b/.test(src.journeyPage ?? "")) errors.push("RITUAL_DUPLICATED");
  if (/longyu-chest-shake|revealTimer|CHEST_REVEAL_MS/.test(stripComments(src.journeyPage)) || /revealTimer/.test(src.chestModal ?? "")) errors.push("RITUAL_DUPLICATED");
  if (!/relative isolate rounded-2xl/.test(ritual)) errors.push("AURA_ESCAPES_CHEST");
  if (!/pt-\[calc\(var\(--app-safe-top\)\+1\.5rem\)\]/.test(ritual)) errors.push("REWARD_UNDER_STATUS_BAR");
  // CSS: one-shot, sequenced, resting poses.
  const css = src.css ?? "";
  const rule = (name) => (css.match(new RegExp(`\\.${name} \\{([\\s\\S]*?)\\n\\}`)) ?? [])[1] ?? "";
  const timing = (name) => {
    const m = rule(name).match(/animation: [a-z-]+ (\d+)ms [^;]*?(?: (\d+)ms)? both;/);
    return m ? Number(m[1]) + Number(m[2] ?? 0) : null;
  };
  const press = timing("longyu-chest-press");
  const lid = timing("longyu-chest-lid");
  const aura = timing("longyu-chest-aura");
  const sparkMs = Number((rule("longyu-chest-spark").match(/animation: longyu-chest-spark (\d+)ms/) ?? [])[1] ?? NaN);
  const delays = [...(src.chest ?? "").matchAll(/delay: (\d+) \}/g)].map((m) => Number(m[1]));
  const sparks = delays.length ? Math.max(...delays) + sparkMs : NaN;
  const total = Math.max(press ?? Infinity, lid ?? Infinity, aura ?? Infinity, sparks);
  if (![press, lid, aura].every(Number.isFinite) || !Number.isFinite(sparks) || total > 900 || total < 500) errors.push("RITUAL_TOO_LONG");
  if (!((lid ?? 0) > (press ?? 0) - 120 && (aura ?? 0) >= (lid ?? 0) - 60)) errors.push("RITUAL_NOT_SEQUENCED");
  if (!/transform: translate\(-50%, -50%\);\s*opacity: 0\.35;/.test(rule("longyu-chest-aura"))) errors.push("REST_POSE_BROKEN");
  if (!/opacity: 0;/.test(rule("longyu-chest-spark").split("animation")[0])) errors.push("REST_POSE_BROKEN");
  const glowKeys = (css.match(/@keyframes longyu-chest-glow \{([\s\S]*?)\n\}/) ?? [])[1] ?? "";
  if (/filter/.test(glowKeys) || !/animation: longyu-chest-glow var\(--motion-ambient\)/.test(rule("longyu-chest-glow"))) errors.push("GLOW_REPAINTS");
  if (!/\.longyu-chest-press,/.test(css)) errors.push("REDUCED_MOTION_WAITS");
  if (!/animated=\{state === "unlocked"\}/.test(src.journeyPage ?? "")) errors.push("OPENED_CHEST_REPLAYS");
  if (!/aria-disabled=\{opened \|\| undefined\}/.test(src.journeyPage ?? "")) errors.push("CHEST_STATE_UNANNOUNCED");
  // Honest summary: catalog names, distinct icons, copy that matches the roll.
  if (!/chestRewardName\(reward\.kind, reward\.amount\)/.test(src.rewardReveal ?? "") || /\{reward\.label\}/.test(src.rewardReveal ?? "")) errors.push("REWARD_LABEL_PT_ONLY");
  const iconMap = (src.chestMeta ?? "").match(/CHEST_REWARD_ICON[^=]*= \{([\s\S]*?)\};/);
  const icons = iconMap ? [...iconMap[1].matchAll(/:\s*(Icon\w+)/g)].map((m) => m[1]) : [];
  if (icons.length < 6 || new Set(icons).size !== icons.length) errors.push("REWARD_ICON_CLASH");
  const glyphs = [...(src.chestMeta ?? "").matchAll(/glyph: "(.)"/g)].map((m) => m[1]);
  if (glyphs.length !== 4 || new Set(glyphs).size !== 4) errors.push("CHEST_GLYPH_DUPLICATE");
  for (const [locale, text] of [["pt", src.ptBR], ["en", src.en]]) {
    for (const key of ["chestRewardNameQi", "chestRewardNameShield", "chestRewardNameBreath", "chestContinue", "chestUnavailableBody"]) {
      if (!new RegExp(`${key}: "`).test(text ?? "")) errors.push("REWARD_COPY_MISSING");
    }
    const legendary = ((text ?? "").match(/chestLegendaryContains: "([^"]+)"/) ?? [])[1] ?? "";
    if (/\bXP\b/.test(legendary)) errors.push("CHEST_COPY_MISMATCH");
    const small = ((text ?? "").match(/chestSmallContains: "([^"]+)"/) ?? [])[1] ?? "";
    if (!/escudo|shield/i.test(small)) errors.push("CHEST_COPY_MISMATCH");
    if (locale === "pt" && /claimRewards: "Receber recompensas"/.test(text) && /t\("player\.claimRewards"\)/.test(ritual)) errors.push("CTA_COPY_LIES");
  }
  // Victory never promises Qi the store will not pay — executed against the store formula.
  const { mod: qi, consts } = lessonQiModule(src.lessonQi ?? "", src.economy ?? "");
  const storeFn = storeLessonQi(src.store ?? "", consts);
  if (!qi?.lessonCompletionQi || !storeFn) errors.push("VICTORY_QI_UNTRUE");
  else {
    for (const stars of [0, 1, 2, 3]) {
      for (const noSkip of [false, true]) {
        for (const pro of [false, true]) {
          for (const graduated of [false, true]) {
            const shown = qi.lessonCompletionQi({ stars, noSkip, pro, graduated });
            const paid = storeFn(stars, noSkip, pro, graduated, ...Object.values(consts));
            if (!Number.isFinite(shown) || shown !== paid) errors.push("VICTORY_QI_UNTRUE");
          }
        }
      }
    }
  }
  if (count(stripComments(src.lessonPlayer), /lessonCompletionQi\(/g) < 2) errors.push("VICTORY_QI_UNTRUE");
  if (!/claimedHereRef\.current\.ids\.add\(reward\.id\)/.test(src.lessonPlayer ?? "") || !/qi: offeredRewards\.find/.test(src.lessonPlayer ?? "")) errors.push("QI_CHIP_VANISHES");
  if (!/state=\{canOpenMonthlyChest \? "unlocked" : "opened"\}/.test(src.missoes ?? "")) errors.push("CLAIMED_CHEST_LOCKED");
  // Claim toasts: announced, one timer at a time — executed.
  const hook = runTransientHook(src.transientHook ?? "");
  if (hook.error || hook.active !== 1 || hook.shown !== "second" || hook.afterUnmount !== 0) errors.push("TOAST_TIMER_RACE");
  for (const key of ["missoes", "loja"]) {
    const page = stripComments(src[key]);
    if (!/useTransientMessage\(/.test(page) || /window\.setTimeout\(\(\) => setBurst/.test(page)) errors.push("TOAST_TIMER_RACE");
    if (!/role="status"\s*aria-live="polite"/.test(page)) errors.push("TOAST_SILENT");
  }
  const doc = src.rewardDoc ?? "";
  for (const heading of ["Claim before ritual", "Ritual", "Reduced motion", "Honest summary", "Escalated to the economy owner"]) if (!doc.includes(`## ${heading}`)) errors.push("REWARD_DOC_MISSING");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 5 · Guide UX contract                                              */
/* ------------------------------------------------------------------ */

/** Run TeacherSpeechBubble: a parent re-render with fresh inline callbacks must not restart the line. */
export function runTeacherBubble(source) {
  const rt = makeHookRuntime();
  const timers = new Map();
  let next = 1;
  const fakeWindow = {
    setTimeout: (fn) => {
      const id = next++;
      timers.set(id, { fn, kind: "timeout" });
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    setInterval: (fn) => {
      const id = next++;
      timers.set(id, { fn, kind: "interval" });
      return id;
    },
    clearInterval: (id) => timers.delete(id),
  };
  const stub = (name) => Object.assign((props) => ({ type: name, props }), { displayName: name });
  let mod;
  try {
    mod = evalSource(source, {
      jsx: true,
      requires: {
        react: rt.React,
        "../../components/guide/GuideDialogue": { TypingCaret: stub("TypingCaret") },
        "../../components/brand/Mascot": { Mascot: stub("Mascot") },
        "../../lib/guidedPresentation": { GUIDED_DRAGON_SIZE: { default: 56 } },
        "../../lib/guideDialogueMachine": { segmentGraphemes: (s) => Array.from(s) },
        "../../lib/motion/livingUiMotion": { prefersReducedMotion: () => false },
      },
      globals: { window: fakeWindow, React: rt.React },
    });
  } catch (error) {
    return { error: String(error) };
  }
  let ready = 0;
  const props = () => ({ text: "你好 dragon", onReady: () => (ready += 1), onTypingComplete: () => {} });
  const stateOf = (tree) => findAll(tree, (n) => n.props?.["data-bubble-state"])[0]?.props?.["data-bubble-state"];
  rt.render(mod.TeacherSpeechBubble, props());
  for (const [id, t] of [...timers]) if (t.kind === "timeout") {
    timers.delete(id);
    t.fn();
  }
  const typing = stateOf(rt.render(mod.TeacherSpeechBubble, props()));
  // Parent re-render with new arrows mid-typing.
  const afterRerender = stateOf(rt.render(mod.TeacherSpeechBubble, props()));
  for (let i = 0; i < 40; i += 1) {
    for (const [, t] of [...timers]) if (t.kind === "interval") t.fn();
    rt.render(mod.TeacherSpeechBubble, props());
  }
  const finalState = stateOf(rt.render(mod.TeacherSpeechBubble, props()));
  const settled = ready;
  stateOf(rt.render(mod.TeacherSpeechBubble, props()));
  return { typing, afterRerender, finalState, ready: settled, readyAfter: ready };
}

export function checkGuideUxContract(src) {
  const errors = [];
  const bubble = runTeacherBubble(src.teacherBubble ?? "");
  if (bubble.error || bubble.typing !== "TYPING" || bubble.afterRerender !== "TYPING" || bubble.finalState !== "READY" || bubble.ready !== 1 || bubble.readyAfter !== 1) {
    errors.push("GUIDE_DOUBLE_TYPING");
  }
  if (/\}, \[text, reduced, onReady, onTypingComplete\]\)/.test(src.teacherBubble ?? "")) errors.push("GUIDE_DOUBLE_TYPING");
  if (!/segmentGraphemes\(full\)/.test(src.teacherBubble ?? "")) errors.push("GRAPHEME_SPLIT");
  if (!/\[data-guidance-surface\]:not\(\[data-guidance-surface="inline"\]\)/.test(src.backNav ?? "")) errors.push("BACK_SWALLOWED_BY_INLINE_TIP");
  const jg = stripComments(src.journeyGuide);
  if (!/readSeen\(accountId\)\.has\(id\)/.test(jg) || !/if \(dismissed\) markSeen\(accountId, id\);/.test(jg)) errors.push("GUIDE_REPLAYS_EVERY_VISIT");
  if (!/actionVariant="outline"/.test(jg) || !/variant=\{actionVariant\}/.test(src.guideDialogue ?? "")) errors.push("GUIDE_OUTRANKS_CTA");
  if (!/whenSeen="static"/.test(src.cultureGate ?? "") || /inline-flex h-10 items-center/.test(src.cultureGate ?? "")) errors.push("GUIDE_OUTRANKS_CTA");
  if (!/if \(audioOwnerState\(\) !== "IDLE"\) return;/.test(src.soundFx ?? "")) errors.push("BLIP_OVER_MANDARIN");
  if (!/onBackdropClick=\{\(\) => markRevealed\(seal\.id\)\}/.test(src.sealReveal ?? "")) errors.push("SEAL_BACK_DEAD");
  if (!/if \(isModalOpen\(\)\) return;\s*event\.preventDefault\(\);/.test(src.guidanceHost ?? "")) errors.push("COACHMARK_UNDER_MODAL_DISMISSED");
  if (!/new ResizeObserver\(\(\) => place\(\)\)/.test(src.guidanceHost ?? "")) errors.push("COACHMARK_DRIFT");
  if (!/useState\(\(\) => !readCultureFirstGuideSeen\(\)\)/.test(src.cultureJourney ?? "")) errors.push("GUIDE_LAYOUT_JUMP");
  if (!/alt=\{decorative \? "" : t\("common\.mascotAlt"\)\}/.test(src.mascot ?? "") || /alt="Mascote Longyu"/.test(src.mascot ?? "")) errors.push("MASCOT_ALT_NOISE");
  for (const key of ["guideDialogue", "teacherBubble"]) if (!/\bdecorative\b/.test(src[key] ?? "")) errors.push("MASCOT_ALT_NOISE");
  for (const key of ["guideMachine", "teacherBubble", "victory"]) {
    if (/matchMedia\("\(prefers-reduced-motion: reduce\)"\)/.test(src[key] ?? "")) errors.push("REDUCED_MOTION_FORKED");
  }
  if (!/<TypingCaret \/>/.test(src.teacherBubble ?? "") || /animate-pulse/.test(stripComments(src.teacherBubble))) errors.push("UNBUDGETED_CARET");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 6 · Mobile ergonomics                                              */
/* ------------------------------------------------------------------ */

export function checkMobileErgonomics(src) {
  const errors = [];
  const css = src.css ?? "";
  if (!/html\[data-native-keyboard="open"\] \[data-app-bottom-nav\] \{\s*display: none;/.test(css)) errors.push("TABBAR_OVER_KEYBOARD");
  if (!/html\[data-native-keyboard="open"\] \{\s*--app-bottom-nav-height: var\(--app-safe-bottom\);/.test(css)) errors.push("TABBAR_OVER_KEYBOARD");
  if (!/@media \(pointer: coarse\) \{\s*input:not\(\[type="checkbox"\]\)[\s\S]{0,120}font-size: max\(16px, 1em\);/.test(css)) errors.push("INPUT_ZOOM_ON_FOCUS");
  if (/maximum-scale|user-scalable=no/.test(src.indexHtml ?? "")) errors.push("INPUT_ZOOM_ON_FOCUS");
  if (!/:where\(\[aria-modal="true"\]:not\(\.living-overlay\)\)/.test(css)) errors.push("SAFE_AREA_OVERRIDES_PANEL");
  const pw = src.passwordField ?? "";
  if (!/autoCapitalize="none"\s*autoCorrect="off"\s*spellCheck=\{false\}\s*\{\.\.\.inputProps\}/.test(pw)) errors.push("PASSWORD_AUTOCAPITALIZED");
  if (!/className="-my-3 inline-flex min-h-11 items-center px-2 text-xs font-semibold text-accent/.test(src.loginForm ?? "")) errors.push("TOUCH_TARGET_SMALL");
  if (!/h-11 w-11/.test(src.inlineTip ?? "") || /h-7 w-7/.test(src.inlineTip ?? "")) errors.push("TOUCH_TARGET_SMALL");
  if (!/inline-flex min-h-11 shrink-0 items-center rounded-lg px-2/.test(src.pwaBanner ?? "")) errors.push("TOUCH_TARGET_SMALL");
  if (!/min-h-11 items-center justify-center rounded-xl bg-accent/.test(src.cultureGate ?? "")) errors.push("TOUCH_TARGET_SMALL");
  if (count(src.socialAuth, /inline-flex min-h-11 items-center px-1 font-semibold text-accent/g) < 2) errors.push("TOUCH_TARGET_SMALL");
  const social = stripComments(src.socialAuth);
  if (!/subscribeAppLifecycle\(\(state\) => \{/.test(social) || !/window\.addEventListener\("pageshow", onPageShow\)/.test(social)) errors.push("OAUTH_BUTTONS_STUCK");
  if ((src.detectCapacitor ?? findCapacitorAccess)(src.socialAuth ?? "", "SocialAuthButtons.tsx").length) errors.push("CAPACITOR_OUTSIDE_PLATFORM");
  if (!/<SignOutControl testId="topbar-sign-out" variant="pill" \/>/.test(src.topBar ?? "") || /onClick=\{\(\) => void signOut\(\)\}/.test(src.topBar ?? "")) errors.push("SIGN_OUT_WITHOUT_CONFIRM");
  const so = stripComments(src.signOutControl);
  if (!/await signOut\(\);\s*\} finally \{[\s\S]{0,160}onBeforeSignOut\?\.\(\);/.test(so) || /setBusy\(true\);\s*onBeforeSignOut\?\.\(\);/.test(so)) errors.push("SIGN_OUT_SHEET_VANISHES");
  if (!/data-testid=\{`\$\{testId\}-unsynced`\}/.test(src.signOutControl ?? "")) errors.push("SIGN_OUT_HIDES_UNSYNCED");
  if (!/<div className="mt-4">\s*<PasswordField/.test(src.forgotPassword ?? "")) errors.push("EYE_TOGGLE_MISALIGNED");
  const dz = src.dangerZone ?? "";
  if (/role="dialog" aria-modal="false"/.test(dz) || !/event\.key !== "Escape" \|\| busy/.test(dz)) errors.push("BACK_SWALLOWED_BY_CONFIRM");
  if (!/<DeleteAccountConfirm testIdPrefix="conta"/.test(src.conta ?? "")) errors.push("NATIVE_PROMPT");
  // A full-screen sheet inside a space-y page must not inherit the stack margin.
  if (!/"living-overlay fixed inset-0 !m-0 /.test(src.modalOverlay ?? "")) errors.push("MODAL_INHERITS_STACK_MARGIN");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* 7 · UX closure accessibility (+ the R.3.2.4 follow-ups, executed)  */
/* ------------------------------------------------------------------ */

export function topicTransitionModule(source, clock) {
  try {
    return evalSource(source, { globals: { performance: { now: () => clock.now }, Date: { now: () => clock.now } } });
  } catch {
    return null;
  }
}

/** [source, is real Capacitor access] — the detector reads code, never prose. */
export const PLATFORM_PROBES = [
  ["// the shell runs inside Capacitor.\nexport const a = 1;\n", false],
  ["const why = 'Capacitor.isNativePlatform() lives in lib/platform';\n", false],
  ["const tpl = `Capacitor ${1}`;\n", false],
  ["export const C = () => <p>Capacitor apps</p>;\n", false],
  ['import { Capacitor } from "@capacitor/core";\n', true],
  ['const m = await import("@capacitor/app");\n', true],
  ["const native = window.Capacitor;\n", true],
  ['const native = window["Capacitor"];\n', true],
];

export function checkTopicTransition(source) {
  const errors = [];
  const clock = { now: 1000 };
  const mod = topicTransitionModule(source, clock);
  if (!mod?.markTopicTransition || !mod?.consumeTopicTransition) return ["TOPIC_DIRECTION_STALE"];
  const click = (over = {}) => ({ defaultPrevented: false, button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, ...over });
  mod.markTopicTransition("forward", "/cultura/a", click());
  if (mod.consumeTopicTransition("/cultura/a", "k1") !== "forward") errors.push("TOPIC_DIRECTION_LOST");
  if (mod.consumeTopicTransition("/cultura/a", "k1") !== "forward") errors.push("TOPIC_DIRECTION_LOST"); // StrictMode re-read
  if (mod.consumeTopicTransition("/cultura/a", "k2") !== null) errors.push("TOPIC_DIRECTION_STALE");
  mod.markTopicTransition("forward", "/cultura/b", click({ ctrlKey: true }));
  if (mod.consumeTopicTransition("/cultura/b", "k3") !== null) errors.push("TOPIC_DIRECTION_STALE");
  mod.markTopicTransition("back", "/cultura", click());
  clock.now += 3500;
  if (mod.consumeTopicTransition("/cultura", "k4") !== null) errors.push("TOPIC_DIRECTION_STALE");
  mod.markTopicTransition("back", "/cultura", click());
  if (mod.consumeTopicTransition("/cultura/other", "k5") !== null) errors.push("TOPIC_DIRECTION_STALE");
  return uniq(errors);
}

export function checkUxClosureAccessibility(src) {
  const errors = [];
  const ritual = src.ritual ?? "";
  if (!/ref=\{resultHeading\}\s*tabIndex=\{-1\}/.test(ritual) || !/resultHeading\.current\?\.focus\(\{ preventScroll: true \}\)/.test(ritual)) errors.push("REVEAL_FOCUS_LOST");
  if (!/role="alert"/.test(src.loginForm ?? "")) errors.push("AUTH_ERROR_SILENT");
  const tb = src.teacherBubble ?? "";
  if (!/aria-hidden="true">\{shown\}/.test(tb) || !/className="sr-only" aria-live="polite">\{state === "READY" \? text : ""\}/.test(tb) || /aria-live="polite"\s*className="relative min-w-0/.test(tb)) errors.push("SR_CHATTER");
  if (!/aria-label=\{`\$\{chestTitle\} — \$\{opened \?/.test(src.journeyPage ?? "")) errors.push("CHEST_STATE_UNANNOUNCED");
  if (!/state === "problem" \? <span className="sr-only">/.test(src.syncChip ?? "")) errors.push("SYNC_REASSURANCE_HIDDEN");
  if (!/role=\{notice\.ok \? "status" : "alert"\}/.test(src.dangerZone ?? "")) errors.push("DELETE_RESULT_SILENT");
  if (!/aria-expanded=\{open\}/.test(src.inlineTip ?? "")) errors.push("TIP_STATE_UNANNOUNCED");
  // Interface language at sign-in and in reward rows.
  if (/Entrando…|Usar outro método<|Tentar novamente<|authErrorCopyPt\(/.test(stripComments(src.oauthCallback))) errors.push("AUTH_COPY_PT_ONLY");
  if (/"Abrindo…"|authErrorCopyPt\(/.test(stripComments(src.socialAuth))) errors.push("AUTH_COPY_PT_ONLY");
  for (const text of [src.ptBR, src.en]) {
    if (!/oauth: \{[\s\S]*?otherMethod: "/.test(text ?? "")) errors.push("AUTH_COPY_PT_ONLY");
    for (const key of ["economyPendingOffline", "syncTimeout", "offlineRetry", "retry", "mascotAlt", "signOutUnsynced", "syncStatusOffline"]) {
      if (!new RegExp(`${key}: "`).test(text ?? "")) errors.push("CATALOG_KEY_MISSING");
    }
  }
  // R.3.2.4 follow-ups stay closed (executed / pinned).
  errors.push(...checkTopicTransition(src.topicTransition ?? ""));
  if (!/onClick=\{\(event\) => markTopicTransition\("forward", cultureTopicHref\(topic\.id\), event\)\}/.test(src.cultureCard ?? "")) errors.push("TOPIC_DIRECTION_STALE");
  const css = src.css ?? "";
  if (!/\.mascot-eye-blink\[data-ambient\]:not\(\[data-ambient="run"\]\) \{\s*animation: none;/.test(css)) errors.push("MASCOT_EYES_SHUT_AT_REST");
  if (!/@keyframes lyo-edge-draw \{\s*from \{\s*opacity: 0;\s*\}\s*\}/.test(css)) errors.push("EDGE_DRAW_REST_POSE");
  const victory = stripComments(src.victory);
  const fadeAt = victory.indexOf("lesson-victory-in");
  const burstAt = victory.indexOf("<CompletionBurst");
  if (fadeAt < 0 || burstAt < 0 || burstAt > fadeAt) errors.push("VICTORY_BURST_UNDER_FADE");
  // Android boundary: prose never trips it, real access always does — executed.
  const detect = src.detectCapacitor ?? findCapacitorAccess;
  for (const [text, real] of PLATFORM_PROBES) {
    if (detect(text, "probe.tsx").length > 0 !== real) errors.push("PLATFORM_DETECTOR_LEXICAL");
  }
  // QA-only switches, never a production backdoor.
  const qa = src.qaPanel ?? "";
  if (!/Premium UX closure/.test(qa) || !/data-qa-premium-ux=""/.test(qa)) errors.push("QA_SECTION_MISSING");
  if (!/<PremiumUxQaPanel \/>/.test(src.qaPage ?? "")) errors.push("QA_SECTION_MISSING");
  if (/useStore\.setState|setEconomySyncMessage\(|localStorage\.setItem/.test(stripComments(qa))) errors.push("QA_BACKDOOR");
  return uniq(errors);
}

/* ------------------------------------------------------------------ */
/* Release honesty                                                    */
/* ------------------------------------------------------------------ */

export const GATE_SCRIPTS = [
  "validate:premium-surface-system",
  "validate:interactive-state-consistency",
  "validate:resilient-ui-states",
  "validate:reward-ux-contract",
  "validate:guide-ux-contract",
  "validate:mobile-ergonomics",
  "validate:ux-closure-accessibility",
  "validate:rc2-3-13r3-2-5-premium-ux-closure",
  "test:rc2-3-13r3-2-5-premium-ux-closure",
  "gate:rc2-3-13r3-2-5-premium-ux-closure",
];

export const CERT_SECTIONS = [
  "parent", "runtime", "fingerprint", "androidValidatorRepair", "knownFollowups", "surfaces", "resilientStates",
  "rewards", "guide", "accessibility", "crossEngine", "android", "hosted", "artifact", "physical", "entry",
];

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
  for (const step of ["validate:premium-surface-system", "validate:resilient-ui-states", "validate:reward-ux-contract", "test:rc2-3-13r3-2-5-premium-ux-closure"]) {
    if (!new RegExp(`\\n\\s+"${step}",\\n`).test(src.suites ?? "")) errors.push("GATE_NOT_IN_HOSTED_SUITE");
  }
  // Parent: #355 / R.3.2.4, classified, never "green" by assertion.
  const parent = cert.parent ?? {};
  if (parent.pr !== PARENT_PR || parent.wave !== PARENT_WAVE || !/^[0-9a-f]{40}$/.test(parent.headSha ?? "")) errors.push("WRONG_PARENT_PR");
  const parentCert = j(src.parentCert);
  if (parentCert?.wave !== PARENT_WAVE) errors.push("WRONG_PARENT_PR");
  // Runtime identity: advanced, stamped everywhere, fingerprint from the generator.
  const lr = cert.runtime?.learnerRuntimeSha;
  if (!lr || lr === PREVIOUS_LEARNER_RUNTIME_SHA || !/^[0-9a-f]{40}$/.test(lr)) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (rc.learnerRuntimeSha !== lr) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (cert.runtime?.previousLearnerRuntimeSha !== PREVIOUS_LEARNER_RUNTIME_SHA) errors.push("LEARNER_RUNTIME_NOT_ADVANCED");
  if (parentCert?.runtime?.learnerRuntimeSha !== lr) errors.push("PARENT_RUNTIME_PIN_STALE");
  if (!src.liveFingerprint || cert.fingerprint?.value !== src.liveFingerprint || rc.fingerprint !== src.liveFingerprint || cert.fingerprint?.source !== "generator") errors.push("FINGERPRINT_DRIFT");
  // The Android validator was repaired at the root, not by editing the comment.
  const repair = cert.androidValidatorRepair ?? {};
  if (repair.rootCause !== "LEXICAL_MATCH_ON_PROSE" || repair.fix !== "AST_DETECTOR" || !(repair.mutations >= 7) || repair.commentEdited !== false) errors.push("VALIDATOR_REPAIR_DISHONEST");
  // Every R.3.2.4 follow-up closed with root cause, fix and regression.
  const followups = cert.knownFollowups?.items ?? [];
  for (const id of KNOWN_FOLLOWUPS) {
    const row = followups.find((f) => f.id === id);
    if (!row || row.status !== "CLOSED" || !row.rootCause || !row.fix || !row.regression) errors.push("FOLLOWUP_OPEN");
  }
  for (const [section, key] of [["surfaces", "state"], ["resilientStates", "state"], ["rewards", "state"], ["guide", "state"], ["accessibility", "state"]]) {
    if (cert[section]?.[key] !== "CODE_PASS") errors.push("SYSTEM_STATE_DISHONEST");
  }
  if (cert.rewards?.economyChange !== false || !(cert.rewards?.escalated?.length >= 3)) errors.push("ECONOMY_SCOPE_CREEP");
  if (cert.accessibility?.talkBack !== "NOT_RUN" && cert.physical?.status !== "PASS") errors.push("PHYSICAL_PASS_FROM_EMULATOR");
  // Freeze exception + scope.
  if (!new RegExp(`PRE_BETA_FREEZE_EXCEPTION_R325[\\s\\S]*${FREEZE_REASON}`).test(src.freeze ?? "")) errors.push("FREEZE_EXCEPTION_MISSING");
  if (cert.freezeException !== FREEZE_REASON) errors.push("FREEZE_EXCEPTION_MISSING");
  for (const k of ["navigationRedesign", "curriculumExpansion", "pedagogyChange", "masteryChange", "economyChange", "srsChange", "unlockRuleChange", "schemaChange", "jevRuntimeChange", "billingChange"]) {
    if (cert.scope?.[k] !== false) errors.push("SCOPE_CREEP");
  }
  // Cross-engine: classified, no new skips.
  const ce = cert.crossEngine ?? {};
  if (ce.newSkips !== 0) errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  for (const f of ce.failures ?? []) if (!f.classification || !f.fixedIn || !f.test) errors.push("CROSS_ENGINE_FAILURE_HIDDEN");
  const entries = j(src.skipAllowlist)?.entries ?? [];
  if (entries.some((e) => /rc2-3-13r3-2-5/.test(e.file ?? ""))) errors.push("NEW_SKIP_WITHOUT_EVIDENCE");
  const e2e = src.e2eSpec ?? "";
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
  if (!/DO NOT USE/.test(src.handoff ?? "")) errors.push("OWNER_HANDOFF_MISSING");
  for (const h of STALE_APK_SHA256) if (!(src.handoff ?? "").includes(h)) errors.push("HANDOFF_STALE_LIST_INCOMPLETE");
  return uniq(errors);
}

export const checkAll = (src) =>
  uniq([
    ...checkPremiumSurfaceSystem(src),
    ...checkInteractiveStateConsistency(src),
    ...checkResilientUiStates(src),
    ...checkRewardUxContract(src),
    ...checkGuideUxContract(src),
    ...checkMobileErgonomics(src),
    ...checkUxClosureAccessibility(src),
    ...checkRelease(src),
  ]);
