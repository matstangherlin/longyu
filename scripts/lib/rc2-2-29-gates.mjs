/**
 * RC2.2.29 — LAUNCH CONVERGENCE / FULL AUDIO / OWNER REQUEST CLOSURE.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";
import { stripComments } from "./rc2-2-8-gates.mjs";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";

const ROOT = process.cwd();
export const RC2_2_29_BASE_SHA = "6c7d54e8e6d186a6c4497ce73f4d2a56df20abcf";

export const FILES = {
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  runtime: "src/lib/conversationRuntime.ts",
  playback: "src/lib/audioPlayback.ts",
  canonical: "src/lib/audio/canonicalPlayer.ts",
  nativeMedia: "src/lib/platform/nativeMedia.ts",
  manifest: "src/data/audioManifest.generated.ts",
  policy: "src/lib/audio/audioEnginePolicy.ts",
  gate: "src/lib/audio/audioGate.ts",
  guidance: "src/lib/guidanceOrchestrator.ts",
  dados: "src/features/dados/DadosLocaisPage.tsx",
  localesPt: "src/locales/pt-BR.ts",
  player: "src/features/lesson/LessonPlayer.tsx",
  completion: "src/lib/completionSequence.ts",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  appGradle: "android/app/build.gradle",
  e2e: "e2e/rc2-2-28-deterministic-audio.spec.ts",
  owner: "docs/release/rc2-2-29-owner-request-closure.json",
  classification: "docs/reports/rc2-2-29-audio-classification.json",
  pack: "docs/reports/rc2-2-29-audio-pack.json",
  corpus29: "docs/reports/rc2-2-29-audio-corpus.json",
  base: "docs/release/rc2-2-29-base.json",
  matrix: "docs/release/rc2-2-29-physical-matrix.json",
  guideVoice: "scripts/validate-guide-text-voice.mjs",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);

export async function loadState() {
  const src = Object.fromEntries(Object.entries(FILES).map(([key, rel]) => [key, exists(rel) ? read(rel) : ""]));
  return {
    src,
    owner: optionalJson(FILES.owner),
    classification: optionalJson(FILES.classification),
    pack: optionalJson(FILES.pack),
    corpus29: optionalJson(FILES.corpus29),
    base: optionalJson(FILES.base),
    matrix: optionalJson(FILES.matrix),
    freeze: loadBetaPedagogyFreezeState(),
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
async function bundle(entryKey, s) {
  const overrides = new Map(Object.entries(FILES).map(([key, rel]) => [path.join(ROOT, rel), s.src[key]]));
  const result = await build({
    entryPoints: [path.join(ROOT, FILES[entryKey])],
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
    logLevel: "silent",
    define: { "import.meta.env": '{"DEV":true}' },
    plugins: [{
      name: "rc2-2-29",
      setup(b) {
        b.onLoad({ filter: /\.(ts|tsx)$/ }, (args) => {
          const text = overrides.get(args.path);
          return text === undefined ? undefined : { contents: text, loader: args.path.endsWith(".tsx") ? "tsx" : "ts" };
        });
      },
    }],
  });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc2229-"));
  const file = path.join(dir, `b-${(importSeq += 1)}.mjs`);
  fs.writeFileSync(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function guarded(fail, where, fn) {
  try { await fn(); } catch (err) { fail("GATE_EXEC_ERROR", where, err instanceof Error ? err.message : String(err)); }
}

export async function validateCiGreen(s) {
  const { failures, fail } = collector();
  if (!s.base || s.base.RC2_2_29_BASE_SHA !== RC2_2_29_BASE_SHA) fail("BASE_SHA", FILES.base, RC2_2_29_BASE_SHA);
  if (!/nativeMedia/.test(s.src.canonical) && /@capacitor\/core/.test(s.src.canonical)) {
    fail("PLATFORM_BOUNDARY", FILES.canonical, "Capacitor fora de platform/");
  }
  if (/from "@capacitor\/core"/.test(s.src.canonical) || /registerPlugin/.test(s.src.canonical)) {
    fail("PLATFORM_BOUNDARY", FILES.canonical, "canonicalPlayer deve ser platform-agnostic");
  }
  if (!/registerPlugin/.test(s.src.nativeMedia)) fail("NATIVE_MEDIA_MISSING", FILES.nativeMedia, "bridge");
  return failures;
}

export async function validateAudioCoverage(s) {
  const { failures, fail } = collector();
  if (!s.classification) fail("CLASSIFICATION_MISSING", FILES.classification, "classify corpus");
  else if ((s.classification.fixedContentMissingAudio ?? 1) !== 0) {
    fail("FIXED_CONTENT_MISSING", FILES.classification, `missing=${s.classification.fixedContentMissingAudio} [4][12]`);
  }
  if (!s.pack?.entries?.length) fail("PACK_EMPTY", FILES.pack, "pack");
  else if (s.pack.entries.length < 600) fail("PACK_TOO_SMALL", FILES.pack, String(s.pack.entries.length));
  if (!s.corpus29 || (s.corpus29.fixedContentMissingAudio ?? 1) !== 0) {
    fail("CORPUS_MISSING_FIXED", FILES.corpus29, "FIXED_CONTENT_MISSING_AUDIO must be 0");
  }
  if (!/audio:guided-try:nihao:v1/.test(s.src.manifest)) fail("GUIDED_CORE", FILES.manifest, "nihao");
  return failures;
}

export async function validateAudioQuality(s) {
  const { failures, fail } = collector();
  if (!s.pack?.entries?.length) fail("PACK_EMPTY", FILES.pack, "pack");
  else {
    for (const e of s.pack.entries.slice(0, 30)) {
      if (!e.checksum) fail("NO_CHECKSUM", e.audioId, "checksum");
      if (!(e.durationMs > 0)) fail("DURATION_ZERO", e.audioId, "duration");
      if ((e.bytes ?? 0) < 200) fail("BYTES_TOO_SMALL", e.audioId, String(e.bytes));
    }
    const suspiciousUnflagged = s.pack.entries.filter((e) => {
      const hanzi = (String(e.textKey).match(/[\u4e00-\u9fff]/g) || []).length || 1;
      const bad = (hanzi === 1 && e.durationMs > 900) || (hanzi >= 12 && e.durationMs < 600);
      return bad && !e.suspiciousDuration;
    });
    if (suspiciousUnflagged.length) fail("SUSPICIOUS_DURATION", suspiciousUnflagged[0].audioId, "unflagged [13]");
    const third = s.pack.entries.find((e) => /^https?:\/\//.test(e.uri) && !/longyu/i.test(e.uri));
    if (third) fail("THIRD_PARTY_AUDIO", third.audioId, third.uri);
  }
  if (!/checksum|FIRST_PARTY_AUDIO/.test(s.src.guideVoice)) fail("VOICE_GATE_STALE", FILES.guideVoice, "guide-text-voice must allow Longyu manifest");
  return failures;
}

export async function validateTtsFallbackOnly(s) {
  const { failures, fail } = collector();
  if (!/FIXED_CONTENT/.test(s.src.policy)) fail("POLICY", FILES.policy, "FIXED_CONTENT");
  if (!/setTtsForcedUnavailableForTests/.test(s.src.playback)) fail("TTS_INDEPENDENCE", FILES.playback, "hook [5][6]");
  if (!/GUIDED_TRY_NIHAO_AUDIO_ID/.test(s.src.guidedTry)) fail("GUIDED_TRY_TTS", FILES.guidedTry, "audioId [5]");
  return failures;
}

export async function validateConversationZeroStall(s) {
  const { failures, fail } = collector();
  if (!/tryAcquireTransitionLock/.test(s.src.conversation)) fail("NO_TRANSITION_LOCK", FILES.conversation, "lock [10]");
  if (!/TRANSITION_LOCK_MS/.test(s.src.runtime)) fail("LOCK_MISSING", FILES.runtime, "TRANSITION_LOCK_MS");
  if (!/forceReleaseTransitionLock/.test(s.src.runtime) || !/forceReleaseTransitionLock/.test(s.src.conversation)) {
    fail("LOCK_DOM_RELEASE_MISSING", FILES.runtime, "release on DOM_NEXT_VISIBLE");
  }
  // APK pointer→audio contract traces
  for (const ev of [
    "conversation_pointer_down",
    "conversation_click",
    "conversation_handler_enter",
    "conversation_lock_acquired",
    "conversation_lock_rejected",
    "conversation_target",
    "conversation_state_commit",
    "conversation_dom_visible",
    "conversation_audio_request",
  ]) {
    if (!s.src.conversation.includes(ev) && !read("src/lib/conversationTransition.ts").includes(ev)) {
      fail("TRACE_MISSING", "conversationTransition", ev);
    }
  }
  if (!/conversation_pointer_down/.test(s.src.conversation) || !/onPointerDown/.test(s.src.conversation)) {
    fail("POINTER_CONTRACT", FILES.conversation, "pointerdown on Continuar [OR58]");
  }
  if (!/reuseTransitionId/.test(s.src.conversation)) {
    fail("FAILSAFE_SAME_TRANSITION", FILES.conversation, "failsafe reuses transitionId");
  }
  if (!/touch-manipulation|touch-action/.test(s.src.conversation) && !/touch-manipulation/.test(read("src/components/ui/primitives.tsx"))) {
    fail("BUTTON_TOUCH", FILES.conversation, "touch-action manipulation");
  }
  await guarded(fail, FILES.runtime, async () => {
    const m = await bundle("runtime", s);
    const ten = m.runQaConversationTenNodes(true);
    if (ten.nodeIds.length !== 10) fail("TEN_NODES", FILES.runtime, "10/10 silent");
    if (typeof m.runQaConversationNodes === "function") {
      const twenty = m.runQaConversationNodes(20, true);
      if (twenty.nodeIds.length !== 20) fail("TWENTY_NODES", FILES.runtime, "20/20");
    }
    // duplicate tap ignored
    let lock = m.createTransitionLock();
    const a = m.tryAcquireTransitionLock(lock, "t-1", 1000);
    const b = m.tryAcquireTransitionLock(a.lock, "t-2", 1000 + 10);
    if (b.ok) fail("DUPLICATE_TAP_ADVANCES", FILES.runtime, "second tap must be ignored [10]");
    // force release must unlock immediately so next legitimate tap works
    if (typeof m.forceReleaseTransitionLock === "function") {
      const released = m.forceReleaseTransitionLock(a.lock);
      if (released.locked) fail("LOCK_FORCE_RELEASE", FILES.runtime, "forceRelease must clear lock");
    }
    let state = m.createConversationRuntimeState({ sceneId: "s", entryNodeId: "n1" });
    state = m.conversationReducer(state, { type: "CONTINUE", targetNodeId: "n2", transitionId: "t-2" });
    if (state.nodeId !== "n2") fail("CONTINUE_NO_COMMIT", FILES.runtime, "CONTINUE must commit [9]");
  });
  const goTo = s.src.conversation.match(/function goTo\([\s\S]*?\n  function advance\(/)?.[0]
    ?? s.src.conversation.match(/function goTo\([\s\S]*?\n  failsafeRetryRef/)?.[0]
    ?? "";
  if (/playMandarin|requestMandarin/.test(goTo)) fail("AUDIO_BLOCKS_TRANSITION", FILES.conversation, "audio in goTo [8]");
  // P1 must not be marked DONE without APK proof
  const or34 = s.owner?.items?.find((i) => i.id === "OR34");
  if (or34 && (or34.ownerAccepted || or34.apkState === "APK_PASS") && or34.apkState !== "APK_PASS" && or34.apkState !== "OWNER_ACCEPTED") {
    fail("CONVERSATION_P1_FAKE_DONE", FILES.owner, "OR34 DONE without APK");
  }
  if (or34 && or34.codeState === "OWNER_ACCEPTED") fail("CONVERSATION_P1_FAKE_DONE", FILES.owner, "OR34 CODE≠OWNER");
  return failures;
}

export async function validateOwnerRequestRegister(s) {
  const { failures, fail } = collector();
  if (!s.owner?.items?.length) fail("OWNER_REGISTER_MISSING", FILES.owner, "register");
  else {
    if (s.owner.items.length < 60) fail("OWNER_REGISTER_INCOMPLETE", FILES.owner, `need OR01–OR60 got ${s.owner.items.length}`);
    for (const id of ["OR01", "OR34", "OR43", "OR44", "OR45", "OR46", "OR50", "OR58", "OR60"]) {
      if (!s.owner.items.some((i) => i.id === id)) fail("OWNER_ITEM_MISSING", FILES.owner, id);
    }
    // Critical items must not close as CODE_READY pretending DONE
    for (const id of ["OR34", "OR29", "OR30", "OR58", "OR60"]) {
      const item = s.owner.items.find((i) => i.id === id);
      if (item && (item.ownerAccepted || item.codeState === "OWNER_ACCEPTED") && item.apkState !== "APK_PASS" && item.apkState !== "OWNER_ACCEPTED") {
        fail("CRITICAL_OR_CODE_READY_DONE", FILES.owner, `${id} closed without APK/OWNER`);
      }
    }
    const bad = s.owner.items.find((i) => i.codeState === "OWNER_ACCEPTED" || (i.ownerAccepted && !i.ownerSaw));
    if (bad) fail("OWNER_REJECTED_MARKED_DONE", FILES.owner, bad.id);
  }
  return failures;
}

export async function validateNoDebugUi(s) {
  const { failures, fail } = collector();
  if (/TTS:\s*NATIVE/.test(s.src.guidedTry)) fail("DEBUG_TTS_TEXT", FILES.guidedTry, "TTS NATIVE in Guided Try [1]");
  if (/Copiar diagnóstico/.test(s.src.guidedTry)) fail("DEBUG_COPY_DIAG", FILES.guidedTry, "[2]");
  if (/data-tts-request-id|ttsPlayback\.requestId/.test(s.src.guidedTry)) fail("DEBUG_REQUEST_ID", FILES.guidedTry, "[3]");
  if (/guided-tts-qa/.test(s.src.guidedTry)) fail("DEBUG_TTS_TEXT", FILES.guidedTry, "qa panel");
  return failures;
}

export async function validateGuidedParity(s) {
  const { failures, fail } = collector();
  if (!/GUIDED_CLASS|guidedShell|data-guided/.test(s.src.player) && !/guidedShell/.test(s.src.player)) {
    // LessonPlayer must still have guided shell path
    if (!/guidedShell/.test(s.src.player)) fail("GUIDED_SHELL_MISSING", FILES.player, "134 guided [16][17]");
  }
  if (!/guidedShell/.test(s.src.player)) fail("GUIDED_SHELL_MISSING", FILES.player, "guided shell");
  return failures;
}

export async function validateNoLocalProfiles(s) {
  const { failures, fail } = collector();
  if (/Remove progresso, perfis/.test(s.src.dados) || /progresso, perfis e preferências/i.test(s.src.dados)) {
    fail("LOCAL_PROFILE_COPY", FILES.dados, "perfis in learner copy [29]");
  }
  if (/Progresso, perfis e preferências/.test(s.src.localesPt)) fail("LOCAL_PROFILE_COPY", FILES.localesPt, "pt-BR");
  return failures;
}

export async function validateGuidanceDelivery(s) {
  const { failures, fail } = collector();
  if (!/tone_trace_first_use_v1/.test(s.src.guidance)) fail("TONE_TRACE_GUIDANCE", FILES.guidance, "[22]");
  if (!/tone_confusion_2_3_v1/.test(s.src.guidance)) fail("TONE_CONFUSION_GUIDANCE", FILES.guidance, "AF");
  if (!/profile_entry_v1/.test(s.src.guidance)) fail("PROFILE_COACHMARK", FILES.guidance, "OR46");
  if (!/isAutoSeeded/.test(s.src.guidance)) fail("AUTO_SEED", FILES.guidance, "must not mark seen on unlock alone");
  if (!/GUIDANCE_SESSION_BUDGET\s*=\s*1/.test(s.src.guidance)) fail("POPUP_SPAM", FILES.guidance, "budget [21]");
  if (!/GUIDANCE_FIRST_SESSION_BUDGET\s*=\s*2/.test(s.src.guidance)) fail("POPUP_SPAM", FILES.guidance, "onboarding budget");
  if (!/Acompanhe o caminho do tom/.test(s.src.localesPt)) {
    fail("TONE_TRACE_COPY", FILES.localesPt, "Tone Trace first-use copy");
  }
  return failures;
}

export async function validateCompletionSequence(s) {
  const { failures, fail } = collector();
  if (!/computeCompletionDeltas/.test(s.src.player)) fail("UNIT_CELEBRATION", FILES.player, "[32]");
  if (!/completionKind:\s*deltas\.completionKind/.test(s.src.player)) fail("PHASE_CELEBRATION", FILES.player, "[33]");
  if (!/unlockLabel:\s*deltas\.unlockLabel/.test(s.src.player)) fail("FEATURE_UNLOCK", FILES.player, "[34]");
  if (!/claimCompletionShow|completionKey/.test(s.src.completion)) fail("REWARD_DUPLICATE", FILES.completion, "[35]");
  if (!/soundEffects|hapticsEnabled/.test(s.src.completion)) fail("FEEDBACK_PREFS", FILES.completion, "[36][37]");
  if (!/reducedMotion/.test(s.src.completion)) fail("REDUCED_MOTION", FILES.completion, "[38]");
  return failures;
}

export async function validatePhysicalTruth(s) {
  const { failures, fail } = collector();
  if (!s.matrix) fail("MATRIX_MISSING", FILES.matrix, "matrix");
  else {
    const ids = new Set((s.matrix.requiredChecks ?? []).map((c) => c.id));
    for (const need of [
      "conversationPointerDown",
      "conversationClick",
      "conversation20Transitions",
      "noDebugLearnerUi",
      "logoutUnder5Seconds",
      "noScroll390",
      "signupCleanInstall",
      "selfCompareOwnerHear",
      "completionAnimation",
    ]) {
      if (!ids.has(need)) fail("MATRIX_INCOMPLETE", FILES.matrix, need);
    }
    for (const check of s.matrix.requiredChecks ?? []) {
      if (check.result === "PASS" && check.evidence !== "PHYSICAL") fail("FAKE_PHYSICAL_PASS", check.id, "auto PASS");
    }
  }
  if (s.freeze?.fingerprint && s.freeze.fingerprint !== "c48b008c9c1e") fail("FINGERPRINT", FILES.curriculumFreeze, "[44]");
  if (!/RC2_2_29_/.test(s.src.curriculumFreeze)) fail("FREEZE_EXCEPTION", FILES.curriculumFreeze, "exception");
  if (/billingclient|BillingClient/i.test(s.src.appGradle)) fail("BILLING_ENABLED", FILES.appGradle, "[46]");
  return failures;
}

export const VALIDATORS = {
  "ci-green": validateCiGreen,
  "audio-coverage": validateAudioCoverage,
  "audio-quality": validateAudioQuality,
  "tts-fallback-only": validateTtsFallbackOnly,
  "conversation-zero-stall": validateConversationZeroStall,
  "owner-request-register": validateOwnerRequestRegister,
  "no-debug-ui": validateNoDebugUi,
  "guided-parity": validateGuidedParity,
  "no-local-profiles": validateNoLocalProfiles,
  "guidance-delivery": validateGuidanceDelivery,
  "completion-sequence": validateCompletionSequence,
  "physical-truth": validatePhysicalTruth,
};
