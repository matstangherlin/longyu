#!/usr/bin/env node
import assert from "node:assert/strict";
import { VALIDATORS, loadState, report } from "./lib/rc2-2-31-gates.mjs";

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
  "request-aware-cancel": [
    ["[5] cancel(A) stops B", "CANCEL_A_STOPS_B", src("mediaPlugin", 'result.put("reason", "STALE_REQUEST");', 'result.put("reason", "OK");\n                if (player != null) { player.stop(); player.clearMediaItems(); }')],
    ["[6] stop ignores requestId", "STOP_IGNORES_REQUEST_ID", src("mediaPlugin", "cancelCanonicalAudio(call);", "stopAllCanonicalAudio(call);")],
    ["[9] old cleanup kills new media", "OLD_CLEANUP_KILLS_NEW", src("audioPlayback", "void cancelCanonicalAudio(requestId);", "/* cancel skipped — stale cleanup */")],
  ],
  "stale-callback-rejection": [
    // RC2.2.31D — MediaItem uses session.requestId (equivalent identity).
    ["[7] callback A gets B requestId", "CALLBACK_A_GETS_B", src("mediaPlugin", ".setMediaId(session.requestId)", '.setMediaId("shared")')],
    ["[8] started state global", "STARTED_STATE_GLOBAL", src("mediaPlugin", "private long generationCounter = 0;", "private boolean startedForCurrent = false;\n    private long generationCounter = 0;")],
  ],
  "asset-path-preflight": [
    ["[16] manifest Android uses guessed web path", "MANIFEST_GUESSED_WEB_PATH", src("mediaPlugin", 'return Uri.parse("asset:///" + assetPath);', 'return Uri.parse("file:///android_asset/public/" + assetPath);')],
    ["[17] AssetManager preflight skipped", "ASSETMANAGER_PREFLIGHT_SKIPPED", src("mediaPlugin", "openFd(assetPath)", "open(assetPath)")],
  ],
  "listener-lifecycle": [
    ["[11] listener marked bound before bind", "LISTENER_BOUND_BEFORE_BIND", src("canonicalPlayer", 'nativeListenerState = "BINDING";', 'nativeListenerState = "BOUND";')],
    ["[13] handler deleted by arbitrary TTL", "HANDLER_TTL_DELETE", src("canonicalPlayer", "dropHandler(requestId);", "setTimeout(() => nativeHandlers.delete(requestId), 15_000);")],
  ],
  "audio-owner-separation": [
    ["[10] canonical media claims TTS owner", "CANONICAL_CLAIMS_TTS", src("audioPlayback", 'claimedOwner = engine === "asset" || engine === "native-media" ? "CANONICAL_MEDIA" : "TTS";', 'claimedOwner = "TTS";')],
  ],
  "conversation-single-source": [
    ["[21] V2 keeps nodeId twice", "V2_DUAL_NODEID", src("conversation", "const nodeId = runtime.nodeId;", "const [nodeId, setNodeId] = useState(entryNodeId);\n  void runtime;")],
    ["[22] V1 click-only remains", "V1_CLICK_ONLY", src("conversation", "useConversationAction", "useFakeSafeAction")],
    ["[26] audio Promise owns node state", "AUDIO_OWNS_NODE", src("conversation", "function goTo(\n    targetId: string | undefined,\n    _speakTarget?: ConversationNode,\n    opts?: { reuseTransitionId?: string }\n  ) {\n    const sceneId = step.sceneId ?? \"scene\";", 'function goTo(\n    targetId: string | undefined,\n    _speakTarget?: ConversationNode,\n    opts?: { reuseTransitionId?: string }\n  ) {\n    void playMandarinAudio("x");\n    const sceneId = step.sceneId ?? \"scene\";')],
  ],
  "audio-quality-v2": [
    ["[1] silent MP3 passes quality", "SILENT_MP3_PASSES", src("audioQualityV2", "silenceRatio >= 0.8", "silenceRatio >= 1.5")],
    ["[2] RMS not measured", "RMS_NOT_MEASURED", src("audioQualityV2", "volumedetect", "anullsrc")],
    ["[4] 11-Hanzi 450ms accepted blindly", "DURATION_11_HANZI_BLIND", src("audioQualityV2", "durationSuspicious", "durationNeverSuspicious")],
  ],
  "media-position-proof": [
    ["[14] exo.play() counts as audible", "EXO_PLAY_COUNTS_AUDIBLE", src("mediaPlugin", "ENDED_REPAIR", "ENDED_SILENT")],
  ],
  "physical-truth": [
    ["[31] owner reproduced FAIL remains NOT_RUN", "OWNER_FAIL_STAYS_NOT_RUN", (s) => {
      s.matrix = JSON.parse(JSON.stringify(s.matrix));
      s.matrix.checks.guidedTryAudio = "NOT_RUN";
    }],
    ["[34] Android billing enabled", "BILLING_ENABLED", src("appGradle", "implementation project(':capacitor-android')", "implementation 'com.android.billingclient:billing:7.0.0'\n    implementation project(':capacitor-android')")],
    ["[32] base SHA ambiguous", "BASE_SHA_AMBIGUOUS", (s) => {
      s.base = { ...s.base, RC2_2_31_BASE_SHA: "deadbeef" };
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
