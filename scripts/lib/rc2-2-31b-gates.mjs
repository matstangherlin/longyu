/**
 * RC2.2.31B — full Android runtime closure gates.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

export const FILES = {
  mediaPlugin: "android/app/src/main/java/longyu/noba/com/LongyuMediaPlugin.java",
  canonicalPlayer: "src/lib/audio/canonicalPlayer.ts",
  nativeSafe: "src/components/native/NativeSafeAction.tsx",
  conversationAction: "src/components/native/ConversationActionBoundary.tsx",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  audioQualityV3: "scripts/validate-audio-quality-v3.mjs",
  corpusScript: "scripts/regenerate-fixed-speech-corpus.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  bugs: "docs/release/rc2-2-31b-android-runtime-bugs.json",
  matrix: "docs/release/rc2-2-31b-physical-matrix.json",
  base: "docs/release/rc2-2-31b-base.json",
  corpusReport: "docs/reports/rc2-2-31b-fixed-speech-corpus.json",
  manifest: "src/data/audioManifest.generated.ts",
  appGradle: "android/app/build.gradle",
};

function collector() {
  const failures = [];
  const fail = (code, where, why) => failures.push({ code, where, why });
  return { failures, fail };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

export async function loadState() {
  return {
    src: {
      mediaPlugin: read(FILES.mediaPlugin),
      canonicalPlayer: read(FILES.canonicalPlayer),
      nativeSafe: read(FILES.nativeSafe),
      conversationAction: read(FILES.conversationAction),
      conversation: read(FILES.conversation),
      audioQualityV3: read(FILES.audioQualityV3),
      corpusScript: read(FILES.corpusScript),
      curriculumFreeze: read(FILES.curriculumFreeze),
      manifest: read(FILES.manifest),
      appGradle: read(FILES.appGradle),
    },
    bugs: json(FILES.bugs),
    matrix: json(FILES.matrix),
    base: json(FILES.base),
    corpusReport: json(FILES.corpusReport),
  };
}

export async function validateFullFixedSpeech(s) {
  const { failures, fail } = collector();
  if (!/regenerate-fixed-speech-corpus/.test(s.src.corpusScript) && !/fixed-speech/.test(s.src.corpusScript)) {
    fail("CORPUS_SCRIPT_MISSING", FILES.corpusScript, "generator");
  }
  if ((s.src.manifest.match(/extended-tone-v1/g) || []).length > 0) {
    fail("EXTENDED_TONE_REMAINS", FILES.manifest, "638 extended-tone must be gone");
  }
  if ((s.src.manifest.match(/core-tone-v1/g) || []).length > 0) {
    fail("TONE_PLACEHOLDER_SPEECH", FILES.manifest, "core-tone forbidden for Mandarin phrases");
  }
  const speech = (s.src.manifest.match(/fixed-speech-xiaoxiao-v1|core-speech-xiaoxiao-v1/g) || []).length;
  if (speech < 600) fail("FULL_SPEECH_INCOMPLETE", FILES.manifest, `only ${speech} speech speakers`);
  if (s.corpusReport.tonePlaceholdersRemaining !== 0) {
    fail("EXTENDED_TONE_REMAINS", FILES.corpusReport, "tonePlaceholdersRemaining");
  }
  if ((s.corpusReport.entries ?? 0) < 600) fail("FULL_SPEECH_INCOMPLETE", FILES.corpusReport, "entries");
  return failures;
}

export async function validateAudioQualityV3(s) {
  const { failures, fail } = collector();
  const q = s.src.audioQualityV3;
  if (!/silencedetect/.test(q)) fail("SILENCEDETECT_ABSENT", FILES.audioQualityV3, "real silence");
  if (!/actualSilenceRatio/.test(q)) fail("SILENCE_ESTIMATED_ONLY", FILES.audioQualityV3, "must not estimate-only");
  if (!/volumedetect/.test(q)) fail("RMS_NOT_MEASURED", FILES.audioQualityV3, "volume");
  // Full corpus — not a 40/55 sampled gate (ignore error-log slices).
  if (/sampleSize\s*=\s*40|core\+40|entries\.slice\(0,\s*40\)/.test(q)) {
    fail("AQV_SAMPLES_ONLY", FILES.audioQualityV3, "must check all fixed assets");
  }
  if (!/for \(const entry of entries\)/.test(q) && !/for \(const entry of/.test(q)) {
    fail("AQV_SAMPLES_ONLY", FILES.audioQualityV3, "iterate all entries");
  }
  return failures;
}

export async function validateSessionScopedListeners(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  if (!/capturedRequestId/.test(java) || !/capturedGeneration/.test(java)) {
    fail("CALLBACK_USES_CURRENT_MEDIA", FILES.mediaPlugin, "session-scoped capture required");
  }
  if (!/bindSessionListener/.test(java)) fail("CALLBACK_USES_CURRENT_MEDIA", FILES.mediaPlugin, "bindSessionListener");
  if (!/STALE_CALLBACK|STALE_MEDIA_CALLBACK_IGNORED/.test(java)) {
    fail("OLD_CALLBACK_BECOMES_B", FILES.mediaPlugin, "stale rejection");
  }
  // Must not only use currentMediaItem for identity in callbacks of session listener
  if (/private String currentMediaId\(\)/.test(java) && /onPlaybackStateChanged[\s\S]*currentMediaId\(\)/.test(java)
    && !/capturedRequestId/.test(java)) {
    fail("CALLBACK_USES_CURRENT_MEDIA", FILES.mediaPlugin, "legacy currentMediaId path");
  }
  return failures;
}

export async function validatePromiseTerminalState(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  const js = s.src.canonicalPlayer;
  if (!/AUDIO_SUPERSEDED|EVENT_SUPERSEDED/.test(java)) fail("NO_SUPERSEDED_EVENT", FILES.mediaPlugin, "supersede A");
  if (!/AUDIO_CANCELLED|EVENT_CANCELLED/.test(java)) fail("NO_CANCELLED_EVENT", FILES.mediaPlugin, "cancel terminal");
  if (!/cancelled:\s*boolean/.test(js) || !/cancelled: false/.test(js) || !/onCancelled/.test(js)) {
    fail("PROMISE_NEVER_SETTLES", FILES.canonicalPlayer, "outcome.cancelled + onCancelled required");
  }
  if (!/superseded:\s*boolean/.test(js) || !/superseded: false/.test(js) || !/onSuperseded/.test(js)) {
    fail("PROMISE_NEVER_SETTLES", FILES.canonicalPlayer, "outcome.superseded + onSuperseded required");
  }
  if (/input\.onState\?\.\("READY"\);\s*input\.onEvent\?\.\("AUDIO_READY"/.test(js)
    && /PREPARING[\s\S]{0,200}READY[\s\S]{0,80}getNativeMediaPlugin/.test(js)) {
    fail("READY_BEFORE_NATIVE", FILES.canonicalPlayer, "READY must wait AUDIO_READY");
  }
  // Explicit: no READY immediately before native call without waiting
  if (/input\.onState\?\.\("READY"\);[\s\S]{0,120}const media = getNativeMediaPlugin/.test(js)) {
    fail("READY_BEFORE_NATIVE", FILES.canonicalPlayer, "premature READY");
  }
  if (!/h\.remove\(\)/.test(js) && !/\.remove\(\)/.test(js)) {
    fail("PARTIAL_LISTENER_LEAK", FILES.canonicalPlayer, "remove handles on fail");
  }
  return failures;
}

export async function validateConversationRealInputTrace(s) {
  const { failures, fail } = collector();
  const c = s.src.conversation;
  const safe = s.src.nativeSafe;
  if (!/onPointerDownObserved/.test(safe)) fail("FAKE_POINTER_TRACE", FILES.nativeSafe, "observers");
  if (!/onClickObserved/.test(safe)) fail("FAKE_CLICK_TRACE", FILES.nativeSafe, "click observer");
  // V1 must not fabricate pointer_down + click inside advanceDialogue
  const adv = c.match(/function advanceDialogue\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
  if (/conversation_pointer_down/.test(adv) || /conversation_click/.test(adv)) {
    fail("FAKE_POINTER_TRACE", FILES.conversation, "advanceDialogue must not fabricate pointer/click");
  }
  if (!/useConversationAction/.test(c)) fail("UNSAFE_STATE_ACTION", FILES.conversation, "ConversationActionBoundary");
  if (!/useConversationAction\(\s*"reveal"/.test(c)) fail("REVEAL_UNSAFE", FILES.conversation, "reveal");
  if (!/useConversationAction\(\s*"repair"/.test(c)) fail("REPAIR_UNSAFE", FILES.conversation, "repair");
  if (!/useConversationAction\(\s*"stall-retry"/.test(c)) fail("STALL_RETRY_NULL", FILES.conversation, "stall");
  // stall: expected before clear
  if (!/const expected = truth\.stall;/.test(c)) fail("STALL_RETRY_NULL", FILES.conversation, "read stall before clear");
  if (/const \[nodeId, setNodeId\] = useState/.test(c)) fail("V2_DUAL_NODEID", FILES.conversation, "regression");
  return failures;
}

export async function validatePhysicalProof(s) {
  const { failures, fail } = collector();
  if (s.base.RC2_2_31B_BASE_SHA !== "8a0633234b8d57b6a8239c15e2ed2f75d7356045") {
    fail("BASE_SHA_AMBIGUOUS", FILES.base, "must be #304 tip 8a063323");
  }
  for (const id of [
    "ANDROID_CANONICAL_AUDIO_SILENT",
    "ANDROID_CONVERSATION_CONTINUE_STALL",
    "ANDROID_SEQUENTIAL_AUDIO_CANCEL_RACE",
    "CANONICAL_AUDIO_CONTENT_NOT_CERTIFIED",
    "ANDROID_MEDIA_STALE_CALLBACK_RACE",
    "CANONICAL_PROMISE_NEVER_SETTLES",
    "CONVERSATION_FALSE_INPUT_TRACE",
    "CONVERSATION_STALL_RETRY_NULL",
    "EXTENDED_AUDIO_PLACEHOLDER_CORPUS",
  ]) {
    if (!s.bugs.bugs.find((b) => b.id === id)) fail("BUG_REGISTER_MISSING", FILES.bugs, id);
  }
  if (s.matrix.checks.guidedTryAudio === "PASS" && s.matrix.release.OWNER_ACCEPTED !== 1) {
    fail("PHYSICAL_FAIL_OVERWRITTEN", FILES.matrix, "no code-only PASS");
  }
  if (s.matrix.release.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", FILES.matrix, "NO_GO");
  if (!/RC2_2_31B_/.test(s.src.curriculumFreeze)) fail("FREEZE_EXCEPTION_MISSING", FILES.curriculumFreeze, "31B");
  if (/com\.android\.billingclient:billing/.test(s.src.appGradle)) fail("BILLING_ENABLED", FILES.appGradle, "no billing");
  return failures;
}

export async function validateFullApkPackaging(s) {
  const { failures, fail } = collector();
  // Static packaging check: every manifest file exists under android assets
  const re = /file:\s*"([^"]+)"/g;
  let m;
  let missing = 0;
  const checked = new Set();
  while ((m = re.exec(s.src.manifest))) {
    const rel = m[1];
    if (checked.has(rel)) continue;
    checked.add(rel);
    const androidPath = path.join(root, "android/app/src/main/assets", rel);
    if (!fs.existsSync(androidPath)) {
      missing += 1;
      if (missing <= 8) fail("APK_ASSET_MISSING", rel, "not in android/app/src/main/assets");
    }
  }
  if (missing > 8) fail("APK_ASSET_MISSING", FILES.manifest, `${missing} missing total`);
  if (checked.size < 600) fail("APK_PACKAGING_INCOMPLETE", FILES.manifest, `only ${checked.size} files listed`);
  return failures;
}

export const VALIDATORS = {
  "full-fixed-speech": validateFullFixedSpeech,
  "audio-quality-v3": validateAudioQualityV3,
  "session-scoped-listeners": validateSessionScopedListeners,
  "promise-terminal-state": validatePromiseTerminalState,
  "conversation-real-input-trace": validateConversationRealInputTrace,
  "full-apk-packaging": validateFullApkPackaging,
  "physical-proof": validatePhysicalProof,
};
