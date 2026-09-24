#!/usr/bin/env node
/** test:android-platform-boundaries — um só Longyu, SW só no web, BACK seguro, links seguros. */
import { loadAndroidFoundationState, validateAndroidPlatformBoundaries } from "./lib/android-foundation-gates.mjs";
import { runMutations, swap } from "./lib/android-mutation-runner.mjs";

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
  ["plugin sem consumidor", (s) => { s.packageJson.dependencies["@capacitor/camera"] = "8.0.0"; }, "PLUGIN_WITHOUT_CONSUMER"],
  ["deep link abre admin", (s) => edit(s, "deepLinks", '  "/sobre",\n];', '  "/sobre",\n  "/admin",\n];'), "DEEP_LINK_UNSAFE"],
  ["deep link aceita qualquer host https", (s) => edit(s, "deepLinks", '} else if (url.protocol === "https:" && LONGYU_WEB_HOSTS.includes(url.hostname) && !url.port) {', '} else if (url.protocol === "https:") {'), "DEEP_LINK_UNSAFE"],
  ["link externo renderizado na WebView", (s) => edit(s, "externalLinks", 'return { kind: "external", url: url.href };', 'return { kind: "internal", to: url.href };'), "EXTERNAL_LINK_IN_WEBVIEW"],
  ["permissão de localização", (s) => { s.androidManifestXml += '\n<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />\n'; }, "UNNEEDED_PERMISSION"],
  ["background reseta a sessão", (s) => edit(s, "appLifecycle", "    last = next;\n    onChange(next);", "    last = next;\n    if (next === \"background\") resetLessonSession();\n    onChange(next);"), "BACKGROUND_RESETS_STATE"],
  ["shell nativo roda no web", (s) => edit(s, "nativeShell", "if (installed || !isNativeApp()) return;", "if (installed) return;"), "WEB_REGRESSION"],
  ["shell nativo não ligado no main", (s) => { s.mainTsx = s.mainTsx.replace(/initNativeShell\(/g, "noop("); }, "NATIVE_SHELL_NOT_WIRED"],
]);
