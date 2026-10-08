#!/usr/bin/env node
/**
 * RC2.2.32 — validate:<área> / test:<área>
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-32-gates.mjs";

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
  "voice-consistency": [
    ["[1] TTS back in FIXED order", "FIXED_CONTENT_TTS_IN_ORDER", src("policy", '"textual-fallback",\n] as const;', '"native-tts",\n  "web-tts",\n  "textual-fallback",\n] as const;')],
    ["[2] canonical voice removed", "CANONICAL_VOICE_MISSING", src("voice", 'CANONICAL_VOICE_PROFILE = "zh-CN-XiaoxiaoNeural"', 'CANONICAL_VOICE_PROFILE = "device-default"')],
    ["[3] instrumentation unwired", "VOICE_INSTRUMENTATION", src("playback", "recordVoicePlayback(", "recordVoicePlaybackDisabled(")],
  ],
  "speech-experience": [
    ["[4] human message removed", "HUMAN_SPEECH_MESSAGE", src("speech", "Não consegui analisar sua fala agora.", "recognitionService unavailable.")],
    ["[5] contrast same-voice removed", "CONTRAST_SAME_VOICE", src("contrast", "sameCanonicalVoiceRequired", "sameCanonicalVoiceOptional")],
  ],
  "guidance-delivery": [
    ["[6] global budget raised", "GLOBAL_BUDGET", src("guidance", "GUIDANCE_SESSION_BUDGET = 1", "GUIDANCE_SESSION_BUDGET = 5")],
    ["[7] inline tip unwired from builder", "INLINE_NOT_WIRED", src("hanziBuilder", 'interaction="hanzi_builder"', 'interaction="legacy_removed"')],
  ],
  "sensory-feedback": [
    ["[8] scroll haptic allowed", "NO_SCROLL_HAPTIC", src("sensory", "allowed: false", "allowed: true")],
    ["[9] hapticsEnabled removed", "HAPTICS_PREF", src("haptics", "hapticsEnabled", "hapticsAlwaysOn")],
  ],
  "conversation-integrity": [
    ["[10] empty speech check removed", "INTEGRITY_CODES", (s) => {
      s.src.conversationIntegrity = s.src.conversationIntegrity
        .replaceAll("EMPTY_SPEECH", "MISSING_SPEECH_CODE")
        .replaceAll("TRUNCATED_SPEECH", "CUT_SPEECH_CODE")
        .replaceAll("SCAFFOLD_LEAK", "SCAFFOLD_CODE");
    }],
  ],
  "physical-truth": [
    ["[11] fake physical PASS", "FAKE_PHYSICAL_PASS", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      const check = s.matrix.requiredChecks.find((c) => c.id === "guidedTry");
      check.result = "PASS";
      check.evidence = "AUTOMATED";
    }],
    ["[12] billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
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
