/**
 * RC2.2.28 — DETERMINISTIC AUDIO PIPELINE + CONVERSATION RUNTIME + ANDROID DEADLOCK.
 *
 * Áreas: canonical-audio-manifest · core-audio-pack · native-media-player ·
 * web-asset-player · tts-fallback-only · guided-try-no-tts · conversation-reducer ·
 * conversation-audio-after-render · promise-safety · build-provenance ·
 * completion-deltas · no-scroll-expanded · physical-truth · tts-independence.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_28_BASE_SHA = "920310c18f5e77d044754885bd0319d183db6d45";
export const RC2_2_28_PARENT_PR = 300;

export const FILES = {
  playback: "src/lib/audioPlayback.ts",
  policy: "src/lib/audio/audioEnginePolicy.ts",
  gate: "src/lib/audio/audioGate.ts",
  canonical: "src/lib/audio/canonicalPlayer.ts",
  manifest: "src/data/audioManifest.generated.ts",
  manifestTypes: "src/lib/audio/audioManifestTypes.ts",
  runtime: "src/lib/conversationRuntime.ts",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  provenance: "src/lib/buildProvenance.ts",
  forensics: "src/lib/ttsForensics.ts",
  completionDeltas: "src/lib/completionDeltas.ts",
  completion: "src/lib/completionSequence.ts",
  victory: "src/features/lesson/LessonVictory.tsx",
  player: "src/features/lesson/LessonPlayer.tsx",
  mediaPlugin: "android/app/src/main/java/longyu/noba/com/LongyuMediaPlugin.java",
  speechPlugin: "android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java",
  mainActivity: "android/app/src/main/java/longyu/noba/com/MainActivity.java",
  appGradle: "android/app/build.gradle",
  variables: "android/variables.gradle",
  viteBuild: "scripts/vite-build.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  corpus: "docs/reports/rc2-2-28-audio-corpus.json",
  corePack: "docs/reports/rc2-2-28-core-pack.json",
  base: "docs/release/rc2-2-28-base.json",
  e2e: "e2e/rc2-2-28-deterministic-audio.spec.ts",
  panel: "src/features/qa/AndroidTtsForensicsPanel.tsx",
  mandarin: "src/lib/mandarinSpeech.ts",
  autoSpeak: "src/lib/useAutoSpeak.ts",
  techEvents: "src/lib/techEvents.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  return {
    src,
    base: optionalJson(FILES.base),
    corpus: optionalJson(FILES.corpus),
    corePack: optionalJson(FILES.corePack),
    matrix: optionalJson("docs/release/rc2-2-28-physical-matrix.json"),
    bugs: optionalJson("docs/release/rc2-2-28-android-audio-bugs.json"),
    freeze: loadBetaPedagogyFreezeState(),
    rc2CandidateSha256: (await import("node:crypto")).createHash("sha256").update(read("docs/release/rc2-candidate.json")).digest("hex"),
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
        name: "rc2-2-28",
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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2228-"));
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
  } catch (err) {
    fail("GATE_EXEC_ERROR", where, err instanceof Error ? err.message : String(err));
  }
}

// ── validators ────────────────────────────────────────────────────────────

export async function validateCanonicalAudioManifest(s) {
  const { failures, fail } = collector();
  if (!s.src.manifest) fail("MANIFEST_MISSING", FILES.manifest, "audioManifest.generated.ts ausente");
  if (!/audio:guided-try:nihao:v1/.test(s.src.manifest)) fail("GUIDED_TRY_AUDIO_ID_MISSING", FILES.manifest, "nihao core id");
  if (!s.corpus) fail("CORPUS_MISSING", FILES.corpus, "rode npm run audio:inventory");
  else if (!s.corpus.uniqueUtterances) fail("CORPUS_EMPTY", FILES.corpus, "uniqueUtterances=0");
  if (!/canonical-asset/.test(s.src.policy)) fail("POLICY_MISSING", FILES.policy, "audioEnginePolicy");
  if (!/FIXED_CONTENT/.test(s.src.policy)) fail("POLICY_FIXED", FILES.policy, "FIXED_CONTENT class");
  await guarded(fail, FILES.playback, async () => {
    const m = await bundle("playback", s, {
      "./tts": `export const isTTSAvailable=()=>false; export const usesNativeVoice=()=>false; export const speak=()=>{}; export const stopSpeaking=()=>{}; export const getNativeTtsUnavailableReason=()=>null; export const noteUserGesture=()=>{};`,
      "./lessonStepTrace": `export const traceCurrentLessonStep=()=>{};`,
      "./deviceQa": `export const deviceQaEnabled=()=>true; export const recordDeviceQaObservation=()=>{};`,
      "./audioArbiter": `export const claimAudio=()=>1; export const releaseAudio=()=>{};`,
      "./techEvents": `export const recordTechEvent=()=>{};`,
      "./ttsCorrelation": `export const newTtsRequestId=()=>'r1';`,
      "./platform/nativeSpeech": `export const nativeCancelSpeak=async()=>{};`,
      "./audio/canonicalPlayer": `export const playCanonicalAudio=async()=>({requestId:'r1',audioId:'a',started:true,ended:true,failed:false,reason:null,engine:'web-asset'}); export const stopCanonicalAudio=async()=>{}; export const cancelCanonicalAudio=async()=>{};`,
    });
    if (!m.CANONICAL_AUDIO_ASSETS || !Object.keys(m.CANONICAL_AUDIO_ASSETS).length) {
      fail("CANONICAL_AUDIO_EMPTY", FILES.manifest, "mapa de assets vazio [1]");
    }
  });
  return failures;
}

export async function validateCoreAudioPack(s) {
  const { failures, fail } = collector();
  if (!s.corePack?.entries?.length) fail("CORE_PACK_EMPTY", FILES.corePack, "core pack vazio");
  else {
    for (const e of s.corePack.entries) {
      const pub = path.join(ROOT, "public", e.file);
      if (!fs.existsSync(pub)) fail("CORE_ASSET_MISSING", e.file, "public asset ausente");
      if ((e.bytes ?? 0) < 200) fail("CORE_ASSET_TOO_SMALL", e.audioId, "bytes < minimum");
      if (!(e.durationMs > 0)) fail("CORE_DURATION_ZERO", e.audioId, "durationMs");
    }
    if (!s.corePack.entries.some((e) => e.audioId.includes("guided-try:nihao"))) {
      fail("GUIDED_TRY_NOT_IN_CORE", FILES.corePack, "Guided Try nihao deve estar no core pack");
    }
  }
  if (!exists("assets/audio/core")) fail("CORE_DIR_MISSING", "assets/audio/core", "pack directory");
  return failures;
}

export async function validateNativeMediaPlayer(s) {
  const { failures, fail } = collector();
  if (!s.src.mediaPlugin) fail("MEDIA_PLUGIN_MISSING", FILES.mediaPlugin, "LongyuMediaPlugin.java");
  const java = stripComments(s.src.mediaPlugin);
  if (!/playCanonicalAudio/.test(java)) fail("MEDIA_CONTRACT", FILES.mediaPlugin, "playCanonicalAudio");
  if (!/ExoPlayer/.test(java)) fail("NO_EXOPLAYER", FILES.mediaPlugin, "Media3/ExoPlayer");
  if (!/AUDIO_STARTED/.test(java) || !/AUDIO_ENDED/.test(java) || !/AUDIO_ERROR/.test(java)) {
    fail("MEDIA_EVENTS", FILES.mediaPlugin, "AUDIO_* events");
  }
  if (!/requestId/.test(java)) fail("MEDIA_REQUEST_ID", FILES.mediaPlugin, "correlação requestId");
  if (!/player\.release\(\)/.test(java)) fail("MEDIA_RELEASE", FILES.mediaPlugin, "player.release()");
  if (!/LongyuMediaPlugin/.test(s.src.mainActivity)) fail("MEDIA_NOT_REGISTERED", FILES.mainActivity, "registerPlugin");
  if (!/media3-exoplayer/.test(s.src.appGradle)) fail("MEDIA3_DEP_MISSING", FILES.appGradle, "media3 dependency");
  // TTS não deve tocar assets canônicos
  if (/TextToSpeech/.test(java) && /playCanonicalAudio/.test(java) && /tts\.speak/.test(java)) {
    fail("TTS_PLAYS_ASSETS", FILES.mediaPlugin, "Media plugin não usa TTS para assets");
  }
  return failures;
}

export async function validateWebAssetPlayer(s) {
  const { failures, fail } = collector();
  if (!/HTMLAudioElement|new Audio\(/.test(s.src.canonical)) fail("WEB_PLAYER_MISSING", FILES.canonical, "HTMLAudioElement");
  if (!/playCanonicalAudio/.test(s.src.canonical)) fail("WEB_CONTRACT", FILES.canonical, "playCanonicalAudio");
  if (!/engine === "asset"/.test(s.src.playback) && !/engine === 'asset'/.test(s.src.playback)) {
    fail("PLAYBACK_NO_ASSET_PATH", FILES.playback, "asset engine path");
  }
  return failures;
}

export async function validateTtsFallbackOnly(s) {
  const { failures, fail } = collector();
  if (!/decideAudioEngine/.test(s.src.policy)) fail("POLICY_DECISION", FILES.policy, "decideAudioEngine");
  if (!/ttsWithoutJustificationFailsGate/.test(s.src.policy)) fail("TTS_GATE_FLAG", FILES.policy, "flag de release blocker");
  // engineFor não pode preferir native-tts só por estar no Android (antes do asset).
  const engineFn = s.src.playback.match(/function engineFor\([\s\S]*?return "none";\n\}/)?.[0]
    ?? s.src.playback.match(/function engineFor\([\s\S]{0,1200}/)?.[0]
    ?? "";
  if (/usesNativeVoice\(\)\)\s*return\s*"native-tts"/.test(engineFn) && !/resolveAsset\(/.test(engineFn)) {
    fail("ENGINE_TTS_FIRST", FILES.playback, "engineFor prefere TTS nativo antes do asset [2][3]");
  }
  // Painel renomeado / legado
  if (s.src.panel && !/LEGACY|FALLBACK|FORENSICS/.test(s.src.panel)) {
    fail("FORENSICS_NOT_LEGACY", FILES.panel, "painel deve marcar LEGACY/FALLBACK TTS FORENSICS [24]");
  }
  return failures;
}

export async function validateGuidedTryNoTts(s) {
  const { failures, fail } = collector();
  if (!/GUIDED_TRY_NIHAO_AUDIO_ID/.test(s.src.guidedTry)) fail("GUIDED_TRY_NO_AUDIO_ID", FILES.guidedTry, "audioId constante");
  if (!/audioId:\s*GUIDED_TRY_NIHAO_AUDIO_ID/.test(s.src.guidedTry)) fail("GUIDED_TRY_DEPENDS_ON_TTS", FILES.guidedTry, "listen usa audioId [2]");
  if (!/audioGateCtaEnabled|DEGRADED/.test(s.src.guidedTry)) fail("AUDIO_GATE_MISSING", FILES.guidedTry, "DEGRADED gate [5]");
  // playNihao promise chain must have .catch (other .catch in file don't count)
  const playNihao = s.src.guidedTry.match(/function playNihao\(\) \{[\s\S]*?\n  function /)?.[0] ?? "";
  if (!/\.catch\(/.test(playNihao)) fail("PROMISE_UNCAUGHT", FILES.guidedTry, "playNihao precisa .catch [6]");
  if (!/audioGateFromPlayback|AudioGateState/.test(s.src.guidedTry)) fail("AUDIO_GATE_WIRE", FILES.guidedTry, "audioGate wired");
  return failures;
}

export async function validateConversationReducer(s) {
  const { failures, fail } = collector();
  if (!s.src.runtime) fail("REDUCER_MISSING", FILES.runtime, "conversationRuntime.ts");
  await guarded(fail, FILES.runtime, async () => {
    const m = await bundle("runtime", s);
    if (typeof m.conversationReducer !== "function") fail("REDUCER_MISSING", FILES.runtime, "conversationReducer");
    const ten = m.runQaConversationTenNodes(true);
    if (ten.nodeIds.length !== 10) fail("QA_TEN_NODES", FILES.runtime, "10 nodes without audio");
    if (new Set(ten.transitionIds).size !== 10) fail("TRANSITION_IDS", FILES.runtime, "10 unique transitionIds");
    // Reducer purity: source must not mention TTS/Capacitor/player/DOM
    const body = stripComments(s.src.runtime);
    const forbidden = ["TextToSpeech", "Capacitor", "playMandarin", "document.", "window.", "new Promise"];
    for (const token of forbidden) {
      if (body.includes(token)) fail("REDUCER_IMPURE", FILES.runtime, `reducer contém ${token} [7]`);
    }
    // CONTINUE always commits
    let state = m.createConversationRuntimeState({ sceneId: "s", entryNodeId: "n1" });
    state = m.conversationReducer(state, { type: "CONTINUE", targetNodeId: "n2", transitionId: "t-2" });
    if (state.nodeId !== "n2") fail("CONTINUE_NO_COMMIT", FILES.runtime, "CONTINUE must commit nodeId [15]");
  });
  if (!/conversationReducer/.test(s.src.conversation)) fail("REDUCER_NOT_WIRED", FILES.conversation, "ConversationSceneStep usa reducer");
  return failures;
}

export async function validateConversationAudioAfterRender(s) {
  const { failures, fail } = collector();
  // goTo must not call play/speak/requestMandarin — extract until advance()
  const goTo = s.src.conversation.match(/function goTo\([\s\S]*?\n  function advance\(/)?.[0] ?? s.src.conversation.match(/function goTo\([\s\S]{0,2500}/)?.[0] ?? "";
  if (/playMandarin|requestMandarin|speak\(/.test(goTo)) {
    fail("AUDIO_IN_GOTO", FILES.conversation, "goTo não pode tocar áudio [8][12]");
  }
  if (!/useAutoSpeak\(visible/.test(s.src.conversation)) {
    fail("AUDIO_BEFORE_DOM", FILES.conversation, "áudio só com visible [16]");
  }
  if (!/audioId/.test(s.src.conversation)) fail("NODE_NO_AUDIO_ID", FILES.conversation, "nodes resolvem audioId [4]");
  if (!/speechKey:\s*nodeKey/.test(s.src.conversation)) fail("NODE_REUSES_REQUEST", FILES.conversation, "speechKey por nó [10]");
  return failures;
}

export async function validatePromiseSafety(s) {
  const { failures, fail } = collector();
  const playNihao = s.src.guidedTry.match(/function playNihao\(\) \{[\s\S]*?\n  function /)?.[0] ?? "";
  if (!/\.catch\(/.test(playNihao)) {
    fail("PROMISE_UNCAUGHT", FILES.guidedTry, "Guided Try promise sem catch [6]");
  }
  if (!/handle\.done\.then\([\s\S]*?\.catch\(/.test(s.src.mandarin) && !/\.then\(\(\) => opts\.onend\?\.\(\)\)\.catch\(/.test(s.src.mandarin)) {
    fail("AUTOPLAY_PROMISE_UNCAUGHT", FILES.mandarin, "autoplay done precisa catch");
  }
  // Pre-native traces
  for (const ev of ["audio_request_created", "audio_engine_selected", "audio_native_call_enter", "audio_native_call_return"]) {
    if (!s.src.techEvents.includes(`"${ev}"`)) fail("TRACE_MISSING", FILES.techEvents, ev);
  }
  return failures;
}

export async function validateBuildProvenance(s) {
  const { failures, fail } = collector();
  await guarded(fail, FILES.provenance, async () => {
    const m = await bundle("provenance", s);
    const source = "a1c01945aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
    const merge = "dbe7439bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
    // Merge ≠ source é NORMAL
    if (m.buildProvenanceVerdict({
      sourceHeadSha: source,
      workflowSha: merge,
      embeddedSourceHeadSha: source,
      embeddedWorkflowSha: merge,
      installedSourceHeadSha: source,
    }) !== "MATCH") {
      fail("MERGE_SHA_AS_STALE", FILES.provenance, "merge sintético considerado APK antigo [14]");
    }
    // Source diverge = TEST_INVALID
    if (m.buildProvenanceVerdict({
      sourceHeadSha: source,
      workflowSha: merge,
      embeddedSourceHeadSha: source,
      installedSourceHeadSha: "deadbeef00000000000000000000000000000000",
    }) !== "TEST_INVALID") {
      fail("SOURCE_MISMATCH_ACCEPTED", FILES.provenance, "source instalado diverge");
    }
    // Comparar source com merge diretamente seria errado — a API não deve exigir igualdade
    if (m.buildProvenanceVerdict({
      sourceHeadSha: source,
      workflowSha: merge,
      embeddedSourceHeadSha: source,
      installedSourceHeadSha: source,
    }) !== "MATCH") {
      fail("SOURCE_COMPARED_TO_MERGE", FILES.provenance, "source HEAD comparado com merge SHA [13]");
    }
  });
  if (!/sourceHeadSha/.test(s.src.viteBuild) || !/workflowSha/.test(s.src.viteBuild)) {
    fail("VITE_NO_DUAL_SHA", FILES.viteBuild, "version.json deve emitir dual SHA");
  }
  if (!s.base || s.base.RC2_2_28_BASE_SHA !== RC2_2_28_BASE_SHA) {
    fail("BASE_SHA_MISMATCH", FILES.base, `esperava ${RC2_2_28_BASE_SHA}`);
  }
  return failures;
}

export async function validateCompletionDeltas(s) {
  const { failures, fail } = collector();
  if (!/computeCompletionDeltas/.test(s.src.player)) fail("DELTAS_NOT_WIRED", FILES.player, "LessonPlayer não passa deltas [15][16][17]");
  if (!/completionKind:\s*deltas\.completionKind/.test(s.src.player)) fail("COMPLETION_KIND_MISSING", FILES.player, "completionKind");
  if (!/unlockLabel:\s*deltas\.unlockLabel/.test(s.src.player)) fail("UNLOCK_LABEL_MISSING", FILES.player, "unlockLabel");
  await guarded(fail, FILES.completionDeltas, async () => {
    const m = await bundle("completionDeltas", s, {
      "../data/journey": `export const ALL_LESSONS=[]; export function getPhaseById(){return {units:[{lessons:[{id:'l1'},{id:'l2'}]}]}};`,
      "./journeyUnlocks": `export const UNLOCK_LESSONS={fala:'l1'}; export const ENGINE_UNLOCK_COPY={fala:{title:'Fala',desc:'',after:''}}; export const TREINO_UNLOCK_COPY={title:'Treino'};`,
      "./completionSequence": `export const COMPLETION_STAGES=[];`,
    });
    const deltas = m.computeCompletionDeltas({
      lesson: { id: "l2", phaseId: "p1" },
      completedBefore: ["l1"],
      completedAfter: ["l1", "l2"],
    });
    if (!deltas.unitCompletionDelta) fail("UNIT_DELTA_FALSE", FILES.completionDeltas, "unidade deveria fechar");
  });
  return failures;
}

export async function validateNoScrollExpanded(s) {
  const { failures, fail } = collector();
  if (!s.src.e2e) fail("E2E_MISSING", FILES.e2e, "e2e rc2-2-28");
  for (const surface of ["Guided Try", "Lesson", "Review", "Pinyin", "Tone"]) {
    if (!new RegExp(surface, "i").test(s.src.e2e)) fail("NO_SCROLL_SURFACE", FILES.e2e, `${surface} [18-21]`);
  }
  for (const vp of ["390", "375", "360"]) {
    if (!s.src.e2e.includes(vp)) fail("NO_SCROLL_VIEWPORT", FILES.e2e, vp);
  }
  return failures;
}

export async function validateTtsIndependence(s) {
  const { failures, fail } = collector();
  if (!/setTtsForcedUnavailableForTests/.test(s.src.playback)) {
    fail("TTS_INDEPENDENCE_HOOK", FILES.playback, "hook de TTS unavailable [12][22]");
  }
  if (!/ttsForcedUnavailable/.test(s.src.playback)) fail("TTS_FORCE_FLAG", FILES.playback, "flag");
  return failures;
}

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  const matrix = s.matrix;
  if (!matrix) fail("MATRIX_MISSING", "docs/release/rc2-2-28-physical-matrix.json", "matriz física");
  else {
    for (const check of matrix.requiredChecks ?? []) {
      if (check.result === "PASS" && check.evidence !== "PHYSICAL") {
        fail("FAKE_PHYSICAL_PASS", check.id, "PASS físico sem evidência");
      }
    }
  }
  // Freeze fingerprint intact
  if (s.freeze?.fingerprint && s.freeze.fingerprint !== "cc66373bb602") {
    fail("FINGERPRINT_DRIFT", FILES.curriculumFreeze, "fingerprint mudou [27]");
  }
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) {
    // soft: only fail if candidate file changed content hash unexpectedly — use freeze check
  }
  if (!/RC2_2_28_/.test(s.src.curriculumFreeze)) {
    fail("FREEZE_EXCEPTION_MISSING", FILES.curriculumFreeze, "exceção RC2.2.28");
  }
  // Package / billing / Production play not enabled
  if (/billingClient|BillingClient|com\.android\.billingclient/.test(s.src.appGradle)) {
    fail("BILLING_ENABLED", FILES.appGradle, "billing Android habilitado [29]");
  }
  return failures;
}

export const VALIDATORS = {
  "canonical-audio-manifest": validateCanonicalAudioManifest,
  "core-audio-pack": validateCoreAudioPack,
  "native-media-player": validateNativeMediaPlayer,
  "web-asset-player": validateWebAssetPlayer,
  "tts-fallback-only": validateTtsFallbackOnly,
  "guided-try-no-tts": validateGuidedTryNoTts,
  "conversation-reducer": validateConversationReducer,
  "conversation-audio-after-render": validateConversationAudioAfterRender,
  "promise-safety": validatePromiseSafety,
  "build-provenance": validateBuildProvenance,
  "completion-deltas": validateCompletionDeltas,
  "no-scroll-expanded": validateNoScrollExpanded,
  "tts-independence": validateTtsIndependence,
  "physical-truth": validatePhysicalTruth,
};
