#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-31d-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = VALIDATORS[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(VALIDATORS).join("|")}>`);
  process.exit(2);
}
const base = await loadState();
if (mode === "validate") {
  const failures = await gate(base);
  console.log(report(`${mode}:${area}`, failures));
  process.exit(failures.length ? 1 : 0);
}

function swap(text, from, to) {
  assert.ok(String(text).includes(from), `mutação vazia: ${from.slice(0, 80)}`);
  return String(text).split(from).join(to);
}
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};

const MUTATIONS = {
  "real-android-runtime-job": [
    ["[2] workflow has no connectedDebugAndroidTest", "NO_CONNECTED_TEST", src("androidWorkflow", "connectedDebugAndroidTest", "assembleDebugOnly")],
  ],
  "no-fake-instrumentation": [
    ["[1] Conversation test only checks strings", "NO_REAL_WEBVIEW_TEST", src("webViewConvTest", "MainActivity", "FakeActivity")],
  ],
  "observer-never-blocks-action": [
    ["[4] observer throw blocks onClick", "OBSERVER_BLOCKS_ACTION", src("nativeSafe", "safeObserve(() => observersRef.current?.onClickObserved?.())", "observersRef.current?.onClickObserved?.()")],
    ["[6] action timer survives unmount", "STALE_TIMER_UNMOUNT", src("nativeSafe", "clearFallback();\n      pendingRef.current = null;", "pendingRef.current = null;")],
  ],
  "state-first-conversation": [
    ["[9] V1 truth.begin before setLineIndex", "TRUTH_BEFORE_STATE_V1", src("conversation", "setLineIndex((index) => index + 1);\n      safeSideEffect(\"conversation_truth\", () => {\n        truth.begin(`line-${from}`, `line-${from + 1}`);\n      });", "truth.begin(`line-${from}`, `line-${from + 1}`);\n      setLineIndex((index) => index + 1);\n      safeSideEffect(\"conversation_truth\", () => {\n        /* moved */\n      });")],
    ["[10] finish trace before onDone", "FINISH_TRACE_BEFORE_ONDONE", src("conversation", "onDone(!hadMistakeRef.current, {\n      attempts,\n      helpLevel: helpLevelRef.current,\n      helpRequests: helpRequestsRef.current,\n    });\n    safeSideEffect(\"conversation_trace\", () => {\n      traceLessonStep({ lessonId: step.sceneId ?? \"scene\", stepIndex: -1, kind: \"conversation_scene\", attempt: attempts, event: \"scene_onDone\" });\n    });", "traceLessonStep({ lessonId: step.sceneId ?? \"scene\", stepIndex: -1, kind: \"conversation_scene\", attempt: attempts, event: \"scene_onDone\" });\n    onDone(!hadMistakeRef.current, {\n      attempts,\n      helpLevel: helpLevelRef.current,\n      helpRequests: helpRequestsRef.current,\n    });")],
  ],
  "async-direct-fallback": [
    ["[11] Direct onError terminal without Media3", "NO_ASYNC_DIRECT_FALLBACK", (s) => {
      s.src.mediaPlugin = s.src.mediaPlugin.split("failDirectBackend").join("failDirectBackendDisabled");
    }],
    ["[15] AUDIO_ERROR before exhausted", "TERMINAL_BEFORE_EXHAUSTED", src("mediaPlugin", "AUDIO_LOCAL_BACKENDS_EXHAUSTED", "AUDIO_ERROR_LOCAL_ONLY")],
    ["[18] no AudioFocusRequest", "NO_AUDIO_FOCUS", src("mediaPlugin", "AudioFocusRequest", "LegacyFocusRequest")],
  ],
  "fixed-content-fail-open": [
    ["[23] Guided Try dead-end", "GUIDED_TRY_DEAD_END", src("guidedTry", "listen-continue-degraded", "listen-continue-blocked")],
  ],
  "physical-truth": [
    ["[33] physical FAIL overwritten", "PHYSICAL_FAIL_OVERWRITTEN", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      s.matrix.priorPhysical.pr305_pre_1713d851.guidedTryAudio = "PASS";
    }],
    ["[40] billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
    ["[base] SHA ambiguous", "BASE_SHA_AMBIGUOUS", (s) => {
      s.base = { ...s.base, RC2_2_31D_BASE_SHA: "deadbeef" };
    }],
  ],
};

const cases = MUTATIONS[area] ?? [];
const clean = await gate(base);
assert.deepEqual(clean, [], `${area}: estado real falhou\n${report(`${mode}:${area}`, clean)}`);
let killed = 0;
let failed = 0;
for (const [label, code, mutate] of cases) {
  const state = structuredClone(base);
  try {
    mutate(state);
    const failures = await gate(state);
    const codes = failures.map((f) => f.code);
    assert.ok(codes.includes(code), `${label}: esperava ${code}, veio ${codes.join(", ") || "nenhuma falha"}`);
    console.log(`KILLED ${label}: ${code}`);
    killed += 1;
  } catch (err) {
    console.error(`FAIL mutation: ${label}: ${err instanceof Error ? err.message : err}`);
    failed += 1;
  }
}
console.log(`PASS test:${area} (${killed} mutações)`);
process.exit(failed ? 1 : 0);
