#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-31b-gates.mjs";

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
  "full-fixed-speech": [
    ["[1] 638 extended-tone assets remain", "EXTENDED_TONE_REMAINS", src("manifest", 'speaker: "fixed-speech-xiaoxiao-v1"', 'speaker: "extended-tone-v1"')],
    ["[2] fixed Mandarin phrase uses tone placeholder", "TONE_PLACEHOLDER_SPEECH", (s) => {
      s.src.manifest = s.src.manifest.replace('speaker: "fixed-speech-xiaoxiao-v1"', 'speaker: "core-tone-v1"');
      s.corpusReport = { ...s.corpusReport, tonePlaceholdersRemaining: 0 };
    }],
  ],
  "audio-quality-v3": [
    ["[5] silencedetect absent", "SILENCEDETECT_ABSENT", src("audioQualityV3", "silencedetect", "volumedetect")],
    ["[4] silenceRatio estimated only", "SILENCE_ESTIMATED_ONLY", src("audioQualityV3", "actualSilenceRatio", "estimatedSilenceRatio")],
  ],
  "session-scoped-listeners": [
    ["[6] callback uses current mediaId", "CALLBACK_USES_CURRENT_MEDIA", src("mediaPlugin", "capturedRequestId", "legacyRequestId")],
  ],
  "promise-terminal-state": [
    ["[8] A replacement receives no SUPERSEDED", "NO_SUPERSEDED_EVENT", (s) => {
      s.src.mediaPlugin = s.src.mediaPlugin
        .split("EVENT_SUPERSEDED")
        .join("EVENT_LEGACY")
        .split("AUDIO_SUPERSEDED")
        .join("AUDIO_LEGACY");
    }],
    ["[9] cancelled Promise never resolves", "PROMISE_NEVER_SETTLES", (s) => {
      s.src.canonicalPlayer = s.src.canonicalPlayer
        .split("cancelled: boolean")
        .join("/* cancelled type removed */")
        .split("cancelled: false")
        .join("/* cancelled removed */")
        .split("onCancelled")
        .join("onLegacyCancel");
    }],
    ["[11] READY emitted before native READY", "READY_BEFORE_NATIVE", src("canonicalPlayer", 'input.onState?.("PREPARING");', 'input.onState?.("PREPARING");\n  input.onState?.("READY");\n  input.onEvent?.("AUDIO_READY", { requestId });\n  const media = getNativeMediaPlugin(); if (false) void media;')],
  ],
  "conversation-real-input-trace": [
    ["[14] V1 fake pointer trace", "FAKE_POINTER_TRACE", src("conversation", "function advanceDialogue() {\n    const sceneId = step.sceneId ?? \"scene\";\n    // RC2.2.31C — V1 state first; no noteUserGesture on critical path.\n    if (lineIndex < lines.length - 1) {\n      // RC2.2.24 — sem TTS no toque: a fala nova aparece e só então a bolha fala.\n      truth.begin(`line-${lineIndex}`, `line-${lineIndex + 1}`);\n      setLineIndex((index) => index + 1);\n      safeSideEffect(\"conversation_trace\", () => {\n        recordConversationTrace({ event: \"conversation_handler_enter\", sceneId, nodeId: `line-${lineIndex}` });", "function advanceDialogue() {\n    const sceneId = step.sceneId ?? \"scene\";\n    recordConversationTrace({ event: \"conversation_pointer_down\", sceneId, nodeId: `line-${lineIndex}` });\n    recordConversationTrace({ event: \"conversation_click\", sceneId, nodeId: `line-${lineIndex}` });\n    // RC2.2.31C — V1 state first; no noteUserGesture on critical path.\n    if (lineIndex < lines.length - 1) {\n      truth.begin(`line-${lineIndex}`, `line-${lineIndex + 1}`);\n      setLineIndex((index) => index + 1);\n      safeSideEffect(\"conversation_trace\", () => {\n        recordConversationTrace({ event: \"conversation_handler_enter\", sceneId, nodeId: `line-${lineIndex}` });")],
    ["[16] stall expected read after clear", "STALL_RETRY_NULL", src("conversation", "const expected = truth.stall;", "const expected = null; /* cleared */ truth.stall;")],
    ["[17] Reveal uses unsafe state action", "REVEAL_UNSAFE", src("conversation", 'useConversationAction(\n    "reveal"', 'useConversationAction(\n    "continue"')],
  ],
  "full-apk-packaging": [
    ["[27] asset missing from APK passes", "APK_ASSET_MISSING", (s) => {
      s.src.manifest = s.src.manifest.replace(/file: "audio\/core\/guided-try-nihao\.mp3"/, 'file: "audio/core/missing-guided-try-nihao.mp3"');
    }],
  ],
  "physical-proof": [
    ["[32] physical FAIL overwritten by CI", "PHYSICAL_FAIL_OVERWRITTEN", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      s.matrix.checks.guidedTryAudio = "PASS";
      s.matrix.release.OWNER_ACCEPTED = 0;
    }],
    ["[35] Android billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
    ["[base] SHA ambiguous", "BASE_SHA_AMBIGUOUS", (s) => {
      s.base = { ...s.base, RC2_2_31B_BASE_SHA: "deadbeef" };
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
