#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-31c-gates.mjs";

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
  "webview-speechSynthesis-absence": [
    ["[1] isTTSAvailable assumes speechSynthesis", "WEBVIEW_SPEECH_SYNTHESIS_UNDEFINED", src("tts", "function resumeSpeechSynthesis(): void {\n  // não usar isTTSAvailable() aqui — ver webSpeechSynthesis().\n  const synth = webSpeechSynthesis();\n  if (!synth) return;", "function resumeSpeechSynthesis(): void {\n  if (!isTTSAvailable()) return;\n  const synth = window.speechSynthesis;\n  if (synth.paused) synth.resume();\n  return; /*")],
  ],
  "gesture-no-throw": [
    ["[3] noteUserGesture throws", "GESTURE_THROWS", src("tts", "try {\n    resumeSpeechSynthesis();\n  } catch {\n    /* never throw */\n  }", "resumeSpeechSynthesis();")],
  ],
  "gesture-not-in-navigation-critical-path": [
    ["[4] Conversation calls gesture before reducer", "GESTURE_IN_NAV_CRITICAL_PATH", src("conversation", "function advance() {\n    const sceneId = step.sceneId ?? \"scene\";\n    // RC2.2.31C — state first. Gesture/trace/audio are side effects; never gate goTo.", "function advance() {\n    const sceneId = step.sceneId ?? \"scene\";\n    noteUserGesture();\n    // RC2.2.31C — state first. Gesture/trace/audio are side effects; never gate goTo.")],
  ],
  "canonical-request-always-reaches-player": [
    ["[5] audioPlayback aborts before native player", "AUDIO_ABORTS_BEFORE_PLAYER", src("audioPlayback", "try {\n        noteUserGesture();\n      } catch {\n        recordTechEvent(\"js_error\", { errorClass: \"GestureUnlockError\", source: \"playMandarinAudio\" });\n      }", "noteUserGesture();")],
  ],
  "direct-asset-player": [
    ["[10] Direct asset fallback absent", "DIRECT_ASSET_FALLBACK_ABSENT", src("mediaPlugin", "playDirectAsset", "playLegacyAsset")],
  ],
  "no-false-start": [
    ["[7] READY counts as HEARD", "READY_COUNTS_AS_HEARD", src("canonicalPlayer", 'outcome.reason = "PLAYBACK_NOT_CONFIRMED";', 'outcome.reason = "ENDED_WITHOUT_START"; outcome.started = true; /* READY laundry */')],
  ],
  "guided-try-real-audio": [
    ["[9] asset failure shows Configure Chinese Voice", "ASSET_FAILURE_SHOWS_VOICE_INSTALL", src("guidedTry", "{canOfferVoiceInstall(failReason) ? (\n                    <Button size=\"sm\" variant=\"outline\" onClick={() => void installVoice()} data-testid=\"guided-audio-install\">\n                      {t(\"guidedTry.audioInstallVoice\")}\n                    </Button>\n                  ) : null}", "{canOfferVoiceInstall(failReason) ? (\n                    <Button size=\"sm\" variant=\"outline\" onClick={() => void installVoice()} data-testid=\"guided-audio-install\">\n                      {t(\"guidedTry.audioInstallVoice\")}\n                    </Button>\n                  ) : (\n                    <Button size=\"sm\" variant=\"outline\" onClick={() => void openNativeTtsSettings()} data-testid=\"guided-audio-settings\">\n                      {t(\"guidedTry.audioInstallVoice\")}\n                    </Button>\n                  )}")],
  ],
  "conversation-chaos": [
    ["[14] second real gesture same actionKey ignored", "ACTIONKEY_STICKINESS", (s) => {
      s.src.nativeSafe = s.src.nativeSafe
        .split("gestureSeq")
        .join("legacySeq")
        .split("gestureId")
        .join("legacyId");
    }],
    ["[16] trace exception blocks conversation", "TRACE_BLOCKS_CONVERSATION", src("conversation", 'safeSideEffect("conversation_trace"', 'void ("conversation_trace"')],
  ],
  "physical-truth": [
    ["[24] old #305 FAIL overwritten", "PHYSICAL_FAIL_OVERWRITTEN", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      s.matrix.priorPhysical.pr305_pre_1713d851.guidedTryAudio = "PASS";
    }],
    ["[25] HEAD PASS without owner", "PHYSICAL_FAIL_OVERWRITTEN", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      s.matrix.checks.guidedTryAudio = "PASS";
      s.matrix.release.OWNER_ACCEPTED = 0;
    }],
    ["[32] billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
    ["[base] SHA ambiguous", "BASE_SHA_AMBIGUOUS", (s) => {
      s.base = { ...s.base, RC2_2_31C_BASE_SHA: "deadbeef" };
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
