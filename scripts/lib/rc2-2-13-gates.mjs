/**
 * RC2.2.13 — Android Native UX, Voice, Permissions & Notifications.
 *
 * Sete gates sobre um estado carregado do repositório real:
 *   validateAndroidSafeArea              safe-area única (Capacitor + env)
 *   validateMobileNavigationDensity      TabBar/TopBar/sheets
 *   validateMobileVisualDensity          alvos de toque ≥48dp, densidade
 *   validateNativeTts                    TextToSpeech por trás de speak()
 *   validateNativeSpeechRecognition      SpeechRecognizer por trás de recognizeOnce()
 *   validateNativePermissions            permissões, intro, ajustes, invariantes
 *   validateStreakNotifications          lembretes locais (plano EXECUTADO)
 * Cada um devolve [{ code, where, why }] (vazio = passa). Os `test:*` mutam o
 * estado e exigem o código de falha certo.
 *
 * O plano de lembretes e o resolvedor de deep link são carregados A PARTIR DO
 * TEXTO do estado (transpilado), para que uma mutação no código seja de fato
 * executada.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256, CLOUD_CHECKS } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();

export const MOBILE_TABBAR = ["jornada", "treino", "cultura", "missoes", "mais"];
export const PRACTICE_SHEET = ["ideogramas", "pinyin", "fala", "leitura", "imersao", "biblioteca"];
export const ALLOWED_PERMISSIONS = [
  "android.permission.INTERNET",
  "android.permission.RECORD_AUDIO",
  "android.permission.MODIFY_AUDIO_SETTINGS",
  "android.permission.POST_NOTIFICATIONS",
  "android.permission.VIBRATE",
];
export const FORBIDDEN_PERMISSION_RE = /LOCATION|CAMERA|CONTACTS|READ_PHONE|SMS|CALL_LOG|BLUETOOTH_SCAN|BODY_SENSORS/;
export const EXACT_ALARM_PERMISSIONS = ["android.permission.SCHEDULE_EXACT_ALARM", "android.permission.USE_EXACT_ALARM"];
export const RC2_2_13_QA_FIELDS = [
  "safeAreaTop",
  "safeAreaBottom",
  "mobileNav",
  "culturePrimaryNav",
  "nativeTts",
  "nativeSpeech",
  "notificationPermission",
  "microphonePermission",
  "streakNotification",
  "notificationDeepLink",
  "permissionFirstRun",
];
export const SPEECH_PRIVACY_PT =
  "Longyu não armazena a gravação. O reconhecimento pode ser processado pelo serviço de fala configurado no dispositivo.";
export const RECOGNITION_ERROR_CODES = [
  "NO_MATCH",
  "SPEECH_TIMEOUT",
  "AUDIO",
  "NETWORK",
  "RECOGNIZER_BUSY",
  "INSUFFICIENT_PERMISSIONS",
  "LANGUAGE_NOT_SUPPORTED",
  "LANGUAGE_UNAVAILABLE",
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|css)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

const JAVA = "android/app/src/main/java/longyu/noba/com";

export async function loadState() {
  const pkg = readJson("package.json");
  const srcFiles = Object.fromEntries(walk("src").map((rel) => [rel, read(rel)]));
  return {
    freeze: loadBetaPedagogyFreezeState(),
    qa: readJson("docs/release/android-physical-qa.json"),
    dataSafety: readJson("docs/release/play-data-safety.json"),
    operational: readJson("docs/release/rc1-operational-checks.json"),
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    dependencies: { ...pkg.dependencies, ...pkg.devDependencies },
    srcFiles,
    files: {
      statusIcon: exists("android/app/src/main/res/drawable/ic_stat_longyu.xml"),
      googleServicesJson: exists("android/app/google-services.json"),
    },
    src: {
      indexCss: srcFiles["src/index.css"],
      indexHtml: read("index.html"),
      topBar: srcFiles["src/components/layout/TopBar.tsx"],
      tabBar: srcFiles["src/components/layout/TabBar.tsx"],
      nav: srcFiles["src/components/layout/nav.tsx"],
      hubLayout: srcFiles["src/components/layout/HubLayout.tsx"],
      page: srcFiles["src/components/ui/page.tsx"],
      settingSwitch: srcFiles["src/components/ui/SettingSwitch.tsx"],
      focusHeader: srcFiles["src/features/lesson/LessonFocusHeader.tsx"],
      loja: srcFiles["src/features/loja/LojaPage.tsx"],
      cultureHub: srcFiles["src/features/culture/CultureHubPage.tsx"],
      immersion: srcFiles["src/features/immersion/ImmersionPage.tsx"],
      profile: srcFiles["src/features/perfil/ProfilePage.tsx"],
      tts: srcFiles["src/lib/tts.ts"],
      speech: srcFiles["src/lib/speech.ts"],
      speakButton: srcFiles["src/components/ui/SpeakButton.tsx"],
      pronunciation: srcFiles["src/features/lesson/PronunciationPractice.tsx"],
      nativeSpeech: srcFiles["src/lib/platform/nativeSpeech.ts"],
      nativeNotifications: srcFiles["src/lib/platform/nativeNotifications.ts"],
      reminderPlan: srcFiles["src/lib/studyReminderPlan.ts"],
      deepLinks: srcFiles["src/lib/platform/deepLinks.ts"],
      bootstrap: srcFiles["src/components/native/NativeExperienceBootstrap.tsx"],
      intro: srcFiles["src/components/native/NativePermissionIntro.tsx"],
      settings: srcFiles["src/components/native/NativeSettingsSections.tsx"],
      settingsPage: srcFiles["src/features/settings/SettingsPage.tsx"],
      main: srcFiles["src/main.tsx"],
      store: srcFiles["src/lib/store.ts"],
      curriculumFreeze: srcFiles["src/lib/curriculumFreeze.ts"],
      privacyPage: srcFiles["src/features/privacy/PrivacyPage.tsx"],
      ptBR: srcFiles["src/locales/pt-BR.ts"],
      en: srcFiles["src/locales/en.ts"],
      manifest: read("android/app/src/main/AndroidManifest.xml"),
      appGradle: read("android/app/build.gradle"),
      rootGradle: read("android/build.gradle"),
      plugin: read(`${JAVA}/LongyuSpeechPlugin.java`),
      mainActivity: read(`${JAVA}/MainActivity.java`),
      nativeUxDoc: read("docs/ANDROID_NATIVE_UX.md"),
      envProduction: exists(".env.production") ? read(".env.production") : "",
    },
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

/** Corpo de uma função (do nome até a chave que fecha no mesmo nível). */
function fnBody(text, signature) {
  const start = String(text).indexOf(signature);
  if (start < 0) return "";
  let from = start + signature.length - 1;
  if (signature.endsWith("(")) {
    // Pula a lista de parâmetros (default `= {}` não é o corpo).
    let parens = 0;
    for (; from < text.length; from += 1) {
      if (text[from] === "(") parens += 1;
      else if (text[from] === ")" && --parens === 0) break;
    }
  }
  const open = text.indexOf("{", from);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "{") depth += 1;
    else if (text[i] === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return text.slice(start);
}

/** Bloco `nome: {` … `}` de um namespace de locale. */
function localeBlock(text, ns) {
  return fnBody(text, `  ${ns}: {`);
}

const navKeys = (body) => [...body.matchAll(/\bNAV\.(\w+)/g)].map((m) => m[1]);

/** `<uses-permission>` ativos (entradas com tools:node="remove" não contam). */
export function manifestPermissions(manifest) {
  return [...String(manifest).matchAll(/<uses-permission\b[^>]*>/g)].map((m) => ({
    name: /android:name="([^"]+)"/.exec(m[0])?.[1] ?? "",
    removed: /tools:node="remove"/.test(m[0]),
  }));
}

// ── Execução do plano de lembretes a partir do texto ────────────────────────
let importSeq = 0;
async function importTs(text) {
  const js = ts.transpileModule(text, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2213-"));
  const file = path.join(dir, `m${importSeq++}.mjs`);
  fs.writeFileSync(file, js);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// ── 1 · Safe area ─────────────────────────────────────────────────────────
export async function validateAndroidSafeArea(s) {
  const { failures, fail } = collector();
  const css = s.src.indexCss;
  for (const side of ["top", "bottom"]) {
    const decl = new RegExp(`--app-safe-${side}:\\s*([^;]+);`).exec(css)?.[1] ?? "";
    if (!decl) fail("SAFE_AREA_TOKEN_MISSING", "src/index.css", `--app-safe-${side} ausente`);
    if (!decl.includes(`var(--safe-area-inset-${side}`))
      fail("CAPACITOR_INSET_IGNORED", "src/index.css", `--app-safe-${side} precisa ler --safe-area-inset-${side} (Capacitor edge-to-edge)`);
    if (!decl.includes(`env(safe-area-inset-${side}`))
      fail("WEB_INSET_IGNORED", "src/index.css", `--app-safe-${side} precisa manter env(safe-area-inset-${side})`);
  }
  // Nenhum componente lê env() direto: só os tokens.
  for (const [rel, text] of Object.entries(s.srcFiles)) {
    if (rel === "src/index.css") continue;
    if (/env\(safe-area-inset-/.test(stripComments(text))) fail("RAW_SAFE_AREA_ENV", rel, "use var(--app-safe-*) em vez de env(safe-area-inset-*)");
  }
  const cssOutsideTokens = css.replace(/--app-safe-[a-z]+:[^;]+;/g, "");
  if (/env\(safe-area-inset-/.test(stripComments(cssOutsideTokens))) fail("RAW_SAFE_AREA_ENV", "src/index.css", "env() só nos tokens");
  if (!/pt-\[var\(--app-safe-top\)\]/.test(s.src.topBar)) fail("TOPBAR_SAFE_AREA_MISSING", "TopBar.tsx", "a TopBar desce abaixo da status bar");
  if (!/paddingBottom:\s*"var\(--app-safe-bottom\)"/.test(s.src.tabBar)) fail("TABBAR_SAFE_AREA_MISSING", "TabBar.tsx", "a TabBar sobe acima da barra de gestos");
  if (!/paddingBottom:\s*"max\(1rem, var\(--app-safe-bottom\)\)"/.test(s.src.tabBar)) fail("SHEET_SAFE_AREA_MISSING", "TabBar.tsx (TabSheet)", "sheet respeita a safe-area inferior");
  if (!/--app-safe-bottom/.test(s.src.intro)) fail("MODAL_SAFE_AREA_MISSING", "NativePermissionIntro.tsx", "o intro encosta na barra de gestos");
  if (!/pt-\[max\(0\.25rem,var\(--app-safe-top\)\)\]/.test(s.src.focusHeader)) fail("FOCUS_SAFE_AREA_MISSING", "LessonFocusHeader.tsx", "modo foco respeita a safe-area superior");
  if (!/viewport-fit=cover/.test(s.src.indexHtml)) fail("VIEWPORT_FIT_MISSING", "index.html", "viewport-fit=cover habilita as insets");
  if (/fixed inset-x-0 top-20\b/.test(s.src.loja)) fail("TOAST_UNDER_HEADER", "LojaPage.tsx", "toast fixo precisa ficar abaixo de --app-header-height");
  return failures;
}

// ── 2 · Navegação mobile ──────────────────────────────────────────────────
export async function validateMobileNavigationDensity(s) {
  const { failures, fail } = collector();
  const nav = stripComments(s.src.nav);
  const bar = navKeys(fnBody(nav, "export function mobileNavForStage("));
  if (bar.length > 5) fail("TABBAR_TOO_MANY", "nav.tsx mobileNavForStage", `${bar.length} itens (máximo 5)`);
  if (bar.includes("perfil")) fail("PROFILE_IN_TABBAR", "nav.tsx mobileNavForStage", "Perfil entra pelo avatar da TopBar");
  if (!bar.includes("cultura")) fail("CULTURE_HIDDEN_IN_MORE", "nav.tsx mobileNavForStage", "Cultura é navegação primária");
  if (JSON.stringify(bar) !== JSON.stringify(MOBILE_TABBAR)) fail("TABBAR_ITEMS_WRONG", "nav.tsx mobileNavForStage", `${bar.join(",")} ≠ ${MOBILE_TABBAR.join(",")}`);
  const mobileConst = /export const NAV_MOBILE: NavItem\[\] = \[([\s\S]*?)\n\];/.exec(nav)?.[1] ?? "";
  if (JSON.stringify(navKeys(mobileConst)) !== JSON.stringify(MOBILE_TABBAR)) fail("TABBAR_ITEMS_WRONG", "nav.tsx NAV_MOBILE", "NAV_MOBILE diverge da barra");
  if (/"\/cultura"/.test(mobileConst) || /"\/cultura"/.test(fnBody(nav, "export function mobileNavForStage("))) fail("CULTURE_UNDER_MORE_MATCH", "nav.tsx", "Mais não pode acender em /cultura");
  const moreSheet = fnBody(nav, "export function moreMobileSheetGroups(");
  if (navKeys(moreSheet).includes("cultura")) fail("CULTURE_DUPLICATED_IN_MORE", "nav.tsx moreMobileSheetGroups", "Cultura já é aba");
  const practice = navKeys(fnBody(nav, "export function practiceMobileSheetItems(")).filter((key) => key !== "revisao");
  if (!practice.includes("fala")) fail("SPEAKING_HIDDEN", "nav.tsx practiceMobileSheetItems", "Fala continua visível (também no Android)");
  if (JSON.stringify(practice) !== JSON.stringify(PRACTICE_SHEET)) fail("PRACTICE_SHEET_ORDER", "nav.tsx practiceMobileSheetItems", `${practice.join(",")} ≠ ${PRACTICE_SHEET.join(",")}`);
  if (!/grid grid-cols-2 gap-2/.test(s.src.tabBar)) fail("PRACTICE_SHEET_NOT_COMPACT", "TabBar.tsx", "sheet em 2 colunas");
  const top = stripComments(s.src.topBar);
  if (!/testId="topbar-qi"\s*outerClassName="hidden min-\[390px\]:inline-flex"/.test(top)) fail("TOPBAR_NOT_COMPACT", "TopBar.tsx", "Qi some abaixo de 390px");
  if (!/to="\/perfil"\s*data-testid="topbar-avatar"/.test(top)) fail("PROFILE_ENTRY_MISSING", "TopBar.tsx", "avatar leva ao Perfil");
  return failures;
}

// ── 3 · Densidade visual e alvos de toque ─────────────────────────────────
export async function validateMobileVisualDensity(s) {
  const { failures, fail } = collector();
  const touch = [
    ["TopBar StatPill", s.src.topBar, /"inline-flex min-h-12 items-center gap-1 rounded-full/],
    ["TopBar avatar", s.src.topBar, /data-testid="topbar-avatar"[\s\S]{0,120}className="flex h-12 w-12 shrink-0/],
    ["TabBar item", s.src.tabBar, /"flex min-h-14 min-w-0 flex-1 flex-col/],
    ["TabSheet item", s.src.tabBar, /"flex min-h-12 items-center gap-2\.5 rounded-2xl border/],
    ["SettingSwitch", s.src.settingSwitch, /className="flex h-12 w-14 shrink-0/],
  ];
  for (const [where, text, re] of touch) if (!re.test(text)) fail("TOUCH_TARGET_TOO_SMALL", where, "alvo de toque ≥ 48dp");
  if (!/<HubPage compact data-testid="culture-hub">/.test(s.src.cultureHub)) fail("DENSITY_REGRESSION", "CultureHubPage.tsx", "Cultura compacta no celular");
  if (!/<HubPage compact data-testid="immersion-hub">/.test(s.src.immersion)) fail("DENSITY_REGRESSION", "ImmersionPage.tsx", "Imersão compacta no celular");
  if (!/compact \? "space-y-3\.5 sm:space-y-5" : "space-y-5"/.test(s.src.hubLayout)) fail("DENSITY_REGRESSION", "HubLayout.tsx", "HubPage compact aperta só no celular");
  if (!/className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-5" data-testid="profile-header"/.test(s.src.profile))
    fail("DENSITY_REGRESSION", "ProfilePage.tsx", "cabeçalho do Perfil horizontal no celular");
  const statTile = fnBody(s.src.page, "export function StatTile(");
  if (/truncate text-\[10px\]/.test(statTile)) fail("LABEL_TRUNCATED", "page.tsx StatTile", "rótulo quebra em vez de cortar");
  return failures;
}

// ── 4 · TTS nativo ────────────────────────────────────────────────────────
export async function validateNativeTts(s) {
  const { failures, fail } = collector();
  const tts = stripComments(s.src.tts);
  const speakFn = fnBody(tts, "export function speak(");
  if (!/if \(hasNativeSpeech\(\)\) \{\s*speakNative\(text, opts\);\s*return;/.test(speakFn)) fail("TTS_NOT_NATIVE", "tts.ts speak()", "Android fala pelo TextToSpeech nativo");
  const available = fnBody(tts, "export function isTTSAvailable(");
  if (!/if \(hasNativeSpeech\(\)\) return nativeTtsKnownAvailable !== false;/.test(available))
    fail("TTS_REQUIRES_WEB_SPEECH", "tts.ts isTTSAvailable()", "no Android não depende de speechSynthesis");
  const speakNative = fnBody(tts, "function speakNative(");
  // RC2.2.17 · C — onerror agora leva o código honesto do motor (result.code).
  if (!/\} else \{[\s\S]*?opts\.onerror\?\.\((?:result\.code)?\);[\s\S]*?\}\s*opts\.onend\?\.\(\);/.test(speakNative))
    fail("TTS_FAKE_SUCCESS", "tts.ts speakNative()", "falha nativa chama onerror (nunca finge que tocou)");
  if (!/disabled=\{unavailable && !usesNativeVoice\(\)\}/.test(s.src.speakButton))
    fail("SPEAK_BUTTON_DISABLED_ON_ANDROID", "SpeakButton.tsx", "o botão não morre por falta de speechSynthesis");
  // Um motor só: ninguém fora de tts.ts fala com speechSynthesis; ninguém fora do adapter registra o plugin.
  for (const [rel, text] of Object.entries(s.srcFiles)) {
    const code = stripComments(text);
    if (rel !== "src/lib/tts.ts" && /speechSynthesis\s*\.\s*speak|new SpeechSynthesisUtterance/.test(code))
      fail("PARALLEL_TTS_ENGINE", rel, "fala só por speak() de src/lib/tts.ts");
    if (rel !== "src/lib/platform/nativeSpeech.ts" && /registerPlugin[^(]*\(\s*"LongyuSpeech"/.test(code))
      fail("PARALLEL_TTS_ENGINE", rel, "o plugin LongyuSpeech só é registrado no adapter");
    if (!rel.startsWith("src/lib/") && /\bnativeSpeak\(/.test(code)) fail("PARALLEL_TTS_ENGINE", rel, "telas usam speak(), não o adapter");
  }
  if (!/MANDARIN_LANGUAGE = "zh-CN"/.test(s.src.nativeSpeech)) fail("TTS_LANGUAGE_WRONG", "nativeSpeech.ts", "voz zh-CN");
  const java = stripComments(s.src.plugin);
  if (!/tts\.speak\(text, TextToSpeech\.QUEUE_FLUSH/.test(java)) fail("TTS_QUEUE_NOT_FLUSH", "LongyuSpeechPlugin.java", "QUEUE_FLUSH: uma fala por vez");
  if (!/LANG_MISSING_DATA\) return "TTS_LANGUAGE_MISSING_DATA"/.test(java) || !/LANG_NOT_SUPPORTED\) return "TTS_LANGUAGE_NOT_SUPPORTED"/.test(java))
    fail("TTS_UNAVAILABILITY_HIDDEN", "LongyuSpeechPlugin.java", "voz ausente vira erro honesto");
  const onPause = fnBody(java, "protected void handleOnPause(");
  if (!/tts\.stop\(\)/.test(onPause)) fail("TTS_NOT_STOPPED_ON_BACKGROUND", "LongyuSpeechPlugin.java handleOnPause", "voz para no background");
  if (!/registerPlugin\(LongyuSpeechPlugin\.class\);\s*super\.onCreate/.test(stripComments(s.src.mainActivity)))
    fail("PLUGIN_NOT_REGISTERED", "MainActivity.java", "registerPlugin antes de super.onCreate");
  return failures;
}

// ── 5 · Reconhecimento nativo ─────────────────────────────────────────────
export async function validateNativeSpeechRecognition(s) {
  const { failures, fail } = collector();
  const java = stripComments(s.src.plugin);
  const start = fnBody(java, "public void startRecognition(");
  if (!/getPermissionState\("microphone"\) != PermissionState\.GRANTED/.test(start)) fail("RECOGNITION_WITHOUT_PERMISSION", "startRecognition", "sem permissão, não escuta");
  if (!/SpeechRecognizer\.createOnDeviceSpeechRecognizer/.test(start) || !/SDK_INT >= Build\.VERSION_CODES\.S/.test(start))
    fail("ON_DEVICE_MISSING", "startRecognition", "on-device quando API ≥ 31 e disponível");
  if (/DICTATION_MODE|EXTRA_SEGMENTED_SESSION|startListening[\s\S]{0,200}startListening/.test(java) || /EXTRA_PARTIAL_RESULTS, true/.test(java))
    fail("CONTINUOUS_LISTENING", "LongyuSpeechPlugin.java", "uma escuta por toque");
  if (!/if \(recognitionCall != null\) \{[\s\S]{0,160}RECOGNIZER_BUSY/.test(start)) fail("NOT_SINGLE_FLIGHT", "startRecognition", "segundo toque = RECOGNIZER_BUSY");
  if (!/main\.postDelayed\(recognitionTimeout, timeout\)/.test(start)) fail("NO_TIMEOUT", "startRecognition", "timeout obrigatório");
  if (!/recognizer\.destroy\(\);/.test(fnBody(java, "private void releaseRecognizer("))) fail("RECOGNIZER_NOT_DESTROYED", "releaseRecognizer", "destruir após o uso");
  if (!/failRecognition\("CANCELLED"\)/.test(fnBody(java, "protected void handleOnPause("))) fail("NOT_CANCELLED_ON_BACKGROUND", "handleOnPause", "microfone nunca fica ouvindo no background");
  const errorMap = fnBody(java, "static String errorCode(");
  for (const code of RECOGNITION_ERROR_CODES) if (!errorMap.includes(`return "${code}"`)) fail("ERROR_MAPPING_INCOMPLETE", "errorCode", code);
  const perms = manifestPermissions(s.src.manifest);
  if (!perms.some((p) => p.name === "android.permission.RECORD_AUDIO" && !p.removed)) fail("RECORD_AUDIO_MISSING", "AndroidManifest.xml", "RECORD_AUDIO");
  if (!/<queries>[\s\S]*android\.speech\.RecognitionService[\s\S]*<\/queries>/.test(s.src.manifest)) fail("RECOGNITION_QUERY_MISSING", "AndroidManifest.xml", "Android 11+ precisa ver o RecognitionService");
  const adapter = stripComments(s.src.nativeSpeech);
  const recognize = fnBody(adapter, "export async function nativeRecognize(");
  if (!/if \(recognitionInFlight\) return \{ ok: false, code: "RECOGNIZER_BUSY" \};/.test(recognize)) fail("NOT_SINGLE_FLIGHT", "nativeSpeech.ts nativeRecognize", "single-flight no JS");
  if (!/await nativeStopSpeaking\(\);[\s\S]*LongyuSpeech\.startRecognition/.test(recognize)) fail("TTS_NOT_STOPPED_BEFORE_LISTEN", "nativeSpeech.ts nativeRecognize", "a voz para antes de ouvir");
  const speech = stripComments(s.src.speech);
  if (!/if \(hasNativeSpeech\(\)\) return recognizeOnceNative\(/.test(fnBody(speech, "export function recognizeOnce("))) fail("SPEECH_NOT_NATIVE", "speech.ts recognizeOnce", "Android usa o SpeechRecognizer");
  if (!/if \(hasNativeSpeech\(\)\) return nativeRecognitionKnownAvailable !== false;/.test(fnBody(speech, "export function isRecognitionAvailable(")))
    fail("SPEAKING_HIDDEN_ON_ANDROID", "speech.ts isRecognitionAvailable", "Fala disponível no Android até o SO dizer que não");
  const practice = stripComments(s.src.pronunciation);
  if (!/cancelRecognition\(\);/.test(practice)) fail("NOT_CANCELLED_ON_LEAVE", "PronunciationPractice.tsx", "sair da tela cancela a escuta");
  for (const key of ["player.micAllow", "player.micOpenSettings", "player.listening"]) {
    const [ns, leaf] = key.split(".");
    const inUi = practice.includes(`t("${key}")`);
    const inLocale = new RegExp(`\\b${leaf}:`).test(localeBlock(s.src.ptBR, ns));
    if (!inUi || !inLocale) fail("MIC_UX_STATES_MISSING", "PronunciationPractice.tsx", key);
  }
  const claims = /tom perfeito|precisão de tom|pronúncia perfeita|perfect tone|tone accuracy|nota do tom/i;
  for (const [where, text] of [
    ["pt-BR nativeApp", localeBlock(s.src.ptBR, "nativeApp")],
    ["en nativeApp", localeBlock(s.src.en, "nativeApp")],
    ["speech.ts", s.src.speech],
    ["LongyuSpeechPlugin.java", s.src.plugin],
  ])
    if (claims.test(text)) fail("TONE_ACCURACY_CLAIM", where, "o reconhecedor devolve texto; nada de nota de tom");
  if (!s.src.ptBR.includes(SPEECH_PRIVACY_PT)) fail("SPEECH_PRIVACY_COPY_MISSING", "pt-BR", SPEECH_PRIVACY_PT);
  if (!/t\("nativeApp\.speechPrivacy"\)/.test(s.src.settings)) fail("SPEECH_PRIVACY_COPY_MISSING", "NativeSettingsSections.tsx", "privacidade visível em Áudio e fala");
  return failures;
}

// ── 6 · Permissões + invariantes da onda ──────────────────────────────────
export async function validateNativePermissions(s) {
  const { failures, fail } = collector();
  const perms = manifestPermissions(s.src.manifest);
  for (const p of perms) {
    if (p.removed) continue;
    if (EXACT_ALARM_PERMISSIONS.includes(p.name)) fail("EXACT_ALARM_PERMISSION", "AndroidManifest.xml", `${p.name} ativo (lembrete de estudo não é alarme)`);
    else if (FORBIDDEN_PERMISSION_RE.test(p.name)) fail("FORBIDDEN_PERMISSION", "AndroidManifest.xml", p.name);
    else if (!ALLOWED_PERMISSIONS.includes(p.name)) fail("FORBIDDEN_PERMISSION", "AndroidManifest.xml", `${p.name} fora da lista`);
  }
  for (const name of EXACT_ALARM_PERMISSIONS)
    if (!perms.some((p) => p.name === name && p.removed)) fail("EXACT_ALARM_PERMISSION", "AndroidManifest.xml", `${name} do plugin precisa de tools:node="remove"`);
  if (!perms.some((p) => p.name === "android.permission.POST_NOTIFICATIONS" && !p.removed)) fail("NOTIFICATION_PERMISSION_MISSING", "AndroidManifest.xml", "POST_NOTIFICATIONS");
  if (Object.keys(s.dependencies).some((dep) => /firebase|@capacitor\/push-notifications|onesignal/i.test(dep))) fail("FIREBASE_ADDED", "package.json", "sem push de servidor");
  // O template do Capacitor só aplica google-services se houver google-services.json.
  if (/firebase/i.test(stripComments(s.src.appGradle) + stripComments(s.src.rootGradle)) || s.files.googleServicesJson)
    fail("FIREBASE_ADDED", "android/", "sem Google Services / Firebase");

  // Intro do primeiro launch.
  const intro = stripComments(s.src.intro);
  if (!/NATIVE_PERMISSION_INTRO_VERSION = 1;/.test(intro)) fail("INTRO_VERSION_WRONG", "NativePermissionIntro.tsx", "nativePermissionIntroVersion = 1");
  const request = fnBody(intro, "const requestSequentially = async");
  const notifAt = request.indexOf("await requestNotificationPermission()");
  const micAt = request.indexOf("await requestNativeMicrophone()");
  if (notifAt < 0 || micAt < 0 || notifAt > micAt) fail("PERMISSION_ORDER", "NativePermissionIntro.tsx", "1) notificações 2) microfone, em sequência");
  if (!/finally \{[^}]*finish\(\);/.test(request)) fail("DENIAL_BLOCKS_APP", "NativePermissionIntro.tsx", "recusa (ou erro) também fecha o intro");
  const boot = stripComments(s.src.bootstrap);
  if (!/if \(!android \|\| introVersion >= NATIVE_PERMISSION_INTRO_VERSION\) return null;/.test(boot)) fail("INTRO_NOT_GATED", "NativeExperienceBootstrap.tsx", "intro só no Android e só uma vez");
  if (!/nativePermissionIntroVersion: Math\.max\(s\.nativePermissionIntroVersion \?\? 0, version\)/.test(s.src.store)) fail("INTRO_REPEATS", "store.ts", "visto fica visto");
  if (/requestNotificationPermission|requestNativeMicrophone|requestPermissions/.test(boot)) fail("PERMISSION_ON_BOOT", "NativeExperienceBootstrap.tsx", "nada pedido sem o aluno tocar");
  if (!/<NativeExperienceBootstrap \/>/.test(s.src.main)) fail("INTRO_NOT_MOUNTED", "main.tsx", "bootstrap na raiz do router");

  // Configurações leem o SO.
  const settings = stripComments(s.src.settings);
  const refresh = fnBody(settings, "const refresh = useCallback(async");
  if (!/notificationPermission\(\),\s*nativeRecognitionStatus\(\),/.test(refresh) || !/subscribeAppLifecycle\(/.test(settings))
    fail("STALE_PERMISSION_STATE", "NativeSettingsSections.tsx", "estado real do Android, relido ao voltar");
  if (!/openNativeAppSettings/.test(settings) || !/onClick=\{\(\) => void openNativeAppSettings\(\)\}/.test(stripComments(s.src.pronunciation)))
    fail("NO_SETTINGS_PATH", "microfone negado", "caminho para os ajustes do Android");
  // RC2.2.14 — Configurações agrupa as seções por categoria (`parts`); a
  // exigência continua: Permissões, Notificações e Áudio e fala renderizadas.
  const nativeUses = [...String(s.src.settingsPage).matchAll(/<NativeSettingsSections(?:\s+parts=\{\[([^\]]*)\]\})?\s*\/>/g)];
  const nativeParts = new Set(nativeUses.flatMap((use) => (use[1] == null ? ["permissions", "notifications", "audio"] : [...use[1].matchAll(/"([a-z]+)"/g)].map((m) => m[1]))));
  if (!["permissions", "notifications", "audio"].every((part) => nativeParts.has(part)))
    fail("SETTINGS_SECTIONS_MISSING", "SettingsPage.tsx", "Permissões/Notificações/Áudio e fala");

  // QA físico: nenhum PASS sem aparelho.
  const qa = s.qa;
  const evidence = qa.formalPass === true && /^[0-9a-f]{40}$/.test(qa.sha ?? "") && qa.deviceModel && qa.isEmulator === false;
  for (const field of RC2_2_13_QA_FIELDS) {
    if (!(field in qa)) fail("QA_FIELD_MISSING", "android-physical-qa.json", field);
    else if (qa[field] === "PASS" && !evidence) fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "android-physical-qa.json", `${field}=PASS sem aparelho físico`);
  }
  if (s.operational.checks?.android_real_device?.pass === true && !evidence) fail("PHYSICAL_PASS_WITHOUT_EVIDENCE", "rc1-operational-checks.json", "android_real_device");

  // Invariantes: freeze, #273, username cloud.
  if (!/export const RC2_2_13_ANDROID_NATIVE_UX_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_13_ANDROID_NATIVE_UX_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  for (const id of CLOUD_CHECKS) if (s.operational.checks?.[id]?.pass !== false) fail("CLOUD_273_TOUCHED", id, "cloud segue adiada (#273)");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("CLOUD_273_TOUCHED", "rc2-candidate.json", "o candidate da #273 não muda");
  if (/VITE_USERNAME_LOGIN_ENABLED\s*=\s*"?true/.test(s.src.envProduction)) fail("USERNAME_FLAG_WITHOUT_CLOUD", ".env.production", "username login fica desligado");
  const privacy = s.dataSafety.items ?? [];
  if (!privacy.some((item) => item.data === "localNotifications" && item.collected === false)) fail("DATA_SAFETY_INCOMPLETE", "play-data-safety.json", "lembretes locais declarados (não coletados)");
  if (!/t\("privacyNotice\.notifications"\)/.test(s.src.privacyPage)) fail("PRIVACY_POLICY_GAP", "PrivacyPage.tsx", "notificações na política");
  return failures;
}

// ── 7 · Lembretes (plano executado) ───────────────────────────────────────
const DAY_MS = 86_400_000;
const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min).getTime();
const PREFS = { enabled: true, streak: true, comeback: true };

export async function validateStreakNotifications(s) {
  const { failures, fail } = collector();
  let plan;
  let links;
  try {
    plan = await importTs(s.src.reminderPlan);
    links = await importTs(s.src.deepLinks);
  } catch (error) {
    fail("REMINDER_PLAN_BROKEN", "studyReminderPlan.ts", String(error?.message ?? error));
    return failures;
  }
  const { planStudyReminders, streakRiskCopy, comebackCopy } = plan;
  const run = (over) => planStudyReminders({ now: at(2026, 9, 20, 15), streak: 5, lastStudyDate: "2026-09-20", prefs: PREFS, permissionGranted: true, locale: "pt-BR", ...over });

  if (run({ permissionGranted: false }).length) fail("NOTIFY_WITHOUT_PERMISSION", "planStudyReminders", "sem POST_NOTIFICATIONS, nada agendado");
  if (run({ prefs: { ...PREFS, enabled: false } }).length) fail("TOGGLE_OFF_IGNORED", "planStudyReminders", "toggle desligado cancela tudo");
  if (run({ prefs: { ...PREFS, streak: false } }).some((r) => r.kind === "risk")) fail("TOGGLE_OFF_IGNORED", "planStudyReminders", "Ofensiva desligada");
  if (run({ prefs: { ...PREFS, comeback: false } }).some((r) => r.kind === "comeback")) fail("TOGGLE_OFF_IGNORED", "planStudyReminders", "retorno desligado");

  // Estudou hoje (D=20/09): risco D+1 21:00; retornos D+2..D+4 21:00.
  const base = run({});
  const risk = base.filter((r) => r.kind === "risk");
  if (risk.length !== 1 || risk[0].at !== at(2026, 9, 21, 21)) fail("RISK_TIMING", "planStudyReminders", "UM aviso de risco em D+1 21:00 (~3 h antes da quebra)");
  const comebackAt = base.filter((r) => r.kind === "comeback").map((r) => r.at);
  if (JSON.stringify(comebackAt) !== JSON.stringify([at(2026, 9, 22, 21), at(2026, 9, 23, 21), at(2026, 9, 24, 21)]))
    fail("COMEBACK_SCHEDULE", "planStudyReminders", "retorno em D+2, D+3 e D+4 às 21:00");

  // Varredura: agora em cada hora de D+1..D+6.
  for (let day = 20; day <= 26; day += 1) {
    for (let hour = 0; hour < 24; hour += 1) {
      const now = at(2026, 9, day, hour, 30);
      const out = run({ now });
      const ids = out.map((r) => r.id);
      if (new Set(ids).size !== ids.length || out.filter((r) => r.kind === "risk").length > 1)
        fail("DUPLICATE_REMINDERS", `now=${day}/09 ${hour}:30`, "IDs fixos e únicos; no máximo 1 risco pendente");
      for (let i = 0; i < out.length; i += 1) {
        const r = out[i];
        const h = new Date(r.at).getHours();
        if (h >= 22 || h < 8) fail("QUIET_HOURS_VIOLATED", `now=${day}/09 ${hour}:30`, `${r.kind} às ${h}h`);
        if (r.at <= now) fail("REMINDER_IN_PAST", `now=${day}/09 ${hour}:30`, r.kind);
        if (r.kind === "risk" && r.at >= at(2026, 9, 22)) fail("RISK_AFTER_BREAK", `now=${day}/09 ${hour}:30`, "aviso de risco depois de a ofensiva quebrar");
        if (r.at >= at(2026, 9, 25)) fail("COMEBACK_NOT_STOPPED", `now=${day}/09 ${hour}:30`, "depois do dia 4 longe, silêncio");
        if (i > 0 && r.at - out[i - 1].at < 23 * 3_600_000) fail("MORE_THAN_ONE_PER_DAY", `now=${day}/09 ${hour}:30`, "no máximo 1 lembrete por 24 h");
      }
    }
  }
  // Estudar de novo refaz o plano: nada para o dia em que já estudou.
  const restudied = run({ now: at(2026, 9, 21, 10), lastStudyDate: "2026-09-21" });
  if (restudied.some((r) => r.at < at(2026, 9, 22)) || restudied.find((r) => r.kind === "risk")?.at !== at(2026, 9, 22, 21))
    fail("RESCHEDULE_AFTER_STUDY", "planStudyReminders", "estudou → risco passa para o dia seguinte");

  // Cópias.
  const titles = [1, 2, 3, 4, 5].map((n) => streakRiskCopy(n, "pt-BR").title);
  if (new Set(titles).size !== titles.length) fail("STREAK_COPY_WRONG", "streakRiskCopy", "1, 2, 3, 4 e 5–6 têm cópias próprias");
  const milestones = { 7: /semana/i, 14: /duas semanas/i, 30: /mês/i, 50: /50/, 100: /100/ };
  for (const [n, re] of Object.entries(milestones)) if (!re.test(streakRiskCopy(Number(n), "pt-BR").title)) fail("STREAK_COPY_WRONG", "streakRiskCopy", `marco ${n}`);
  for (const n of [8, 23, 61]) {
    const title = streakRiskCopy(n, "pt-BR").title;
    if (!title.includes(String(n)) || !/risco/i.test(title)) fail("STREAK_COPY_WRONG", "streakRiskCopy", `risco genérico com N (${n})`);
  }
  const comebacks = [2, 3, 4].map((d) => comebackCopy(d, "pt-BR")?.title);
  if (comebacks.some((title) => !title) || new Set(comebacks).size !== 3) fail("COMEBACK_COPY_DUPLICATED", "comebackCopy", "dias 2, 3 e 4 com cópias diferentes");
  if (comebackCopy(5, "pt-BR") !== null) fail("COMEBACK_NOT_STOPPED", "comebackCopy", "dia 5 = silêncio");

  // Toque → allowlist de deep link.
  for (const url of [plan.REMINDER_URL_RISK, plan.REMINDER_URL_COMEBACK]) {
    const route = links.resolveDeepLink(url);
    if (!route || !["/jornada", "/revisao"].includes(route)) fail("DEEP_LINK_NOT_ALLOWED", "studyReminderPlan.ts", `${url} → ${route}`);
  }

  // Agendamento: inexato, idempotente, ícone e canais.
  const notif = stripComments(s.src.nativeNotifications);
  if (/isExactNotification:\s*true|allowWhileIdle:\s*true/.test(notif) || (notif.match(/isExactNotification:\s*false/g) ?? []).length < 2)
    fail("EXACT_ALARM_SCHEDULE", "nativeNotifications.ts", "agendamento inexato (sem alarme)");
  if (!/await cancelAllReminders\(\);\s*if \(!plan\.length\) return 0;/.test(fnBody(notif, "export async function applyReminderPlan(")))
    fail("DUPLICATE_REMINDERS", "applyReminderPlan", "cancela antes de agendar");
  if (!/NOTIFICATION_SMALL_ICON = "ic_stat_longyu"/.test(notif) || !s.files.statusIcon) fail("STATUS_ICON_MISSING", "res/drawable/ic_stat_longyu.xml", "ícone monocromático");
  if (!/id: "streak", name: "Ofensiva"/.test(notif)) fail("CHANNEL_MISSING", "nativeNotifications.ts", "canal streak (Ofensiva)");

  // Bootstrap: um listener, resolvedor, estado real, reconciliação no resume.
  const boot = stripComments(s.src.bootstrap);
  if (!/const route = url \? resolveDeepLink\(url\) : null;/.test(boot)) fail("TAP_BYPASSES_DEEP_LINK", "NativeExperienceBootstrap.tsx", "toque passa pelo resolveDeepLink");
  const tapDeps = /void onReminderTap\([\s\S]*?\}, (\[[^\]]*\])\);/.exec(boot)?.[1];
  if (tapDeps !== "[android]" || (boot.match(/onReminderTap\(/g) ?? []).length !== 1)
    fail("LISTENER_DUPLICATED", "NativeExperienceBootstrap.tsx", "listener registrado uma vez");
  if (!/permissionGranted: permission === "granted",/.test(boot) || !/const permission = await notificationPermission\(\);/.test(boot))
    fail("STALE_PERMISSION_STATE", "NativeExperienceBootstrap.tsx", "permissão real do SO a cada reconciliação");
  if (!/subscribeAppLifecycle\(/.test(boot) || !/\}, \[android, streak, lastStudyDate, prefs, locale, resumeTick\]\);/.test(boot))
    fail("NO_RESUME_RECONCILE", "NativeExperienceBootstrap.tsx", "reconciliar ao abrir/voltar e ao estudar");
  const settings = stripComments(s.src.settings);
  if (!/\{!isProductionBetaEnv\(\) && \(\s*<HubSection id="diagnostico-nativo"/.test(settings)) fail("DEV_REMINDER_IN_PRODUCTION", "NativeSettingsSections.tsx", "+60 s só fora de production_beta");
  if (!/### Limitação: lembretes são só locais/.test(s.src.nativeUxDoc)) fail("LOCAL_ONLY_UNDOCUMENTED", "docs/ANDROID_NATIVE_UX.md", "limitação local documentada");
  return failures;
}

export const GATES = {
  "android-safe-area": validateAndroidSafeArea,
  "mobile-navigation-density": validateMobileNavigationDensity,
  "mobile-visual-density": validateMobileVisualDensity,
  "native-tts": validateNativeTts,
  "native-speech-recognition": validateNativeSpeechRecognition,
  "native-permissions": validateNativePermissions,
  "streak-notifications": validateStreakNotifications,
};
