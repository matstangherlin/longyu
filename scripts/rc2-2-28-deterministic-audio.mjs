#!/usr/bin/env node
/**
 * RC2.2.28 — validate:<área> / test:<área>.
 *
 *   node scripts/rc2-2-28-deterministic-audio.mjs validate <área>
 *   node scripts/rc2-2-28-deterministic-audio.mjs test <área>
 *
 * Mutações = as 30 obrigatórias da spec RC2.2.28.
 */
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-28-gates.mjs";

const [mode, area] = process.argv.slice(2);
const gate = VALIDATORS[area];
if (!gate || !["validate", "test"].includes(mode)) {
  console.error(`uso: validate|test <${Object.keys(VALIDATORS).join("|")}>`);
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
const src = (key, from, to) => (s) => {
  s.src[key] = swap(s.src[key], from, to);
};

const MUTATIONS = {
  "canonical-audio-manifest": [
    ["[1] CANONICAL_AUDIO_ASSETS vazio passa gate", "CANONICAL_AUDIO_EMPTY", (s) => {
      s.src.manifest = s.src.manifest
        .replace(/export const CANONICAL_AUDIO_ENTRIES[\s\S]*?\] as const;/, "export const CANONICAL_AUDIO_ENTRIES: readonly CanonicalAudioEntry[] = [] as const;")
        .replace(/CANONICAL_AUDIO_ENTRIES\.map/g, "[].map");
    }],
    ["[4] fixed content sem audioId passa", "GUIDED_TRY_AUDIO_ID_MISSING", src("manifest", "audio:guided-try:nihao:v1", "audio:other:placeholder:v1")],
  ],
  "core-audio-pack": [
    ["[25] core pack sem guided-try", "GUIDED_TRY_NOT_IN_CORE", (s) => {
      s.corePack = JSON.parse(JSON.stringify(s.corePack));
      s.corePack.entries = s.corePack.entries.filter((e) => !String(e.audioId).includes("guided-try:nihao"));
    }],
  ],
  "native-media-player": [
    ["[23] sem ExoPlayer", "NO_EXOPLAYER", src("mediaPlugin", "ExoPlayer", "MediaPlayerLegacy")],
  ],
  "web-asset-player": [
    ["web player sem HTMLAudio", "WEB_PLAYER_MISSING", (s) => {
      s.src.canonical = s.src.canonical.replace(/HTMLAudioElement/g, "FakeAudioElement").replace(/new Audio\(/g, "new FakeAudio(");
    }],
  ],
  "tts-fallback-only": [
    ["[2] Guided Try depende de TTS (policy/TTS-first)", "ENGINE_TTS_FIRST", (s) => {
      s.src.playback = s.src.playback.replace(
        "function engineFor(text: string, options: PlayMandarinOptions = {}): PlaybackEngine {\n  const asset = resolveAsset(text, options.audioId);",
        'function engineFor(text: string, options: PlayMandarinOptions = {}): PlaybackEngine {\n  if (usesNativeVoice()) return "native-tts";\n  const asset = null;'
      );
    }],
    ["[3] Conversation fixed line depende de TTS", "ENGINE_TTS_FIRST", (s) => {
      s.src.playback = s.src.playback.replace(
        "function engineFor(text: string, options: PlayMandarinOptions = {}): PlaybackEngine {\n  const asset = resolveAsset(text, options.audioId);",
        'function engineFor(text: string, options: PlayMandarinOptions = {}): PlaybackEngine {\n  if (usesNativeVoice()) return "native-tts";\n  const asset = null;'
      );
    }],
  ],
  "guided-try-no-tts": [
    ["[5] asset failure deixa CTA bloqueado", "AUDIO_GATE_MISSING", (s) => {
      s.src.guidedTry = s.src.guidedTry
        .replace(/audioGateCtaEnabled/g, "audioGateNever")
        .replace(/DEGRADED/g, "STUCK_IDLE");
    }],
    ["[6] Promise rejection deixa tela em IDLE", "PROMISE_UNCAUGHT", (s) => {
      s.src.guidedTry = s.src.guidedTry.replace(/\.catch\(\(err: unknown\) => \{[\s\S]*?\}\);/, ");");
    }],
    ["[22] TTS unavailable quebra onboarding", "GUIDED_TRY_DEPENDS_ON_TTS", src("guidedTry", "audioId: GUIDED_TRY_NIHAO_AUDIO_ID,", "")],
  ],
  "conversation-reducer": [
    ["[7] conversation reducer chama áudio", "REDUCER_IMPURE", (s) => {
      s.src.runtime = s.src.runtime.replace(
        "export function conversationReducer(",
        'import { Capacitor } from "@capacitor/core";\nvoid Capacitor;\nexport function conversationReducer('
      );
    }],
    ["[15] CONTINUE não commita", "CONTINUE_NO_COMMIT", src("runtime", "nodeId: event.targetNodeId,", "nodeId: state.nodeId,")],
  ],
  "conversation-audio-after-render": [
    ["[8] audio promise controla nodeId", "AUDIO_IN_GOTO", (s) => {
      // RC2.2.29 — goTo takes opts.reuseTransitionId (multi-line signature).
      s.src.conversation = s.src.conversation.replace(
        "    const sceneId = step.sceneId ?? \"scene\";\n    const transitionId = opts?.reuseTransitionId ?? nextTransitionId(sceneId, spokenCount);",
        '    void playMandarinAudio("x");\n    const sceneId = step.sceneId ?? \"scene\";\n    const transitionId = opts?.reuseTransitionId ?? nextTransitionId(sceneId, spokenCount);'
      );
    }],
    ["[12] player ERROR cancela transition", "AUDIO_IN_GOTO", (s) => {
      s.src.conversation = s.src.conversation.replace(
        "truth.begin(nodeId, target.id, transitionId, { failsafe: Boolean(opts?.reuseTransitionId) });",
        'void requestMandarinSpeech({ text: "x", source: "CONVERSATION_AUTOPLAY", mode: "AUTO_PLAY" });\n    truth.begin(nodeId, target.id, transitionId, { failsafe: Boolean(opts?.reuseTransitionId) });'
      );
    }],
    ["[10] node 2 reutiliza request do node 1", "NODE_REUSES_REQUEST", src("conversation", "speechKey: nodeKey,", 'speechKey: "shared",')],
    ["[11] same text em nodes diferentes não toca novamente", "NODE_REUSES_REQUEST", src("conversation", "speechKey: nodeKey,", "/* speechKey removed */")],
  ],
  "promise-safety": [
    ["[6] Guided Try sem catch", "PROMISE_UNCAUGHT", (s) => {
      s.src.guidedTry = s.src.guidedTry.replace(/\.catch\(\(err: unknown\) => \{[\s\S]*?\}\);/, ");");
    }],
  ],
  "build-provenance": [
    ["[13] source HEAD comparado com merge SHA", "SOURCE_COMPARED_TO_MERGE", src("provenance", "if (workflow && sourceHead && !shaMatches(workflow, sourceHead)) {\n    // Isso é ESPERADO em PR builds. Continua MATCH se source bateu.\n  }", "if (workflow && sourceHead && !shaMatches(workflow, sourceHead)) return \"TEST_INVALID\";")],
    ["[14] merge SHA considerado APK antigo", "MERGE_SHA_AS_STALE", src("provenance", "if (workflow && sourceHead && !shaMatches(workflow, sourceHead)) {\n    // Isso é ESPERADO em PR builds. Continua MATCH se source bateu.\n  }", "if (workflow && sourceHead && !shaMatches(workflow, sourceHead)) return \"TEST_INVALID\";")],
  ],
  "completion-deltas": [
    ["[15] unit completion não chega à victory", "DELTAS_NOT_WIRED", src("player", "computeCompletionDeltas", "computeNothing")],
    ["[16] phase completion não chega à victory", "COMPLETION_KIND_MISSING", src("player", "completionKind: deltas.completionKind,", "")],
    ["[17] feature unlock nunca aparece", "UNLOCK_LABEL_MISSING", src("player", "unlockLabel: deltas.unlockLabel,", "")],
  ],
  "no-scroll-expanded": [
    ["[18] Lesson exige scroll", "NO_SCROLL_SURFACE", (s) => {
      s.src.e2e = s.src.e2e.replace(/Lesson/g, "Xesson");
    }],
    ["[19] Review exige scroll", "NO_SCROLL_SURFACE", (s) => {
      s.src.e2e = s.src.e2e.replace(/Review/g, "Xeview");
    }],
    ["[20] Pinyin exige scroll", "NO_SCROLL_SURFACE", (s) => {
      s.src.e2e = s.src.e2e.replace(/Pinyin/gi, "Xinyin");
    }],
    ["[21] Tone exige scroll", "NO_SCROLL_SURFACE", (s) => {
      s.src.e2e = s.src.e2e.replace(/Tone/g, "Xone");
    }],
  ],
  "tts-independence": [
    ["[22][23][24] TTS independence hook removed", "TTS_INDEPENDENCE_HOOK", src("playback", "setTtsForcedUnavailableForTests", "setTtsSomethingElse")],
  ],
  "physical-truth": [
    ["[27] #273 alterada / freeze exception", "FREEZE_EXCEPTION_MISSING", src("curriculumFreeze", "RC2_2_28_", "RC2_2_XX_")],
    ["[29] billing Android habilitado", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
  ],
};

const mutations = MUTATIONS[area] ?? [];
let failed = 0;
for (const [label, code, mutate] of mutations) {
  const state = await loadState();
  mutate(state);
  const failures = await gate(state);
  const hit = failures.some((f) => f.code === code);
  if (!hit) {
    console.error(`FAIL mutation did not catch: ${label} (esperava ${code})`);
    console.error(report(`test:${area}`, failures));
    failed += 1;
  } else {
    console.log(`PASS mutation: ${label}`);
  }
}
if (!mutations.length) console.log(`PASS test:${area} (sem mutações — validate-only)`);
process.exit(failed ? 1 : 0);
