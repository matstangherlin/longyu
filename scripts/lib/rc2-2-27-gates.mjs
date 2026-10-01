/**
 * RC2.2.27 — ANDROID TTS ROOT CAUSE + COMPLETION MOMENT.
 *
 * O gate não prova que o aparelho fala: prova que o código mede o que o
 * aparelho fizer (request, isSpeaking, callbacks, quem cancelou quem) e que
 * nada vira PASS físico sem o build certo instalado.
 *
 *   build-identity           PR HEAD · workflow · embutido · instalado; divergiu = TEST_INVALID
 *   native-tts-engine-truth  estado nativo inclui isSpeaking AO VIVO; stop só com fala tocando
 *   is-speaking-probe        isSpeaking confirma início; polling repetido até 4 s
 *   sequential-tts           5 e 20 falas em sequência (motor simulado pelo contrato do plugin)
 *   request-lifecycle        evento de outra request não confirma; superseded recebe terminal
 *   request-cancellation     dono cancela só a sua request
 *   auto-speak-unification   autoplay pelo mesmo runtime; requestId por fala; speechKey
 *   conversation-sequence    áudio nunca trava a conversa
 *   guided-try               engineSpeaking libera; prazo nunca deixa cinza para sempre
 *   lesson-audio-gates       auditoria dos passos com trava de áudio (todo passo tem saída)
 *   audio-arbiter-recovery   árbitro cancela a própria fala; recuperação TTS↔gravação registrada
 *   completion-sequence      só apresentação; revelação mínima; prefs; idempotente
 *   celebration-queue        uma cerimônia por vez; TTS cancelado antes do SFX
 *   physical-truth           NOT_RUN honesto, P1 bloqueantes, NO-GO, #273, package, compras, Production
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { validateBetaPedagogyFreeze } from "./beta-pedagogy-freeze.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_27_BASE_SHA = "eb84b6595249aff56f05dd4d71ad8c1142571075";
export const RC2_2_27_PARENT_BRANCH = "codex/rc2-2-26-android-physical-closure";
const NEW_P1 = [
  "ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED",
  "ANDROID_SEQUENTIAL_TTS_STOPS_AFTER_FIRST_UTTERANCE",
  "ANDROID_CONVERSATION_AUDIO_SEQUENCE_BROKEN",
  "ANDROID_LESSON_AUDIO_PROGRESS_STALL",
];
const CARRIED_P1 = ["AUDIO_OWNER_RECOVERY_FAIL", "SELF_COMPARE_VOICE_NOT_AUDIBLE_ANDROID", "NATIVE_SPEECH_NOT_PROVEN", "LOCAL_PROFILES_VISIBLE", "LOGOUT_DISCOVERABILITY_OWNER_FAIL"];
const REQUIRED_CHECKS = ["buildIdentityMatch", "ttsFiveSequential", "ttsTwentySequential", "ttsInterruption", "stopModeA", "stopModeB", "guidedTryTenColdStarts", "conversationFiveDialogues", "conversationTenLines", "audioOwnerRecoveryChain", "completionSequenceOwner", "noScroll390x844", "noScroll375x667", "noScroll360x640"];
const NO_SCROLL_VIEWPORTS = ["390, height: 844", "375, height: 667", "360, height: 640"];

export const FILES = {
  plugin: "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java",
  nativeSpeech: "src/lib/platform/nativeSpeech.ts",
  correlation: "src/lib/ttsCorrelation.ts",
  forensics: "src/lib/ttsForensics.ts",
  mandarin: "src/lib/mandarinSpeech.ts",
  autoSpeak: "src/lib/useAutoSpeak.ts",
  tts: "src/lib/tts.ts",
  playback: "src/lib/audioPlayback.ts",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  steps: "src/features/lesson/steps.tsx",
  panel: "src/features/qa/AndroidTtsForensicsPanel.tsx",
  qaPage: "src/features/qa/QaDevicePage.tsx",
  completion: "src/lib/completionSequence.ts",
  victory: "src/features/lesson/LessonVictory.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  guidanceHost: "src/components/guidance/GuidanceHost.tsx",
  audioGatedAudit: "scripts/audit-rc2-2-27-audio-gated-steps.mjs",
  subscription: "src/services/subscriptionService.ts",
  releaseIdentity: "scripts/lib/release-identity.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  e2e: "e2e/rc2-2-27-android-tts-root-cause.spec.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);
const optionalText = (rel) => (exists(rel) ? read(rel) : "");
const sha256 = async (text) => (await import("node:crypto")).createHash("sha256").update(text).digest("hex");

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  src.capacitorConfig = read(exists("capacitor.config.ts") ? "capacitor.config.ts" : "capacitor.config.json");
  return {
    src,
    base: optionalJson("docs/release/rc2-2-27-base.json"),
    bugs: optionalJson("docs/release/rc2-2-27-android-tts-bugs.json"),
    previousBugs: optionalJson("docs/release/rc2-2-26-android-physical-bugs.json"),
    matrix: optionalJson("docs/release/rc2-2-27-physical-matrix.json"),
    debt: optionalJson("docs/release/rc2-2-27-owner-product-debt.json"),
    audioGated: optionalJson("docs/reports/rc2-2-27-audio-gated-steps.json"),
    forensicReport: optionalText("docs/reports/rc2-2-27-android-tts-forensics.md"),
    report: optionalText("docs/reports/rc2-2-27-android-tts-root-cause.md"),
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

/** Trecho de `start` até `end` (ou fim do arquivo). */
function section(text, start, end) {
  const source = String(text);
  const from = source.indexOf(start);
  if (from < 0) return "";
  const to = end ? source.indexOf(end, from + start.length) : -1;
  return source.slice(from, to < 0 ? undefined : to);
}

// ── Execução dos módulos reais (com a fonte possivelmente mutada) ─────────

let importSeq = 0;
async function bundle(entryKey, s, mocks = {}) {
  const overrides = new Map(Object.entries(FILES).map(([key, rel]) => [path.join(ROOT, rel), s.src[key]]));
  const result = await build({
    entryPoints: [path.join(ROOT, FILES[entryKey])],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    plugins: [
      {
        name: "rc2-2-27",
        setup(pluginBuild) {
          pluginBuild.onResolve({ filter: /.*/ }, (args) => (mocks[args.path] !== undefined ? { path: args.path, namespace: "mock" } : undefined));
          pluginBuild.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({ contents: mocks[args.path], loader: "js" }));
          pluginBuild.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2227-"));
  const file = path.join(dir, `bundle-${(importSeq += 1)}.mjs`);
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function guarded(fail, where, fn) {
  try {
    await fn();
  } catch (error) {
    fail("MODULE_NOT_EXECUTABLE", where, String(error?.message ?? error).slice(0, 200));
  }
}

const ADAPTER_MOCKS = {
  "@capacitor/core": "export const Capacitor = { isPluginAvailable: () => true, getPlatform: () => 'android', isNativePlatform: () => true }; export const registerPlugin = () => new Proxy({}, { get: (_t, key) => globalThis.__longyu27Engine?.[key] });",
  "./nativePlatform": "export const isAndroid = () => true; export const isNativePlatform = () => true;",
  "../resourceCounters": "export const trackObserver = () => () => {};",
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Motor simulado pelo CONTRATO do plugin RC2.2.27 (não pelo Java): eventos com
 * requestId, startSpeak resolve no início, nova fala substitui a anterior.
 *   mode "callbacks"     onStart/onDone chegam normalmente
 *   mode "isSpeakingOnly" nenhum callback; só tts.isSpeaking() a partir de `speakingAfterMs`
 *   mode "foreignStart"  emite START de OUTRA request; esta termina em ERROR
 */
function simulatedEngine({ mode = "callbacks", speakingAfterMs = 60, durationMs = 90 } = {}) {
  let listener = null;
  const requests = new Map();
  const event = (type, requestId, extra = {}) => listener?.({ type, requestId, utteranceId: `u-${requestId}`, timestamp: Date.now(), engineState: "sim", ...extra });
  return {
    requests,
    addListener: async (_name, callback) => {
      listener = callback;
      return { remove: async () => {} };
    },
    getTtsPlaybackState: async ({ requestId }) => {
      const req = requests.get(requestId);
      if (!req) return { requestId, utteranceId: null, state: "IDLE", started: false, done: false, errorCode: null };
      const elapsed = Date.now() - req.at;
      if (mode === "foreignStart") return { requestId, utteranceId: null, state: elapsed > 250 ? "ERROR" : "QUEUED", started: false, done: false, errorCode: elapsed > 250 ? "TTS_SPEAK_FAILED" : null };
      const speaking = elapsed >= speakingAfterMs && elapsed < speakingAfterMs + durationMs;
      return { requestId, utteranceId: `u-${requestId}`, state: elapsed >= speakingAfterMs + durationMs && mode === "callbacks" ? "DONE" : "QUEUED", started: false, done: false, errorCode: null, isCurrent: true, engineSpeakingNow: speaking || (mode === "isSpeakingOnly" && elapsed >= speakingAfterMs) };
    },
    startSpeak: ({ requestId }) => {
      requests.set(requestId, { at: Date.now() });
      if (mode === "isSpeakingOnly") return new Promise((_resolve, reject) => setTimeout(() => reject(Object.assign(new Error("start not confirmed"), { code: "TTS_START_NOT_CONFIRMED" })), 30));
      if (mode === "foreignStart") {
        setTimeout(() => event("TTS_STARTED", "someone-else"), 20);
        return new Promise((_resolve, reject) => setTimeout(() => reject(Object.assign(new Error("speak failed"), { code: "TTS_SPEAK_FAILED" })), 40));
      }
      return new Promise((resolve) => {
        setTimeout(() => {
          event("TTS_STARTED", requestId);
          resolve({ requestId, utteranceId: `u-${requestId}`, started: true });
        }, 20);
        setTimeout(() => event("TTS_DONE", requestId), 20 + durationMs);
      });
    },
    cancelSpeak: async ({ requestId }) => ({ requestId, cancelled: true }),
    stop: async () => {},
  };
}

/** Uma fala pelo adaptador REAL: done = DONE da própria request (ou prazo). */
function adapterSpeaker(adapter, prefix) {
  return (index) => {
    const requestId = `${prefix}-${index}`;
    let started = false;
    let resolveEnd;
    const ended = new Promise((resolve) => {
      resolveEnd = resolve;
    });
    const timeout = setTimeout(() => resolveEnd(false), 1500);
    const result = adapter.nativeSpeakTracked("一", { requestId, source: "QA_DIAGNOSTIC" }, (event) => {
      if (event.type === "TTS_STARTED" || event.type === "TTS_ENGINE_SPEAKING") started = true;
      if (event.type === "TTS_DONE") {
        clearTimeout(timeout);
        resolveEnd(true);
      }
    });
    const done = Promise.all([result, ended]).then(([res, end]) => ({ started: started || res.ok === true, ended: end, superseded: false, reason: res.ok ? null : res.code }));
    return { requestId, done };
  };
}

// ── 1. build-identity ─────────────────────────────────────────────────────

export async function validateBuildIdentity(s) {
  const { failures, fail } = collector();
  await guarded(fail, FILES.forensics, async () => {
    const m = await bundle("forensics", s);
    const head = "eb84b6595249aff56f05dd4d71ad8c1142571075";
    if (m.buildIdentityVerdict({ prHead: head, workflowHead: head, embeddedSha: head, installedSha: "e54ca366" }) !== "TEST_INVALID") fail("BUILD_MISMATCH_ACCEPTED", FILES.forensics, "SHA instalado ≠ PR HEAD precisa ser TEST_INVALID [20]");
    if (m.buildIdentityVerdict({ prHead: head, installedSha: "e54ca366c0ffee" }) !== "TEST_INVALID") fail("BUILD_MISMATCH_ACCEPTED", FILES.forensics, "instalado diferente do HEAD");
    if (m.buildIdentityVerdict({ prHead: head, workflowHead: head, embeddedSha: head.slice(0, 12), installedSha: head.slice(0, 7) }) !== "MATCH") fail("BUILD_IDENTITY_BROKEN", FILES.forensics, "prefixos ≥ 7 do mesmo SHA batem");
    if (m.buildIdentityVerdict({ prHead: head }) !== "UNKNOWN") fail("BUILD_MISMATCH_ACCEPTED", FILES.forensics, "sem SHA instalado = UNKNOWN");
    if (m.physicalResultAcceptable("TEST_INVALID") || m.physicalResultAcceptable("UNKNOWN") || !m.physicalResultAcceptable("MATCH")) fail("BUILD_MISMATCH_ACCEPTED", FILES.forensics, "só MATCH aceita resultado físico");
  });
  if (!/data-build-verdict=\{/.test(s.src.panel) || !/buildIdentityVerdict\(/.test(s.src.panel)) fail("BUILD_IDENTITY_HIDDEN", FILES.panel, "painel mostra o veredito");
  if (!/<AndroidTtsForensicsPanel \/>/.test(s.src.qaPage)) fail("BUILD_IDENTITY_HIDDEN", FILES.qaPage, "painel montado em /qa/device");
  return failures;
}

// ── 2. native-tts-engine-truth ────────────────────────────────────────────

export async function validateNativeTtsEngineTruth(s) {
  const { failures, fail } = collector();
  const java = stripComments(s.src.plugin);
  const state = section(java, "public void getTtsPlaybackState(PluginCall call)", "@PluginMethod");
  if (!/"engineSpeakingNow", isCurrent && safeIsSpeaking\(\)/.test(state)) fail("QUERY_SNAPSHOT_ONLY", FILES.plugin, "getTtsPlaybackState inclui tts.isSpeaking() AO VIVO, não só o snapshot dos callbacks [1]");
  if (!/private String ttsStopMode = "CONDITIONAL";/.test(java)) fail("UNCONDITIONAL_STOP", FILES.plugin, "modo padrão CONDITIONAL");
  const begin = section(java, "private void beginTtsRequest(PluginCall call, boolean ackOnStart)", "private void startSpeakingProbe");
  if (!/"EXPLICIT_STOP"\.equals\(ttsStopMode\)\s*\|\|\s*\("CONDITIONAL"\.equals\(ttsStopMode\) && engineSpeakingNow\)/.test(begin)) fail("UNCONDITIONAL_STOP", FILES.plugin, "tts.stop() só com fala tocando (ou modo A de QA) [8]");
  if (/^\s*if \(tts != null\) tts\.stop\(\);/m.test(begin)) fail("UNCONDITIONAL_STOP", FILES.plugin, "stop incondicional antes do speak");
  const stop = section(java, "public void stop(PluginCall call)", "@PluginMethod");
  if (!/if \(safeIsSpeaking\(\) && tts != null\) tts\.stop\(\);/.test(stop)) fail("STOP_AFTER_DONE", FILES.plugin, "stop() não para motor ocioso (fala anterior já em DONE) [9]");
  if (!/main\.post\(/.test(stop)) fail("STOP_OFF_MAIN_THREAD", FILES.plugin, "stop no mesmo thread dos callbacks");
  const cancel = section(java, "public void cancelSpeak(PluginCall call)", "@PluginMethod");
  if (!/if \(isCurrent && safeIsSpeaking\(\) && tts != null\) tts\.stop\(\);/.test(cancel)) fail("STOP_AFTER_DONE", FILES.plugin, "cancelSpeak só para a própria fala se ela estiver tocando");
  const forensics = section(java, "public void getTtsForensics(PluginCall call)", "@PluginMethod");
  for (const field of ["engine", "languageStatus", "voiceLocale", "androidApi", "manufacturer", "webView", "isSpeaking", "requests"]) if (!forensics.includes(`"${field}"`)) fail("ENGINE_TRUTH_MISSING", FILES.plugin, `getTtsForensics.${field}`);
  const log = section(java, "private void ttsLog(", "\n    }\n");
  if (!log || /\btext\b/.test(log)) fail("TTS_LOG_CARRIES_TEXT", FILES.plugin, "LongyuTTS nunca registra texto");
  return failures;
}

// ── 3. is-speaking-probe ──────────────────────────────────────────────────

export async function validateIsSpeakingProbe(s) {
  const { failures, fail } = collector();
  const java = stripComments(s.src.plugin);
  const probe = section(java, "private void startSpeakingProbe(TtsRequest request)", "private void armDeadline");
  if (!/safeIsSpeaking\(\)/.test(probe) || !/ackRequest\(request, "isSpeaking", false\)/.test(probe)) fail("IS_SPEAKING_IGNORED", FILES.plugin, "watchdog isSpeaking confirma o início");
  const probeMs = Number((java.match(/TTS_SPEAKING_PROBE_MS = (\d+)L;/) ?? [])[1]);
  if (!(probeMs >= 50 && probeMs <= 100)) fail("IS_SPEAKING_IGNORED", FILES.plugin, "watchdog a cada 50–100 ms");
  const deadline = Number((s.src.nativeSpeech.match(/TTS_STATE_POLL_DEADLINE_MS = (\d+);/) ?? [])[1]);
  const pollMs = Number((s.src.nativeSpeech.match(/TTS_STATE_POLL_MS = (\d+);/) ?? [])[1]);
  if (!(deadline >= 3500)) fail("POLLING_ENDS_EARLY", FILES.nativeSpeech, "consulta até ~4 s sem confirmação [4]");
  if (!(pollMs >= 200 && pollMs <= 250)) fail("POLLING_SINGLE_SHOT", FILES.nativeSpeech, "consulta a cada 200–250 ms");
  await guarded(fail, FILES.nativeSpeech, async () => {
    // Nenhum callback; o motor só aparece no isSpeaking depois de ~900 ms.
    globalThis.__longyu27Engine = simulatedEngine({ mode: "isSpeakingOnly", speakingAfterMs: 900 });
    const adapter = await bundle("nativeSpeech", s, ADAPTER_MOCKS);
    const events = [];
    const result = await adapter.nativeSpeakTracked("一", { requestId: "probe-A" }, (event) => events.push(event));
    const engine = events.some((event) => event.type === "TTS_ENGINE_SPEAKING" && event.source === "engine");
    if (!engine) {
      const condition = (s.src.nativeSpeech.match(/if \(!queryStarted && \(.*\)\) \{/) ?? [""])[0];
      const code = !/engineSpeakingNow === true/.test(condition) ? "IS_SPEAKING_IGNORED" : /while \(!confirmed && !terminal/.test(s.src.nativeSpeech) ? "POLLING_ENDS_EARLY" : "POLLING_SINGLE_SHOT";
      fail(code, FILES.nativeSpeech, "isSpeaking da MESMA request (sem callbacks) precisa confirmar o início [2][3][4]");
    }
    if (engine && result.ok !== true) fail("IS_SPEAKING_IGNORED", FILES.nativeSpeech, "início confirmado por isSpeaking não pode virar falha");
  });
  return failures;
}

// ── 4. sequential-tts ─────────────────────────────────────────────────────

export async function validateSequentialTts(s) {
  const { failures, fail } = collector();
  await guarded(fail, FILES.forensics, async () => {
    const forensics = await bundle("forensics", s);
    globalThis.__longyu27Engine = simulatedEngine({ mode: "callbacks" });
    const adapter = await bundle("nativeSpeech", s, ADAPTER_MOCKS);
    const rows5 = await forensics.runSequentialProbe(5, adapterSpeaker(adapter, "seq5"));
    const v5 = forensics.sequentialVerdict(rows5, 5);
    if (rows5[1]?.result !== "PASS") fail("SECOND_UTTERANCE_SILENT", FILES.nativeSpeech, "fala 2 precisa tocar depois da fala 1 [15]");
    if (v5.result !== "PASS") fail("SEQUENCE_BREAKS", FILES.nativeSpeech, `5/5 em sequência (veio ${v5.passed}/5)`);
    const rows20 = await forensics.runSequentialProbe(20, adapterSpeaker(adapter, "seq20"));
    if (forensics.sequentialVerdict(rows20, 20).result !== "PASS") fail("SEQUENCE_BREAKS", FILES.nativeSpeech, "20/20 em sequência");
    // O veredito não pode aceitar 4/5.
    const lossy = [1, 2, 3, 4, 5].map((index) => forensics.probeRow(index, `r${index}`, { started: index !== 5, ended: index !== 5, superseded: false, reason: index === 5 ? "NO_START" : null }));
    if (forensics.sequentialVerdict(lossy, 5).result !== "FAIL") fail("SEQUENCE_BREAKS", FILES.forensics, "fala 5 falhando = FAIL [16]");
  });
  for (const testId of ["qa-tts-one", "qa-tts-five", "qa-tts-twenty", "qa-tts-interrupt", "qa-tts-done-next", "qa-tts-double-tap", "qa-tts-dialogue", "qa-tts-forensics-copy"]) if (!s.src.panel.includes(`"${testId}"`)) fail("FORENSICS_TEST_MISSING", FILES.panel, testId);
  return failures;
}

// ── 5. request-lifecycle ──────────────────────────────────────────────────

export async function validateRequestLifecycle(s) {
  const { failures, fail } = collector();
  await guarded(fail, FILES.nativeSpeech, async () => {
    globalThis.__longyu27Engine = simulatedEngine({ mode: "foreignStart" });
    const adapter = await bundle("nativeSpeech", s, ADAPTER_MOCKS);
    const events = [];
    const result = await adapter.nativeSpeakTracked("一", { requestId: "mine" }, (event) => events.push(event));
    if (result.ok === true || events.some((event) => event.type === "TTS_STARTED" && event.requestId !== "mine")) fail("FOREIGN_REQUEST_CONFIRMS", FILES.nativeSpeech, "START de outra request nunca confirma esta [5]");
  });
  await guarded(fail, FILES.correlation, async () => {
    const c = await bundle("correlation", s);
    const foreign = c.applyTtsEvent(c.beginTtsPlayback("B"), { type: "TTS_STARTED", requestId: "A", utteranceId: "u", timestamp: 1, engineState: "x", source: "event" });
    if (c.ttsCtaEnabled(foreign)) fail("FOREIGN_REQUEST_CONFIRMS", FILES.correlation, "correlação ignora evento alheio");
    const superseded = c.applyTtsEvent(c.beginTtsPlayback("A"), { type: "TTS_SUPERSEDED", requestId: "A", utteranceId: null, timestamp: 1, engineState: "superseded", source: "event" });
    if (superseded.phase !== "STOPPED") fail("SUPERSEDED_NOT_TERMINAL", FILES.correlation, "TTS_SUPERSEDED é terminal [7]");
  });
  const java = stripComments(s.src.plugin);
  const begin = section(java, "private void beginTtsRequest(PluginCall call, boolean ackOnStart)", "private void startSpeakingProbe");
  if (!/if \(previous != null && previous != request && !previous\.terminal\(\)\) \{[\s\S]*?supersede\(previous, rid\);/.test(begin)) fail("START_CALL_OVERWRITTEN", FILES.plugin, "pedido anterior pendente é SUPERSEDED, nunca sobrescrito [6]");
  if (/private PluginCall startCall;/.test(java)) fail("START_CALL_OVERWRITTEN", FILES.plugin, "sem slot único startCall");
  const supersede = section(java, "private void supersede(TtsRequest previous, String byRequestId)", "private void failRequest");
  if (!/emitTts\("TTS_SUPERSEDED"/.test(supersede) || !/settleRequest\(previous, true, "TTS_SUPERSEDED"\)/.test(supersede)) fail("SUPERSEDED_NOT_TERMINAL", FILES.plugin, "superseded recebe evento E fecha as chamadas pendentes [7]");
  if (!/event\.type === "TTS_SUPERSEDED"\) end\(\)/.test(s.src.tts)) fail("SUPERSEDED_NOT_TERMINAL", FILES.tts, "speakNative encerra em TTS_SUPERSEDED");
  for (const state of ["CREATED", "QUEUED", "ENGINE_SPEAKING", "STARTED", "DONE", "SUPERSEDED", "STOPPED", "ERROR"]) if (!java.includes(`"${state}"`)) fail("LIFECYCLE_STATE_MISSING", FILES.plugin, state);
  return failures;
}

// ── 6. request-cancellation ───────────────────────────────────────────────

export async function validateRequestCancellation(s) {
  const { failures, fail } = collector();
  const schedule = section(s.src.mandarin, "export function scheduleAutoSpeak(", "\n}\n");
  if (!/if \(own && mandarinSpeechActive\(own\.requestId\)\) own\.cancel\(\);/.test(schedule)) fail("UNMOUNT_KEEPS_OWN_REQUEST", FILES.mandarin, "cleanup cancela a própria request ainda viva [13]");
  const own = section(s.src.playback, "export function cancelOwnSpeech(", "\n}\n");
  if (!/void nativeCancelSpeak\(requestId\);/.test(own) || !/if \(stillNewest\) stopSpeaking\(\);/.test(own)) fail("CLEANUP_CANCELS_FOREIGN", FILES.playback, "cancelOwnSpeech nunca para fala de outro dono [14]");
  const cancelOne = section(s.src.mandarin, "export function cancelMandarinSpeech(", "\n}\n");
  if (!/if \(!slot \|\| slot\.settled\) return;/.test(cancelOne)) fail("CLEANUP_CANCELS_FOREIGN", FILES.mandarin, "cancelar request já encerrada é no-op");
  if (!/export async function nativeCancelSpeak\(requestId: string\)/.test(s.src.nativeSpeech)) fail("CLEANUP_CANCELS_FOREIGN", FILES.nativeSpeech, "cancelamento por requestId");
  return failures;
}

// ── 7. auto-speak-unification ─────────────────────────────────────────────

export async function validateAutoSpeakUnification(s) {
  const { failures, fail } = collector();
  if (!/import \{ scheduleAutoSpeak, type AutoSpeakOptions \} from "\.\/mandarinSpeech";/.test(s.src.autoSpeak)) fail("AUTOPLAY_BYPASSES_RUNTIME", FILES.autoSpeak, "useAutoSpeak usa o runtime único [10]");
  if (/export function scheduleAutoSpeak/.test(s.src.tts)) fail("AUTOPLAY_BYPASSES_RUNTIME", FILES.tts, "tts.ts não tem segundo agendador");
  const schedule = section(s.src.mandarin, "export function scheduleAutoSpeak(", "\n}\n");
  if (!/handle = requestMandarinSpeech\(\{/.test(schedule) || /\bspeak\(/.test(schedule)) fail("AUTOPLAY_BYPASSES_RUNTIME", FILES.mandarin, "autoplay = requestMandarinSpeech (mesmo dono, árbitro e correlação)");
  if (!/const requestId = request\.requestId \?\? newTtsRequestId\(\);/.test(s.src.mandarin)) fail("NODE_REUSES_REQUEST_ID", FILES.mandarin, "cada fala nova ganha requestId próprio [11]");
  if (!/\[opts\.speechKey,/.test(s.src.autoSpeak)) fail("SAME_TEXT_NEW_NODE_SILENT", FILES.autoSpeak, "speechKey nas dependências: mesmo texto em nó novo toca [12]");
  if (!/speechKey: nodeKey/.test(s.src.conversation) || !/nodeKey=\{`\$\{step\.sceneId \?\? "scene"\}:\$\{node\.id\}:\$\{spokenCount\}`\}/.test(s.src.conversation)) fail("SAME_TEXT_NEW_NODE_SILENT", FILES.conversation, "speechKey = cena:nó");
  return failures;
}

// ── 8. conversation-sequence ──────────────────────────────────────────────

export async function validateConversationSequence(s) {
  const { failures, fail } = collector();
  const disabled = [...s.src.conversation.matchAll(/disabled=\{([^}]*)\}/g)].map((match) => match[1]);
  if (disabled.some((expr) => /audio|speak|tts|playing/i.test(expr))) fail("AUDIO_BLOCKS_CONVERSATION", FILES.conversation, "nenhum botão da conversa depende do áudio [17]");
  if (!/source: "CONVERSATION_AUTOPLAY"/.test(s.src.conversation)) fail("AUDIO_BLOCKS_CONVERSATION", FILES.conversation, "autoplay da conversa identificado na sessão única");
  if (!/conversation_dom_next_visible/.test(s.src.conversation)) fail("AUDIO_BLOCKS_CONVERSATION", FILES.conversation, "próximo nó visível independe do áudio");
  const schedule = section(s.src.mandarin, "export function scheduleAutoSpeak(", "\n}\n");
  // RC2.2.28+ also chains .catch so rejected done still fires onend.
  if (!/void handle\.done\.then\(\(\) => opts\.onend\?\.\(\)\)(?:\.catch\(\(\) => opts\.onend\?\.\(\)\))?;/.test(schedule)) {
    fail("AUDIO_BLOCKS_CONVERSATION", FILES.mandarin, "onend sempre chega (falha, substituída ou cancelada)");
  }
  return failures;
}

// ── 9. guided-try ─────────────────────────────────────────────────────────

export async function validateGuidedTry(s) {
  const { failures, fail } = collector();
  await guarded(fail, FILES.correlation, async () => {
    const c = await bundle("correlation", s);
    const engine = c.applyTtsEvent(c.beginTtsPlayback("A"), { type: "TTS_ENGINE_SPEAKING", requestId: "A", utteranceId: "u", timestamp: 1, engineState: "speaking", source: "engine" });
    if (!c.ttsCtaEnabled(engine) || !c.ttsPlaybackConfirmed(engine)) fail("GUIDED_TRY_IGNORES_ENGINE", FILES.correlation, "isSpeaking da mesma request libera o Continuar [18]");
  });
  const deadline = Number((s.src.guidedTry.match(/GUIDED_LISTEN_DEADLINE_MS = (\d+);/) ?? [])[1]);
  if (!(deadline > 0 && deadline <= 8000)) fail("GUIDED_TRY_DISABLED_FOREVER", FILES.guidedTry, "prazo de UI ≤ 8 s");
  // O prazo nasce no TOQUE (o APK do owner ficou em IDLE: prazo preso a STARTING nunca armou).
  const effect = section(s.src.guidedTry, "if (step !== \"listen\" || listenTap === 0) return;", "}, [step, listen, listenTap]);");
  if (!effect || !/setFailReason\("TTS_UI_DEADLINE"\)/.test(effect) || !/"FAILED"/.test(effect)) fail("GUIDED_TRY_DISABLED_FOREVER", FILES.guidedTry, "prazo leva a [Tocar novamente] [Eu ouvi] [Continuar sem áudio] [19]");
  if (!/setListenTap\(\(count\) => count \+ 1\);/.test(section(s.src.guidedTry, "function playNihao()", "function confirmHeardWithoutAck()"))) fail("GUIDED_TRY_DISABLED_FOREVER", FILES.guidedTry, "o toque arma o prazo");
  const superseded = section(s.src.guidedTry, "if (outcome.superseded) {", "setFailReason(outcome.reason);");
  if (/"IDLE"/.test(superseded) || !/setFailReason\("TTS_SUPERSEDED"\)/.test(superseded)) fail("GUIDED_TRY_DISABLED_FOREVER", FILES.guidedTry, "substituída sem início vira falha recuperável, nunca IDLE cinza");
  for (const testId of ["guided-audio-retry", "guided-audio-confirm-heard", "listen-continue-degraded"]) if (!s.src.guidedTry.includes(testId)) fail("GUIDED_TRY_DISABLED_FOREVER", FILES.guidedTry, testId);
  if (!/failReason === "TTS_UI_DEADLINE"/.test(s.src.guidedTry)) fail("GUIDED_TRY_DISABLED_FOREVER", FILES.guidedTry, "\"Eu ouvi\" aparece depois do prazo");
  if (!/source: "GUIDED_TRY"/.test(s.src.guidedTry)) fail("GUIDED_TRY_IGNORES_ENGINE", FILES.guidedTry, "sessão única de fala");
  return failures;
}

// ── 10. lesson-audio-gates ────────────────────────────────────────────────

export async function validateLessonAudioGates(s) {
  const { failures, fail } = collector();
  const audit = s.audioGated;
  if (!audit) fail("AUDIO_GATE_AUDIT_MISSING", "docs/reports/rc2-2-27-audio-gated-steps.json", "auditoria");
  else {
    const all = [...(audit.steps ?? []), ...(audit.surfaces ?? [])];
    for (const item of all) {
      for (const key of ["kind", "surface", "requiresAudio", "canFallback", "nativePath", "physicalStatus"]) if (!(key in item)) fail("AUDIO_GATE_AUDIT_INCOMPLETE", `audio-gated.${item.kind}`, key);
      if (item.audioGatesContinue && !item.canFallback) fail("AUDIO_GATE_NO_EXIT", `audio-gated.${item.kind}`, "trava de áudio sem saída");
      if (item.physicalStatus !== "NOT_RUN") fail("FAKE_PHYSICAL_PASS", `audio-gated.${item.kind}`, "NOT_RUN até o aparelho");
    }
    if (!all.some((item) => item.kind === "listen" && item.audioGatesContinue)) fail("AUDIO_GATE_AUDIT_INCOMPLETE", "audio-gated.listen", "Ouça é passo com trava");
    if (!all.some((item) => item.kind === "guided_try_listen")) fail("AUDIO_GATE_AUDIT_INCOMPLETE", "audio-gated", "Teste Guiado 2/7");
  }
  const listen = section(s.src.steps, "function GuidedStepListen(", "function LegacyStepListen(");
  if (!/requestMandarinSpeech\(\{ text: step\.text!, source: "LESSON_AUDIO"/.test(listen)) fail("LESSON_AUDIO_OUTSIDE_RUNTIME", FILES.steps, "Ouça pela sessão única");
  if (!/tr\("player\.cannotListenNow"\)/.test(listen) || !/data-testid=\{failed \? "listen-continue-degraded" : "listen-continue"\}/.test(listen)) fail("AUDIO_GATE_NO_EXIT", FILES.steps, "Ouça sempre tem saída sem áudio");
  return failures;
}

// ── 11. audio-arbiter-recovery ────────────────────────────────────────────

export async function validateAudioArbiterRecovery(s) {
  const { failures, fail } = collector();
  if (!/claim = claimAudio\("TTS", \(\) => cancelOwnSpeech\(requestId, token\)\);/.test(s.src.playback)) fail("ARBITER_GLOBAL_STOP", FILES.playback, "o árbitro cancela a PRÓPRIA fala, não para tudo");
  const play = section(s.src.playback, "export function playMandarinAudio(", "export function cancelOwnSpeech(");
  if (/\bstopSpeaking\(\)/.test(stripComments(play))) fail("ARBITER_GLOBAL_STOP", FILES.playback, "prazo de fim cancela só a própria request");
  const bug = s.bugs?.bugs?.find((item) => item.id === "AUDIO_OWNER_RECOVERY_FAIL");
  if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true || bug.physicalStatus !== "NOT_RUN") fail("RECOVERY_DEBT_DROPPED", "rc2-2-27-android-tts-bugs.json", "AUDIO_OWNER_RECOVERY_FAIL carregado, P1, NOT_RUN");
  if (s.matrix?.checks?.audioOwnerRecoveryChain !== "NOT_RUN") fail("RECOVERY_DEBT_DROPPED", "rc2-2-27-physical-matrix.json", "TTS → RECORDING → SELF_PLAYBACK → TTS → RECOGNITION → TTS");
  return failures;
}

// ── 12. completion-sequence ───────────────────────────────────────────────

export async function validateCompletionSequence(s) {
  const { failures, fail } = collector();
  await guarded(fail, FILES.completion, async () => {
    const m = await bundle("completion", s);
    const full = m.buildCompletionStages({ kind: "LESSON", xpDelta: 20, qiDelta: 5, streakAdvanced: true, progress: { before: 3, after: 4, total: 5 }, unlockLabel: "Cultura", medalLabel: "Precisão Serena", summaryLine: "Seu ouvido segurou as falas." });
    if (full.includes("QI") && full.includes("STREAK")) fail("REWARDS_ALL_AT_ONCE", FILES.completion, "Qi OU ofensiva, nunca os dois");
    if (full.join(",") !== "CHECK,XP,QI,PROGRESS,UNLOCK,MEDAL,SUMMARY") fail("COMPLETION_ORDER", FILES.completion, full.join(","));
    const none = m.buildCompletionStages({ kind: "LESSON", xpDelta: 10, qiDelta: 0, streakAdvanced: false, progress: { before: 2, after: 2, total: 4 }, unlockLabel: null, medalLabel: null, summaryLine: null });
    if (none.join(",") !== "CHECK,XP") fail("UNCHANGED_REWARD_SHOWN", FILES.completion, `sem mudança não aparece [29] (veio ${none.join(",")})`);
    const schedule = m.completionSchedule(full, false);
    if (schedule[schedule.length - 1] > m.COMPLETION_REVEAL_MAX_MS || m.COMPLETION_REVEAL_MAX_MS > 2500) fail("COMPLETION_TOO_LONG", FILES.completion, "≤ 2,5 s");
    if (m.completionSchedule(full, true).some((at) => at !== 0)) fail("REDUCED_MOTION_IGNORED", FILES.completion, "reduced motion = estado final instantâneo [25]");
    if (m.completionFeedback("CHECK", "LESSON", { soundEffects: false, hapticsEnabled: true }, true).sound !== null) fail("SOUND_WHEN_OFF", FILES.completion, "soundEffects off = sem som [23]");
    if (m.completionFeedback("CHECK", "LESSON", { soundEffects: true, hapticsEnabled: false }, true).haptic !== null) fail("HAPTIC_WHEN_OFF", FILES.completion, "haptics off = sem vibração [24]");
    const on = m.completionFeedback("CHECK", "UNIT", { soundEffects: true, hapticsEnabled: true }, true);
    if (on.sound !== "moduleComplete" || on.haptic !== "lessonComplete") fail("COMPLETION_FEEDBACK", FILES.completion, "sons/vibrações existentes do Longyu");
    if (m.completionFeedback("CHECK", "LESSON", { soundEffects: true, hapticsEnabled: true }, false).sound !== null) fail("CELEBRATION_REPEATS", FILES.completion, "reabrir não toca de novo");
    const store = new Map();
    const storage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
    const key = m.completionKey("hello-1", "hello-1:1700000000000");
    if (key !== "completion:hello-1:hello-1:1700000000000") fail("CELEBRATION_REPEATS", FILES.completion, "chave completion:<lessonId>:<completionId>");
    if (m.claimCompletionShow(key, storage) !== true || m.claimCompletionShow(key, storage) !== false) fail("CELEBRATION_REPEATS", FILES.completion, "voltar/reabrir não repete [30]");
  });
  const victory = stripComments(s.src.victory);
  if (/\b(addXp|addQi|grantLessonReward|claimReward|addPoints|addPearls?)\(/.test(victory)) fail(/addXp/.test(victory) ? "COMPLETION_GRANTS_XP" : "COMPLETION_GRANTS_QI", FILES.victory, "a cerimônia só exibe; nunca concede [21][22]");
  if (!/claimCompletionShow\(completionKey\(completion\.lessonId, completion\.completionId\), storage\)/.test(victory)) fail("CELEBRATION_REPEATS", FILES.victory, "idempotência por conclusão");
  if (!/useState\(\(\) => \(firstShow && !reducedMotion \? 0 : stages\.length - 1\)\)/.test(victory)) fail("REDUCED_MOTION_IGNORED", FILES.victory, "reduced motion/reabrir = estado final direto");
  const actions = section(victory, "data-lesson-victory-actions", "</div>");
  if (/disabled=\{[^}]*stage/i.test(actions)) fail("CONTINUE_HIJACKED", FILES.victory, "Continuar nunca espera a animação");
  // JSX prop (qi={...}) or spread object field (qi: ...) — same delta source.
  if (!/qi[=:]\s*\{?newRewards\.find\(\(reward\) => reward\.type === "qi"\)\?\.amount \?\? 0\}?/.test(s.src.player)) {
    fail("COMPLETION_GRANTS_QI", FILES.player, "Qi exibido = delta já calculado pelo fluxo existente");
  }
  return failures;
}

// ── 13. celebration-queue ─────────────────────────────────────────────────

export async function validateCelebrationQueue(s) {
  const { failures, fail } = collector();
  const victory = stripComments(s.src.victory);
  if (!/return holdCelebration\(`completion:/.test(victory)) fail("CEREMONIES_STACKED", FILES.victory, "conclusão segura a fila de cerimônias [26]");
  if (!/if \(isCelebrationActive\(GUIDANCE_CEREMONY_ID\)\) return true;/.test(s.src.guidanceHost)) fail("COACHMARK_OVER_COMPLETION", FILES.guidanceHost, "orientação espera a cerimônia [27]");
  const mount = section(victory, "if (playedRef.current) return;", "const timers = [");
  if (!/cancelAllMandarinSpeech\(\);/.test(mount)) fail("SFX_OVER_TTS", FILES.victory, "fala pedagógica cancelada antes do SFX [28]");
  if (/playSoundFx\("lessonComplete", soundEffects\)/.test(mount)) fail("SFX_OVER_TTS", FILES.victory, "som só pela sequência");
  if (!/export function cancelAllMandarinSpeech\(\)/.test(s.src.mandarin)) fail("SFX_OVER_TTS", FILES.mandarin, "cancelamento de todas as falas, cada uma pela própria request");
  return failures;
}

// ── 14. physical-truth ────────────────────────────────────────────────────

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  for (const viewport of NO_SCROLL_VIEWPORTS) if (!s.src.e2e.includes(`width: ${viewport}`)) fail("ACTIVITY_REQUIRES_SCROLL", FILES.e2e, `atividade sem scroll em ${viewport.replace(", height: ", "×")} [31]`);
  if (!/scrollHeight/.test(s.src.e2e)) fail("ACTIVITY_REQUIRES_SCROLL", FILES.e2e, "mede scroll de verdade");
  const base = s.base;
  if (!base) fail("BASE_MISSING", "docs/release/rc2-2-27-base.json", "base");
  else {
    if (base.RC2_2_27_BASE_SHA !== RC2_2_27_BASE_SHA || base.parentWave !== "RC2.2.26" || base.strategy !== "STACKED") fail("BASE_SHA_AMBIGUOUS", "rc2-2-27-base.json", `STACKED sobre ${RC2_2_27_BASE_SHA}`);
    if (base.prTargetWhileParentOpen !== RC2_2_27_PARENT_BRANCH || base.doNotDuplicateParentCommits !== true || base.noNewEngines !== true) fail("PARENT_COMMITS_DUPLICATED", "rc2-2-27-base.json", "mira o #299; nunca recriar commits; sem motor novo");
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", RC2_2_27_BASE_SHA, "HEAD"], { cwd: ROOT, stdio: "ignore" });
    } catch {
      if (!process.env.RC2_2_27_SKIP_ANCESTRY) fail("BASE_SHA_AMBIGUOUS", "git", `${RC2_2_27_BASE_SHA} ancestral do HEAD`);
    }
  }
  const bugs = s.bugs;
  if (!bugs) fail("BUGS_MISSING", "docs/release/rc2-2-27-android-tts-bugs.json", "manifesto");
  else {
    const list = bugs.bugs ?? [];
    if (bugs.importedFrom?.historyReset !== false || list.length < (s.previousBugs?.bugs?.length ?? 0)) fail("HISTORY_RESET", "bugs.importedFrom", "importa a RC2.2.26 sem reset");
    for (const id of NEW_P1) {
      const bug = list.find((item) => item.id === id);
      if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true || bug.status !== "REPRODUCED") fail("P1_IGNORED", `bugs.${id}`, "P1 REPRODUCED bloqueante até PASS físico");
    }
    for (const id of CARRIED_P1) {
      const bug = list.find((item) => item.id === id);
      if (!bug || bug.severity !== "P1" || bug.releaseBlocking !== true) fail("P1_IGNORED", `bugs.${id}`, "carregado como P1");
    }
    for (const bug of list) if (bug.status === "PHYSICAL_PASS" && !(bug.physicalEvidence?.testedAt && bug.physicalEvidence?.installedSha)) fail("FAKE_PHYSICAL_PASS", `bugs.${bug.id}`, "CODE/WEB PASS não é APK PASS");
    if (bugs.rootCauseProven !== false && !bugs.rootCauseEvidence?.installedSha) fail("ROOT_CAUSE_CLAIMED", "bugs.rootCauseProven", "causa só é provada no aparelho");
    if (bugs.androidRuntimeBug !== "CONFIRMED") fail("P1_IGNORED", "bugs.androidRuntimeBug", "CONFIRMED (APK FAIL, Web PASS)");
    for (const sev of ["P0", "P1", "P2"]) {
      const items = list.filter((bug) => bug.severity === sev);
      const panel = {
        open: items.filter((b) => !["PHYSICAL_PASS", "WONT_FIX_WITH_REASON"].includes(b.status)).length,
        reproduced: items.filter((b) => b.status === "REPRODUCED").length,
        fixedCode: items.filter((b) => b.status === "FIXED_CODE").length,
        awaitingPhysical: items.filter((b) => b.status === "PHYSICAL_RETEST_PENDING").length,
        physicalPass: items.filter((b) => b.status === "PHYSICAL_PASS").length,
      };
      if (JSON.stringify(panel) !== JSON.stringify(bugs.panel?.[sev])) fail("BUG_COUNTER_DRIFT", `bugs.panel.${sev}`, `${JSON.stringify(bugs.panel?.[sev])} ≠ ${JSON.stringify(panel)}`);
    }
    if (bugs.release?.PUBLIC_BETA !== "NO_GO" || bugs.release?.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", "bugs.release", "NO-GO enquanto Guided Try/Sequential TTS/Conversation Audio = FAIL");
    if (bugs.prOpenedAutomatically !== false) fail("AUTO_PR", "bugs", "PR nunca automático");
  }
  const matrix = s.matrix;
  if (!matrix) fail("MATRIX_MISSING", "docs/release/rc2-2-27-physical-matrix.json", "matriz");
  else {
    for (const name of REQUIRED_CHECKS) if (!(name in (matrix.checks ?? {}))) fail("MATRIX_MISSING", `matrix.checks.${name}`, "check físico");
    const accepted = matrix.buildIdentityVerdict === "MATCH" && matrix.installedApkSha && matrix.prHeadSha;
    for (const [name, value] of Object.entries(matrix.checks ?? {})) if (value !== "NOT_RUN" && !accepted) fail("FAKE_PHYSICAL_PASS", `matrix.checks.${name}`, "resultado físico só com build identity MATCH");
    if (matrix.release?.APK_PASS !== 0 || matrix.release?.OWNER_ACCEPTED !== 0 || matrix.release?.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", "matrix.release", "APK_PASS 0 · OWNER_ACCEPTED 0 · NO_GO");
  }
  if (s.debt && (s.debt.totals?.APK_PASS !== 0 || s.debt.ownerAccepted !== 0 || s.debt.items.some((item) => item.ownerAccepted !== false))) fail("FAKE_OWNER_ACCEPTANCE", "rc2-2-27-owner-product-debt.json", "aceite só do owner");
  if (!/## 3\. Candidate causes, ranked/.test(s.forensicReport) || !/NOT YET PROVEN/.test(s.forensicReport)) fail("REPORT_EVIDENCE_COLLAPSED", "rc2-2-27-android-tts-forensics.md", "candidatas ranqueadas, causa não provada");
  if (!/## OBSERVED/.test(s.report) || !/## INFERRED/.test(s.report) || !/## NOT_TESTED/.test(s.report)) fail("REPORT_EVIDENCE_COLLAPSED", "rc2-2-27-android-tts-root-cause.md", "OBSERVED/INFERRED/NOT_TESTED");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "docs/release/rc2-candidate.json", "#273 congelada [32]");
  if (!/appId: "longyu\.noba\.com"/.test(s.src.capacitorConfig)) fail("PACKAGE_CHANGED", "capacitor.config", "longyu.noba.com [33]");
  if (!/export const ANDROID_IN_APP_PURCHASE = "DISABLED_FOR_BETA" as const;/.test(s.src.subscription)) fail("PURCHASES_ENABLED", FILES.subscription, "DISABLED_FOR_BETA [34]");
  if (!/MAX_AUTOMATIC_CHANNEL = "internal"/.test(stripComments(s.src.releaseIdentity))) fail("PRODUCTION_PLAY_ENABLED", FILES.releaseIdentity, "internal [35]");
  if (!/export const RC2_2_27_ANDROID_TTS_ROOT_CAUSE_EXCEPTION = \{[\s\S]*?fingerprint: "c48b008c9c1e"[\s\S]*?gate: "gate:rc2-2-27-android-tts-root-cause"/.test(s.src.curriculumFreeze)) fail("FREEZE_EXCEPTION_MISSING", "curriculumFreeze.ts", "RC2_2_27_ANDROID_TTS_ROOT_CAUSE_EXCEPTION");
  for (const failure of validateBetaPedagogyFreeze(s.freeze)) fail(failure.code === "FINGERPRINT_DRIFT" ? "FINGERPRINT_DRIFT" : "CURRICULUM_COUNT_DRIFT", failure.where, failure.why);
  return failures;
}

export const VALIDATORS = {
  "build-identity": validateBuildIdentity,
  "native-tts-engine-truth": validateNativeTtsEngineTruth,
  "is-speaking-probe": validateIsSpeakingProbe,
  "sequential-tts": validateSequentialTts,
  "request-lifecycle": validateRequestLifecycle,
  "request-cancellation": validateRequestCancellation,
  "auto-speak-unification": validateAutoSpeakUnification,
  "conversation-sequence": validateConversationSequence,
  "guided-try": validateGuidedTry,
  "lesson-audio-gates": validateLessonAudioGates,
  "audio-arbiter-recovery": validateAudioArbiterRecovery,
  "completion-sequence": validateCompletionSequence,
  "celebration-queue": validateCelebrationQueue,
  "physical-truth": validatePhysicalTruth,
};
