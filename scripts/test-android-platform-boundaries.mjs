#!/usr/bin/env node
/** test:android-platform-boundaries — um só Longyu, SW só no web, BACK seguro, links seguros. */
import assert from "node:assert/strict";
import {
  CAPACITOR_CANDIDATE,
  findCapacitorAccess,
  loadAndroidFoundationState,
  validateAndroidPlatformBoundaries,
} from "./lib/android-foundation-gates.mjs";
import { runMutations, swap } from "./lib/android-mutation-runner.mjs";

/**
 * RC2.3.13R.3.2.5 — the Capacitor boundary is judged on the syntax tree.
 * Real access outside src/lib/platform fails; prose that merely names
 * Capacitor (comments, strings, JSX text) passes.
 */
const BOUNDARY_VIOLATIONS = [
  ["window.Capacitor num componente", "src/components/ui/Banner.tsx", "export const native = Boolean(window.Capacitor);"],
  ["globalThis.Capacitor numa lib", "src/lib/audio/tts.ts", "const cap = (globalThis as any).Capacitor;"],
  ["Capacitor.getPlatform() fora da plataforma", "src/features/journey/JourneyPage.tsx", 'import { Capacitor } from "@capacitor/core";\nexport const p = Capacitor.getPlatform();'],
  ["Capacitor.isNativePlatform() sem import", "src/features/lesson/steps.tsx", "export const n = Capacitor.isNativePlatform();"],
  ["import estático de @capacitor/*", "src/features/qa/QaDevicePage.tsx", 'import { App } from "@capacitor/app";\nexport { App };'],
  ["import dinâmico de @capacitor/*", "src/lib/share.ts", 'export const load = () => import("@capacitor/share");'],
  ["require de @capacitor/*", "src/lib/legacy.ts", 'const core = require("@capacitor/core");\nexport default core;'],
  ["import de tipo de @capacitor/*", "src/lib/types.ts", 'export type Info = import("@capacitor/device").DeviceInfo;'],
  ['window["Capacitor"]', "src/lib/detect.ts", 'export const c = (window as any)["Capacitor"];'],
  ["acesso real dentro da pasta de ornamentos", "src/components/ornaments/chinese/ChineseOrnament.tsx", "export const native = window.Capacitor?.isNativePlatform();"],
];

/** Mentions that are not code: never a violation. */
const BOUNDARY_PROSE = [
  ["comentário de bloco", "src/components/ornaments/chinese/ChineseOrnament.tsx", "/** Bundled at build time: no network, works offline and inside Capacitor. */\nexport const x = 1;"],
  ["comentário de linha com chamada", "src/lib/a.ts", "// Capacitor.getPlatform() lives in src/lib/platform\nexport const a = 1;"],
  ["comentário citando window.Capacitor", "src/lib/b.ts", "/* window.Capacitor is read only by nativePlatform.ts */\nexport const b = 2;"],
  ["string literal", "src/lib/c.ts", 'export const label = "Rodando no Capacitor.";'],
  ["template literal", "src/lib/d.ts", "export const help = `Capacitor.getPlatform() is platform-only`;"],
  ["texto JSX", "src/features/qa/Hint.tsx", "export const Hint = () => <p>Capacitor shell (Android)</p>;"],
  ["string com @capacitor/ em descrição", "src/lib/e.ts", 'export const note = "plugins @capacitor/app e @capacitor/share";'],
];

const base = loadAndroidFoundationState();
const P = (name) => `src/lib/platform/${name}.ts`;
const edit = (s, name, from, to) => { s.platformSources[P(name)] = swap(s.platformSources[P(name)], from, to); };

runMutations("test:android-platform-boundaries", base, validateAndroidPlatformBoundaries, [
  ["#17 SW do PWA forçado no runtime nativo", (s) => edit(s, "serviceWorkerPolicy", 'return platform === "web";', "return true;"), "SW_IN_NATIVE"],
  ["SW registrado sem o gate no banner", (s) => { s.pwaBanner = swap(s.pwaBanner, "if (!shouldRegisterServiceWorker()) {", "if (false) {"); }, "SW_IN_NATIVE"],
  ["SW injetado no HTML (injectRegister)", (s) => { s.viteConfig = swap(s.viteConfig, 'registerType: "autoUpdate",', 'registerType: "autoUpdate",\n      injectRegister: "script",'); }, "SW_IN_NATIVE"],
  ["PWA web deixa de registrar", (s) => edit(s, "serviceWorkerPolicy", 'return platform === "web";', 'return platform === "android";'), "PWA_REGRESSION"],
  ["#18 app nativo cria segundo SRS", (s) => { s.platformSources[P("nativeSrs")] = "export function scheduleNative(card: { dueAt: number; intervalDays: number }) { return card; }\n"; }, "NATIVE_SECOND_SRS"],
  ["plataforma agenda revisão importando o SRS", (s) => edit(s, "appLifecycle", 'import { isNativePluginAvailable } from "./nativePlatform";', 'import { isNativePluginAvailable } from "./nativePlatform";\nimport { reviewQueue } from "../srs";'), "NATIVE_SECOND_SRS"],
  ["#19 app nativo cria segundo account store", (s) => { s.platformSources[P("nativeAccountStore")] = 'import { create } from "zustand";\nexport const useNativeAccount = create(() => ({ id: "" }));\n'; }, "NATIVE_SECOND_ACCOUNT_STORE"],
  ["plataforma grava progresso no localStorage", (s) => edit(s, "networkStatus", "export function readOnline(): boolean {", 'export function saveProgress(p: string): void { localStorage.setItem("native-progress", p); }\nexport function readOnline(): boolean {'), "NATIVE_SECOND_ACCOUNT_STORE"],
  ["dependência de persistência nativa paralela", (s) => { s.packageJson.dependencies["@capacitor/preferences"] = "8.0.0"; }, "NATIVE_SECOND_ACCOUNT_STORE"],
  ["MainActivity com SharedPreferences", (s) => { const k = Object.keys(s.javaSources)[0]; s.javaSources[k] += "\n// SharedPreferences prefs;\n"; }, "NATIVE_SECOND_ACCOUNT_STORE"],
  ["#21 BACK fecha o app em qualquer rota", (s) => edit(s, "backNavigation", '  if (BACK_ROOT_PATHS.includes(path)) return "minimize-app";\n  return "navigate-home";', '  return "minimize-app";'), "BACK_EXITS_APP"],
  ["BACK chama exitApp()", (s) => edit(s, "nativeShell", "else void App.minimizeApp();", "else void App.exitApp();"), "BACK_EXITS_APP"],
  ["BACK ignora overlay aberto", (s) => edit(s, "backNavigation", 'if (input.overlayOpen) return "dismiss-overlay";', ""), "BACK_EXITS_APP"],
  ["Capacitor espalhado num componente", (s) => { s.capacitorUsers.push({ path: "src/features/journey/JourneyPage.tsx", text: "if (window.Capacitor) {}" }); }, "CAPACITOR_OUTSIDE_PLATFORM"],
  ...BOUNDARY_VIOLATIONS.map(([label, path, text]) => [label, (s) => { s.capacitorUsers.push({ path, text }); }, "CAPACITOR_OUTSIDE_PLATFORM"]),
  ["plugin sem consumidor", (s) => { s.packageJson.dependencies["@capacitor/camera"] = "8.0.0"; }, "PLUGIN_WITHOUT_CONSUMER"],
  ["deep link abre admin", (s) => edit(s, "deepLinks", '  "/sobre",\n];', '  "/sobre",\n  "/admin",\n];'), "DEEP_LINK_UNSAFE"],
  ["deep link aceita qualquer host https", (s) => edit(s, "deepLinks", '} else if (url.protocol === "https:" && LONGYU_WEB_HOSTS.includes(url.hostname) && !url.port) {', '} else if (url.protocol === "https:") {'), "DEEP_LINK_UNSAFE"],
  ["link externo renderizado na WebView", (s) => edit(s, "externalLinks", 'return { kind: "external", url: url.href };', 'return { kind: "internal", to: url.href };'), "EXTERNAL_LINK_IN_WEBVIEW"],
  ["permissão de localização", (s) => { s.androidManifestXml += '\n<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n'; }, "UNNEEDED_PERMISSION"],
  ["background reseta a sessão", (s) => edit(s, "appLifecycle", "    last = next;\n    onChange(next);", "    last = next;\n    if (next === \"background\") resetLessonSession();\n    onChange(next);"), "BACKGROUND_RESETS_STATE"],
  ["shell nativo roda no web", (s) => edit(s, "nativeShell", "if (installed || !isNativeApp()) return;", "if (installed) return;"), "WEB_REGRESSION"],
  ["shell nativo não ligado no main", (s) => { s.mainTsx = s.mainTsx.replace(/initNativeShell\(/g, "noop("); }, "NATIVE_SHELL_NOT_WIRED"],
]);

// Prose passes (the false positive that blocked #355 on ChineseOrnament.tsx).
const capCodes = (state, opts) => validateAndroidPlatformBoundaries(state, opts).filter((f) => f.code === "CAPACITOR_OUTSIDE_PLATFORM");
for (const [label, path, text] of BOUNDARY_PROSE) {
  assert.ok(CAPACITOR_CANDIDATE.test(text), `fixture "${label}" must reach the validator (prefilter)`);
  const state = structuredClone(base);
  state.capacitorUsers.push({ path, text });
  assert.deepEqual(capCodes(state), [], `prose "${label}" must not be a boundary violation`);
  console.log(`PASS prose: ${label}`);
}
// The prefilter is never narrower than the rule.
for (const [label, , text] of BOUNDARY_VIOLATIONS) assert.ok(CAPACITOR_CANDIDATE.test(text), `prefilter misses "${label}"`);

// Broken detectors: each one must be caught by the fixtures above.
const battery = (detectCapacitor) => {
  for (const [, path, text] of BOUNDARY_VIOLATIONS) {
    const state = structuredClone(base);
    state.capacitorUsers.push({ path, text });
    if (!capCodes(state, { detectCapacitor }).length) return "violation passed";
  }
  for (const [, path, text] of BOUNDARY_PROSE) {
    const state = structuredClone(base);
    state.capacitorUsers.push({ path, text });
    if (capCodes(state, { detectCapacitor }).length) return "prose failed";
  }
  return null;
};
assert.equal(battery(findCapacitorAccess), null, "the real detector passes its own battery");
const DETECTOR_MUTANTS = [
  ["lexical regex (comments/strings count)", (text) => (/@capacitor\/|window\.Capacitor|\bCapacitor\./.test(text) ? [{ kind: "identifier", line: 1 }] : [])],
  ["detector disabled", () => []],
  ["imports ignored", (text, path) => findCapacitorAccess(text, path).filter((a) => a.kind !== "import")],
  ["member access ignored", (text, path) => findCapacitorAccess(text, path).filter((a) => a.kind !== "identifier")],
  ["ornament path allowlisted", (text, path) => (path.startsWith("src/components/") ? [] : findCapacitorAccess(text, path))],
];
for (const [label, mutant] of DETECTOR_MUTANTS) {
  const verdict = battery(mutant);
  assert.ok(verdict, `detector mutant "${label}" survived the boundary battery`);
  console.log(`KILLED detector mutant ${label}: ${verdict}`);
}
console.log(`PASS boundary syntax battery (${BOUNDARY_VIOLATIONS.length} violations, ${BOUNDARY_PROSE.length} prose, ${DETECTOR_MUTANTS.length} detector mutants)`);
