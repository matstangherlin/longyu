/**
 * RC2.2.31C — ANDROID WEBVIEW GESTURE ROOT CAUSE + DIRECT ASSET PLAYER.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import os from "node:os";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";
import { RC2_CANDIDATE_FROZEN_SHA256 } from "./rc2-2-12-gates.mjs";

const ROOT = process.cwd();
export const RC2_2_31C_BASE_SHA = "96d6dc7da40173e72a83a03df2097ae072103a0a";

export const FILES = {
  tts: "src/lib/tts.ts",
  safeSideEffect: "src/lib/safeSideEffect.ts",
  audioPlayback: "src/lib/audioPlayback.ts",
  canonicalPlayer: "src/lib/audio/canonicalPlayer.ts",
  audioArbiter: "src/lib/audioArbiter.ts",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  nativeSafe: "src/components/native/NativeSafeAction.tsx",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  mediaPlugin: "android/app/src/main/java/longyu/noba/com/LongyuMediaPlugin.java",
  nativeMedia: "src/lib/platform/nativeMedia.ts",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  appGradle: "android/app/build.gradle",
  capacitorConfig: "capacitor.config.ts",
  subscription: "src/lib/subscription.ts",
  releaseIdentity: "src/lib/releaseIdentity.ts",
  base: "docs/release/rc2-2-31c-base.json",
  matrix: "docs/release/rc2-2-31c-physical-matrix.json",
  bugs: "docs/release/rc2-2-31c-android-runtime-bugs.json",
  pt: "src/locales/pt-BR.ts",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  return {
    src,
    base: optionalJson(FILES.base),
    matrix: optionalJson(FILES.matrix),
    bugs: optionalJson(FILES.bugs),
    freeze: loadBetaPedagogyFreezeState(),
    rc2CandidateSha256: (await import("node:crypto")).createHash("sha256").update(read("docs/release/rc2-candidate.json")).digest("hex"),
  };
}

function collector() {
  const failures = [];
  return { failures, fail: (code, where, why) => failures.push({ code, where, why }) };
}

export function report(name, failures) {
  if (!failures.length) return `PASS ${name}`;
  return `FAIL ${name}\n${failures.map((f) => `  - ${f.code} @ ${f.where}: ${f.why}`).join("\n")}`;
}

let importSeq = 0;
async function bundleTts(s) {
  const overrides = new Map([[path.join(ROOT, FILES.tts), s.src.tts]]);
  const result = await build({
    entryPoints: [path.join(ROOT, FILES.tts)],
    bundle: true,
    platform: "browser",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    plugins: [
      {
        name: "rc231c-tts",
        setup(b) {
          b.onResolve({ filter: /^\.\// }, (args) => {
            // Stub all relative deps so we can execute gesture helpers.
            return { path: args.path, namespace: "stub" };
          });
          b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({
            contents: `
              export const hasNativeSpeech = () => true;
              export const nativeSpeakTracked = async () => ({ ok: true });
              export const nativeStopSpeaking = async () => {};
              export const nativeTtsStatus = async () => ({ available: true, status: "ok" });
              export const applyTtsEvent = (p) => p;
              export const beginTtsPlayback = () => ({ phase: "IDLE" });
              export const newTtsRequestId = () => "r1";
              export const setActiveTtsRequest = () => {};
              export const ttsPlaybackConfirmed = () => false;
              export const unlockAudio = () => {};
              export const useStore = { getState: () => ({ accounts: {}, currentAccountId: null, slowAudio: false, ttsRate: 0.85, ttsVolume: 1 }) };
              export const speakableProperNames = () => [];
            `,
            loader: "js",
          }));
          b.onLoad({ filter: /\.ts$/ }, (args) => {
            const text = overrides.get(args.path);
            return text === undefined ? undefined : { contents: text, loader: "ts" };
          });
        },
      },
    ],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc231c-"));
  const file = path.join(dir, `tts-${(importSeq += 1)}.mjs`);
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href + `?t=${Date.now()}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

export async function validateWebviewSpeechSynthesisAbsence(s) {
  const { failures, fail } = collector();
  const tts = s.src.tts;
  if (!/export function webSpeechSynthesis\(/.test(tts)) {
    fail("WEBVIEW_SPEECH_SYNTHESIS_UNDEFINED", FILES.tts, "webSpeechSynthesis helper missing");
  }
  if (!/não SUBSTITUIR ESTA GUARDA POR isTTSAvailable/.test(tts) && !/NAO SUBSTITUIR ESTA GUARDA POR isTTSAvailable/.test(tts)) {
    fail("WEBVIEW_SPEECH_SYNTHESIS_UNDEFINED", FILES.tts, "must document not to use isTTSAvailable for Web Speech");
  }
  // resumeSpeechSynthesis must not gate on isTTSAvailable() then deref speechSynthesis.
  const resume = tts.match(/function resumeSpeechSynthesis\(\): void \{[\s\S]*?\n\}/)?.[0] ?? "";
  if (/if\s*\(\s*!?\s*isTTSAvailable\s*\(/.test(resume)) {
    fail("WEBVIEW_SPEECH_SYNTHESIS_UNDEFINED", FILES.tts, "resumeSpeechSynthesis must not use isTTSAvailable");
  }
  if (!/webSpeechSynthesis\(\)/.test(resume)) {
    fail("WEBVIEW_SPEECH_SYNTHESIS_UNDEFINED", FILES.tts, "resume must use webSpeechSynthesis()");
  }
  if (/const synth =\s*window\.speechSynthesis/.test(resume)) {
    fail("WEBVIEW_SPEECH_SYNTHESIS_UNDEFINED", FILES.tts, "resume must not raw-deref window.speechSynthesis");
  }
  try {
    const mod = await bundleTts(s);
    // Simulate Android: native TTS present, Web Speech absent.
    globalThis.window = { speechSynthesis: undefined };
    if (typeof mod.noteUserGesture !== "function") {
      fail("GESTURE_THROWS", FILES.tts, "noteUserGesture export missing");
    } else {
      mod.noteUserGesture();
    }
  } catch (err) {
    fail("GESTURE_THROWS", FILES.tts, err instanceof Error ? err.message : String(err));
  } finally {
    delete globalThis.window;
  }
  return failures;
}

export async function validateGestureNoThrow(s) {
  const { failures, fail } = collector();
  const note = s.src.tts.match(/export function noteUserGesture\(\)[\s\S]*?\n\}/)?.[0] ?? "";
  if (!/try\s*\{[\s\S]*resumeSpeechSynthesis/.test(note)) {
    fail("GESTURE_THROWS", FILES.tts, "noteUserGesture must try/catch resume");
  }
  if (!/try\s*\{[\s\S]*unlockAudio/.test(note)) {
    fail("GESTURE_THROWS", FILES.tts, "noteUserGesture must try/catch unlockAudio");
  }
  if (!/safeSideEffect/.test(s.src.safeSideEffect)) fail("GESTURE_THROWS", FILES.safeSideEffect, "safeSideEffect helper");
  return failures;
}

export async function validateGestureNotInNavigationCriticalPath(s) {
  const { failures, fail } = collector();
  const c = s.src.conversation;
  const advance = c.match(/function advance\(\)[\s\S]*?\n  const continueObservers/)?.[0] ?? "";
  const advDialogue = c.match(/function advanceDialogue\(\)[\s\S]*?\n  const v1Observers/)?.[0] ?? "";
  if (/noteUserGesture\(/.test(advance)) {
    fail("GESTURE_IN_NAV_CRITICAL_PATH", FILES.conversation, "advance must not call noteUserGesture");
  }
  if (/noteUserGesture\(/.test(advDialogue)) {
    fail("GESTURE_IN_NAV_CRITICAL_PATH", FILES.conversation, "advanceDialogue must not call noteUserGesture");
  }
  // goTo / reducer before optional traces
  if (!/goTo\(node\.nextNodeId/.test(advance)) {
    fail("STATE_AFTER_AUDIO", FILES.conversation, "advance must call goTo for next node");
  }
  return failures;
}

export async function validateCanonicalRequestAlwaysReachesPlayer(s) {
  const { failures, fail } = collector();
  const p = s.src.audioPlayback;
  if (!/try\s*\{[\s\S]*noteUserGesture\(\);[\s\S]*\}\s*catch/.test(p)) {
    fail("AUDIO_ABORTS_BEFORE_PLAYER", FILES.audioPlayback, "gesture unlock must be try/catch before claim/play");
  }
  if (!/claimAudio\("CANONICAL_MEDIA"/.test(p) || !/playCanonicalAudio/.test(p)) {
    fail("AUDIO_ABORTS_BEFORE_PLAYER", FILES.audioPlayback, "must still claim + playCanonicalAudio");
  }
  return failures;
}

export async function validateDirectAssetPlayer(s) {
  const { failures, fail } = collector();
  const java = s.src.mediaPlugin;
  if (!/playDirectAsset\(/.test(java) || !/BACKEND_DIRECT/.test(java)) {
    fail("DIRECT_ASSET_FALLBACK_ABSENT", FILES.mediaPlugin, "Direct MediaPlayer backend missing");
  }
  if (!/MediaPlayer/.test(java) || !/openFd/.test(java)) {
    fail("DIRECT_ASSET_FALLBACK_ABSENT", FILES.mediaPlugin, "AssetFileDescriptor + MediaPlayer required");
  }
  if (!/MIN_PLAYBACK_PROOF_MS/.test(java)) {
    fail("NO_FALSE_START", FILES.mediaPlugin, "MIN_PLAYBACK_PROOF_MS required");
  }
  if (!/MEDIA_VOLUME_ZERO/.test(java)) {
    fail("MEDIA_VOLUME_AS_VOICE_INSTALL", FILES.mediaPlugin, "MEDIA_VOLUME_ZERO must be reported");
  }
  return failures;
}

export async function validateNoFalseStart(s) {
  const { failures, fail } = collector();
  const js = s.src.canonicalPlayer;
  if (/sawReady/.test(js) && /ENDED_AFTER_READY/.test(js)) {
    fail("READY_COUNTS_AS_HEARD", FILES.canonicalPlayer, "must not launder READY→ENDED as started");
  }
  if (!/outcome\.reason = "PLAYBACK_NOT_CONFIRMED"/.test(js)) {
    fail("READY_COUNTS_AS_HEARD", FILES.canonicalPlayer, "ENDED without STARTED → PLAYBACK_NOT_CONFIRMED");
  }
  if (/outcome\.started = true;[\s\S]{0,80}READY laundry|ENDED_AFTER_READY/.test(js)) {
    fail("READY_COUNTS_AS_HEARD", FILES.canonicalPlayer, "must not launder READY/ENDED as started");
  }
  if (/preparedAt > 0 \|\| safePosition\(\) > 0/.test(s.src.mediaPlugin)) {
    fail("NO_FALSE_START", FILES.mediaPlugin, "preparedAt alone must not prove audible start");
  }
  return failures;
}

export async function validateGuidedTryRealAudio(s) {
  const { failures, fail } = collector();
  const g = s.src.guidedTry;
  // Asset failure must not always open TTS settings.
  if (/usesNativeVoice\(\)\s*\?\s*\([\s\S]*guided-audio-settings/.test(g) || /guided-audio-settings/.test(g)) {
    fail("ASSET_FAILURE_SHOWS_VOICE_INSTALL", FILES.guidedTry, "remove generic Configurar voz on asset failure");
  }
  if (!/Não foi possível reproduzir o áudio/.test(s.src.pt)) {
    fail("ASSET_FAILURE_SHOWS_VOICE_INSTALL", FILES.pt, "asset-first failure copy");
  }
  if (!/GUIDED_TRY_NIHAO_AUDIO_ID/.test(g)) fail("GUIDED_TRY_REAL_AUDIO", FILES.guidedTry, "nihao audioId");
  return failures;
}

export async function validateConversationChaos(s) {
  const { failures, fail } = collector();
  if (!/safeSideEffect\(\s*["']conversation_trace["']/.test(s.src.conversation)) {
    fail("TRACE_BLOCKS_CONVERSATION", FILES.conversation, "traces must use safeSideEffect");
  }
  if (!/gestureSeq/.test(s.src.nativeSafe) || !/gestureId/.test(s.src.nativeSafe)) {
    fail("ACTIONKEY_STICKINESS", FILES.nativeSafe, "dedupe must be gesture-id based");
  }
  return failures;
}

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  if (!s.base || s.base.RC2_2_31C_BASE_SHA !== RC2_2_31C_BASE_SHA) {
    fail("BASE_SHA_AMBIGUOUS", FILES.base, RC2_2_31C_BASE_SHA);
  }
  if (!s.matrix?.priorPhysical?.pr305_pre_1713d851) {
    fail("PHYSICAL_FAIL_OVERWRITTEN", FILES.matrix, "must keep prior #305 FAIL record");
  }
  if (s.matrix?.priorPhysical?.pr305_pre_1713d851?.guidedTryAudio !== "FAIL") {
    fail("PHYSICAL_FAIL_OVERWRITTEN", FILES.matrix, "prior Guided Try FAIL must remain");
  }
  if (s.matrix?.checks?.guidedTryAudio === "PASS" && s.matrix?.release?.OWNER_ACCEPTED !== 1) {
    fail("PHYSICAL_FAIL_OVERWRITTEN", FILES.matrix, "current HEAD PASS without owner acceptance");
  }
  if (s.matrix?.release?.CLOSED_BETA === "GO") fail("CLOSED_BETA_PREMATURE", FILES.matrix, "NO-GO until owner APK");
  if (!/RC2_2_31C_ANDROID_WEBVIEW/.test(s.src.curriculumFreeze)) {
    fail("FREEZE_EXCEPTION_MISSING", FILES.curriculumFreeze, "RC2.2.31C exception");
  }
  if (/com\.android\.billingclient:billing/.test(s.src.appGradle)) fail("BILLING_ENABLED", FILES.appGradle, "no billing");
  if (s.rc2CandidateSha256 !== RC2_CANDIDATE_FROZEN_SHA256) fail("TOUCHED_273", "rc2-candidate.json", "frozen");
  return failures;
}

export const VALIDATORS = {
  "webview-speechSynthesis-absence": validateWebviewSpeechSynthesisAbsence,
  "gesture-no-throw": validateGestureNoThrow,
  "gesture-not-in-navigation-critical-path": validateGestureNotInNavigationCriticalPath,
  "canonical-request-always-reaches-player": validateCanonicalRequestAlwaysReachesPlayer,
  "direct-asset-player": validateDirectAssetPlayer,
  "no-false-start": validateNoFalseStart,
  "guided-try-real-audio": validateGuidedTryRealAudio,
  "conversation-chaos": validateConversationChaos,
  "physical-truth": validatePhysicalTruth,
};
