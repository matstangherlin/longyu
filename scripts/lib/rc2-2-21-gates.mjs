/**
 * RC2.2.21 — MOBILE NATIVE STABILITY.
 *
 * O gate valida CONTRATOS de código e a honestidade dos documentos; nunca
 * finge estado físico (ninguém ouviu a própria voz num Android por causa de
 * um gate). Nove áreas:
 *   native-voice-playback  gravar e OUVIR a própria voz: AudioAttributes
 *                          mídia/fala antes do prepare, foco transitório sempre
 *                          devolvido, PLAYING só após isPlaying(), códigos
 *                          estáveis, volume zerado, amplitude, duração real,
 *                          Parar/Ouvir novamente, microfone pedido
 *   native-speech          reconhecedor on-device só com zh-CN instalado, RMS,
 *                          categorias estáveis (CLIENT…), sem loop infinito,
 *                          TTS como mídia/fala e reconsulta após instalar voz
 *   mobile-lifecycle       pausa interrompe sem apagar; stop/destroy apagam;
 *                          pausa/retomada observadas
 *   mobile-layout          varredura 360/375/390 no E2E, sem tap-through no
 *                          fundo do modal, alvos ≥ 44px, safe areas por token
 *   mobile-navigation      VOLTAR: teclado → modal → orientação → subtela →
 *                          rota → só sai na raiz; um modal por VOLTAR
 *   auth-resilience        cadastro com prazo; OTP só em memória, nunca logado
 *   state-integrity        buffer técnico ≤150, só memória, só QA, sanitizado;
 *                          diagnóstico sem PII e sem PASS físico
 *   resource-cleanup       um dono do áudio por vez; posse velha não libera a
 *                          nova; ouvintes/URLs/arquivos liberados ao sair
 *   release-truth          base empilhada, QA físico NOT_RUN, bugs honestos,
 *                          NO_GO de beta, package/compras/#273/Production,
 *                          freeze e relatório com estados separados
 * Cada um devolve [{ code, where, why }]. Módulos puros são EMPACOTADOS a partir
 * do texto (esbuild), então as mutações do `test:*` valem de verdade.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_21_BASE_SHA = "b43ca4465319cb9632c68982de9ebbbba6dbb003";
export const RC2_2_21_PARENT_BRANCH = "claude/rc2-2-20-physical-beta-readiness";
export const RC2_2_21_P1 = [
  "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID",
  "NATIVE_SPEECH_NOT_PROVEN",
  "ANDROID_TTS_NOT_PROVEN_ACROSS_SURFACES",
  "LESSON_ADVANCE_DEVICE_REGRESSION_RISK",
  "MOBILE_SIGNUP_NOT_PHYSICALLY_PROVEN",
  "PASSWORD_RECOVERY_NOT_PHYSICALLY_PROVEN",
  "GUIDANCE_NOT_PHYSICALLY_PROVEN",
  "ANDROID_LIFECYCLE_STATE_LOSS",
];
const BUG_STATUSES = ["OPEN", "REPRODUCED", "ROOT_CAUSE_FOUND", "FIXED_CODE", "AUTOMATED_REGRESSION", "PHYSICAL_RETEST_PENDING", "PHYSICAL_PASS", "WONT_FIX_WITH_REASON"];
const PLAYBACK_CODES = ["NO_RECORDING", "INVALID_FILE", "PLAYER_PREPARE_FAILED", "AUDIO_FOCUS_FAILED", "PLAYBACK_START_FAILED", "OUTPUT_UNAVAILABLE", "MEDIA_VOLUME_ZERO", "PLAYBACK_INTERRUPTED", "PLAYBACK_ERROR"];
const RECOGNITION_CATEGORIES = ["NO_SPEECH", "AUDIO_CAPTURE", "NETWORK", "BUSY", "PERMISSION", "LANGUAGE_UNAVAILABLE", "SERVICE_UNAVAILABLE", "TIMEOUT", "CLIENT", "UNKNOWN"];
const AUDIO_OWNERS = ["IDLE", "TTS", "SELF_PLAYBACK", "RECORDING", "RECOGNITION"];
const PASS_EVIDENCE_FIELDS = ["testedAt", "buildSha", "versionCode", "deviceClass", "evidenceType"];
const REPORT_STATES = ["CODE PASS", "E2E PASS", "ANDROID QA BUILD PASS", "PLAY PHYSICAL PASS", "OWNER ACTION REQUIRED"];
const FORBIDDEN_DUPLICATES = /(LongyuSpeechPlugin2|LongyuVoicePlugin|AudioEngineV2|AudioEngine2|SpeechEngineV2|SecondAudioEngine|SrsV2|LessonEngineV2)\.(tsx?|mjs|java)$/;

export const FILES = {
  plugin: "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  selfPlayback: "src/lib/selfPlayback.ts",
  selfCompare: "src/features/lesson/SelfComparePractice.tsx",
  pronunciation: "src/features/lesson/PronunciationPractice.tsx",
  speech: "src/lib/speech.ts",
  speechFailure: "src/lib/speechFailure.ts",
  capability: "src/lib/recognitionCapability.ts",
  tts: "src/lib/tts.ts",
  speakButton: "src/components/ui/SpeakButton.tsx",
  audioPlayback: "src/lib/audioPlayback.ts",
  arbiter: "src/lib/audioArbiter.ts",
  techEvents: "src/lib/techEvents.ts",
  diagnostics: "src/lib/mobileDiagnostics.ts",
  console: "src/features/qa/MobileDiagnosticConsole.tsx",
  qaPage: "src/features/qa/QaDevicePage.tsx",
  main: "src/main.tsx",
  back: "src/lib/platform/backNavigation.ts",
  nativeShell: "src/lib/platform/nativeShell.ts",
  modalStack: "src/lib/modalStack.ts",
  modalOverlay: "src/components/ui/ModalOverlay.tsx",
  stepTrace: "src/lib/lessonStepTrace.ts",
  deviceQa: "src/lib/deviceQa.ts",
  signupTrace: "src/lib/signupTrace.ts",
  forgot: "src/features/auth/ForgotPasswordPage.tsx",
  authService: "src/services/authService.ts",
  ptBR: "src/locales/pt-BR.ts",
  en: "src/locales/en.ts",
  e2e: "e2e/rc2-2-21-mobile-native-stability.spec.ts",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

function walk(dir, out = []) {
  if (!exists(dir)) return out;
  for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|mjs|java)$/.test(entry.name)) out.push(rel);
  }
  return out;
}

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  return {
    fileNames: [...walk("src"), ...walk("android/app/src/main/java")],
    src,
    base: optionalJson("docs/release/rc2-2-21-base.json"),
    deviceQa: optionalJson("docs/release/rc2-2-21-device-qa.json"),
    bugs: optionalJson("docs/release/rc2-2-21-mobile-bugs.json"),
    report: exists("docs/reports/rc2-2-21-mobile-native-stability.md") ? read("docs/reports/rc2-2-21-mobile-native-stability.md") : "",
    rc2CandidateSha256: await sha256(read("docs/release/rc2-candidate.json")),
    freeze: loadBetaPedagogyFreezeState(),
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

/** Corpo de um método Java/TS a partir da assinatura (chaves balanceadas). */
function body(text, signature) {
  const source = String(text);
  const start = source.indexOf(signature);
  if (start < 0) return "";
  const open = source.indexOf("{", start + signature.length - 1);
  if (open < 0) return "";
  let depth = 1;
  let index = open + 1;
  while (index < source.length && depth > 0) {
    if (source[index] === "{") depth += 1;
    else if (source[index] === "}") depth -= 1;
    index += 1;
  }
  return source.slice(open + 1, index - 1);
}

const javaCode = (text) => String(text).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"])\/\/.*$/gm, "$1");

// ── Execução dos módulos puros a partir do TEXTO ──────────────────────────

const MODULE_KEYS = ["techEvents", "arbiter", "selfPlayback", "diagnostics", "modalStack", "back", "speechFailure", "capability", "deviceQa"];
const bundleCache = new Map();

export async function loadModules(s) {
  const cacheKey = MODULE_KEYS.map((key) => s.src[key]).join("\u0000");
  if (bundleCache.has(cacheKey)) return bundleCache.get(cacheKey);
  const overrides = new Map(MODULE_KEYS.map((key) => [path.join(ROOT, FILES[key]), s.src[key]]));
  const result = await build({
    stdin: {
      contents: MODULE_KEYS.map((key) => `export * as ${key} from "./${FILES[key]}";`).join("\n"),
      resolveDir: ROOT,
      loader: "ts",
      sourcefile: "rc2-2-21-entry.ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    // Build de QA (DEV): o buffer técnico e o diagnóstico ficam ligados.
    define: { "import.meta.env": '{"DEV":true}' },
    loader: { ".png": "empty", ".jpg": "empty", ".svg": "empty", ".css": "empty", ".webp": "empty" },
    plugins: [
      {
        name: "rc2-2-21-overrides",
        setup(pluginBuild) {
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2221-"));
  const file = path.join(dir, "bundle.mjs");
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    const mod = await import(pathToFileURL(file).href);
    bundleCache.set(cacheKey, mod);
    return mod;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function modulesOrFail(s, fail, where) {
  try {
    return await loadModules(s);
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
    return null;
  }
}

// ── 1. Ouvir a própria voz ─────────────────────────────────────────────────

export async function validateNativeVoicePlayback(s) {
  const { failures, fail } = collector();
  const java = javaCode(s.src.plugin);
  const play = body(java, "public void playPracticeRecording(PluginCall call)");
  if (!play) fail("PLAYBACK_NOT_IMPLEMENTED", FILES.plugin, "playPracticeRecording no plugin EXISTENTE");
  else {
    if (!/\.setUsage\(AudioAttributes\.USAGE_MEDIA\)/.test(play) || !/\.setContentType\(AudioAttributes\.CONTENT_TYPE_SPEECH\)/.test(play))
      fail("PLAYBACK_WRONG_AUDIO_ATTRIBUTES", "playPracticeRecording", "USAGE_MEDIA + CONTENT_TYPE_SPEECH (nunca a rota de chamada)");
    const attrAt = play.indexOf("practicePlayer.setAudioAttributes(attributes)");
    const sourceAt = play.indexOf("practicePlayer.setDataSource(");
    const prepareAt = play.indexOf("practicePlayer.prepare()");
    if (attrAt < 0 || sourceAt < 0 || prepareAt < 0 || attrAt > sourceAt || attrAt > prepareAt)
      fail("PLAYBACK_WRONG_AUDIO_ATTRIBUTES", "playPracticeRecording", "setAudioAttributes ANTES de setDataSource/prepare");
    if (!/requestPracticeFocus\(attributes\)/.test(play) || !/"AUDIO_FOCUS_FAILED"/.test(play)) fail("AUDIO_FOCUS_MISSING", "playPracticeRecording", "foco de áudio pedido antes de tocar; AUDIO_FOCUS_FAILED se negado");
    const focusAt = play.indexOf("requestPracticeFocus(attributes)");
    const startAt = play.indexOf("practicePlayer.start()");
    if (focusAt < 0 || startAt < 0 || focusAt > startAt) fail("AUDIO_FOCUS_MISSING", "playPracticeRecording", "foco ANTES do start()");
    if (!/"MEDIA_VOLUME_ZERO"/.test(play) || !/mediaVolumeCurrent", 1\) == 0/.test(play)) fail("VOLUME_ZERO_SILENT", "playPracticeRecording", "volume de mídia zerado vira MEDIA_VOLUME_ZERO (não falha genérica)");
    if (!/"NO_RECORDING"/.test(play) || !/"INVALID_FILE"/.test(play)) fail("PLAYBACK_CODE_MISSING", "playPracticeRecording", "NO_RECORDING / INVALID_FILE");
    if (!/"PLAYER_PREPARE_FAILED"/.test(play) || !/"PLAYBACK_START_FAILED"/.test(play) || !/"PLAYBACK_ERROR"/.test(play)) fail("PLAYBACK_CODE_MISSING", "playPracticeRecording", "PREPARE/START/ERROR com código estável");
    // PLAYING só depois de isPlaying(): toda marcação de PLAYING passa pelo teste.
    const marks = play.match(/markPracticePlaying\(route, volume\)/g) ?? [];
    const guarded = play.match(/if \(practicePlayer\.isPlaying\(\)\) markPracticePlaying\(route, volume\)|playing = practicePlayer\.isPlaying\(\);[\s\S]{0,480}if \(!practicePlaybackStarted\) markPracticePlaying\(route, volume\)/g) ?? [];
    if (!marks.length || guarded.length < marks.length) fail("PLAYING_WITHOUT_PROOF", "playPracticeRecording", "PLAYING só depois de isPlaying() confirmado");
    if (!/!playing && !practicePlaybackStarted\) \{\s*finishPracticePlay\("PLAYBACK_START_FAILED"\)/.test(play)) fail("PLAYING_WITHOUT_PROOF", "playPracticeRecording", "sem isPlaying() → PLAYBACK_START_FAILED");
    if (!/setOnCompletionListener\(\(player\) -> finishPracticePlay\(practicePlaybackStarted \? null : "PLAYBACK_START_FAILED"\)\)/.test(play))
      fail("PLAYING_WITHOUT_PROOF", "playPracticeRecording", "'terminou' sem ter tocado não é PLAYED");
  }
  const finish = body(java, "private void finishPracticePlay(String code)");
  if (!/abandonPracticeFocus\(\);/.test(finish) || !/releasePracticePlayer\(\);/.test(finish)) fail("AUDIO_FOCUS_LEAK", "finishPracticePlay", "sempre devolve o foco e libera o player");
  if (!/abandonPracticeFocus\(\);/.test(body(java, "private void discardPracticeRecording()"))) fail("AUDIO_FOCUS_LEAK", "discardPracticeRecording", "descartar devolve o foco");
  const focus = body(java, "private boolean requestPracticeFocus(AudioAttributes attributes)");
  if (!/new AudioFocusRequest\.Builder\(AudioManager\.AUDIOFOCUS_GAIN_TRANSIENT\)/.test(focus) || !/STREAM_MUSIC, AudioManager\.AUDIOFOCUS_GAIN_TRANSIENT\)/.test(focus))
    fail("AUDIO_FOCUS_MISSING", "requestPracticeFocus", "foco TRANSITÓRIO nas duas APIs (a música do aluno volta depois)");
  if (!/AUDIOFOCUS_LOSS[\s\S]{0,160}"PLAYBACK_INTERRUPTED"/.test(java)) fail("PLAYBACK_CODE_MISSING", "practiceFocusListener", "perda de foco → PLAYBACK_INTERRUPTED");
  if (!/practiceRecorder\.getMaxAmplitude\(\)/.test(java)) fail("CAPTURE_SIGNAL_MISSING", FILES.plugin, "amplitude da captura (getMaxAmplitude) no diagnóstico");
  if (!/new MediaMetadataRetriever\(\)/.test(java) || !/METADATA_KEY_DURATION/.test(java)) fail("METADATA_DURATION_MISSING", FILES.plugin, "duração lida do arquivo (MediaMetadataRetriever)");
  if (!/@PluginMethod\s+public void stopPracticePlayback\(PluginCall call\)/.test(java) || !/finishPracticePlay\("STOPPED"\)/.test(body(java, "public void stopPracticePlayback(PluginCall call)")))
    fail("PLAYBACK_NOT_STOPPABLE", FILES.plugin, "■ Parar resolve como STOPPED");
  if (!/private String outputRoute\(\)/.test(java) || !/TYPE_BLUETOOTH_A2DP/.test(java)) fail("OUTPUT_ROUTE_MISSING", FILES.plugin, "rota de saída (alto-falante/fone/Bluetooth) no diagnóstico");
  // Adaptador único.
  const adapter = stripComments(s.src.nativeSpeech);
  if (!/stopPracticePlayback\(\): Promise<void>/.test(adapter) || !/export async function nativeStopPracticePlayback\(/.test(adapter)) fail("PLAYBACK_NOT_STOPPABLE", FILES.nativeSpeech, "nativeStopPracticePlayback no adaptador");
  // Códigos e prova (módulo puro).
  const mods = await modulesOrFail(s, fail, FILES.selfPlayback);
  if (mods) {
    const p = mods.selfPlayback;
    const codes = p.SELF_PLAYBACK_ERROR_CODES ?? [];
    for (const code of PLAYBACK_CODES) if (!codes.includes(code)) fail("PLAYBACK_CODE_MISSING", "SELF_PLAYBACK_ERROR_CODES", code);
    if (p.selfPlaybackMessageKey?.("MEDIA_VOLUME_ZERO") !== "player.selfPlaybackVolumeZero") fail("VOLUME_ZERO_SILENT", "selfPlaybackMessageKey", "volume zero tem mensagem própria");
    if (p.selfPlaybackMessageKey?.("NO_RECORDING") === p.selfPlaybackMessageKey?.("MEDIA_VOLUME_ZERO")) fail("VOLUME_ZERO_SILENT", "selfPlaybackMessageKey", "volume zero ≠ sem gravação");
    const proven = p.selfPlaybackProven ?? (() => true);
    if (proven(["PLAY_PREPARING", "PLAYED"]) || proven(["PLAYING", "PLAYED"]) || !proven(["PLAY_PREPARING", "PLAYING", "PLAYED"]))
      fail("PLAYING_WITHOUT_PROOF", "selfPlaybackProven", "PLAY_PREPARING < PLAYING < PLAYED");
    if (!(p.SELF_PLAYBACK_PROOF ?? []).includes("ownerHeardOwnVoice")) fail("FAKE_PHYSICAL_PASS", "SELF_PLAYBACK_PROOF", "a última prova é humana (o owner ouviu)");
  }
  // Tela: microfone pedido, estados de botão, código visível ao QA.
  const ui = stripComments(s.src.selfCompare);
  if (!/const permission = await ensureMicPermission\(\);/.test(ui)) fail("MIC_NOT_REQUESTED", FILES.selfCompare, "Gravar e comparar pede o microfone (com explicação) antes de gravar");
  if (!/t\("player\.micPrePermission"\)/.test(ui)) fail("MIC_NOT_REQUESTED", FILES.selfCompare, "explicação antes do diálogo do sistema");
  for (const key of ["selfComparePreparingPlayback", "selfComparePlayingMine", "selfCompareListenAgain", "selfCompareListenMine"])
    if (!ui.includes(`t("player.${key}")`)) fail("PLAYBACK_BUTTON_FLOW", FILES.selfCompare, `[Ouvir minha voz] → [Reproduzindo… ■ Parar] → [Ouvir novamente]: ${key}`);
  if (!/nativeStopPracticePlayback\(\)/.test(ui)) fail("PLAYBACK_NOT_STOPPABLE", FILES.selfCompare, "■ Parar chama o nativo");
  if (!/data-playback-code=/.test(ui) || !/selfPlaybackMessageKey\(/.test(ui)) fail("PLAYBACK_CODE_MISSING", FILES.selfCompare, "mensagem por código + código visível ao QA");
  for (const [key, text] of [["ptBR", "Reproduzindo…"], ["en", "Playing…"]])
    if (!s.src[key].includes(`selfComparePlayingMine: "${text}"`)) fail("PLAYBACK_BUTTON_FLOW", FILES[key], `selfComparePlayingMine = "${text}"`);
  if (!/selfPlaybackVolumeZero:/.test(s.src.ptBR) || !/selfPlaybackVolumeZero:/.test(s.src.en)) fail("VOLUME_ZERO_SILENT", "locales", "mensagem de volume zerado nos dois idiomas");
  if (/upload|analytics|sendBeacon|fetch\(/i.test(ui)) fail("RECORDING_UPLOADED", FILES.selfCompare, "a gravação nunca sai do aparelho");
  return failures;
}

// ── 2. Fala nativa + TTS ───────────────────────────────────────────────────

export async function validateNativeSpeech(s) {
  const { failures, fail } = collector();
  const java = javaCode(s.src.plugin);
  const start = body(java, "public void startRecognition(PluginCall call)");
  if (!/call\.getBoolean\("preferOnDevice", false\)/.test(start) || !/if \(onDevice && \(preferOnDevice \|\| !service\)\)/.test(start))
    fail("RECOGNIZER_WRONG_STRATEGY", "startRecognition", "on-device só quando pedido (zh-CN instalado) ou sem serviço");
  if (!/recognizerKind = "service"/.test(start) || !/recognizerKind = "on_device"/.test(start)) fail("RECOGNIZER_WRONG_STRATEGY", "startRecognition", "tipo do reconhecedor no diagnóstico");
  const rms = body(java, "public void onRmsChanged(float rmsdB)");
  if (!/recognitionPeakRms/.test(rms) || !/"signal"/.test(rms)) fail("RMS_SIGNAL_MISSING", "onRmsChanged", "pico de RMS + evento de sinal (sem áudio)");
  if (!/private JSObject recognitionDiagnostics\(\)/.test(java) || !/peakRmsBucket/.test(java)) fail("RMS_SIGNAL_MISSING", FILES.plugin, "diagnóstico da escuta em resultado e erro");
  if (!/ERROR_CLIENT[\s\S]{0,60}"CLIENT"/.test(java)) fail("SPEECH_CATEGORY_MISSING", FILES.plugin, "ERROR_CLIENT → CLIENT (nunca número cru)");
  // TTS como mídia/fala + reconsulta depois de instalar a voz.
  const tts = body(java, "private void ensureTts(Runnable ready)");
  if (!/tts\.setAudioAttributes\(/.test(tts) || !/USAGE_MEDIA/.test(tts) || !/CONTENT_TYPE_SPEECH/.test(tts)) fail("TTS_AUDIO_ATTRIBUTES_MISSING", "ensureTts", "voz modelo como mídia/fala");
  const ttsStatus = body(java, "public void getTtsStatus(PluginCall call)");
  if (!/call\.getBoolean\("reinit", false\)/.test(ttsStatus) || !/tts\.shutdown\(\);/.test(ttsStatus)) fail("TTS_NOT_RECHECKED", "getTtsStatus", "recria o motor depois de instalar a voz");
  if (!/refreshNativeTtsStatus\(\{ reinit: true \}\)/.test(stripComments(s.src.speakButton))) fail("TTS_NOT_RECHECKED", FILES.speakButton, "ao voltar do instalador, reconsulta com reinit");
  // Estratégia, categorias e sem loop (módulos puros).
  const mods = await modulesOrFail(s, fail, FILES.capability);
  if (mods) {
    const strategy = mods.capability.recognizerStrategyFor ?? (() => "ON_DEVICE");
    const support = (patch) => ({ checked: true, serviceAvailable: true, onDeviceAvailable: true, installedOnDevice: false, supportedOnDevice: true, pendingOnDevice: false, online: true, ...patch });
    if (strategy(support({})) !== "SERVICE") fail("RECOGNIZER_WRONG_STRATEGY", "recognizerStrategyFor", "on-device sem zh-CN instalado → serviço");
    if (strategy(support({ installedOnDevice: true })) !== "ON_DEVICE") fail("RECOGNIZER_WRONG_STRATEGY", "recognizerStrategyFor", "zh-CN instalado no on-device → on-device");
    if (strategy(null) !== "SERVICE") fail("RECOGNIZER_WRONG_STRATEGY", "recognizerStrategyFor", "sem consulta (Android < 13) → serviço");
    const f = mods.speechFailure;
    const cats = f.NATIVE_RECOGNITION_CATEGORIES ?? [];
    for (const cat of RECOGNITION_CATEGORIES) if (!cats.includes(cat)) fail("SPEECH_CATEGORY_MISSING", "NATIVE_RECOGNITION_CATEGORIES", cat);
    const category = f.nativeRecognitionCategory ?? (() => "UNKNOWN");
    const expected = { CLIENT: "CLIENT", NO_MATCH: "NO_SPEECH", SPEECH_TIMEOUT: "TIMEOUT", AUDIO: "AUDIO_CAPTURE", NETWORK: "NETWORK", RECOGNIZER_BUSY: "BUSY", INSUFFICIENT_PERMISSIONS: "PERMISSION", LANGUAGE_UNAVAILABLE: "LANGUAGE_UNAVAILABLE", RECOGNITION_UNAVAILABLE: "SERVICE_UNAVAILABLE", ALIEN: "UNKNOWN" };
    for (const [raw, cat] of Object.entries(expected)) if (category(raw) !== cat) fail("SPEECH_CATEGORY_MISSING", "nativeRecognitionCategory", `${raw} → ${cat}`);
    const leave = f.shouldLeaveRecognition ?? (() => false);
    const limit = f.SPEECH_RETRY_LIMIT ?? Infinity;
    if (!(limit >= 1 && limit <= 3)) fail("SPEECH_RETRY_LOOP", "SPEECH_RETRY_LIMIT", "limite pequeno e finito (1–3)");
    if (!leave(limit, "NO_SPEECH") || !leave(limit, "UNKNOWN") || !leave(1, "NO_ZH_CN")) fail("SPEECH_RETRY_LOOP", "shouldLeaveRecognition", "no limite (ou sem zh-CN) sai do reconhecimento");
    if (leave(1, "NO_SPEECH") && limit > 1) fail("SPEECH_RETRY_LOOP", "shouldLeaveRecognition", "uma falha só ainda deixa tentar de novo");
    if (leave(99, "PERMISSION_DENIED")) fail("SPEECH_RETRY_LOOP", "shouldLeaveRecognition", "permissão negada → Ajustes, não autoavaliação");
  }
  const speech = stripComments(s.src.speech);
  if (!/const preferOnDevice = recognizerStrategyFor\(mandarinSupport\) === "ON_DEVICE";/.test(speech) || !/nativeRecognize\(Math\.min\(timeoutMs, 15_000\), \{ preferOnDevice \}\)/.test(speech))
    fail("RECOGNIZER_WRONG_STRATEGY", FILES.speech, "a escuta nativa passa a estratégia ao plugin");
  const pron = stripComments(s.src.pronunciation);
  if (!/shouldLeaveRecognition\(failuresRef\.current, category\)/.test(pron) || !/shouldLeaveRecognition\(failuresRef\.current, "NO_SPEECH"\)/.test(pron))
    fail("SPEECH_RETRY_LOOP", FILES.pronunciation, "falhas seguidas levam a Gravar e comparar / Continuar");
  if (!/failuresRef\.current = 0;/.test(pron)) fail("SPEECH_RETRY_LOOP", FILES.pronunciation, "acerto zera a contagem");
  if (!/recognizerKind: diag\.recognizer/.test(pron) || !/recognitionSignal:/.test(pron)) fail("RMS_SIGNAL_MISSING", FILES.pronunciation, "tipo de reconhecedor e sinal no diagnóstico");
  if (!/onClick=\{onContinue\}/.test(pron)) fail("SPEECH_DEAD_END", FILES.pronunciation, "toda lição tem continuação sem falar");
  return failures;
}

// ── 3. Ciclo de vida ───────────────────────────────────────────────────────

export async function validateMobileLifecycle(s) {
  const { failures, fail } = collector();
  const java = javaCode(s.src.plugin);
  const pause = body(java, "protected void handleOnPause()");
  if (/discardPracticeRecording\(\)/.test(pause)) fail("PAUSE_DELETES_RECORDING", "handleOnPause", "diálogo de permissão/painel pausam: não apaga a gravação válida");
  if (!/interruptPractice\(\);/.test(pause)) fail("PAUSE_KEEPS_AUDIO", "handleOnPause", "pausa interrompe microfone e reprodução (nada escondido)");
  if (!/tts\.stop\(\)/.test(pause) || !/failRecognition\("CANCELLED"\)/.test(pause)) fail("PAUSE_KEEPS_AUDIO", "handleOnPause", "voz e escuta param na pausa");
  if (!/discardPracticeRecording\(\);/.test(body(java, "protected void handleOnStop()"))) fail("RECORDING_LEFT_ON_EXIT", "handleOnStop", "sair do app apaga a gravação temporária");
  if (!/discardPracticeRecording\(\);/.test(body(java, "protected void handleOnDestroy()"))) fail("RECORDING_LEFT_ON_EXIT", "handleOnDestroy", "fechar apaga a gravação temporária");
  const interrupt = body(java, "private void interruptPractice()");
  if (!/finishPracticePlay\("PLAYBACK_INTERRUPTED"\)/.test(interrupt)) fail("PAUSE_KEEPS_AUDIO", "interruptPractice", "reprodução em curso termina como PLAYBACK_INTERRUPTED");
  if (/practiceFile = null;[\s\S]*practiceFile\.delete|file\.delete\(\)/.test(interrupt) && !/partial|parcial|RECORDING_INTERRUPTED/.test(interrupt))
    fail("PAUSE_DELETES_RECORDING", "interruptPractice", "só a gravação PARCIAL (em captura) é descartada");
  const shell = stripComments(s.src.nativeShell);
  if (!/App\.addListener\("pause", \(\) => recordTechEvent\("app_paused"/.test(shell) || !/App\.addListener\("resume", \(\) => recordTechEvent\("app_resumed"/.test(shell))
    fail("LIFECYCLE_NOT_OBSERVED", FILES.nativeShell, "pausa/retomada nativas no buffer técnico");
  if (!/visibilitychange/.test(stripComments(s.src.techEvents))) fail("LIFECYCLE_NOT_OBSERVED", FILES.techEvents, "visibilidade (web/WebView) observada");
  const ui = stripComments(s.src.selfCompare);
  if (!/RECORDING_INTERRUPTED/.test(ui)) fail("LIFECYCLE_NOT_OBSERVED", FILES.selfCompare, "gravação interrompida pela pausa volta ao estado seguro");
  return failures;
}

// ── 4. Layout mobile ───────────────────────────────────────────────────────

export async function validateMobileLayout(s) {
  const { failures, fail } = collector();
  const e2e = s.src.e2e;
  for (const [w, h] of [[360, 640], [375, 667], [390, 844]])
    if (!new RegExp(`\\{ width: ${w}, height: ${h} \\}`).test(e2e)) fail("LAYOUT_SWEEP_MISSING", FILES.e2e, `varredura sem rolagem horizontal em ${w}×${h}`);
  if (!/scrollWidth - window\.innerWidth/.test(e2e) || !/expect\(offenders\)\.toEqual\(\[\]\)/.test(e2e)) fail("LAYOUT_SWEEP_MISSING", FILES.e2e, "mede scrollWidth e falha com qualquer rota vazando");
  for (const route of ["/jornada", "/revisao", "/hanzi", "/qa/device"]) if (!e2e.includes(`"${route}"`)) fail("LAYOUT_SWEEP_MISSING", FILES.e2e, `rota ${route} na varredura`);
  // Tap-through: o fundo do modal fecha no click, e só se o toque começou nele.
  const modal = stripComments(s.src.modalOverlay);
  const mouseDown = /onMouseDown=\{\(event\) => \{([\s\S]*?)\}\}/.exec(modal)?.[1] ?? "";
  if (/onBackdropClick\?\.\(\)/.test(mouseDown)) fail("TAP_THROUGH", FILES.modalOverlay, "fechar no mousedown deixa o click atravessar para baixo");
  if (!/onClick=\{\(event\) => \{[\s\S]*?if \(startedOnBackdrop\) onBackdropClick\?\.\(\);/.test(modal) || !/downOnBackdropRef\.current = event\.target === event\.currentTarget;/.test(modal))
    fail("TAP_THROUGH", FILES.modalOverlay, "fecha no click, só com o toque iniciado no fundo");
  // Alvos de toque ≥ 44px na autoavaliação.
  const ui = stripComments(s.src.selfCompare);
  if ((ui.match(/min-h-11/g) ?? []).length < 4) fail("TOUCH_TARGET_SMALL", FILES.selfCompare, "botões da autoavaliação ≥ 44px (min-h-11)");
  // Safe areas pelos tokens do app (os mesmos do layout).
  const consoleSrc = stripComments(s.src.console);
  if (!/var\(--app-safe-top/.test(consoleSrc) || !/var\(--app-safe-bottom/.test(consoleSrc)) fail("SAFE_AREA_NOT_DIAGNOSED", FILES.console, "diagnóstico lê --app-safe-top/bottom");
  return failures;
}

// ── 5. Navegação (VOLTAR e modais) ─────────────────────────────────────────

export async function validateMobileNavigation(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.back);
  if (mods) {
    const b = mods.back;
    const decide = b.decideBackAction ?? (() => "minimize-app");
    const base = { keyboardOpen: false, overlayOpen: false, guidanceOpen: false, canGoBack: false, pathname: "/revisao" };
    const cases = [
      [{ keyboardOpen: true, overlayOpen: true, guidanceOpen: true, canGoBack: true }, "close-keyboard", "teclado primeiro"],
      [{ overlayOpen: true, guidanceOpen: true, canGoBack: true }, "dismiss-overlay", "modal antes da orientação"],
      [{ guidanceOpen: true, canGoBack: true }, "dismiss-guidance", "orientação antes da rota"],
      [{ canGoBack: true }, "history-back", "rota volta no histórico"],
      [{}, "navigate-home", "rota sem histórico vai ao pai"],
      [{ pathname: "/jornada" }, "minimize-app", "só a raiz minimiza"],
      [{ pathname: "/" }, "minimize-app", "só a raiz minimiza"],
    ];
    for (const [patch, expected, why] of cases) {
      const got = decide({ ...base, ...patch });
      if (got !== expected) fail(expected === "minimize-app" || got === "minimize-app" ? "BACK_EXITS_APP" : "BACK_PRIORITY_WRONG", "decideBackAction", `${why}: ${got} ≠ ${expected}`);
    }
    if ((b.BACK_PRIORITY ?? []).join(">") !== "keyboard>modal>guidance>subview>route>exit") fail("BACK_PRIORITY_WRONG", "BACK_PRIORITY", "keyboard → modal → guidance → subview → route → exit");
    const m = mods.modalStack;
    m.resetModalStackForTests?.();
    const first = m.pushModal("dialog");
    const second = m.pushModal("dialog");
    if (m.isTopModal(first) || !m.isTopModal(second)) fail("MODAL_STACK_BROKEN", "modalStack", "só o modal do topo reage ao VOLTAR");
    m.popModal(second, "dialog");
    if (!m.isTopModal(first) || m.modalDepth() !== 1) fail("MODAL_STACK_BROKEN", "modalStack", "fechar o topo devolve a vez ao de baixo");
    m.popModal(first, "dialog");
    m.popModal(first, "dialog");
    if (m.modalDepth() !== 0) fail("MODAL_STACK_BROKEN", "modalStack", "fechar duas vezes não quebra a pilha");
  }
  const modal = stripComments(s.src.modalOverlay);
  if (!/if \(stackIdRef\.current != null && !isTopModal\(stackIdRef\.current\)\) return;/.test(modal) || !/pushModal\(role\)/.test(modal) || !/popModal\(id, role\)/.test(modal))
    fail("MODAL_STACK_BROKEN", FILES.modalOverlay, "ModalOverlay entra na pilha e só o topo trata Escape/VOLTAR");
  const shell = stripComments(s.src.nativeShell);
  if (!/const keyboardOpen = isKeyboardOpen\(\);/.test(shell) || !/if \(action === "close-keyboard"\) closeKeyboard\(\);/.test(shell)) fail("BACK_PRIORITY_WRONG", FILES.nativeShell, "VOLTAR fecha o teclado primeiro");
  if (!/if \(!keyboardOpen && !overlayOpen && !guidanceOpen && runBackGuard\(\)\)/.test(shell)) fail("BACK_PRIORITY_WRONG", FILES.nativeShell, "guarda da subtela só depois de teclado/modal/orientação");
  if ((shell.match(/minimizeApp\s*\(/g) ?? []).length !== 1 || /exitApp\s*\(/.test(shell)) fail("BACK_EXITS_APP", FILES.nativeShell, "minimiza só no ramo da raiz; nunca exitApp");
  if (!/recordTechEvent\("back_pressed", \{ action \}\)/.test(shell)) fail("BACK_NOT_OBSERVED", FILES.nativeShell, "cada VOLTAR no buffer técnico");
  return failures;
}

// ── 6. Cadastro e recuperação ──────────────────────────────────────────────

export async function validateAuthResilience(s) {
  const { failures, fail } = collector();
  const timeout = /export const SIGNUP_REQUEST_TIMEOUT_MS = ([\d_]+);/.exec(s.src.signupTrace)?.[1];
  const ms = timeout ? Number(timeout.replace(/_/g, "")) : Infinity;
  if (!(ms > 0 && ms <= 60_000)) fail("SIGNUP_INFINITE_SPINNER", FILES.signupTrace, "cadastro com prazo finito (≤ 60 s)");
  const forgot = stripComments(s.src.forgot);
  if (/(localStorage|sessionStorage|indexedDB)[\s\S]{0,40}(setItem|put|add)/.test(forgot)) fail("OTP_PERSISTED", FILES.forgot, "código só em memória");
  if (/console\.(log|info|debug|warn|error)\([^)]*\b(code|token|otp)\b/i.test(forgot)) fail("OTP_LOGGED", FILES.forgot, "código nunca logado");
  const auth = stripComments(s.src.authService);
  const verify = body(auth, "export async function verifyRecoveryCode(");
  if (!verify) fail("RECOVERY_MISSING", FILES.authService, "verifyRecoveryCode");
  if (/console\.(log|info|debug|warn|error)\([^)]*\b(token|code|otp)\b/i.test(verify)) fail("OTP_LOGGED", "verifyRecoveryCode", "token nunca logado");
  if (/recordTechEvent\([^)]*\b(email|token|code|otp|password)\b/i.test(forgot + auth)) fail("OTP_LOGGED", "auth", "nada de auth no buffer técnico");
  return failures;
}

function checkDiagnosticModules(mods, fail) {
  const t = mods.techEvents;
  if (t.TECH_EVENT_LIMIT !== 150) fail("TECH_BUFFER_UNBOUNDED", "TECH_EVENT_LIMIT", "máximo 150 eventos");
  t.clearTechEventsForTests?.();
  for (let i = 0; i < 220; i += 1) t.recordTechEvent("route_changed", { from: `/r${i}` });
  const snap = t.techEventsSnapshot();
  if (snap.length !== 150) fail("TECH_BUFFER_UNBOUNDED", "recordTechEvent", `buffer com ${snap.length} (≠ 150) depois de 220 eventos`);
  else if (snap[149].detail?.from !== "/r219" || snap[0].detail?.from !== "/r70") fail("TECH_BUFFER_UNBOUNDED", "recordTechEvent", "sai o mais antigo, fica o mais novo");
  t.clearTechEventsForTests?.();
  const clean = t.sanitizeTechDetail({ transcript: "你好", text: "segredo", email: "a@b.co", password: "x", token: "y", name: "Ana", note: "ana@exemplo.com", code: "123456", ok: "fine" }) ?? {};
  for (const key of ["transcript", "text", "email", "password", "token", "name"]) if (key in clean) fail("DIAGNOSTIC_PII", "sanitizeTechDetail", `chave ${key} nunca entra`);
  if (clean.note !== "[redigido]" || clean.code !== "[redigido]" || clean.ok !== "fine") fail("DIAGNOSTIC_PII", "sanitizeTechDetail", "valor com e-mail/OTP vira [redigido]; o resto passa");
  const d = mods.diagnostics;
  const input = {
    build: { buildSha: "b43ca4465319", versionName: "0.2.0", versionCode: 42, packageName: "longyu.noba.com", runtime: "native" },
    device: { androidVersion: "14", webViewVersion: "WebView 124.0", viewport: { width: 360, height: 640 }, visualViewport: null, devicePixelRatio: 3, safeAreaTop: 24, safeAreaBottom: 16 },
    state: { keyboard: "closed", network: "online", lifecycle: "visible", route: "/perfil/ana@exemplo.com", lastNavigation: "/ → /jornada" },
    audio: { owner: "IDLE", engine: "android-native", ttsAvailable: true, ttsReason: null, microphone: "granted", speechService: "yes", zhCnSupport: "SUPPORTED", recognitionCapability: "READY", recognizerKind: "service", recordingState: "RECORDED", playbackState: "completed", outputRoute: "BUILT_IN_SPEAKER", mediaVolume: "7/15" },
    events: [
      { at: 1, name: "route_changed", route: "/jornada", detail: { from: "/" } },
      { at: 2, name: "js_error", route: "/jornada", detail: { note: "fale com ana@exemplo.com", code: "123456", email: "a@b.co", transcript: "你好" } },
    ],
    email: "ana@exemplo.com",
    extra: { password: "p", refreshToken: "r", transcript: "你好", displayName: "Ana", note: "fale com ana@exemplo.com", otp: "123456" },
  };
  const json = d.buildMobileDiagnostic(input, "2026-10-01T00:00:00.000Z");
  const direct = JSON.stringify(d.sanitizeMobileDiagnostic?.({ a: { password: "p", refreshToken: "r", nested: [{ email: "x", v: "ana@exemplo.com" }] }, b: "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc" }) ?? {});
  if (/exemplo\.com|"password"|refreshToken|"email"|eyJhbGci/.test(direct)) fail("DIAGNOSTIC_PII", "sanitizeMobileDiagnostic", "sanitiza a árvore inteira, em qualquer nível");
  const text = JSON.stringify(json);
  if (/exemplo\.com|"password"|refreshToken|"transcript"|displayName|"otp"|"email"|123456/.test(text)) fail("DIAGNOSTIC_PII", "buildMobileDiagnostic", "JSON sem e-mail, senha, token, OTP, nome ou transcrição");
  if (json?.physicalPass !== false) fail("FAKE_PHYSICAL_PASS", "buildMobileDiagnostic", "diagnóstico nunca é PASS físico");
  if (json?.schema !== "longyu-mobile-diagnostic/1" || json?.build?.versionCode !== 42 || json?.audio?.outputRoute !== "BUILT_IN_SPEAKER" || json?.events?.[0]?.event !== "route_changed")
    fail("DIAGNOSTIC_INCOMPLETE", "buildMobileDiagnostic", "build, áudio e eventos preservados");
  if (d.webViewVersionFromUserAgent?.("Mozilla/5.0 (Linux; Android 14; Pixel 7 Build/UQ1A; wv) AppleWebKit/537.36 Chrome/124.0.6367.82 Mobile Safari/537.36") !== "WebView 124.0.6367.82")
    fail("DIAGNOSTIC_INCOMPLETE", "webViewVersionFromUserAgent", "versão do WebView");
}

// ── 7. Integridade do diagnóstico ──────────────────────────────────────────

export async function validateStateIntegrity(s) {
  const { failures, fail } = collector();
  const tech = stripComments(s.src.techEvents);
  if (/localStorage|sessionStorage|indexedDB|IDBFactory|document\.cookie/.test(tech)) fail("TECH_EVENTS_PERSISTED", FILES.techEvents, "buffer técnico só em memória");
  if (!/export function recordTechEvent\([^)]*\): void \{\s*if \(!deviceQaEnabled\(\)\) return;/.test(tech)) fail("DIAGNOSTICS_IN_PRODUCTION", FILES.techEvents, "buffer só em builds de QA");
  if (!/if \(typeof window === "undefined" \|\| !deviceQaEnabled\(\)\) return/.test(tech)) fail("DIAGNOSTICS_IN_PRODUCTION", "installTechCapture", "captura global só em QA");
  if (!/installTechCapture\(\);/.test(stripComments(s.src.main))) fail("TECH_CAPTURE_MISSING", FILES.main, "captura instalada no boot (todas as rotas)");
  if (!/<MobileDiagnosticConsole build=\{build\} \/>/.test(s.src.qaPage)) fail("TECH_CAPTURE_MISSING", FILES.qaPage, "console de diagnóstico no /qa/device");
  if (!/if \(!deviceQaEnabled\(\)\) return <Navigate to="\/" replace \/>;/.test(s.src.qaPage)) fail("DIAGNOSTICS_IN_PRODUCTION", FILES.qaPage, "/qa/device redireciona fora do QA");
  const mods = await modulesOrFail(s, fail, FILES.techEvents);
  if (mods) {
    try {
      checkDiagnosticModules(mods, fail);
    } catch (error) {
      fail("MODULE_NOT_EXECUTABLE", FILES.techEvents, String(error?.message ?? error).slice(0, 200));
    }
  }
  const consoleSrc = stripComments(s.src.console);
  for (const field of ["BUILD SHA", "versionName", "versionCode", "package", "Android", "WebView", "viewport", "DPR", "safe-area", "teclado", "rede", "ciclo de vida", "rota", "última navegação", "dono do áudio", "TTS", "microfone", "serviço de fala", "zh-CN", "gravação", "reprodução"])
    if (!consoleSrc.includes(`["${field}"`)) fail("DIAGNOSTIC_INCOMPLETE", FILES.console, `campo ${field}`);
  if (!/data-testid="qa-mobile-copy"/.test(consoleSrc) || !/Copiar diagnóstico/.test(consoleSrc)) fail("DIAGNOSTIC_INCOMPLETE", FILES.console, "[Copiar diagnóstico]");
  if (!/buildSha\.slice\(0, 12\)/.test(consoleSrc)) fail("DIAGNOSTIC_INCOMPLETE", FILES.console, "SHA curto (o completo seria redigido como token)");
  return failures;
}

// ── 8. Limpeza de recursos ─────────────────────────────────────────────────

export async function validateResourceCleanup(s) {
  const { failures, fail } = collector();
  const mods = await modulesOrFail(s, fail, FILES.arbiter);
  if (mods) {
    const a = mods.arbiter;
    if ((a.AUDIO_OWNERS ?? []).join(",") !== AUDIO_OWNERS.join(",")) fail("AUDIO_OWNERS_WRONG", "AUDIO_OWNERS", AUDIO_OWNERS.join("/"));
    a.resetAudioArbiterForTests?.();
    const stopped = [];
    const tts = a.claimAudio("TTS", () => stopped.push("TTS"));
    const rec = a.claimAudio("RECORDING", () => stopped.push("RECORDING"));
    if (stopped.join() !== "TTS" || a.currentAudioOwner() !== "RECORDING") fail("AUDIO_OVERLAP", "claimAudio", "novo dono para o anterior (nunca dois sons juntos)");
    a.releaseAudio("TTS", tts);
    if (a.currentAudioOwner() !== "RECORDING") fail("AUDIO_OWNER_STOLEN", "releaseAudio", "quem não é dono não libera");
    const self = a.claimAudio("SELF_PLAYBACK", () => stopped.push("SELF"));
    a.releaseAudio("SELF_PLAYBACK", rec);
    if (a.currentAudioOwner() !== "SELF_PLAYBACK") fail("AUDIO_OWNER_STOLEN", "releaseAudio", "posse velha não libera a nova");
    a.releaseAudio("SELF_PLAYBACK", self);
    if (a.currentAudioOwner() !== "IDLE") fail("AUDIO_OWNER_STUCK", "releaseAudio", "o dono atual libera");
    a.claimAudio("RECOGNITION", () => {
      throw new Error("já parou");
    });
    try {
      a.claimAudio("TTS");
    } catch {
      fail("AUDIO_OVERLAP", "claimAudio", "falha ao parar o anterior não quebra o novo");
    }
    a.resetAudioArbiterForTests?.();
  }
  const playback = stripComments(s.src.audioPlayback);
  // RC2.2.27 — quem perde a posse cancela SÓ a própria fala (cancelOwnSpeech), nunca a de outro.
  if (!/claimAudio\("TTS", \(\) => (stopSpeaking\(\)|cancelOwnSpeech\(requestId, token\))\)/.test(playback) || !/releaseAudio\("TTS"/.test(playback)) fail("AUDIO_OVERLAP", FILES.audioPlayback, "voz modelo passa pelo árbitro");
  const pron = stripComments(s.src.pronunciation);
  if (!/audioClaimRef\.current = claimAudio\("RECOGNITION"/.test(pron)) fail("AUDIO_OVERLAP", FILES.pronunciation, "reconhecimento passa pelo árbitro");
  const unmount = /useEffect\(\(\) => \{\s*return \(\) => \{([\s\S]*?)\};\s*\}, \[audioUrl\]\);/.exec(pron)?.[1] ?? "";
  if (!/cancelRecognition\(\);/.test(unmount) || !/releaseRecognitionAudio\(\);/.test(unmount)) fail("RESOURCE_LEAK", FILES.pronunciation, "sair da tela fecha o microfone e libera o áudio");
  const ui = stripComments(s.src.selfCompare);
  const cleanup = /useEffect\(\s*\(\) => \(\) => \{([\s\S]*?)\},\s*\[native\]\s*\);/.exec(ui)?.[1] ?? "";
  for (const [pattern, why] of [
    [/nativeDeletePracticeRecording\(\)/, "apaga a gravação nativa"],
    [/URL\.revokeObjectURL\(webUrlRef\.current\)/, "revoga a URL da gravação web"],
    [/getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/, "fecha o microfone web"],
    [/releaseAudio\("SELF_PLAYBACK", playTokenRef\.current\)/, "libera o áudio"],
  ])
    if (!pattern.test(cleanup)) fail("RESOURCE_LEAK", FILES.selfCompare, `sair da autoavaliação ${why}`);
  const tech = stripComments(s.src.techEvents);
  if (!/if \(installed\) return installed;/.test(tech) || !/removeEventListener\("error", onError\)/.test(tech)) fail("LISTENER_LEAK", "installTechCapture", "instalar de novo não duplica ouvintes; desinstalar remove");
  const adapter = stripComments(s.src.nativeSpeech);
  if (!/if \(released\) void h\.remove\(\);/.test(adapter)) fail("LISTENER_LEAK", FILES.nativeSpeech, "ouvinte nativo removido mesmo se a tela saiu antes do registro");
  const java = javaCode(s.src.plugin);
  if (!/stopAmplitudeSampler\(\);/.test(body(java, "private void discardPracticeRecording()"))) fail("RESOURCE_LEAK", "discardPracticeRecording", "para o amostrador de amplitude");
  if (!/retriever\.release\(\)/.test(java)) fail("RESOURCE_LEAK", "metadataDurationMs", "MediaMetadataRetriever liberado");
  const dup = s.fileNames.filter((rel) => FORBIDDEN_DUPLICATES.test(rel));
  if (dup.length) fail("DUPLICATE_ENGINE", dup.join(", "), "evoluir o plugin/motor existente (sem paralelo)");
  if ((s.fileNames.filter((rel) => /Plugin\.java$/.test(rel) && /Speech|Voice|Audio/.test(rel))).length !== 1) fail("DUPLICATE_ENGINE", "android/app/src/main/java", "um único plugin de voz");
  return failures;
}

// ── 9. Verdade de release ──────────────────────────────────────────────────

export async function validateReleaseTruth(s) {
  const { failures, fail } = collector();
  const base = s.base;
  if (!base) fail("BASE_MISSING", "docs/release/rc2-2-21-base.json", "base da onda empilhada");
  else {
    if (base.baseSha !== RC2_2_21_BASE_SHA || base.parentWave !== "RC2.2.20" || base.strategy !== "STACKED") fail("BASE_SHA_AMBIGUOUS", "rc2-2-21-base.json", `STACKED sobre ${RC2_2_21_BASE_SHA}`);
    if (base.prTargetWhileParentOpen !== RC2_2_21_PARENT_BRANCH || base.prTargetAfterParentMerged !== "main") fail("BASE_SHA_AMBIGUOUS", "rc2-2-21-base.json", "PR mira a RC2.2.20 e depois a main");
    if (base.doNotDuplicateParentCommits !== true) fail("PARENT_COMMITS_DUPLICATED", "rc2-2-21-base.json", "nunca recriar commits da RC2.2.20");
  }
  const qa = s.deviceQa;
  if (!qa) fail("DEVICE_QA_MISSING", "docs/release/rc2-2-21-device-qa.json", "matriz física");
  else {
    const tests = Object.entries(qa.tests ?? {});
    if (tests.length < 20) fail("DEVICE_QA_MISSING", "rc2-2-21-device-qa.json", "todos os testes físicos listados");
    for (const id of ["selfPlaybackAudible", "nativeSpeechZhCnRecognized", "ttsModelVoiceAllSurfaces", "androidBackPriority", "lifecycleBackgroundResume"])
      if (!qa.tests?.[id]) fail("DEVICE_QA_MISSING", `device-qa.${id}`, "teste físico obrigatório");
    for (const [id, test] of tests) {
      if (test.status === "PASS" && PASS_EVIDENCE_FIELDS.some((field) => !test[field])) fail("FAKE_PHYSICAL_PASS", `device-qa.${id}`, "PASS só com testedAt/buildSha/versionCode/deviceClass/evidenceType");
      if (test.status === "PASS" && ["MOCK", "E2E", "EMULATOR", "CODE"].includes(String(test.evidenceType))) fail("FAKE_PHYSICAL_PASS", `device-qa.${id}`, "mock/E2E/emulador não é físico");
    }
    const allCriticalPass = tests.filter(([, t]) => t.critical).every(([, t]) => t.status === "PASS");
    if (qa.physicalCriticalMatrix === "PASS" && !allCriticalPass) fail("FAKE_PHYSICAL_PASS", "device-qa.physicalCriticalMatrix", "matriz só passa com todos os críticos PASS");
    if (qa.physicalPass === true && !allCriticalPass) fail("FAKE_PHYSICAL_PASS", "device-qa.physicalPass", "nunca por código");
    if (qa.evidenceRules?.voiceRecordingInRepo !== "FORBIDDEN_WITHOUT_OWNER_DECISION" || qa.evidenceRules?.humanVoiceInCi !== "FORBIDDEN") fail("VOICE_IN_REPO", "device-qa.evidenceRules", "voz humana nunca em CI/repo sem decisão do owner");
  }
  const bugs = s.bugs;
  if (!bugs) fail("BUGS_MISSING", "docs/release/rc2-2-21-mobile-bugs.json", "matriz de bugs mobile");
  else {
    const list = bugs.bugs ?? [];
    for (const id of RC2_2_21_P1) {
      const bug = list.find((item) => item.id === id);
      if (!bug) fail("P1_HIDDEN", `mobile-bugs.${id}`, "P1 da onda listado");
      else if (bug.severity !== "P1" || bug.releaseBlocking !== true) fail("P1_HIDDEN", `mobile-bugs.${id}`, "P1 que bloqueia release");
    }
    for (const bug of list) {
      if (!BUG_STATUSES.includes(bug.status)) fail("BUG_STATUS_UNKNOWN", `mobile-bugs.${bug.id}`, bug.status);
      if (bug.status === "PHYSICAL_PASS" && !(bug.physicalEvidence && PASS_EVIDENCE_FIELDS.every((field) => bug.physicalEvidence[field]))) fail("FAKE_PHYSICAL_PASS", `mobile-bugs.${bug.id}`, "PHYSICAL_PASS só com evidência física");
      if (bug.status === "PHYSICAL_PASS" && qa?.tests?.[bug.physicalTest]?.status !== "PASS") fail("FAKE_PHYSICAL_PASS", `mobile-bugs.${bug.id}`, "PHYSICAL_PASS exige o teste físico PASS");
      if (bug.status === "REPRODUCED" && bug.reproducedOnDevice !== true) fail("FAKE_REPRODUCTION", `mobile-bugs.${bug.id}`, "REPRODUCED só se reproduzido");
      if (bug.status === "WONT_FIX_WITH_REASON" && !bug.reason) fail("BUG_STATUS_UNKNOWN", `mobile-bugs.${bug.id}`, "WONT_FIX precisa do motivo");
    }
    const count = (sev) => {
      const items = list.filter((bug) => bug.severity === sev);
      return { total: items.length, physicalPass: items.filter((b) => b.status === "PHYSICAL_PASS").length, openOrPending: items.filter((b) => !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length };
    };
    for (const sev of ["P0", "P1", "P2"]) {
      const want = count(sev);
      const got = bugs.counters?.[sev] ?? {};
      if (want.total !== got.total || want.physicalPass !== got.physicalPass || want.openOrPending !== got.openOrPending) fail("BUG_COUNTER_DRIFT", `mobile-bugs.counters.${sev}`, `${JSON.stringify(got)} ≠ ${JSON.stringify(want)}`);
    }
    const blocking = list.filter((bug) => bug.releaseBlocking && !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(bug.status)).length;
    if (bugs.counters?.releaseBlockingOpen !== blocking) fail("BUG_COUNTER_DRIFT", "mobile-bugs.counters.releaseBlockingOpen", `${bugs.counters?.releaseBlockingOpen} ≠ ${blocking}`);
    const selfVoice = list.find((bug) => bug.id === "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID");
    if (bugs.selfVoiceAudibleOnAndroid === "PASS" && selfVoice?.status !== "PHYSICAL_PASS") fail("FAKE_PHYSICAL_PASS", "mobile-bugs.selfVoiceAudibleOnAndroid", "voz própria audível só com PHYSICAL_PASS");
    const release = bugs.release ?? {};
    if (release.PUBLIC_BETA !== "NO_GO") fail("PUBLIC_BETA_PREMATURE", "mobile-bugs.release.PUBLIC_BETA", "NO_GO");
    if (release.CLOSED_BETA !== "NO_GO" && blocking > 0) fail("CLOSED_BETA_PREMATURE", "mobile-bugs.release.CLOSED_BETA", "NO_GO até fechar os P1 mobile");
    if (release.package !== "longyu.noba.com") fail("PACKAGE_CHANGED", "mobile-bugs.release.package", "longyu.noba.com");
    if (release.androidInAppPurchase !== "DISABLED_FOR_BETA") fail("PURCHASES_ENABLED", "mobile-bugs.release", "DISABLED_FOR_BETA");
    if (release.productionPlay !== "NOT_ENABLED") fail("PRODUCTION_PLAY_ENABLED", "mobile-bugs.release", "NOT_ENABLED");
    if (release.prOpenedAutomatically !== false) fail("AUTO_PR", "mobile-bugs.release", "PR nunca automático");
  }
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "appId continua longyu.noba.com");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "compras Android desligadas na Beta");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "o candidate da #273 não muda");
  if (!/MAX_AUTOMATIC_CHANNEL = "internal"/.test(stripComments(s.src.releaseIdentity))) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "automático = internal");
  if (!/export const RC2_2_21_MOBILE_NATIVE_STABILITY_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-21-mobile-native-stability"/.test(s.src.curriculumFreeze))
    fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_21_MOBILE_NATIVE_STABILITY_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze))
    fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  if (!s.report) fail("REPORT_MISSING", "docs/reports/rc2-2-21-mobile-native-stability.md", "relatório da onda");
  else {
    for (const state of REPORT_STATES) if (!s.report.includes(state)) fail("REPORT_STATES_COLLAPSED", "relatório", `seção ${state}`);
    if (!/PUBLIC BETA: NO-GO/.test(s.report) || !/CLOSED BETA: NO-GO/.test(s.report)) fail("PUBLIC_BETA_PREMATURE", "relatório", "PUBLIC/CLOSED BETA NO-GO");
    if (/PLAY PHYSICAL PASS:\s*(PASS|SIM|YES)/i.test(s.report)) fail("FAKE_PHYSICAL_PASS", "relatório", "PLAY PHYSICAL PASS nunca por código");
    if (!s.report.includes(RC2_2_21_BASE_SHA)) fail("BASE_SHA_AMBIGUOUS", "relatório", "RC2_2_21_BASE_SHA explícito");
  }
  return failures;
}

export const VALIDATORS = {
  "native-voice-playback": validateNativeVoicePlayback,
  "native-speech": validateNativeSpeech,
  "mobile-lifecycle": validateMobileLifecycle,
  "mobile-layout": validateMobileLayout,
  "mobile-navigation": validateMobileNavigation,
  "auth-resilience": validateAuthResilience,
  "state-integrity": validateStateIntegrity,
  "resource-cleanup": validateResourceCleanup,
  "release-truth": validateReleaseTruth,
};
