#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import { build } from "esbuild";

const read = (path) => fs.readFileSync(path, "utf8");
const json = (path) => JSON.parse(read(path));

const output = await build({
  entryPoints: ["src/lib/ttsCorrelation.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const correlation = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`);
const event = (source, requestId = "A", type = "TTS_STARTED") => ({
  type, requestId, utteranceId: "utterance-A", timestamp: 1, engineState: "speaking", source,
});

for (const source of ["direct", "event", "query"]) {
  const state = correlation.applyTtsEvent(correlation.beginTtsPlayback("A"), event(source));
  assert.equal(correlation.ttsCtaEnabled(state), true, `${source} must release Continue`);
  assert.deepEqual(state.ackSources, [source]);
}
let state = correlation.beginTtsPlayback("A");
for (const source of ["direct", "event", "query"]) state = correlation.applyTtsEvent(state, event(source));
assert.equal(correlation.ttsCtaEnabled(state), true);
assert.deepEqual(state.ackSources, ["direct", "event", "query"]);

const foreign = correlation.applyTtsEvent(correlation.beginTtsPlayback("A"), event("direct", "B"));
assert.equal(correlation.ttsCtaEnabled(foreign), false);
assert.equal(foreign.ignoredForeign, 1);
assert.equal(correlation.ttsCtaEnabled(correlation.beginTtsPlayback("A")), false, "request alone is not audio");
const doneOnly = correlation.applyTtsEvent(correlation.beginTtsPlayback("A"), event("query", "A", "TTS_DONE"));
assert.equal(correlation.ttsCtaEnabled(doneOnly), true);

const adapterBuild = await build({
  entryPoints: ["src/lib/platform/nativeSpeech.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
  plugins: [{
    name: "mock-native-bridge",
    setup(plugin) {
      plugin.onResolve({ filter: /^@capacitor\/core$/ }, () => ({ path: "capacitor", namespace: "mock" }));
      plugin.onResolve({ filter: /^\.\/nativePlatform$/ }, () => ({ path: "platform", namespace: "mock" }));
      plugin.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({
        contents: path === "capacitor"
          ? "export const Capacitor = { isPluginAvailable: () => true }; export const registerPlugin = () => globalThis.__longyuTtsTestPlugin;"
          : "export const isAndroid = () => true;",
        loader: "js",
      }));
    },
  }],
});
const adapterUrl = `data:text/javascript;base64,${Buffer.from(adapterBuild.outputFiles[0].text).toString("base64")}`;
for (const source of ["direct", "event", "query"]) {
  const received = [];
  let listener;
  globalThis.__longyuTtsTestPlugin = {
    addListener: async (_name, callback) => { listener = callback; return { remove: async () => {} }; },
    getTtsPlaybackState: async ({ requestId }) => ({
      requestId, utteranceId: "utterance-A", state: source === "query" ? "STARTED" : "IDLE",
      started: source === "query", done: false, errorCode: null,
    }),
    startSpeak: async ({ requestId }) => {
      if (source === "direct") return { requestId, utteranceId: "utterance-A", started: true };
      if (source === "event") {
        listener(event(undefined, requestId));
        throw new Error("direct ACK lost");
      }
      throw new Error("event and direct ACK lost");
    },
  };
  const adapter = await import(`${adapterUrl}#${source}`);
  const result = await adapter.nativeSpeakTracked("你好", { requestId: "A" }, (receivedEvent) => received.push(receivedEvent));
  assert.equal(received.some((item) => item.type === "TTS_STARTED" && item.source === source), true, `${source} must reach subscriber`);
  if (source === "query" || source === "direct") assert.equal(result.ok, true);
  // RC2.2.27 — onStart da MESMA request é início confirmado: o ACK direto
  // perdido não transforma uma fala que começou em falha (antes: ok=false).
  if (source === "event") assert.equal(result.ok, true, "event START of the same request is a confirmed start");
}
delete globalThis.__longyuTtsTestPlugin;

const java = read("android/app/src/main/java/longyu/noba/com/LongyuSpeechPlugin.java");
// RC2.2.27 — startSpeak delega ao registro de requests (beginTtsRequest com
// ackOnStart=true); o trecho vai até o watchdog de isSpeaking. A chamada
// nunca é mantida viva até o fim da fala (só o speak legado faz isso).
const start = java.split("public void startSpeak(PluginCall call)")[1]?.split("private void armDeadline")[0] ?? "";
assert.match(start, /beginTtsRequest\(call, true\)/);
assert.match(start, /TTS_START_TIMEOUT_MS/);
assert.match(start, /tts\.speak\(/);
assert.doesNotMatch(start, /setKeepAlive\(true\)/);
assert.match(java, /public void getTtsPlaybackState\(PluginCall call\)/);
assert.match(java, /pending\.resolve\(result\)/);
assert.match(java, /emitTts\("TTS_DONE"/);

const adapter = read("src/lib/platform/nativeSpeech.ts");
assert.match(adapter, /LongyuSpeech\.startSpeak\(/);
assert.match(adapter, /nativeTtsPlaybackState\(requestId\)/);
assert.match(adapter, /source: "direct"/);
assert.match(adapter, /source: "query"/);
assert.match(adapter, /ttsSubscribers\.get\(event\.requestId\)/);

const guided = read("src/features/landing/GuidedTryPage.tsx");
assert.match(guided, /guided-audio-confirm-heard/);
assert.match(guided, /user_confirmed_audio_without_native_ack/);
assert.match(guided, /setAudioResult\("DEGRADED_AUDIO"\)/);
// RC2.2.29+ — recovery stays; technical TTS diagnostics leave the learner surface.
assert.doesNotMatch(guided, /guided-audio-copy-diagnostic/);
assert.doesNotMatch(guided, /guided-tts-qa/);
assert.doesNotMatch(guided, /Copiar diagnóstico/);

const bugs = json("docs/release/rc2-2-26-android-physical-bugs.json");
const ttsBug = bugs.bugs.find((bug) => bug.id === "ANDROID_TTS_HEARD_BUT_UI_NOT_ACKNOWLEDGED");
assert.equal(bugs.RC2_2_26_BASE_SHA, "94020966cac9094a00a85a1c0ddbc4956e3171e6");
assert.equal(ttsBug.status, "REPRODUCED");
assert.equal(ttsBug.reproducedOnDevice, true);
assert.equal(ttsBug.ownerEvidence, true);
assert.equal(ttsBug.rootCause.confidence, "REOPENED_AFTER_PHYSICAL_FAILURE");

const debt = json("docs/release/rc2-2-26-owner-product-debt.json");
assert.equal(debt.items.length, 30);
assert.equal(debt.ownerAccepted, 0);
assert.equal(debt.items.find((item) => item.id === "OD29").physicalState, "FAIL");
const matrix = json("docs/release/rc2-2-26-physical-matrix.json");
assert.equal(Object.values(matrix.checks).every((value) => value === "NOT_RUN"), true);
assert.equal(matrix.release.CLOSED_BETA, "NO_GO");
assert.equal(matrix.release.APK_PASS, 0);
assert.equal(matrix.release.OWNER_ACCEPTED, 0);

console.log("PASS gate:rc2-2-26-android-physical-closure (3 ACK sources, foreign request, recovery and release truth)");
