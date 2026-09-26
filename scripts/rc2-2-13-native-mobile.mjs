#!/usr/bin/env node
/**
 * RC2.2.13 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-13-native-mobile.mjs validate <área>
 *   node scripts/rc2-2-13-native-mobile.mjs test <área>
 *
 * validate = gate sobre o estado real do repositório.
 * test     = o estado real passa E cada mutação é pega com o código certo.
 * Gates em scripts/lib/rc2-2-13-gates.mjs.
 */
import assert from "node:assert/strict";
import { GATES, loadState, report } from "./lib/rc2-2-13-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = GATES[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(GATES).join("|")}>`);
  process.exit(2);
}
const name = `${mode}:${area}`;
const base = await loadState();

if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(name, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: trecho não encontrado → ${from.slice(0, 90)}`);
  return String(text).split(from).join(to);
}
/** Muta s.src[key] (e o espelho em s.srcFiles, quando existir). */
const SRC_PATH = {
  indexCss: "src/index.css",
  topBar: "src/components/layout/TopBar.tsx",
  tabBar: "src/components/layout/TabBar.tsx",
  nav: "src/components/layout/nav.tsx",
  tts: "src/lib/tts.ts",
  speakButton: "src/components/ui/SpeakButton.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
};
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
  const rel = SRC_PATH[key];
  if (rel) s.srcFiles[rel] = s.src[key];
};
const both = (...mutations) => (s) => mutations.forEach((mutate) => mutate(s));
const file = (rel, from, to) => (s) => {
  s.srcFiles[rel] = swap(s.srcFiles[rel], from, to);
};

const MUTATIONS = {
  "android-safe-area": [
    ["DF1. token ignora a inset do Capacitor", "CAPACITOR_INSET_IGNORED", src("indexCss", "--app-safe-top: max(var(--safe-area-inset-top, 0px), env(safe-area-inset-top, 0px));", "--app-safe-top: env(safe-area-inset-top, 0px);")],
    ["DF2. token ignora env() da Web", "WEB_INSET_IGNORED", src("indexCss", "--app-safe-bottom: max(var(--safe-area-inset-bottom, 0px), env(safe-area-inset-bottom, 0px));", "--app-safe-bottom: var(--safe-area-inset-bottom, 0px);")],
    ["DF3. componente lê env() direto", "RAW_SAFE_AREA_ENV", file("src/components/layout/AppShell.tsx", "pb-[calc(var(--app-safe-bottom)+1rem)]", "pb-[calc(env(safe-area-inset-bottom)+1rem)]")],
    ["DF4. TopBar sem safe-area", "TOPBAR_SAFE_AREA_MISSING", src("topBar", "pt-[var(--app-safe-top)]", "pt-0")],
    ["DF5. TabBar sem safe-area", "TABBAR_SAFE_AREA_MISSING", src("tabBar", 'style={{ paddingBottom: "var(--app-safe-bottom)" }}', "style={{ paddingBottom: 0 }}")],
    ["DF6. sheet sem safe-area", "SHEET_SAFE_AREA_MISSING", src("tabBar", 'paddingBottom: "max(1rem, var(--app-safe-bottom))"', 'paddingBottom: "1rem"')],
    ["DF7. cartão de orientação sem safe-area", "MODAL_SAFE_AREA_MISSING", src("guidanceHost", "var(--app-safe-bottom, 0px) + 12px", "12px")],
    ["DF8. modo foco sem safe-area", "FOCUS_SAFE_AREA_MISSING", src("focusHeader", "pt-[max(0.25rem,var(--app-safe-top))]", "pt-1")],
    ["DF9. viewport sem cover", "VIEWPORT_FIT_MISSING", src("indexHtml", ", viewport-fit=cover", "")],
    ["DF10. toast da Loja sob o header", "TOAST_UNDER_HEADER", src("loja", "fixed inset-x-0 top-[calc(var(--app-header-height)+0.5rem)]", "fixed inset-x-0 top-20")],
  ],
  "mobile-navigation-density": [
    ["DG1. Perfil volta como 6ª aba", "TABBAR_TOO_MANY", src("nav", "    NAV.missoes,\n    NAV.mais,\n  ].filter((item) => isNavItemDiscovered(item, visibility));\n}", "    NAV.missoes,\n    NAV.perfil,\n    NAV.mais,\n  ].filter((item) => isNavItemDiscovered(item, visibility));\n}")],
    ["DG2. Cultura some da barra (Perfil no lugar)", "CULTURE_HIDDEN_IN_MORE", src("nav", "    NAV.treino,\n    NAV.cultura,\n    NAV.missoes,\n    NAV.mais,\n  ].filter((item) => isNavItemDiscovered(item, visibility));\n}", "    NAV.treino,\n    NAV.perfil,\n    NAV.missoes,\n    NAV.mais,\n  ].filter((item) => isNavItemDiscovered(item, visibility));\n}")],
    ["DG2b. Perfil na barra", "PROFILE_IN_TABBAR", src("nav", "    NAV.treino,\n    NAV.cultura,\n    NAV.missoes,\n    NAV.mais,\n  ].filter((item) => isNavItemDiscovered(item, visibility));\n}", "    NAV.treino,\n    NAV.perfil,\n    NAV.missoes,\n    NAV.mais,\n  ].filter((item) => isNavItemDiscovered(item, visibility));\n}")],
    ["DG3. Cultura duplicada no sheet Mais", "CULTURE_DUPLICATED_IN_MORE", src("nav", "const explore = [NAV.loja, NAV.ligas, NAV.conquistas]", "const explore = [NAV.cultura, NAV.loja, NAV.ligas, NAV.conquistas]")],
    ["DG4. Fala escondida", "SPEAKING_HIDDEN", src("nav", "[NAV.ideogramas, NAV.pinyin, NAV.fala, NAV.leitura, NAV.imersao, NAV.biblioteca]", "[NAV.ideogramas, NAV.pinyin, NAV.leitura, NAV.imersao, NAV.biblioteca]")],
    ["DG5. ordem do sheet Praticar", "PRACTICE_SHEET_ORDER", src("nav", "[NAV.ideogramas, NAV.pinyin, NAV.fala, NAV.leitura, NAV.imersao, NAV.biblioteca]", "[NAV.ideogramas, NAV.pinyin, NAV.fala, NAV.leitura, NAV.biblioteca, NAV.imersao]")],
    ["DG6. NAV_MOBILE diverge", "TABBAR_ITEMS_WRONG", src("nav", "export const NAV_MOBILE: NavItem[] = [\n  NAV.jornada,\n  NAV.treino,\n  NAV.cultura,", "export const NAV_MOBILE: NavItem[] = [\n  NAV.jornada,\n  NAV.treino,\n  NAV.imersao,")],
    ["DG7. Mais acende em /cultura", "CULTURE_UNDER_MORE_MATCH", src("nav", 'matches: [...MORE_MATCHES, "/loja", "/ligas"]', 'matches: [...MORE_MATCHES, "/loja", "/ligas", "/cultura"]')],
    ["DG8. Qi sempre visível", "TOPBAR_NOT_COMPACT", src("topBar", 'outerClassName="hidden min-[390px]:inline-flex"', 'outerClassName="inline-flex"')],
    ["DG9. avatar não leva ao Perfil", "PROFILE_ENTRY_MISSING", src("topBar", 'to="/perfil"\n          data-testid="topbar-avatar"', 'to="/conta"\n          data-testid="topbar-avatar"')],
    ["DG10. sheet em 1 coluna", "PRACTICE_SHEET_NOT_COMPACT", src("tabBar", "grid grid-cols-2 gap-2", "grid grid-cols-1 gap-2")],
  ],
  "mobile-visual-density": [
    ["DH1. pílula da TopBar < 48dp", "TOUCH_TARGET_TOO_SMALL", src("topBar", '"inline-flex min-h-12 items-center gap-1 rounded-full', '"inline-flex min-h-9 items-center gap-1 rounded-full')],
    ["DH2. avatar < 48dp", "TOUCH_TARGET_TOO_SMALL", src("topBar", 'className="flex h-12 w-12 shrink-0', 'className="flex h-9 w-9 shrink-0')],
    ["DH3. item da TabBar < 48dp", "TOUCH_TARGET_TOO_SMALL", src("tabBar", '"flex min-h-14 min-w-0 flex-1 flex-col', '"flex min-h-10 min-w-0 flex-1 flex-col')],
    ["DH4. item do sheet < 48dp", "TOUCH_TARGET_TOO_SMALL", src("tabBar", '"flex min-h-12 items-center gap-2.5 rounded-2xl border', '"flex min-h-10 items-center gap-2.5 rounded-2xl border')],
    ["DH5. interruptor < 48dp", "TOUCH_TARGET_TOO_SMALL", src("settingSwitch", 'className="flex h-12 w-14 shrink-0', 'className="flex h-10 w-14 shrink-0')],
    ["DH6. Cultura sem densidade mobile", "DENSITY_REGRESSION", src("cultureHub", '<HubPage compact data-testid="culture-hub">', '<HubPage data-testid="culture-hub">')],
    ["DH7. Imersão sem densidade mobile", "DENSITY_REGRESSION", src("immersion", '<HubPage compact data-testid="immersion-hub">', '<HubPage data-testid="immersion-hub">')],
    ["DH8. Perfil empilhado no celular", "DENSITY_REGRESSION", src("profile", 'className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-4 sm:p-5" data-testid="profile-header"', 'className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5" data-testid="profile-header"')],
    ["DH9. rótulo do StatTile cortado", "LABEL_TRUNCATED", src("page", '<span className="min-w-0 break-words text-[10px]', '<span className="truncate text-[10px]')],
  ],
  "native-tts": [
    ["DI1. speak() ignora o nativo", "TTS_NOT_NATIVE", src("tts", "  if (hasNativeSpeech()) {\n    speakNative(text, opts);\n    return;\n  }\n", "")],
    ["DI2. Android exige speechSynthesis", "TTS_REQUIRES_WEB_SPEECH", src("tts", "  if (hasNativeSpeech()) return nativeTtsKnownAvailable !== false;\n", "")],
    ["DI3. falha nativa finge que tocou", "TTS_FAKE_SUCCESS", src("tts", "      nativeTtsUnavailableReason = result.code;\n      opts.onerror?.(result.code);", "      nativeTtsUnavailableReason = result.code;")],
    ["DI4. SpeakButton desativado no Android", "SPEAK_BUTTON_DISABLED_ON_ANDROID", src("speakButton", "disabled={unavailable && !usesNativeVoice()}", "disabled={unavailable}")],
    ["DI5. motor de TTS paralelo numa tela", "PARALLEL_TTS_ENGINE", file("src/features/immersion/ImmersionPage.tsx", "export function ImmersionPage", "const parallelVoice = () => window.speechSynthesis.speak(new SpeechSynthesisUtterance(\"你好\"));\nexport function ImmersionPage")],
    ["DI5b. plugin registrado fora do adapter", "PARALLEL_TTS_ENGINE", file("src/components/ui/SpeakButton.tsx", "export function SpeakButton", "const Voice = registerPlugin(\"LongyuSpeech\");\nexport function SpeakButton")],
    ["DI6. QUEUE_ADD", "TTS_QUEUE_NOT_FLUSH", src("plugin", "tts.speak(text, TextToSpeech.QUEUE_FLUSH", "tts.speak(text, TextToSpeech.QUEUE_ADD")],
    ["DI7. voz ausente escondida", "TTS_UNAVAILABILITY_HIDDEN", src("plugin", 'if (result == TextToSpeech.LANG_MISSING_DATA) return "TTS_LANGUAGE_MISSING_DATA";', "")],
    ["DI8. voz continua no background", "TTS_NOT_STOPPED_ON_BACKGROUND", src("plugin", "        super.handleOnPause();\n        if (tts != null) tts.stop();", "        super.handleOnPause();")],
    ["DI9. plugin não registrado", "PLUGIN_NOT_REGISTERED", src("mainActivity", "registerPlugin(LongyuSpeechPlugin.class);", "")],
    ["DI10. idioma errado", "TTS_LANGUAGE_WRONG", src("nativeSpeech", 'MANDARIN_LANGUAGE = "zh-CN"', 'MANDARIN_LANGUAGE = "en-US"')],
  ],
  "native-speech-recognition": [
    ["DJ1. sem on-device", "ON_DEVICE_MISSING", src("plugin", "SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext())", "SpeechRecognizer.createSpeechRecognizer(getContext())")],
    ["DJ2. escuta contínua", "CONTINUOUS_LISTENING", src("plugin", "intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, false);", "intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);")],
    ["DJ3. reconhecedor não destruído", "RECOGNIZER_NOT_DESTROYED", src("plugin", "            recognizer.destroy();\n", "")],
    ["DJ4. background não cancela", "NOT_CANCELLED_ON_BACKGROUND", src("plugin", "        finishSpeak(true);\n        failRecognition(\"CANCELLED\");\n        // RC2.2.17 · AB", "        finishSpeak(true);\n        // RC2.2.17 · AB")],
    ["DJ5. sem timeout", "NO_TIMEOUT", src("plugin", "main.postDelayed(recognitionTimeout, timeout);", "")],
    ["DJ6. JS sem single-flight", "NOT_SINGLE_FLIGHT", src("nativeSpeech", '  if (recognitionInFlight) return { ok: false, code: "RECOGNIZER_BUSY" };\n', "")],
    ["DJ7. Java sem single-flight", "NOT_SINGLE_FLIGHT", src("plugin", "if (recognitionCall != null) {", "if (false) {")],
    ["DJ8. voz não para antes de ouvir", "TTS_NOT_STOPPED_BEFORE_LISTEN", src("nativeSpeech", "  await nativeStopSpeaking();\n  try {\n    const result = await LongyuSpeech.startRecognition", "  try {\n    const result = await LongyuSpeech.startRecognition")],
    ["DJ9. erro NO_MATCH sem mapeamento", "ERROR_MAPPING_INCOMPLETE", src("plugin", 'if (error == SpeechRecognizer.ERROR_NO_MATCH) return "NO_MATCH";', "")],
    ["DJ10. sem <queries> do RecognitionService", "RECOGNITION_QUERY_MISSING", src("manifest", '<action android:name="android.speech.RecognitionService" />', "")],
    ["DJ11. RECORD_AUDIO removida", "RECORD_AUDIO_MISSING", src("manifest", '<uses-permission android:name="android.permission.RECORD_AUDIO" />', "")],
    ["DJ12. Fala escondida no Android", "SPEAKING_HIDDEN_ON_ANDROID", src("speech", "if (hasNativeSpeech()) return nativeRecognitionKnownAvailable !== false;", "if (hasNativeSpeech()) return false;")],
    ["DJ13. sair da tela não cancela", "NOT_CANCELLED_ON_LEAVE", src("pronunciation", "      cancelRecognition();\n", "")],
    ["DJ14. promessa de tom", "TONE_ACCURACY_CLAIM", src("ptBR", 'testHeard: "Ouvi: {text}",', 'testHeard: "Ouvi: {text} — tom perfeito!",')],
    ["DJ15. privacidade da fala removida", "SPEECH_PRIVACY_COPY_MISSING", src("ptBR", 'speechPrivacy: "Longyu não armazena a gravação.', 'speechPrivacy: "Sua voz fica segura.')],
    ["DJ16. estado Abrir configurações removido", "MIC_UX_STATES_MISSING", src("pronunciation", '{t("player.micOpenSettings")}', '{t("player.speak")}')],
    ["DJ17. escuta sem permissão", "RECOGNITION_WITHOUT_PERMISSION", src("plugin", 'if (getPermissionState("microphone") != PermissionState.GRANTED) {', "if (false) {")],
    ["DJ18. recognizeOnce ignora o nativo", "SPEECH_NOT_NATIVE", src("speech", "  if (hasNativeSpeech()) return recognizeOnceNative(onResult, onError, timeoutMs);\n", "")],
  ],
  "native-permissions": [
    ["DK1. câmera", "FORBIDDEN_PERMISSION", src("manifest", '<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.CAMERA" />')],
    ["DK2. localização", "FORBIDDEN_PERMISSION", src("manifest", '<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />')],
    ["DK3. contatos", "FORBIDDEN_PERMISSION", src("manifest", '<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.READ_CONTACTS" />')],
    ["DK4. alarme exato do plugin volta", "EXACT_ALARM_PERMISSION", src("manifest", '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" tools:node="remove" />', '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" />')],
    ["DK5. USE_EXACT_ALARM declarado", "EXACT_ALARM_PERMISSION", src("manifest", '<uses-permission android:name="android.permission.USE_EXACT_ALARM" tools:node="remove" />', '<uses-permission android:name="android.permission.USE_EXACT_ALARM" />')],
    ["DK6. POST_NOTIFICATIONS removida", "NOTIFICATION_PERMISSION_MISSING", src("manifest", '<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />', "")],
    ["DK7. Firebase no package.json", "FIREBASE_ADDED", (s) => { s.dependencies["@capacitor-firebase/messaging"] = "7.0.0"; }],
    ["DK8. Firebase no Gradle", "FIREBASE_ADDED", (s) => { s.src.appGradle += "\ndependencies { implementation 'com.google.firebase:firebase-messaging:24.1.0' }\n"; }],
    ["DK8b. google-services.json", "FIREBASE_ADDED", (s) => { s.files.googleServicesJson = true; }],
    ["DK9. notificação e microfone pedidos juntos", "PERMISSION_ORDER", src("guidanceHost", "        void requestNotificationPermission();", "        void requestNotificationPermission().then(() => requestNativeMicrophone());")],
    ["DK10. negado volta a ser pedido toda sessão", "DENIAL_BLOCKS_APP", src("guidanceHost", 'setNotificationPromptable(permission === "prompt")', 'setNotificationPromptable(permission !== "granted")')],
    ["DK11. intro de permissões volta ao boot", "INTRO_NOT_GATED", src("bootstrap", "  return null;\n}", "  return <NativePermissionIntro onFinished={() => undefined} />;\n}")],
    ["DK12. intro repete", "INTRO_REPEATS", src("store", "nativePermissionIntroVersion: Math.max(s.nativePermissionIntroVersion ?? 0, version)", "nativePermissionIntroVersion: 0")],
    ["DK13. permissão pedida no boot", "PERMISSION_ON_BOOT", src("bootstrap", "    void refreshNativeTtsStatus();\n", "    void refreshNativeTtsStatus();\n    void requestNotificationPermission();\n")],
    ["DK14. Ajustes leem estado velho", "STALE_PERMISSION_STATE", src("settings", "      notificationPermission(),\n      nativeRecognitionStatus(),", '      Promise.resolve("granted" as NotificationPermission),\n      nativeRecognitionStatus(),')],
    ["DK15. microfone negado sem caminho", "NO_SETTINGS_PATH", src("pronunciation", "onClick={() => void openNativeAppSettings()}", "onClick={() => undefined}")],
    ["DK16. PASS físico sem aparelho", "PHYSICAL_PASS_WITHOUT_EVIDENCE", (s) => { s.qa.notificationPermission = "PASS"; }],
    ["DK17. campo de QA removido", "QA_FIELD_MISSING", (s) => { delete s.qa.nativeSpeech; }],
    ["DK18. exceção do freeze removida", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "export const RC2_2_13_ANDROID_NATIVE_UX_EXCEPTION", "export const RC2_2_13_REMOVED")],
    ["DK19. fingerprint muda", "FINGERPRINT_DRIFT", (s) => { s.freeze.fingerprint = "000000000000"; }],
    ["DK20. contagem muda", "CURRICULUM_COUNT_DRIFT", (s) => { s.freeze.counts.lessons += 1; }],
    ["DK21. #273 tocada", "CLOUD_273_TOUCHED", (s) => { s.rc2CandidateSha256 = "f".repeat(64); }],
    ["DK22. cloud_sync promovido", "CLOUD_273_TOUCHED", (s) => { s.operational.checks.cloud_sync.pass = true; }],
    ["DK23. username cloud ligado", "USERNAME_FLAG_WITHOUT_CLOUD", (s) => { s.src.envProduction += "\nVITE_USERNAME_LOGIN_ENABLED=true\n"; }],
    ["DK24. Data Safety sem lembretes", "DATA_SAFETY_INCOMPLETE", (s) => { s.dataSafety.items = s.dataSafety.items.filter((item) => item.data !== "localNotifications"); }],
    ["DK25. política sem notificações", "PRIVACY_POLICY_GAP", src("privacyPage", '{t("privacyNotice.notifications")}', "")],
  ],
  "streak-notifications": [
    ["DL1. agenda sem permissão", "NOTIFY_WITHOUT_PERMISSION", src("reminderPlan", "if (!input.permissionGranted || !prefs.enabled || !input.lastStudyDate) return [];", "if (!prefs.enabled || !input.lastStudyDate) return [];")],
    ["DL2. toggle off ignorado", "TOGGLE_OFF_IGNORED", src("reminderPlan", "if (!input.permissionGranted || !prefs.enabled || !input.lastStudyDate) return [];", "if (!input.permissionGranted || !input.lastStudyDate) return [];")],
    ["DL3. silêncio só a partir das 23h", "QUIET_HOURS_VIOLATED", src("reminderPlan", "export const QUIET_START_HOUR = 22;", "export const QUIET_START_HOUR = 23;")],
    ["DL4. risco fora da janela de ~3h", "RISK_TIMING", src("reminderPlan", "export const REMINDER_HOUR = 21;", "export const REMINDER_HOUR = 12;")],
    ["DL5. mais de um por dia", "MORE_THAN_ONE_PER_DAY", both(
      src("reminderPlan", "if (!previous || reminder.at - previous.at >= MIN_REMINDER_GAP_MS) spaced.push(reminder);", "spaced.push(reminder);"),
      src("reminderPlan", "const at = applyQuietHours(atLocal(lastDay, days, REMINDER_HOUR)).getTime();", "const at = applyQuietHours(atLocal(lastDay, days, 9)).getTime();")
    )],
    ["DL6. retorno não para no dia 4", "COMEBACK_NOT_STOPPED", both(
      src("reminderPlan", "export const COMEBACK_DAYS = [2, 3, 4] as const;", "export const COMEBACK_DAYS = [2, 3, 4, 5, 6] as const;"),
      src("reminderPlan", "  if (daysAway === 4) {", "  if (daysAway >= 4) {")
    )],
    ["DL7. cópias de retorno repetidas", "COMEBACK_COPY_DUPLICATED", src("reminderPlan", 'title: "🐉 Faz 3 dias"', 'title: "🐉 Dois dias longe do mandarim"')],
    ["DL8. risco depois da quebra", "RISK_AFTER_BREAK", both(
      src("reminderPlan", "      if (quiet < breaksAt) {", "      if (quiet > 0) {"),
      src("reminderPlan", "at = !isQuietHour(soon) && soon.getTime() < breaksAt ? soon.getTime() : Number.NaN;", "at = soon.getTime();")
    )],
    ["DL9. marco de 7 dias sem cópia própria", "STREAK_COPY_WRONG", src("reminderPlan", '  7: { title: "🔥 Uma semana de ofensiva"', '  70: { title: "🔥 Uma semana de ofensiva"')],
    ["DL10. risco genérico sem N", "STREAK_COPY_WRONG", src("reminderPlan", "{ title: `🔥 Sua ofensiva de ${n} dias está em risco`", '{ title: "🔥 Sua ofensiva está acesa"')],
    ["DL11. toque fora da allowlist", "DEEP_LINK_NOT_ALLOWED", src("reminderPlan", 'REMINDER_URL_COMEBACK = "longyu.noba.com://revisao"', 'REMINDER_URL_COMEBACK = "longyu.noba.com://admin"')],
    ["DL12. alarme exato no agendamento", "EXACT_ALARM_SCHEDULE", src("nativeNotifications", "      // Lembrete de estudo não é alarme: agendamento inexato.\n      isExactNotification: false,", "      isExactNotification: true,")],
    ["DL13. reagendar sem cancelar", "DUPLICATE_REMINDERS", src("nativeNotifications", "  await cancelAllReminders();\n  if (!plan.length) return 0;", "  if (!plan.length) return 0;")],
    ["DL14. toque ignora o resolvedor", "TAP_BYPASSES_DEEP_LINK", src("bootstrap", "const route = url ? resolveDeepLink(url) : null;", "const route = url;")],
    ["DL15. listener a cada render", "LISTENER_DUPLICATED", src("bootstrap", "      remove?.();\n    };\n  }, [android]);", "      remove?.();\n    };\n  }, [android, streak]);")],
    ["DL16. permissão presumida", "STALE_PERMISSION_STATE", src("bootstrap", 'permissionGranted: permission === "granted",', "permissionGranted: true,")],
    ["DL17. sem reconciliação no resume", "NO_RESUME_RECONCILE", src("bootstrap", "}, [android, streak, lastStudyDate, prefs, locale, resumeTick]);", "}, [android, streak, lastStudyDate, prefs, locale]);")],
    ["DL18. +60 s em produção", "DEV_REMINDER_IN_PRODUCTION", src("settings", "{!isProductionBetaEnv() && (", "{(")],
    ["DL19. ícone da status bar removido", "STATUS_ICON_MISSING", (s) => { s.files.statusIcon = false; }],
    ["DL20. canal Ofensiva removido", "CHANNEL_MISSING", src("nativeNotifications", '{ id: "streak", name: "Ofensiva"', '{ id: "reminders", name: "Lembretes"')],
    ["DL21. limitação local sem doc", "LOCAL_ONLY_UNDOCUMENTED", src("nativeUxDoc", "### Limitação: lembretes são só locais", "### Lembretes")],
    ["DL22. estudar não reagenda", "RESCHEDULE_AFTER_STUDY", src("reminderPlan", "let at = atLocal(lastDay, 1, REMINDER_HOUR).getTime();", "let at = atLocal(lastDay, 0, REMINDER_HOUR).getTime();")],
  ],
};

const real = await gate(base);
assert.deepEqual(real, [], `${name}: o estado real precisa passar\n${report(name, real)}`);
let killed = 0;
for (const [label, code, mutate] of MUTATIONS[area]) {
  const state = structuredClone(base);
  mutate(state);
  const failures = await gate(state);
  assert.ok(
    failures.some((failure) => failure.code === code),
    `${name}: mutação "${label}" deveria falhar com ${code}; veio ${failures.map((f) => f.code).join(", ") || "nada"}`
  );
  killed += 1;
  console.log(`KILLED ${label}: ${code}`);
}
console.log(`PASS ${name} (${killed} mutações)`);
