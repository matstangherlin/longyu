#!/usr/bin/env node
/**
 * RC2.3.13R.3.2.5 — Premium surface hierarchy, reward rituals, resilient
 * states & UX closure gate.
 *
 *   node scripts/rc2-3-13r3-2-5-premium-ux-closure.mjs surface|interactive|resilient|reward|guide|mobile|a11y|release|validate
 *   node scripts/rc2-3-13r3-2-5-premium-ux-closure.mjs test      # mutation kills (≥160)
 *
 * Every mutation names the checker it targets; that checker must be clean on
 * the real sources first, so each kill proves the corruption fired the error.
 */
import {
  checkAll,
  checkGuideUxContract,
  checkInteractiveStateConsistency,
  checkMobileErgonomics,
  checkPremiumSurfaceSystem,
  checkRelease,
  checkResilientUiStates,
  checkRewardUxContract,
  checkUxClosureAccessibility,
  loadPremiumUxSources,
  MIN_KILLS,
  PREVIOUS_LEARNER_RUNTIME_SHA,
  STALE_APK_SHA256,
} from "./lib/rc2-3-13r3-2-5-premium-ux-gates.mjs";
import { findCapacitorAccess } from "./lib/android-foundation-gates.mjs";

const MODE = process.argv[2] ?? "validate";
// Skip fixtures assembled at runtime: the convergence scanner hunts real skips.
const SKIP_CALL = ["test", "skip("].join(".");

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

const clone = (src) => ({ ...src, tree: { ...src.tree } });

/** Replace `find` (string or RegExp) in src[key]; a miss is a MISS, never a silent no-op. */
function m(base, key, find, replace) {
  const next = clone(base);
  const text = next[key] ?? "";
  const hit = typeof find === "string" ? text.includes(find) : find.test(text);
  if (!hit) throw new Error(`anchor not found in ${key}: ${String(find).slice(0, 80)}`);
  next[key] = typeof find === "string" ? text.replace(find, replace) : text.replace(find, replace);
  return next;
}

function tree(base, rel, edit) {
  const next = clone(base);
  if (!(rel in next.tree)) throw new Error(`no tree file ${rel}`);
  next.tree[rel] = edit(next.tree[rel]);
  return next;
}

function withJson(base, key, edit) {
  const next = clone(base);
  const obj = JSON.parse(next[key]);
  edit(obj);
  next[key] = JSON.stringify(obj, null, 2);
  return next;
}

const S = checkPremiumSurfaceSystem;
const I = checkInteractiveStateConsistency;
const R = checkResilientUiStates;
const W = checkRewardUxContract;
const G = checkGuideUxContract;
const M = checkMobileErgonomics;
const A = checkUxClosureAccessibility;
const REL = checkRelease;

const DARK_BLOCK = '[data-theme="dark"] {';
/** Edit a token inside the dark block only. */
function darkToken(base, name, value) {
  const next = clone(base);
  const css = next.css;
  const i = css.indexOf(DARK_BLOCK);
  const end = css.indexOf("}", i);
  const block = css.slice(i, end);
  const re = new RegExp(`--${name}:\\s*[^;]+;`);
  if (!re.test(block)) throw new Error(`dark token ${name} not found`);
  next.css = css.slice(0, i) + block.replace(re, value == null ? "" : `--${name}: ${value};`) + css.slice(end);
  return next;
}
function rootToken(base, name, value) {
  const next = clone(base);
  const css = next.css;
  const i = css.indexOf(':root,\n[data-theme="clay"]');
  const end = css.indexOf("}", i);
  const block = css.slice(i, end);
  const re = new RegExp(`--${name}:\\s*[^;]+;`);
  if (!re.test(block)) throw new Error(`root token ${name} not found`);
  next.css = css.slice(0, i) + block.replace(re, value == null ? "" : `--${name}: ${value};`) + css.slice(end);
  return next;
}

const HOME = "src/features/journey/HomeCognitiveBlocks.tsx";
const LOJA = "src/features/loja/LojaPage.tsx";

/** Detector mutants (platform mutations 1–7): each must be caught by the probes. */
const DETECTORS = {
  lexical: (text) => (/\bCapacitor\b|@capacitor\//.test(text) ? [{ kind: "lexical", line: 1 }] : []),
  disabled: () => [],
  importsIgnored: (text, file) => findCapacitorAccess(text, file).filter((a) => !/import|require|dynamic/i.test(a.kind)),
  membersIgnored: (text) => (/from "@capacitor\/|import\("@capacitor\//.test(text) ? [{ kind: "import", line: 1 }] : []),
  elementIgnored: (text, file) => findCapacitorAccess(text.replace(/\["Capacitor"\]/g, ".x"), file),
  commentsCounted: (text, file) => (/\/\/.*Capacitor/.test(text) ? [{ kind: "comment", line: 1 }] : findCapacitorAccess(text, file)),
  templatesCounted: (text, file) => (/`[^`]*Capacitor/.test(text) ? [{ kind: "template", line: 1 }] : findCapacitorAccess(text, file)),
};

const cert = (base, edit) => () => withJson(base, "cert", edit);

function cases(base) {
  return [
    // ── 1 Premium surface system ──────────────────────────────────────
    ["dark scrim token removed", "SURFACE_TOKEN_MISSING", S, () => darkToken(base, "scrim", null)],
    ["clay focus-ring token removed", "SURFACE_TOKEN_MISSING", S, () => rootToken(base, "focus-ring", null)],
    ["dark shadow-dock removed", "SURFACE_TOKEN_MISSING", S, () => darkToken(base, "shadow-dock", null)],
    ["white on dark green again", "CONTRAST_BELOW_AA", S, () => darkToken(base, "on-good", "255 255 255")],
    ["white on dark gold again", "CONTRAST_BELOW_AA", S, () => darkToken(base, "on-gold", "255 255 255")],
    ["dark soft label back to accent", "CONTRAST_BELOW_AA", S, () => darkToken(base, "accent-on-soft", "var(--accent)")],
    ["dark focus ring vanishes", "CONTRAST_BELOW_AA", S, () => darkToken(base, "focus-ring", "40 42 48")],
    ["clay text-faint back to 2.9:1", "CONTRAST_BELOW_AA", S, () => rootToken(base, "text-faint", "152 156 159")],
    ["clay gold-soft too dark for gold text", "CONTRAST_BELOW_AA", S, () => rootToken(base, "gold-soft", "190 150 90")],
    ["dark scrim is a light veil", "SCRIM_LIGHTER_THAN_SURFACE", S, () => darkToken(base, "scrim", "247 243 237")],
    ["focus-ring colour unmapped", "TAILWIND_TOKEN_UNMAPPED", S, () => m(base, "tailwind", '"focus-ring": "rgb(var(--focus-ring) / <alpha-value>)",', "")],
    ["card shadow back to a literal", "TAILWIND_TOKEN_UNMAPPED", S, () => m(base, "tailwind", 'card: "var(--shadow-rest)"', 'card: "0 1px 2px rgb(0 0 0 / 0.03)"')],
    ["4xl radius unmapped", "TAILWIND_TOKEN_UNMAPPED", S, () => m(base, "tailwind", /"4xl":\s*"28px",?/, "")],
    ["dark .shadow-card override back", "DARK_SHADOW_OVERRIDE_ERASES_RINGS", S, () => m(base, "css", "button,\na {", '[data-theme="dark"] .shadow-card { box-shadow: 0 8px 24px rgb(0 0 0 / 0.18); }\n\nbutton,\na {')],
    ["emphasis surface loses its elevation", "SURFACE_ROLE_MISSING", S, () => m(base, "css", "  box-shadow: var(--shadow-raised);\n}\n.surface-reward", "}\n.surface-reward")],
    ["reward surface role removed", "SURFACE_ROLE_MISSING", S, () => m(base, "css", ".surface-reward {", ".surface-prize {")],
    ["two emphasis surfaces on one screen", "EMPHASIS_OVERUSED", S, () => tree(base, HOME, (t) => `${t}\nexport const X = () => <div className="surface-emphasis" />;\nexport const Y = () => <div className="surface-emphasis" />;\n`)],
    ["reward surface on the Home", "REWARD_SURFACE_MISUSED", S, () => tree(base, HOME, (t) => `${t}\nexport const Z = () => <div className="surface-reward" />;\n`)],
    ["arbitrary radius creeps back", "RADIUS_RATCHET", S, () => tree(base, HOME, (t) => `${t}\nexport const R1 = () => <div className="rounded-[22px]" />;\n`)],
    ["arbitrary shadow creeps back", "SHADOW_RATCHET", S, () => tree(base, HOME, (t) => `${t}\nexport const R2 = () => <div className="shadow-[0_-10px_28px_rgb(0_0_0/0.16)]" />;\n`)],
    ["hard-coded gold hex in a class", "HEX_TOKEN_BYPASS", S, () => tree(base, LOJA, (t) => `${t}\nexport const H = () => <p className="text-[#B7791F]" />;\n`)],
    ["ink used as a scrim", "SCRIM_INK", S, () => tree(base, "src/components/ui/ModalOverlay.tsx", (t) => t.replace("bg-scrim/60", "bg-ink/65"))],
    ["undefined text-ink-mute", "UNDEFINED_TOKEN", S, () => tree(base, HOME, (t) => `${t}\nexport const U = () => <p className="text-ink-mute" />;\n`)],
    ["undefined var(--line)", "UNDEFINED_TOKEN", S, () => tree(base, HOME, (t) => `${t}\nexport const V = () => <p style={{ borderColor: "rgb(var(--line))" }} />;\n`)],
    ["weak accent/45 focus ring", "FOCUS_RING_WEAK", S, () => tree(base, HOME, (t) => `${t}\nexport const F = () => <a className="focus-visible:ring-accent/45" />;\n`)],
    ["Card merge keeps the variant", "CARD_OVERRIDE_LOST", S, () => m(base, "primitives", "  if (!override) return base;", "  return base;")],
    ["shadow family not merged", "CARD_OVERRIDE_LOST", S, () => m(base, "primitives", '  ["shadow", /^shadow(?:-|$)/],\n', "")],
    ["border family not merged", "CARD_OVERRIDE_LOST", S, () => m(base, "primitives", /  \["border", \/\^border-[^\n]*\n/, "")],
    ["gradients count as a background colour", "CARD_OVERRIDE_LOST", S, () => m(base, "primitives", "gradient|fixed|", "fixed|")],
    ["Card stops merging", "CARD_OVERRIDE_LOST", S, () => m(base, "primitives", "mergeCardClasses(variants[variant], className)", "cx(variants[variant], className)")],
    ["surface doc loses the state matrix", "SURFACE_DOC_MISSING", S, () => m(base, "surfaceDoc", "## Interactive state matrix", "## States")],

    // ── 2 Interactive state consistency ───────────────────────────────
    ["primary variant drifts", "PRIMARY_VARIANT_DRIFT", I, () => m(base, "primitives", '"bg-accent text-white shadow-card hover:bg-accent-strong active:scale-[.98]"', '"bg-accent text-white shadow-lift hover:bg-accent-strong active:scale-[.98]"')],
    ["white label on good again", "ON_COLOR_MISSING", I, () => m(base, "primitives", "text-on-good shadow-card", "text-white shadow-card")],
    ["white label on danger again", "ON_COLOR_MISSING", I, () => m(base, "primitives", "text-on-wrong shadow-card", "text-white shadow-card")],
    ["white label on premium again", "ON_COLOR_MISSING", I, () => m(base, "primitives", "text-on-gold shadow-card", "text-white shadow-card")],
    ["soft label back to accent", "ON_COLOR_MISSING", I, () => m(base, "primitives", "bg-accent-soft text-accent-on-soft hover", "bg-accent-soft text-accent hover")],
    ["disabled primary looks active", "DISABLED_LOOKS_ACTIVE", I, () => m(base, "primitives", '  primary: "disabled:bg-line disabled:text-ink-soft",', '  primary: "",')],
    ["disabled outline loses its outline", "DISABLED_LOOKS_ACTIVE", I, () => m(base, "primitives", '  outline: "disabled:border-line disabled:bg-transparent disabled:text-ink-soft",', '  outline: "disabled:opacity-40",')],
    ["loading turns grey", "LOADING_LOOKS_DISABLED", I, () => m(base, "primitives", 'loading ? "cursor-progress" : BUTTON_DISABLED[variant]', "BUTTON_DISABLED[variant]")],
    ["focus ring back to accent/45", "FOCUS_RING_WEAK", I, () => m(base, "primitives", "focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-offset-2 focus-visible:ring-offset-bg", "focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg")],
    ["small button under 44px", "TOUCH_TARGET_SMALL", I, () => m(base, "primitives", 'sm: "min-h-11 px-3', 'sm: "min-h-9 px-3')],
    ["loading button stays clickable", "LOADING_NOT_INERT", I, () => m(base, "primitives", "disabled={disabled || loading}", "disabled={disabled}")],
    ["Verificar green before the verdict (steps)", "CHECK_GREEN_BEFORE_VERDICT", I, () => m(base, "steps", 'variant={canCheck ? "primary" : "outline"}', 'variant={canCheck ? "good" : "outline"}')],
    ["Verificar green before the verdict (builder)", "CHECK_GREEN_BEFORE_VERDICT", I, () => m(base, "hanziBuilder", 'variant={canCheck ? "primary" : "outline"}', 'variant={canCheck ? "good" : "outline"}')],
    ["Verificar green before the verdict (pieces)", "CHECK_GREEN_BEFORE_VERDICT", I, () => m(base, "pieceAssembly", 'variant={canCheck ? "primary" : "outline"}', 'variant={canCheck ? "good" : "outline"}')],
    ["verdict mark without an X", "VERDICT_COLOUR_ONLY", I, () => m(base, "verdictMark", /IconX/g, "IconStar")],
    ["steps verdict colour-only", "VERDICT_COLOUR_ONLY", I, () => m(base, "steps", /<TileVerdictMark\b/g, "<span")],
    ["conversation verdict colour-only", "VERDICT_COLOUR_ONLY", I, () => m(base, "conversation", /<TileVerdictMark\b/g, "<span")],
    ["switch OFF track invisible", "SWITCH_OFF_INVISIBLE", I, () => m(base, "guidanceSettings", "bg-ink-faint/55 ring-1 ring-inset ring-ink-faint/40", "bg-surface-2")],
    ["locked node swallows the tap", "LOCKED_TAP_SWALLOWED", I, () => m(base, "nodeBubble", "onClick={disabled && !isLocked ? undefined : onSelect}", "onClick={disabled ? undefined : onSelect}")],
    ["current node loses its ring", "CURRENT_STATE_UNMARKED", I, () => m(base, "nodeBubble", /shadow-current/g, "shadow-card")],
    ["login submit greys out while signing in", "LOADING_LOOKS_DISABLED", I, () => m(base, "loginForm", '<Button type="submit" size="lg" loading={loading}', '<Button type="submit" size="lg" disabled={loading}')],
    ["delete request shows no progress", "LOADING_LOOKS_DISABLED", I, () => m(base, "dangerZone", "          loading={busy}\n", "")],

    // ── 3 Resilient UI states ─────────────────────────────────────────
    ["every route change blanks the shell", "AUTH_GATE_BLANK_FLASH", R, () => m(base, "requireCloud", "setAudience((previous) => (previous && canEnterJourney(previous) ? previous : null));", "setAudience(null);")],
    ["blank aria-hidden gate again", "AUTH_GATE_BLANK_FLASH", R, () => m(base, "requireCloud", /<div className="flex min-h-dvh items-center justify-center bg-bg" data-testid="auth-gate">\s*<PageFallback \/>\s*<\/div>/, '<div className="flex min-h-dvh items-center justify-center bg-bg" data-testid="auth-gate" aria-hidden="true" />')],
    ["offline audience never re-checked", "OFFLINE_AUDIENCE_NEVER_RECHECKED", R, () => m(base, "requireCloud", "if (online && !wasOnline) setNetworkEpoch((n) => n + 1);", "")],
    ["offline cold start logs out", "OFFLINE_COLD_START_LOGOUT", R, () => m(base, "sessionAudience", 'if (lastKnownCloudReady(useStore.getState())) return "cloud_ready";', "")],
    ["server confirmation never remembered", "OFFLINE_COLD_START_LOGOUT", R, () => m(base, "sessionAudience", "rememberCloudReady(useStore.getState().currentAccountId);\n", "")],
    ["offline fallback without setup", "OFFLINE_FALLBACK_TOO_WIDE", R, () => m(base, "sessionAudience", 'account.authMode !== "cloud" || !state.accountSetupComplete', 'account.authMode !== "cloud"')],
    ["sign-out keeps the offline pass", "OFFLINE_FALLBACK_SURVIVES_SIGN_OUT", R, () => m(base, "signOutHook", "      forgetCloudReady();\n", "")],
    ["every failure called pending", "OFFLINE_FAILURE_AS_REJECTION", R, () => m(base, "economyPending", "  if (result.ok || result.already_applied) return false;", "  return true;")],
    ["offline not pending", "OFFLINE_FAILURE_AS_REJECTION", R, () => m(base, "economyPending", "  if (!readOnline()) return true;\n", "")],
    ["queued retry not pending", "OFFLINE_FAILURE_AS_REJECTION", R, () => m(base, "economyPending", "  if (result.retry_pending) return true;\n", "")],
    ["Safari 'Load failed' not a network error", "OFFLINE_FAILURE_AS_REJECTION", R, () => m(base, "economyPending", "fetch|network|load failed|", "fetch|network|")],
    ["store rollback scolds offline", "OFFLINE_FAILURE_AS_REJECTION", R, () => m(base, "store", 'get().setEconomySyncMessage(economyFailureMessage(result, "Qi não confirmado pelo servidor."));', 'get().setEconomySyncMessage("Qi não confirmado pelo servidor.");')],
    ["accusatory copy is back", "ACCUSATORY_COPY", R, () => m(base, "store", '"Esta recompensa é liberada quando o servidor confirmar a lição."', '"Conclua a lição de verdade para liberar o Qi."')],
    ["localizer fails open", "RAW_BACKEND_TEXT", R, () => m(base, "errors", '  if (isTechnicalMessage(raw)) return t("errors.unknown");\n', "")],
    ["Safari network text unmapped", "RAW_BACKEND_TEXT", R, () => m(base, "errors", '        "load failed",\n', "")],
    ["JWT text passes through", "RAW_BACKEND_TEXT", R, () => m(base, "errors", "|\\bjwt\\b", "")],
    ["localizer swallows app copy", "RAW_BACKEND_TEXT", R, () => m(base, "errors", "|stack|undefined|null|NaN/i", "|stack|undefined|null|NaN|!/i")],
    ["league prints backend text", "RAW_BACKEND_TEXT", R, () => m(base, "ligas", "          Verifique a conexão e tente de novo.", '          {demoMessage ?? "Tente novamente."}')],
    ["league loading wears the error tone", "LOADING_AS_ERROR", R, () => m(base, "ligas", 'data-testid="league-syncing-banner"', 'data-testid="league-error-banner"')],
    ["league claim double-submits", "CLAIM_DOUBLE_SUBMIT", R, () => m(base, "ligas", "if (claiming || !lastWeek?.week_key", "if (!lastWeek?.week_key")],
    ["league claim prints reason codes", "RAW_BACKEND_TEXT", R, () => m(base, "ligas", "text: leagueClaimCopy(result)", "text: result.message")],
    ["Conta trusts authMode alone", "CLOUD_SAVED_CLAIM_UNSYNCED", R, () => m(base, "conta", "withSyncTruth(statusFor(authMode, t), authMode, cloudSyncState.status, online, t)", "statusFor(authMode, t)")],
    ["Conta green while offline", "CLOUD_SAVED_CLAIM_UNSYNCED", R, () => m(base, "conta", 'if (!online) return { ...base, tone: "muted"', 'if (false) return { ...base, tone: "muted"')],
    ["native prompt is back", "NATIVE_PROMPT", R, () => m(base, "conta", "  const [deleting, setDeleting] = useState(false);", '  const [deleting, setDeleting] = useState(false);\n  const legacy = () => window.prompt("EXCLUIR CONTA");')],
    ["chip says Salvando… offline", "SYNC_CHIP_LIES_OFFLINE", R, () => m(base, "syncChip", '!online && state !== "synced"', "false")],
    ["no push on reconnect", "NO_ONLINE_FLUSH", R, () => m(base, "cloudSyncBoot", "if (online && !wasOnline) void flushCloudProgressPush();", "")],
    ["economy back on window online", "NO_ONLINE_FLUSH", R, () => m(base, "economyBoot", "    return subscribeNetworkStatus((online) => {", '    window.addEventListener("online", () => undefined);\n    return subscribeNetworkStatus((online) => {')],
    ["sync banner shows PT to EN learners", "SYNC_TEXT_NOT_LOCALIZED", R, () => m(base, "syncBanner", "{localizeUserMessage(message)}", "{message}")],
    ["offline block on every step", "OFFLINE_BANNER_BLOCKS_EXERCISE", R, () => m(base, "lessonPlayer", 'data-lesson-offline=""', "data-lesson-note")],
    ["retry does nothing for a failed chunk", "RETRY_NOOP_ON_CHUNK", R, () => m(base, "errorBoundary", "if (error && isStaleBundleError(error)) {", "if (false) {")],
    ["offline retry pretends", "RETRY_NOOP_ON_CHUNK", R, () => m(base, "errorBoundary", '{chunkOffline ? t("errors.offlineRetry") : t("errors.genericBody")}', '{t("errors.genericBody")}')],
    ["fallback flashes at once", "LOADING_FLASH", R, () => m(base, "pageFallback", "loading-delayed-reveal ", "")],
    ["delayed reveal CSS gone", "LOADING_FLASH", R, () => m(base, "css", "  animation: loading-delayed-reveal 200ms ease-out 320ms backwards;", "  animation: none;")],
    ["pulses ignore reduced motion", "UNBUDGETED_PULSE", R, () => m(base, "css", "  .loading-delayed-reveal,\n  .animate-pulse,\n  .animate-ping {", "  .loading-delayed-reveal {")],
    ["Verificar pulses forever", "UNBUDGETED_PULSE", R, () => m(base, "hanziBuilder", '"longyu-correct-pop ring-2', '"animate-pulse ring-2')],
    ["update banner over the lesson", "PWA_BANNER_OVER_LESSON", R, () => m(base, "pwaBanner", "if (!needRefresh || lessonOpen) return null;", "if (!needRefresh) return null;")],
    ["ErrorState without retry", "ERROR_DEAD_END", R, () => m(base, "primitives", 'data-testid="error-state-retry"', 'data-testid="error-state-x"')],
    ["Família error is a dead end", "ERROR_DEAD_END", R, () => m(base, "family", " onRetry={() => void load()}", "")],
    ["empty Review sends to a side tool", "EMPTY_STATE_DEAD_END", R, () => m(base, "revisao", 'to="/jornada" data-testid="review-empty-journey"', 'to="/fala"')],
    ["visible PT loading line shifts the grid", "LOADING_LAYOUT_SHIFT", R, () => m(base, "imageGrid", '{t("common.loading")}', "Carregando imagens…")],
    ["state doc loses Sync truth", "STATE_DOC_MISSING", R, () => m(base, "stateDoc", "## Sync truth", "## Sync")],

    // ── 4 Reward UX contract ──────────────────────────────────────────
    ["double tap claims twice (no ref)", "CLAIM_NOT_IDEMPOTENT", W, () => m(base, "ritual", 'if (claimed.current || phase !== "closed") return;', 'if (phase !== "closed") return;')],
    ["ref never armed", "CLAIM_NOT_IDEMPOTENT", W, () => m(base, "ritual", "    claimed.current = true;\n", "")],
    ["reduced motion waits for the ritual", "REDUCED_MOTION_WAITS", W, () => m(base, "ritual", "    if (prefersReducedMotion()) {\n      reveal();\n      return;\n    }\n", "")],
    ["reveal timer leaks on unmount", "REVEAL_TIMER_LEAK", W, () => m(base, "ritual", "      if (revealTimer.current !== null) window.clearTimeout(revealTimer.current);\n", "")],
    ["empty claim closes silently", "SILENT_UNAVAILABLE", W, () => m(base, "ritual", '      setPhase("unavailable");\n      return;', "      onClose();\n      return;")],
    ["reveal not announced", "REVEAL_SILENT", W, () => m(base, "ritual", '{phase === "revealed" ? `${t("player.chestYouReceived")}: ${summary}`', '{phase === "revealed" ? ""')],
    ["dialog unnamed", "REVEAL_SILENT", W, () => m(base, "ritual", "      labelledBy={headingId}\n", "")],
    ["CTA says 'Receber recompensas' after the claim", "CTA_COPY_LIES", W, () => m(base, "ritual", '{t("player.chestContinue")}\n            </Button>\n          </div>\n        ) : (', '{t("player.claimRewards")}\n            </Button>\n          </div>\n        ) : (')],
    ["ritual drags to 1.5 s", "RITUAL_NOT_SEQUENCED", W, () => m(base, "ritual", "window.setTimeout(reveal, CHEST_REVEAL_MS)", "window.setTimeout(reveal, 1500)")],
    ["reveal never comes", "REVEAL_NEVER_HAPPENS", W, () => m(base, "ritual", "window.setTimeout(reveal, CHEST_REVEAL_MS)", "window.setTimeout(() => undefined, CHEST_REVEAL_MS)")],
    ["Journey keeps its own copy", "RITUAL_DUPLICATED", W, () => m(base, "journeyPage", "<ChestOpeningRitual", "<JourneyRitualCopy")],
    ["Loja modal grows its own timer", "RITUAL_DUPLICATED", W, () => m(base, "chestModal", "export function ChestRewardModal", "const revealTimer = 0;\nexport function ChestRewardModal")],
    ["aura escapes behind the panel", "AURA_ESCAPES_CHEST", W, () => m(base, "ritual", "relative isolate rounded-2xl", "relative rounded-2xl")],
    ["reward under the status bar", "REWARD_UNDER_STATUS_BAR", W, () => m(base, "ritual", "pt-[calc(var(--app-safe-top)+1.5rem)]", "pt-6")],
    ["sparks drag past 1 s", "RITUAL_TOO_LONG", W, () => m(base, "css", "animation: longyu-chest-spark 520ms ease-out both;", "animation: longyu-chest-spark 940ms ease-out both;")],
    ["spark delays back to 520 ms", "RITUAL_TOO_LONG", W, () => m(base, "chest", "delay: 240 }", "delay: 520 }")],
    ["lid waits for the aura", "RITUAL_NOT_SEQUENCED", W, () => m(base, "css", "animation: longyu-chest-aura 420ms cubic-bezier(0.2, 0.8, 0.2, 1) 200ms both;", "animation: longyu-chest-aura 120ms cubic-bezier(0.2, 0.8, 0.2, 1) 0ms both;")],
    ["aura rest pose off-centre", "REST_POSE_BROKEN", W, () => m(base, "css", "  transform: translate(-50%, -50%);\n  opacity: 0.35;\n  z-index: -1;", "  z-index: -1;")],
    ["sparks frozen visible at rest", "REST_POSE_BROKEN", W, () => m(base, "css", "  opacity: 0;\n  animation: longyu-chest-spark", "  animation: longyu-chest-spark")],
    ["glow repaints a filter", "GLOW_REPAINTS", W, () => m(base, "css", "    transform: translateY(-1.5px) scale(1.015);", "    filter: drop-shadow(0 6px 16px var(--chest-glow));")],
    ["glow back to 2.4 s", "GLOW_REPAINTS", W, () => m(base, "css", "animation: longyu-chest-glow var(--motion-ambient) var(--ease-ambient) infinite;", "animation: longyu-chest-glow 2.4s ease-in-out infinite;")],
    ["press ignores reduced motion", "REDUCED_MOTION_WAITS", W, () => m(base, "css", "  .longyu-chest-press,\n", "")],
    ["opened chests replay on every visit", "OPENED_CHEST_REPLAYS", W, () => m(base, "journeyPage", 'animated={state === "unlocked"}', "animated")],
    ["opened chest still a live button", "CHEST_STATE_UNANNOUNCED", W, () => m(base, "journeyPage", "aria-disabled={opened || undefined}", "")],
    ["PT-only reward labels", "REWARD_LABEL_PT_ONLY", W, () => m(base, "rewardReveal", "{chestRewardName(reward.kind, reward.amount)}", "{reward.label}")],
    ["charge and shield share an icon", "REWARD_ICON_CLASH", W, () => m(base, "chestMeta", "  shield: IconFlame,", "  shield: IconShield,")],
    ["Legendary repeats the Monthly seal", "CHEST_GLYPH_DUPLICATE", W, () => m(base, "chestMeta", 'glyph: "珍"', 'glyph: "玉"')],
    ["EN loses the Continue key", "REWARD_COPY_MISSING", W, () => m(base, "en", '    chestContinue: "Continue",\n', "")],
    ["Legendary promises bonus XP", "CHEST_COPY_MISMATCH", W, () => m(base, "ptBR", 'chestLegendaryContains: "Qi alto, Pérola de Jade, Escudo e chance de uma segunda Pérola."', 'chestLegendaryContains: "Qi alto, Pérola de Jade, Escudo, XP bônus e recompensa rara."')],
    ["Small hides the shield", "CHEST_COPY_MISMATCH", W, () => m(base, "en", 'chestSmallContains: "Qi, XP, a charge, a shield, or Recover Lives."', 'chestSmallContains: "Qi, XP, a charge, or an extra attempt."')],
    ["Victory pays below three stars", "VICTORY_QI_UNTRUE", W, () => m(base, "lessonQi", "  if (!(stars >= 3)) return 0;\n", "")],
    ["Victory forgets the Pro bonus", "VICTORY_QI_UNTRUE", W, () => m(base, "lessonQi", "(pro ? PRO_LESSON_QI_BONUS : 0)", "0")],
    ["store formula drifts from Victory", "VICTORY_QI_UNTRUE", W, () => m(base, "store", "        const qiAmount =\n          stars >= 3", "        const qiAmount =\n          stars >= 2")],
    ["Victory computes its own Qi again", "VICTORY_QI_UNTRUE", W, () => m(base, "lessonPlayer", /lessonCompletionQi\(\{ stars: 3, noSkip/, "Math.max({ stars: 3, noSkip")],
    ["claimed-here never recorded", "QI_CHIP_VANISHES", W, () => m(base, "lessonPlayer", "      for (const reward of newRewards) claimedHereRef.current.ids.add(reward.id);\n", "")],
    ["chip reads the live history", "QI_CHIP_VANISHES", W, () => m(base, "lessonPlayer", "qi: offeredRewards.find", "qi: newRewards.find")],
    ["claimed monthly chest shows a padlock", "CLAIMED_CHEST_LOCKED", W, () => m(base, "missoes", 'state={canOpenMonthlyChest ? "unlocked" : "opened"}', 'state={canOpenMonthlyChest ? "unlocked" : "locked"}')],
    ["toast timers race", "TOAST_TIMER_RACE", W, () => m(base, "transientHook", "      if (timer.current !== null) window.clearTimeout(timer.current);\n      setMessage(next);", "      setMessage(next);")],
    ["toast fires after unmount", "TOAST_TIMER_RACE", W, () => m(base, "transientHook", "      if (timer.current !== null) window.clearTimeout(timer.current);\n    },\n    [],", "    },\n    [],")],
    ["Missões back on raw timers", "TOAST_TIMER_RACE", W, () => m(base, "missoes", "  function showBurst(", "  const legacy = () => window.setTimeout(() => setBurst(null), 1100);\n  function showBurst(")],
    ["Loja toast silent", "TOAST_SILENT", W, () => m(base, "loja", 'role="status"\n        aria-live="polite"\n        className="pointer-events-none fixed', 'className="pointer-events-none fixed')],
    ["Missões toast silent", "TOAST_SILENT", W, () => m(base, "missoes", 'role="status"\n        aria-live="polite"\n        className={cx(', "className={cx(")],
    ["reward doc loses the escalations", "REWARD_DOC_MISSING", W, () => m(base, "rewardDoc", "## Escalated to the economy owner", "## Notes")],

    // ── 5 Guide UX contract ───────────────────────────────────────────
    ["inline callbacks restart the line", "GUIDE_DOUBLE_TYPING", G, () => m(base, "teacherBubble", "  }, [text, reduced]);", "  }, [text, reduced, onReady, onTypingComplete]);")],
    ["ready fires twice", "GUIDE_DOUBLE_TYPING", G, () => m(base, "teacherBubble", "        onReadyRef.current?.();\n        window.clearInterval(id);", "        onReadyRef.current?.();\n        onReadyRef.current?.();\n        window.clearInterval(id);")],
    ["typing splits graphemes", "GRAPHEME_SPLIT", G, () => m(base, "teacherBubble", "const graphemes = segmentGraphemes(full);", "const graphemes = full.split(\"\");")],
    ["inline tips swallow Back", "BACK_SWALLOWED_BY_INLINE_TIP", G, () => m(base, "backNav", '[data-guidance-surface]:not([data-guidance-surface="inline"])', "[data-guidance-surface]")],
    ["Journey guide replays on every visit", "GUIDE_REPLAYS_EVERY_VISIT", G, () => m(base, "journeyGuide", "    if (dismissed) markSeen(accountId, id);\n", "")],
    ["guide Continue outranks the CTA", "GUIDE_OUTRANKS_CTA", G, () => m(base, "journeyGuide", '        actionVariant="outline"\n', "")],
    ["gate CTA back to 40px", "GUIDE_OUTRANKS_CTA", G, () => m(base, "cultureGate", "inline-flex min-h-11 items-center justify-center", "inline-flex h-10 items-center justify-center")],
    ["blips over the Mandarin model", "BLIP_OVER_MANDARIN", G, () => m(base, "soundFx", '  if (audioOwnerState() !== "IDLE") return;\n', "")],
    ["seal reveal ignores Back", "SEAL_BACK_DEAD", G, () => m(base, "sealReveal", " onBackdropClick={() => markRevealed(seal.id)}", "")],
    ["Escape dismisses the tip under a sheet", "COACHMARK_UNDER_MODAL_DISMISSED", G, () => m(base, "guidanceHost", "      if (isModalOpen()) return;\n", "")],
    ["coachmark drifts on layout shifts", "COACHMARK_DRIFT", G, () => m(base, "guidanceHost", "new ResizeObserver(() => place())", "new MutationObserver(() => place())")],
    ["culture guide inserted after paint", "GUIDE_LAYOUT_JUMP", G, () => m(base, "cultureJourney", "useState(() => !readCultureFirstGuideSeen())", "useState(false)")],
    ["mascot alt hard-coded in PT", "MASCOT_ALT_NOISE", G, () => m(base, "mascot", 'alt={decorative ? "" : t("common.mascotAlt")}', 'alt="Mascote Longyu"')],
    ["guide mascot announced before every line", "MASCOT_ALT_NOISE", G, () => m(base, "guideDialogue", /\n\s+decorative\n/, "\n")],
    ["guide forks the reduced-motion signal", "REDUCED_MOTION_FORKED", G, () => m(base, "guideMachine", 'export { prefersReducedMotion };', 'export function prefersReducedMotion() { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; }')],
    ["Victory forks the reduced-motion signal", "REDUCED_MOTION_FORKED", G, () => m(base, "victory", "useState(() => prefersReducedMotion())", 'useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches)')],
    ["teacher caret loops offscreen", "UNBUDGETED_CARET", G, () => m(base, "teacherBubble", "<TypingCaret />", '<span className="animate-pulse" />')],

    // ── 6 Mobile ergonomics ───────────────────────────────────────────
    ["TabBar rides on the keyboard", "TABBAR_OVER_KEYBOARD", M, () => m(base, "css", 'html[data-native-keyboard="open"] [data-app-bottom-nav] {\n  display: none;\n}', "")],
    ["main keeps the nav padding", "TABBAR_OVER_KEYBOARD", M, () => m(base, "css", 'html[data-native-keyboard="open"] {\n  --app-bottom-nav-height: var(--app-safe-bottom);\n}', "")],
    ["fields zoom on focus", "INPUT_ZOOM_ON_FOCUS", M, () => m(base, "css", "    font-size: max(16px, 1em);", "    font-size: 14px;")],
    ["zoom disabled to hide it", "INPUT_ZOOM_ON_FOCUS", M, () => m(base, "indexHtml", "width=device-width", "width=device-width, maximum-scale=1")],
    ["safe-area rule beats the panel padding", "SAFE_AREA_OVERRIDES_PANEL", M, () => m(base, "css", ':where([aria-modal="true"]:not(.living-overlay))', '[aria-modal="true"]:not(.living-overlay)')],
    ["password autocapitalised", "PASSWORD_AUTOCAPITALIZED", M, () => m(base, "passwordField", '          autoCapitalize="none"\n', "")],
    ["callers lose control of the attributes", "PASSWORD_AUTOCAPITALIZED", M, () => m(base, "passwordField", '          autoCapitalize="none"\n          autoCorrect="off"\n          spellCheck={false}\n          {...inputProps}', '          {...inputProps}\n          autoCapitalize="none"\n          autoCorrect="off"\n          spellCheck={false}')],
    ["forgot-password link 16px tall", "TOUCH_TARGET_SMALL", M, () => m(base, "loginForm", "-my-3 inline-flex min-h-11 items-center px-2 text-xs", "text-xs")],
    ["tip help 28px", "TOUCH_TARGET_SMALL", M, () => m(base, "inlineTip", "h-11 w-11", "h-7 w-7")],
    ["update dismiss 24px", "TOUCH_TARGET_SMALL", M, () => m(base, "pwaBanner", "inline-flex min-h-11 shrink-0 items-center rounded-lg px-2", "shrink-0 rounded-lg px-2 py-1")],
    ["social retry links tiny", "TOUCH_TARGET_SMALL", M, () => m(base, "socialAuth", /inline-flex min-h-11 items-center px-1 font-semibold text-accent/g, "font-semibold text-accent")],
    ["OAuth buttons stuck after a closed tab", "OAUTH_BUTTONS_STUCK", M, () => m(base, "socialAuth", 'window.addEventListener("pageshow", onPageShow);', "")],
    ["social buttons import Capacitor directly", "CAPACITOR_OUTSIDE_PLATFORM", M, () => m(base, "socialAuth", 'import { useEffect, useState } from "react";', 'import { useEffect, useState } from "react";\nimport { App } from "@capacitor/app";')],
    ["TopBar signs out on one tap", "SIGN_OUT_WITHOUT_CONFIRM", M, () => m(base, "topBar", '<SignOutControl testId="topbar-sign-out" variant="pill" />', '<button type="button" onClick={() => void signOut()}>Sair</button>')],
    ["sheet closes before the request", "SIGN_OUT_SHEET_VANISHES", M, () => m(base, "signOutControl", "    setBusy(true);\n    try {", "    setBusy(true);\n    onBeforeSignOut?.();\n    try {")],
    ["unsynced progress not mentioned", "SIGN_OUT_HIDES_UNSYNCED", M, () => m(base, "signOutControl", "data-testid={`${testId}-unsynced`}", "")],
    ["eye toggle shifted by the margin", "EYE_TOGGLE_MISALIGNED", M, () => m(base, "forgotPassword", '<div className="mt-4">\n            <PasswordField', '<div>\n            <PasswordField')],
    ["delete confirm swallows Back", "BACK_SWALLOWED_BY_CONFIRM", M, () => m(base, "dangerZone", "    <section\n      aria-labelledby={titleId}", '    <section\n      role="dialog" aria-modal="false"\n      aria-labelledby={titleId}')],
    ["Conta keeps a second delete flow", "NATIVE_PROMPT", M, () => m(base, "conta", '<DeleteAccountConfirm testIdPrefix="conta"', '<LegacyDelete testIdPrefix="conta"')],

    // ── 7 Accessibility + follow-ups + platform ───────────────────────
    ["focus lost after the reveal", "REVEAL_FOCUS_LOST", A, () => m(base, "ritual", "resultHeading.current?.focus({ preventScroll: true })", "void 0")],
    ["login error silent", "AUTH_ERROR_SILENT", A, () => m(base, "loginForm", 'role="alert" ', "")],
    ["bubble chatters every 28 ms", "SR_CHATTER", A, () => m(base, "teacherBubble", '<span data-testid="teacher-bubble-text" aria-hidden="true">{shown}</span>', '<span data-testid="teacher-bubble-text">{shown}</span>')],
    ["chest state unannounced", "CHEST_STATE_UNANNOUNCED", A, () => m(base, "journeyPage", /aria-label=\{`\$\{chestTitle\} — \$\{opened \?[^\n]*\n/, "aria-label={chestTitle}\n")],
    ["sync reassurance hidden", "SYNC_REASSURANCE_HIDDEN", A, () => m(base, "syncChip", 'state === "problem" ? <span className="sr-only">', 'state === "never" ? <span className="sr-only">')],
    ["delete result silent", "DELETE_RESULT_SILENT", A, () => m(base, "dangerZone", 'role={notice.ok ? "status" : "alert"}', "")],
    ["tip state unannounced", "TIP_STATE_UNANNOUNCED", A, () => m(base, "inlineTip", "        aria-expanded={open}\n", "")],
    ["OAuth return in PT only", "AUTH_COPY_PT_ONLY", A, () => m(base, "oauthCallback", '{t("auth.oauth.working")}', "Entrando…")],
    ["social buttons in PT only", "AUTH_COPY_PT_ONLY", A, () => m(base, "socialAuth", 't("auth.oauth.opening")', '"Abrindo…"')],
    ["EN loses the OAuth copy", "AUTH_COPY_PT_ONLY", A, () => m(base, "en", /    oauth: \{[\s\S]*?\n    \},\n/, "")],
    ["EN loses the mascot alt", "CATALOG_KEY_MISSING", A, () => m(base, "en", '    mascotAlt: "Longyu mascot",\n', "")],
    ["topic direction from a Ctrl-click", "TOPIC_DIRECTION_STALE", A, () => m(base, "topicTransition", "pending = event && !isInAppNavigationClick(event) ? null : { direction, to, at: now() };", "pending = { direction, to, at: now() };")],
    ["topic direction never expires", "TOPIC_DIRECTION_STALE", A, () => m(base, "topicTransition", "now() - mark.at <= TOPIC_TRANSITION_MAX_AGE_MS", "true")],
    ["StrictMode re-read loses the direction", "TOPIC_DIRECTION_LOST", A, () => m(base, "topicTransition", "if (consumed && consumed.key === key) return consumed.direction;", "")],
    ["direction leaks to another path", "TOPIC_DIRECTION_STALE", A, () => m(base, "topicTransition", "mark.to === pathname && ", "")],
    ["topic card drops the click", "TOPIC_DIRECTION_STALE", A, () => m(base, "cultureCard", 'markTopicTransition("forward", cultureTopicHref(topic.id), event)', 'markTopicTransition("forward", cultureTopicHref(topic.id))')],
    ["mascot eyes shut at rest", "MASCOT_EYES_SHUT_AT_REST", A, () => m(base, "css", '.mascot-eye-blink[data-ambient]:not([data-ambient="run"]) {\n  animation: none;', '.mascot-eye-blink[data-ambient]:not([data-ambient="run"]) {\n  animation-play-state: paused;')],
    ["edge draw rests invisible", "EDGE_DRAW_REST_POSE", A, () => m(base, "css", /@keyframes lyo-edge-draw \{\s*from \{\s*opacity: 0;\s*\}\s*\}/, "@keyframes lyo-edge-draw { from { opacity: 0; } to { opacity: 0; } }")],
    ["burst back under the entrance fade", "VICTORY_BURST_UNDER_FADE", A, () => {
      const s = m(base, "victory", /<CompletionBurst[^\n]*\n/, "");
      s.victory = `${s.victory}\nconst late = () => <CompletionBurst play />;\n`;
      return s;
    }],
    ["platform 1: lexical detector", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.lexical })],
    ["platform 2: detector disabled", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.disabled })],
    ["platform 3: imports ignored", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.importsIgnored })],
    ["platform 4: member access ignored", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.membersIgnored })],
    ["platform 5: element access ignored", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.elementIgnored })],
    ["platform 6: comments counted", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.commentsCounted })],
    ["platform 7: template strings counted", "PLATFORM_DETECTOR_LEXICAL", A, () => ({ ...clone(base), detectCapacitor: DETECTORS.templatesCounted })],
    ["QA section missing", "QA_SECTION_MISSING", A, () => m(base, "qaPanel", /Premium UX closure/g, "Premium")],
    ["QA panel not mounted", "QA_SECTION_MISSING", A, () => m(base, "qaPage", "<PremiumUxQaPanel />", "")],
    ["QA panel writes the store", "QA_BACKDOOR", A, () => m(base, "qaPanel", "export function PremiumUxQaPanel() {", "export function PremiumUxQaPanel() {\n  const x = () => useStore.setState({ points: 9999 });")],

    // ── 8 Release honesty ─────────────────────────────────────────────
    ["learnerRuntimeSha unchanged", "LEARNER_RUNTIME_NOT_ADVANCED", REL, cert(base, (o) => (o.runtime.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["rc runtime not stamped", "LEARNER_RUNTIME_NOT_ADVANCED", REL, () => withJson(base, "rc", (o) => (o.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["previous runtime misreported", "LEARNER_RUNTIME_NOT_ADVANCED", REL, cert(base, (o) => (o.runtime.previousLearnerRuntimeSha = "0".repeat(40)))],
    ["parent cert runtime pin stale", "PARENT_RUNTIME_PIN_STALE", REL, () => withJson(base, "parentCert", (o) => (o.runtime.learnerRuntimeSha = PREVIOUS_LEARNER_RUNTIME_SHA))],
    ["fingerprint forced", "FINGERPRINT_DRIFT", REL, cert(base, (o) => (o.fingerprint.value = "000000000000"))],
    ["fingerprint written by hand", "FINGERPRINT_DRIFT", REL, cert(base, (o) => (o.fingerprint.source = "manual"))],
    ["validator 'fixed' by editing the comment", "VALIDATOR_REPAIR_DISHONEST", REL, cert(base, (o) => (o.androidValidatorRepair.commentEdited = true))],
    ["validator repair without mutations", "VALIDATOR_REPAIR_DISHONEST", REL, cert(base, (o) => (o.androidValidatorRepair.mutations = 0))],
    ["follow-up left open", "FOLLOWUP_OPEN", REL, cert(base, (o) => (o.knownFollowups.items[0].status = "OPEN"))],
    ["follow-up without a regression", "FOLLOWUP_OPEN", REL, cert(base, (o) => delete o.knownFollowups.items[1].regression)],
    ["surfaces claimed PASS (not CODE_PASS)", "SYSTEM_STATE_DISHONEST", REL, cert(base, (o) => (o.surfaces.state = "PASS"))],
    ["economy change sneaked in", "ECONOMY_SCOPE_CREEP", REL, cert(base, (o) => (o.rewards.economyChange = true))],
    ["escalations dropped", "ECONOMY_SCOPE_CREEP", REL, cert(base, (o) => (o.rewards.escalated = []))],
    ["freeze exception missing", "FREEZE_EXCEPTION_MISSING", REL, () => m(base, "freeze", "OWNER_APPROVED_PREMIUM_UX_CLOSURE", "OWNER_APPROVED_SOMETHING")],
    ["scope creep", "SCOPE_CREEP", REL, cert(base, (o) => (o.scope.pedagogyChange = true))],
    ["new skips counted", "NEW_SKIP_WITHOUT_EVIDENCE", REL, cert(base, (o) => (o.crossEngine.newSkips = 1))],
    ["R.3.2.5 spec allowlisted", "NEW_SKIP_WITHOUT_EVIDENCE", REL, () => withJson(base, "skipAllowlist", (o) => o.entries.push({ file: "e2e/rc2-3-13r3-2-5-premium-ux.spec.ts", pattern: "test.skip", classification: "LEGIT", snippet: "x" }))],
    ["cross-engine failure unclassified", "CROSS_ENGINE_FAILURE_HIDDEN", REL, cert(base, (o) => o.crossEngine.failures.push({ engine: "webkit", head: "a".repeat(40) }))],
    ["spec skips an engine", "E2E_HIDES_ENGINE", REL, () => m(base, "e2eSpec", 'test.describe("RC2.3.13R.3.2.5', `${SKIP_CALL}browserName === "webkit");\ntest.describe("RC2.3.13R.3.2.5`)],
    ["old APK accepted", "OLD_APK_ACCEPTED", REL, cert(base, (o) => (o.rejectedApkSha256List = []))],
    ["red hosted source accepted", "RED_HOSTED_SOURCE_ACCEPTED", REL, cert(base, (o) => Object.assign(o.hosted, { overall: "PASS", headSha: "c".repeat(40), workflowRunIds: { ci: 1 }, releaseTruth: "PASS", security: "PASS", betaSuites: "PASS", qualityBuild: "PASS", androidFoundation: "PASS", androidRuntime: "PASS", chromium: "PASS", firefox: "FAILURE", webkit: "PASS" }))],
    ["APK runtime mismatch", "APK_RUNTIME_MISMATCH", REL, cert(base, (o) => {
      Object.assign(o.hosted, { overall: "PASS", headSha: "d".repeat(40), workflowRunIds: { ci: 1 }, releaseTruth: "PASS", security: "PASS", betaSuites: "PASS", qualityBuild: "PASS", androidFoundation: "PASS", androidRuntime: "PASS", chromium: "PASS", firefox: "PASS", webkit: "PASS" });
      Object.assign(o.artifact, { status: "BUILT", channel: "DEVICE_QA", artifactSourceSha: "d".repeat(40), learnerRuntimeSha: PREVIOUS_LEARNER_RUNTIME_SHA, apkSha256: "e".repeat(64), workflowRunId: 1, artifactId: 2 });
    })],
    ["physical PASS from an emulator", "PHYSICAL_PASS_FROM_EMULATOR", REL, cert(base, (o) => Object.assign(o.physical, { status: "PASS", emulator: true, device: "sdk_gphone64_x86_64" }))],
    ["TalkBack PASS without a device", "PHYSICAL_PASS_FROM_EMULATOR", REL, cert(base, (o) => (o.accessibility.talkBack = "PASS"))],
    ["UI freeze accepted without the owner", "FREEZE_WITHOUT_OWNER_ACCEPTANCE", REL, cert(base, (o) => (o.uiFreeze.LONGYU_UI_UX_FREEZE = "OWNER_ACCEPTED_R325"))],
    ["Public Beta GO", "PUBLIC_BETA_GO", REL, cert(base, (o) => (o.entry.PUBLIC_BETA_ENTRY = "GO"))],
    ["Play GO without a signed AAB", "PLAY_GO_WITHOUT_SIGNED_AAB", REL, cert(base, (o) => (o.entry.PLAY_CLOSED_BETA_ENTRY = "GO"))],
    ["Owner QA GO without an APK", "OWNER_QA_WITHOUT_APK", REL, cert(base, (o) => (o.entry.OWNER_QA_ENTRY = "GO"))],
    ["debug AAB Play-ready", "DEBUG_AAB_PLAY_READY", REL, cert(base, (o) => (o.play.debugAabPlayReady = true))],
    ["wrong parent", "WRONG_PARENT_PR", REL, cert(base, (o) => (o.parent.pr = 354))],
    ["cert section missing", "CERT_SECTION_MISSING", REL, cert(base, (o) => delete o.resilientStates)],
    ["gate script missing", "GATE_SCRIPT_MISSING", REL, () => m(base, "packageJson", '"validate:reward-ux-contract"', '"validate:reward-ux-x"')],
    ["gate not in a hosted suite", "GATE_NOT_IN_HOSTED_SUITE", REL, () => m(base, "suites", '      "validate:reward-ux-contract",\n', "")],
    ["gate not registered", "GATE_REGISTRY_MISSING", REL, () => m(base, "gateRegistry", '"gateId": "validate:guide-ux-contract"', '"gateId": "validate:guide-ux-x"')],
    ["report missing", "REPORT_MISSING", REL, () => ({ ...clone(base), report: "" })],
    ["handoff DO NOT USE list incomplete", "HANDOFF_STALE_LIST_INCOMPLETE", REL, () => m(base, "handoff", STALE_APK_SHA256[0], "deadbeef")],
  ];
}

function test() {
  const base = loadPremiumUxSources();
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
    console.error(`FAIL test:rc2-3-13r3-2-5-premium-ux-closure (${killed}/${list.length} kills)`);
    process.exitCode = 1;
    return;
  }
  console.log(`PASS test:rc2-3-13r3-2-5-premium-ux-closure (${killed} kills)`);
}

const src = MODE === "test" ? null : loadPremiumUxSources();
switch (MODE) {
  case "surface":
    report("validate:premium-surface-system", checkPremiumSurfaceSystem(src));
    break;
  case "interactive":
    report("validate:interactive-state-consistency", checkInteractiveStateConsistency(src));
    break;
  case "resilient":
    report("validate:resilient-ui-states", checkResilientUiStates(src));
    break;
  case "reward":
    report("validate:reward-ux-contract", checkRewardUxContract(src));
    break;
  case "guide":
    report("validate:guide-ux-contract", checkGuideUxContract(src));
    break;
  case "mobile":
    report("validate:mobile-ergonomics", checkMobileErgonomics(src));
    break;
  case "a11y":
    report("validate:ux-closure-accessibility", checkUxClosureAccessibility(src));
    break;
  case "release":
    report("validate:rc2-3-13r3-2-5-release", checkRelease(src));
    break;
  case "validate":
    report("validate:rc2-3-13r3-2-5-premium-ux-closure", checkAll(src));
    break;
  case "test":
    test();
    break;
  default:
    console.error(`unknown mode ${MODE}`);
    process.exitCode = 2;
}
