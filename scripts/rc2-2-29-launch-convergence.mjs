#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-29-gates.mjs";

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
const src = (key, from, to) => (s) => { s.src[key] = swap(s.src[key], from, to); };

const MUTATIONS = {
  "ci-green": [
    ["canonicalPlayer imports Capacitor", "PLATFORM_BOUNDARY", src("canonical", 'from "../platform/nativeMedia"', 'from "@capacitor/core"')],
  ],
  "audio-coverage": [
    ["[4][12] fixed missing accepted", "FIXED_CONTENT_MISSING", (s) => { s.classification = { ...s.classification, fixedContentMissingAudio: 649 }; }],
  ],
  "audio-quality": [
    ["[13] suspicious duration unflagged", "SUSPICIOUS_DURATION", (s) => {
      s.pack = JSON.parse(JSON.stringify(s.pack));
      // Force a 12+ char phrase with too-short duration and no flag.
      s.pack.entries.unshift({
        audioId: "audio:qa:suspicious:v1",
        textKey: "一二三四五六七八九十再来",
        durationMs: 400,
        bytes: 2000,
        checksum: "a".repeat(64),
        file: "audio/extended/qa.mp3",
        uri: "/audio/extended/qa.mp3",
        suspiciousDuration: false,
        pack: "extended",
      });
    }],
    ["[15] third-party audio", "THIRD_PARTY_AUDIO", (s) => {
      s.pack = JSON.parse(JSON.stringify(s.pack));
      s.pack.entries[0].uri = "https://evil.example/voice.mp3";
    }],
  ],
  "tts-fallback-only": [
    ["[5] TTS disabled breaks Guided Try", "GUIDED_TRY_TTS", src("guidedTry", "GUIDED_TRY_NIHAO_AUDIO_ID", "REMOVED_AUDIO_ID")],
  ],
  "conversation-zero-stall": [
    ["[9] Continue does not commit", "CONTINUE_NO_COMMIT", src("runtime", "nodeId: event.targetNodeId,", "nodeId: state.nodeId,")],
    ["[10] duplicate tap skips two nodes", "DUPLICATE_TAP_ADVANCES", src("runtime", "if (lock.locked && now - lock.lockedAt < TRANSITION_LOCK_MS) {\n    return { ok: false, lock };\n  }", "if (false) {\n    return { ok: false, lock };\n  }")],
    ["[8] audio failure blocks transition", "AUDIO_BLOCKS_TRANSITION", (s) => {
      s.src.conversation = s.src.conversation.replace(
        "function goTo(targetId: string | undefined, _speakTarget?: ConversationNode) {",
        'function goTo(targetId: string | undefined, _speakTarget?: ConversationNode) {\n    void playMandarinAudio("x");'
      );
    }],
  ],
  "owner-request-register": [
    ["[43] owner-rejected marked DONE", "OWNER_REJECTED_MARKED_DONE", (s) => {
      s.owner = JSON.parse(JSON.stringify(s.owner));
      s.owner.items[0].ownerAccepted = true;
      s.owner.items[0].ownerSaw = false;
    }],
  ],
  "no-debug-ui": [
    ["[1] QA TTS text in Guided Try", "DEBUG_TTS_TEXT", src("guidedTry", "data-testid=\"guided-try\"", "data-testid=\"guided-try\" data-x=\"TTS: NATIVE\"")],
    ["[2] Copiar diagnóstico in lesson surface", "DEBUG_COPY_DIAG", (s) => {
      s.src.guidedTry += "\n{/* Copiar diagnóstico */}\n";
    }],
  ],
  "guided-parity": [
    ["[17] Pro escapes Guided shell", "GUIDED_SHELL_MISSING", src("player", "guidedShell", "legacyShell")],
  ],
  "no-local-profiles": [
    ["[29] local profile text", "LOCAL_PROFILE_COPY", src("dados", "progresso e preferências", "progresso, perfis e preferências")],
  ],
  "guidance-delivery": [
    ["[22] Tone Trace no first-use", "TONE_TRACE_GUIDANCE", src("guidance", "tone_trace_first_use_v1", "tone_trace_removed")],
    ["[21] popup spam", "POPUP_SPAM", src("guidance", "GUIDANCE_SESSION_BUDGET = 1", "GUIDANCE_SESSION_BUDGET = 9")],
  ],
  "completion-sequence": [
    ["[32] unit celebration missing", "UNIT_CELEBRATION", src("player", "computeCompletionDeltas", "computeNothing")],
    ["[34] feature unlock missing", "FEATURE_UNLOCK", src("player", "unlockLabel: deltas.unlockLabel,", "")],
  ],
  "physical-truth": [
    ["[44] #273 / freeze", "FREEZE_EXCEPTION", src("curriculumFreeze", "RC2_2_29_", "RC2_2_XX_")],
    ["[46] billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
  ],
};

const mutations = MUTATIONS[area] ?? [];
let failed = 0;
for (const [label, code, mutate] of mutations) {
  const state = await loadState();
  mutate(state);
  const failures = await gate(state);
  if (!failures.some((f) => f.code === code)) {
    console.error(`FAIL mutation: ${label} (esperava ${code})`);
    console.error(report(`test:${area}`, failures));
    failed += 1;
  } else console.log(`PASS mutation: ${label}`);
}
if (!mutations.length) console.log(`PASS test:${area} (validate-only)`);
process.exit(failed ? 1 : 0);
