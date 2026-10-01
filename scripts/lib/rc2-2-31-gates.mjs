/**
 * RC2.2.31 — Android audio root-cause + conversation deadlock gates.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const json = (rel) => JSON.parse(read(rel));

export const FILES = {
  mediaPlugin: "android/app/src/main/java/longyu/noba/com/LongyuMediaPlugin.java",
  nativeMedia: "src/lib/platform/nativeMedia.ts",
  canonicalPlayer: "src/lib/audio/canonicalPlayer.ts",
  audioPlayback: "src/lib/audioPlayback.ts",
  audioArbiter: "src/lib/audioArbiter.ts",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  runtime: "src/lib/conversationRuntime.ts",
  nativeSafe: "src/components/native/NativeSafeAction.tsx",
  manifestTypes: "src/lib/audio/audioManifestTypes.ts",
  audioQualityV2: "scripts/validate-audio-quality-v2.mjs",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  bugs: "docs/release/rc2-2-31-android-runtime-bugs.json",
  matrix: "docs/release/rc2-2-31-physical-matrix.json",
  base: "docs/release/rc2-2-31-base.json",
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
      nativeMedia: read(FILES.nativeMedia),
      canonicalPlayer: read(FILES.canonicalPlayer),
      audioPlayback: read(FILES.audioPlayback),
      audioArbiter: read(FILES.audioArbiter),
      conversation: read(FILES.conversation),
      runtime: read(FILES.runtime),
      nativeSafe: read(FILES.nativeSafe),
      manifestTypes: read(FILES.manifestTypes),
      audioQualityV2: read(FILES.audioQualityV2),
      curriculumFreeze: read(FILES.curriculumFreeze),
      appGradle: read(FILES.appGradle),
    },
    bugs: json(FILES.bugs),
    matrix: json(FILES.matrix),
    base: json(FILES.base),
  };
}

export async function validateRequestAwareCancel(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  if (!/cancelCanonicalAudio/.test(java)) fail("STOP_IGNORES_REQUEST_ID", FILES.mediaPlugin, "cancelCanonicalAudio missing");
  // Exact put — comment-only STALE_REQUEST must not satisfy the gate (mutation [5]).
  if (!/result\.put\("reason", "STALE_REQUEST"\)/.test(java)) {
    fail("CANCEL_A_STOPS_B", FILES.mediaPlugin, "stale cancel must return STALE_REQUEST and not stop player");
  }
  if (!/requestId\.equals\(session\.requestId\)/.test(java) && !/!requestId\.equals\(session\.requestId\)/.test(java)) {
    fail("STOP_IGNORES_REQUEST_ID", FILES.mediaPlugin, "cancel must compare requestId to active session");
  }
  // stopCanonicalAudio with requestId must delegate to cancel (not blind stop).
  if (!/stopCanonicalAudio[\s\S]*cancelCanonicalAudio/.test(java)) {
    fail("STOP_IGNORES_REQUEST_ID", FILES.mediaPlugin, "stopCanonicalAudio must route requestId to cancel");
  }
  if (!/stopAllCanonicalAudio/.test(java)) fail("STOP_IGNORES_REQUEST_ID", FILES.mediaPlugin, "stopAllCanonicalAudio missing");
  if (!/cancelCanonicalAudio/.test(s.src.nativeMedia)) fail("STOP_IGNORES_REQUEST_ID", FILES.nativeMedia, "JS bridge cancel");
  if (!/cancelCanonicalAudio/.test(s.src.canonicalPlayer)) fail("OLD_CLEANUP_KILLS_NEW", FILES.canonicalPlayer, "JS cancelCanonicalAudio");
  if (!/cancelCanonicalAudio\(requestId\)/.test(s.src.audioPlayback)) fail("OLD_CLEANUP_KILLS_NEW", FILES.audioPlayback, "cancelOwnSpeech → cancelCanonicalAudio");
  return failures;
}

export async function validateStaleCallbackRejection(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  // RC2.2.31D — MediaItem.mediaId binds to session.requestId (same identity as requestId).
  if (!/setMediaId\(requestId\)/.test(java) && !/setMediaId\(session\.requestId\)/.test(java)) {
    fail("CALLBACK_A_GETS_B", FILES.mediaPlugin, "MediaItem.mediaId = requestId");
  }
  // RC2.2.31B — session-scoped capturedRequestId preferred over getCurrentMediaItem().
  if (!/getCurrentMediaItem\(\)/.test(java) && !/capturedRequestId/.test(java)) {
    fail("CALLBACK_A_GETS_B", FILES.mediaPlugin, "callbacks must use mediaId or session-scoped capture");
  }
  if (!/STALE_MEDIA_CALLBACK_IGNORED|STALE_CALLBACK/.test(java)) fail("CALLBACK_A_GETS_B", FILES.mediaPlugin, "stale callback event");
  if (/startedForCurrent/.test(java)) fail("STARTED_STATE_GLOBAL", FILES.mediaPlugin, "started must live on NativeMediaSession");
  if (!/class NativeMediaSession/.test(java) && !/static final class NativeMediaSession/.test(java)) {
    fail("STARTED_STATE_GLOBAL", FILES.mediaPlugin, "NativeMediaSession required");
  }
  return failures;
}

export async function validateAssetPathPreflight(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  if (!/androidAssetPath/.test(java)) fail("MANIFEST_GUESSED_WEB_PATH", FILES.mediaPlugin, "androidAssetPath");
  if (!/openFd\(/.test(java)) fail("ASSETMANAGER_PREFLIGHT_SKIPPED", FILES.mediaPlugin, "AssetManager.openFd");
  if (!/AUDIO_ASSET_NOT_PACKAGED/.test(java)) fail("MISSING_APK_ASSET_PASS", FILES.mediaPlugin, "missing asset reason");
  // Exact Uri.parse — comment-only asset:/// must not satisfy (mutation [16]).
  if (!/Uri\.parse\("asset:\/\/\/" \+ assetPath\)/.test(java)) {
    fail("MANIFEST_GUESSED_WEB_PATH", FILES.mediaPlugin, "prefer asset:/// URI via Uri.parse");
  }
  if (/Uri\.parse\("file:\/\/\/android_asset\/public\//.test(java)) {
    fail("MANIFEST_GUESSED_WEB_PATH", FILES.mediaPlugin, "must not guess file:///android_asset/public/");
  }
  if (!/androidAssetPath\?/.test(s.src.manifestTypes)) fail("MANIFEST_GUESSED_WEB_PATH", FILES.manifestTypes, "type field");
  if (!/androidAssetPath/.test(s.src.audioPlayback)) fail("MANIFEST_GUESSED_WEB_PATH", FILES.audioPlayback, "pass path to player");
  return failures;
}

export async function validateListenerLifecycle(s) {
  const { failures, fail } = collector();
  const p = s.src.canonicalPlayer;
  // Must enter BINDING before BOUND — mutation [11] marks BOUND immediately.
  if (!/nativeListenerState = "BINDING"/.test(p)) {
    fail("LISTENER_BOUND_BEFORE_BIND", FILES.canonicalPlayer, "must set BINDING while addListener runs");
  }
  if (!/nativeListenerState = "BOUND"/.test(p)) fail("LISTENER_BOUND_BEFORE_BIND", FILES.canonicalPlayer, "BOUND after success");
  if (!/nativeListenerState = "FAILED"/.test(p)) fail("LISTENER_BOUND_BEFORE_BIND", FILES.canonicalPlayer, "FAILED allows retry");
  if (/setTimeout\(\(\) => nativeHandlers\.delete\(requestId\), 15_000\)/.test(p)) {
    fail("HANDLER_TTL_DELETE", FILES.canonicalPlayer, "no arbitrary 15s TTL delete");
  }
  if (!/dropHandler\(requestId\)/.test(p)) fail("HANDLER_TTL_DELETE", FILES.canonicalPlayer, "drop on terminal");
  return failures;
}

export async function validateAudioOwnerSeparation(s) {
  const { failures, fail } = collector();
  if (!/CANONICAL_MEDIA/.test(s.src.audioArbiter)) fail("CANONICAL_CLAIMS_TTS", FILES.audioArbiter, "CANONICAL_MEDIA owner");
  // Mutation [10] forces claimedOwner = "TTS" — require asset engines map to CANONICAL_MEDIA.
  if (!/claimedOwner = engine === "asset" \|\| engine === "native-media" \? "CANONICAL_MEDIA" : "TTS"/.test(s.src.audioPlayback)) {
    fail("CANONICAL_CLAIMS_TTS", FILES.audioPlayback, "asset/native-media must claim CANONICAL_MEDIA");
  }
  if (!/claimAudio\("CANONICAL_MEDIA", \(\) => cancelOwnSpeech\(requestId, token\)\)/.test(s.src.audioPlayback)) {
    fail("CANONICAL_CLAIMS_TTS", FILES.audioPlayback, "claimAudio CANONICAL_MEDIA path");
  }
  return failures;
}

export async function validateConversationSingleSource(s) {
  const { failures, fail } = collector();
  const c = s.src.conversation;
  if (/const \[nodeId, setNodeId\] = useState/.test(c)) fail("V2_DUAL_NODEID", FILES.conversation, "remove parallel nodeId state");
  if (!/const nodeId = runtime\.nodeId/.test(c)) fail("V2_DUAL_NODEID", FILES.conversation, "derive nodeId from runtime");
  // RC2.2.31B — ConversationActionBoundary wraps NativeSafeAction.
  if (!/useNativeSafeAction|useConversationAction/.test(c)) {
    fail("V1_CLICK_ONLY", FILES.conversation, "NativeSafeAction / ConversationActionBoundary required");
  }
  if (!/useNativeSafeAction/.test(s.src.nativeSafe) && !/export function useNativeSafeAction/.test(s.src.nativeSafe)) {
    fail("V1_CLICK_ONLY", FILES.nativeSafe, "hook missing");
  }
  if (/behavior:\s*"smooth"/.test(c)) fail("SMOOTH_SCROLL_FOCUS", FILES.conversation, "no smooth scroll on dialogue swap");
  // goTo must not call play/speak
  const goTo = c.match(/function goTo\([\s\S]*?\n  function advance\(/)?.[0] ?? "";
  if (/playMandarin|requestMandarin|speak\(/.test(goTo)) fail("AUDIO_OWNS_NODE", FILES.conversation, "goTo audio-free");
  return failures;
}

export async function validateAudioQualityV2(s) {
  const { failures, fail } = collector();
  const q = s.src.audioQualityV2;
  // Exact ffmpeg filter + hard thresholds — mutations [1]/[2]/[4] must be killed.
  if (!/"-af", "volumedetect"/.test(q) && !/volumedetect", "-f"/.test(q) && !/\["-af", "volumedetect"\]/.test(q)) {
    // accept either array form used by spawn
    if (!/["']volumedetect["']/.test(q)) fail("RMS_NOT_MEASURED", FILES.audioQualityV2, "ffmpeg volumedetect required");
  }
  if (!/["']volumedetect["']/.test(q)) fail("RMS_NOT_MEASURED", FILES.audioQualityV2, "ffmpeg volumedetect required");
  if (!/silenceRatio >= 0\.8/.test(q)) fail("SILENT_MP3_PASSES", FILES.audioQualityV2, "silenceRatio >= 0.8 hard fail");
  if (!/function durationSuspicious\(/.test(q)) fail("DURATION_11_HANZI_BLIND", FILES.audioQualityV2, "durationSuspicious heuristic");
  if (!/SUSPICIOUS_SPEECH_DURATION/.test(q)) fail("DURATION_11_HANZI_BLIND", FILES.audioQualityV2, "flag implausible duration");
  return failures;
}

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  const guided = s.bugs.bugs.find((b) => b.id === "ANDROID_CANONICAL_AUDIO_SILENT");
  const conv = s.bugs.bugs.find((b) => b.id === "ANDROID_CONVERSATION_CONTINUE_STALL");
  if (!guided || guided.physicalStatus === "NOT_RUN") fail("OWNER_FAIL_STAYS_NOT_RUN", FILES.bugs, "guidedTry physical");
  if (!conv || conv.physicalStatus === "NOT_RUN") fail("OWNER_FAIL_STAYS_NOT_RUN", FILES.bugs, "conversation physical");
  if (s.matrix.checks.guidedTryAudio === "NOT_RUN") fail("OWNER_FAIL_STAYS_NOT_RUN", FILES.matrix, "guidedTryAudio");
  if (s.matrix.checks.conversationContinue === "NOT_RUN") fail("OWNER_FAIL_STAYS_NOT_RUN", FILES.matrix, "conversationContinue");
  if (s.matrix.release.CLOSED_BETA !== "NO_GO") fail("CLOSED_BETA_PREMATURE", FILES.matrix, "NO_GO while P1 open");
  if (!/RC2_2_31_ANDROID_RUNTIME_CLOSURE/.test(s.src.curriculumFreeze) && !/RC2_2_31_/.test(s.src.curriculumFreeze)) {
    fail("FREEZE_EXCEPTION_MISSING", FILES.curriculumFreeze, "RC2.2.31 exception");
  }
  if (/com\.android\.billingclient:billing/.test(s.src.appGradle)) fail("BILLING_ENABLED", FILES.appGradle, "no billing");
  if (s.base.RC2_2_31_BASE_SHA !== "a70bff9d9fd5e762373ae7e55ce35bac15f66e60") {
    fail("BASE_SHA_AMBIGUOUS", FILES.base, "must be #303 tip a70bff9d");
  }
  return failures;
}

export async function validateMediaPositionProof(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  if (!/getCurrentPosition/.test(java)) fail("EXO_PLAY_COUNTS_AUDIBLE", FILES.mediaPlugin, "position proof");
  if (!/positionMs/.test(java)) fail("POSITION_ZERO_PASS", FILES.mediaPlugin, "expose positionMs");
  if (!/CONTENT_TYPE_SPEECH|AUDIO_CONTENT_TYPE_SPEECH/.test(java)) fail("AUDIO_ATTRIBUTES", FILES.mediaPlugin, "speech attributes");
  // RC2.2.31B — short-clip STARTED repair (Guided Try / conversation line 2).
  if (!/armPositionWatchdog|POSITION_PROOF/.test(java)) {
    fail("EXO_PLAY_COUNTS_AUDIBLE", FILES.mediaPlugin, "position watchdog must prove audible start");
  }
  if (!/ENDED_REPAIR/.test(java)) {
    fail("EXO_PLAY_COUNTS_AUDIBLE", FILES.mediaPlugin, "STATE_ENDED without isPlaying must repair STARTED");
  }
  return failures;
}

export const VALIDATORS = {
  "request-aware-cancel": validateRequestAwareCancel,
  "stale-callback-rejection": validateStaleCallbackRejection,
  "asset-path-preflight": validateAssetPathPreflight,
  "listener-lifecycle": validateListenerLifecycle,
  "audio-owner-separation": validateAudioOwnerSeparation,
  "conversation-single-source": validateConversationSingleSource,
  "audio-quality-v2": validateAudioQualityV2,
  "media-position-proof": validateMediaPositionProof,
  "physical-truth": validatePhysicalTruth,
};
