/**
 * RC2.2.31D — REAL APK RUNTIME PROOF + ASYNC FAILOVER + PEDAGOGICAL UNBLOCK.
 */
import fs from "node:fs";
import path from "node:path";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_31D_BASE_SHA = "042f0f405a47da022e9c245d245d4823c4fc6af9";

export const FILES = {
  nativeSafe: "src/components/native/NativeSafeAction.tsx",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  mediaPlugin: "android/app/src/main/java/longyu/noba/com/LongyuMediaPlugin.java",
  canonicalPlayer: "src/lib/audio/canonicalPlayer.ts",
  audioPlayback: "src/lib/audioPlayback.ts",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  appEnvironment: "src/lib/appEnvironment.ts",
  appGradle: "android/app/build.gradle",
  androidWorkflow: ".github/workflows/android-build.yml",
  fixtureTest: "android/app/src/androidTest/java/longyu/noba/com/ConversationFixtureContractTest.java",
  webViewConvTest: "android/app/src/androidTest/java/longyu/noba/com/ConversationWebViewRuntimeInstrumentedTest.java",
  mediaRuntimeTest: "android/app/src/androidTest/java/longyu/noba/com/LongyuMediaRuntimeInstrumentedTest.java",
  fakeOldTest: "android/app/src/androidTest/java/longyu/noba/com/ConversationTenNodeInstrumentedTest.java",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  base: "docs/release/rc2-2-31d-base.json",
  matrix: "docs/release/rc2-2-31d-physical-matrix.json",
  bugs: "docs/release/rc2-2-31d-android-runtime-bugs.json",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  return {
    src,
    base: optionalJson(FILES.base),
    matrix: optionalJson(FILES.matrix),
    bugs: optionalJson(FILES.bugs),
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

export async function validateRealAndroidRuntimeJob(s) {
  const { failures, fail } = collector();
  const w = s.src.androidWorkflow;
  if (!/android-runtime-emulator/.test(w) && !/android-runtime-apk/.test(w)) {
    fail("NO_RUNTIME_JOB", FILES.androidWorkflow, "must declare android-runtime-emulator/apk job");
  }
  if (!/connectedDebugAndroidTest/.test(w)) {
    fail("NO_CONNECTED_TEST", FILES.androidWorkflow, "must run connectedDebugAndroidTest");
  }
  if (!/emulator/.test(w)) {
    fail("NO_EMULATOR", FILES.androidWorkflow, "must boot Android emulator");
  }
  return failures;
}

export async function validateNoFakeInstrumentation(s) {
  const { failures, fail } = collector();
  if (exists(FILES.fakeOldTest)) {
    fail("FAKE_INSTRUMENTED_COVERAGE", FILES.fakeOldTest, "ConversationTenNodeInstrumentedTest must be renamed/removed");
  }
  if (!exists(FILES.fixtureTest)) {
    fail("FAKE_INSTRUMENTED_COVERAGE", FILES.fixtureTest, "fixture contract rename missing");
  }
  if (!/NOT runtime proof|fixture contract ONLY/i.test(s.src.fixtureTest)) {
    fail("FAKE_INSTRUMENTED_COVERAGE", FILES.fixtureTest, "must not claim runtime proof");
  }
  if (!exists(FILES.webViewConvTest) || !/MainActivity/.test(s.src.webViewConvTest)) {
    fail("NO_REAL_WEBVIEW_TEST", FILES.webViewConvTest, "ConversationWebViewRuntimeInstrumentedTest must open MainActivity");
  }
  if (!/primeiro-cumprimento/.test(s.src.webViewConvTest) || !/como-se-chama/.test(s.src.webViewConvTest)) {
    fail("NO_EXACT_SCENE_RUNTIME", FILES.webViewConvTest, "must exercise real sceneIds");
  }
  if (!exists(FILES.mediaRuntimeTest) || !/guided-try|teste-guiado|guidedTry/i.test(s.src.mediaRuntimeTest)) {
    fail("NO_MEDIA_RUNTIME_TEST", FILES.mediaRuntimeTest, "LongyuMediaRuntimeInstrumentedTest required");
  }
  return failures;
}

export async function validateObserverNeverBlocksAction(s) {
  const { failures, fail } = collector();
  const n = s.src.nativeSafe;
  if (!/export function safeObserve\(/.test(n)) {
    fail("OBSERVER_BLOCKS_ACTION", FILES.nativeSafe, "safeObserve helper missing");
  }
  if (!/safeObserve\(\(\) => observersRef\.current\?\.onClickObserved/.test(n)
    && !/safeObserve\(\(\) => observersRef\.current\?\.onClickObserved\?\.\(\)\)/.test(n)) {
    fail("OBSERVER_BLOCKS_ACTION", FILES.nativeSafe, "onClickObserved must use safeObserve");
  }
  if (!/safeObserve\(\(\) => observersRef\.current\?\.onPointerDownObserved/.test(n)
    && !/safeObserve\(\(\) => observersRef\.current\?\.onPointerDownObserved\?\.\(\)\)/.test(n)) {
    fail("OBSERVER_BLOCKS_ACTION", FILES.nativeSafe, "onPointerDownObserved must use safeObserve");
  }
  if (!/actionRef\.current/.test(n)) {
    fail("STALE_ACTION_CLOSURE", FILES.nativeSafe, "actionRef.current required for timer/retap");
  }
  const unmount = n.match(/useEffect\(\(\) => \{[\s\S]*?return \(\) => \{[\s\S]*?\};\n  \}, \[\]\);/)?.[0] ?? "";
  if (!/clearFallback\(\)/.test(unmount)) {
    fail("STALE_TIMER_UNMOUNT", FILES.nativeSafe, "unmount must clearFallback");
  }
  return failures;
}

export async function validateStateFirstConversation(s) {
  const { failures, fail } = collector();
  const c = s.src.conversation;
  const goTo = c.match(/function goTo\([\s\S]*?\n  failsafeRetryRef/)?.[0] ?? "";
  // CONTINUE commit must appear before its post-commit lock_acquired trace.
  const continueCommit = goTo.indexOf('conversationReducer(prev, { type: "CONTINUE"');
  const lockAcqAfter = goTo.indexOf("conversation_lock_acquired", continueCommit >= 0 ? continueCommit : 0);
  if (continueCommit < 0 || lockAcqAfter < 0 || lockAcqAfter < continueCommit) {
    fail("TRACE_BEFORE_COMMIT", FILES.conversation, "V2 CONTINUE commit must precede lock_acquired trace");
  }
  if (!/setRuntime\(\(prev\) =>\s*conversationReducer\(prev, \{ type: "CONTINUE"/.test(goTo)) {
    fail("STATE_FIRST_V2", FILES.conversation, "goTo must commit CONTINUE via reducer");
  }
  const v1 = c.match(/function advanceDialogue\(\)[\s\S]*?\n  const v1Observers/)?.[0] ?? "";
  const setIdx = v1.indexOf("setLineIndex((");
  const truthBegin = v1.indexOf("truth.begin(");
  if (setIdx < 0 || (truthBegin >= 0 && truthBegin < setIdx)) {
    fail("TRUTH_BEFORE_STATE_V1", FILES.conversation, "V1 setLineIndex must precede truth.begin");
  }
  const finish = c.match(/function finish\(\)[\s\S]*?\n  \/\*\*/)?.[0]
    ?? c.match(/function finish\(\)[\s\S]*?\n  function goTo/)?.[0]
    ?? "";
  const onDoneAt = finish.indexOf("onDone(");
  const traceAt = finish.indexOf("traceLessonStep");
  if (onDoneAt < 0 || (traceAt >= 0 && traceAt < onDoneAt)) {
    fail("FINISH_TRACE_BEFORE_ONDONE", FILES.conversation, "finish must call onDone before trace");
  }
  return failures;
}

export async function validateAsyncDirectFallback(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  if (!/AUDIO_BACKEND_FAILED/.test(java) || !/failDirectBackend\(/.test(java)) {
    fail("NO_ASYNC_DIRECT_FALLBACK", FILES.mediaPlugin, "async Direct→Media3 failover missing");
  }
  if (!/DIRECT_PREPARE_TIMEOUT/.test(java) || !/DIRECT_START_PROOF_TIMEOUT/.test(java)) {
    fail("NO_DIRECT_TIMEOUT_FALLBACK", FILES.mediaPlugin, "prepare/start proof timeouts required");
  }
  if (!/startMedia3Backend\(/.test(java)) {
    fail("NO_MEDIA3_FALLBACK_SAME_SESSION", FILES.mediaPlugin, "startMedia3Backend required");
  }
  if (!/AudioFocusRequest/.test(java) || !/requestAudioFocus\(/.test(java)) {
    fail("NO_AUDIO_FOCUS", FILES.mediaPlugin, "Direct player must request AudioFocus");
  }
  if (!/abandonAudioFocus/.test(java)) {
    fail("FOCUS_NOT_ABANDONED", FILES.mediaPlugin, "must abandon focus on completion/cancel");
  }
  if (!/AUDIO_LOCAL_BACKENDS_EXHAUSTED/.test(java)) {
    fail("TERMINAL_BEFORE_EXHAUSTED", FILES.mediaPlugin, "exhausted event required");
  }
  const js = s.src.canonicalPlayer;
  if (!/AUDIO_BACKEND_FAILED/.test(js) || !/onBackendFailed/.test(js)) {
    fail("JS_SETTLES_ON_BACKEND_FAIL", FILES.canonicalPlayer, "must handle AUDIO_BACKEND_FAILED without settle");
  }
  if (/onBackendFailed[\s\S]{0,120}settle\(\)/.test(js)) {
    fail("JS_SETTLES_ON_BACKEND_FAIL", FILES.canonicalPlayer, "onBackendFailed must not settle");
  }
  return failures;
}

export async function validateFixedContentFailOpen(s) {
  const { failures, fail } = collector();
  if (!/DEGRADED/.test(s.src.guidedTry) || !/listen-continue-degraded/.test(s.src.guidedTry)) {
    fail("GUIDED_TRY_DEAD_END", FILES.guidedTry, "fail-open Continuar required after audio failure");
  }
  if (!/safeSideEffect\(\s*["']conversation_trace["']/.test(s.src.conversation)) {
    fail("TRACE_BLOCKS_CONVERSATION", FILES.conversation, "traces must be safeSideEffect");
  }
  return failures;
}

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  if (!s.base || s.base.RC2_2_31D_BASE_SHA !== RC2_2_31D_BASE_SHA) {
    fail("BASE_SHA_AMBIGUOUS", FILES.base, RC2_2_31D_BASE_SHA);
  }
  if (s.matrix?.priorPhysical?.pr305_pre_1713d851?.guidedTryAudio !== "FAIL") {
    fail("PHYSICAL_FAIL_OVERWRITTEN", FILES.matrix, "prior #305 Guided Try FAIL must remain");
  }
  if (s.matrix?.checks?.guidedTryAudio === "PASS" && s.matrix?.release?.OWNER_ACCEPTED !== 1) {
    fail("PHYSICAL_FAIL_OVERWRITTEN", FILES.matrix, "HEAD PASS without owner");
  }
  if (s.matrix?.release?.CLOSED_BETA === "GO") {
    fail("CLOSED_BETA_PREMATURE", FILES.matrix, "NO-GO until physical audio PASS");
  }
  if (s.matrix?.lanes?.ANDROID_EMULATOR_RUNTIME === "PASS" && s.matrix?.release?.OWNER_ACCEPTED === 1 && s.matrix?.checks?.guidedTryAudio !== "PASS") {
    fail("EMULATOR_COUNTS_AS_PHYSICAL", FILES.matrix, "emulator PASS ≠ physical PASS");
  }
  if (!/RC2_2_31D_APK_RUNTIME/.test(s.src.curriculumFreeze)) {
    fail("FREEZE_EXCEPTION_MISSING", FILES.curriculumFreeze, "RC2.2.31D exception");
  }
  if (/com\.android\.billingclient:billing/.test(s.src.appGradle)) fail("BILLING_ENABLED", FILES.appGradle, "no billing");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "rc2-candidate.json", "frozen");
  return failures;
}

export const VALIDATORS = {
  "real-android-runtime-job": validateRealAndroidRuntimeJob,
  "no-fake-instrumentation": validateNoFakeInstrumentation,
  "observer-never-blocks-action": validateObserverNeverBlocksAction,
  "state-first-conversation": validateStateFirstConversation,
  "async-direct-fallback": validateAsyncDirectFallback,
  "fixed-content-fail-open": validateFixedContentFailOpen,
  "physical-truth": validatePhysicalTruth,
};
