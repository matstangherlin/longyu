/**
 * RC2.2.30 — CLOSED BETA ENTRY / REAL LEARNER VALIDATION / RC HARDENING.
 * Prove APK+Play+human — do not rebuild RC2.2.29 architectures.
 */
import fs from "node:fs";
import path from "node:path";
import { loadBetaPedagogyFreezeState } from "./beta-pedagogy-freeze-state.mjs";

const ROOT = process.cwd();
export const RC2_2_30_BASE_SHA = "017834c6915874150ddaec2921007c6e536ffcdb";

export const FILES = {
  base: "docs/release/rc2-2-30-base.json",
  manifest: "docs/release/rc2-2-30-manifest.json",
  bugs: "docs/release/rc2-2-30-closed-beta-bugs.json",
  matrix: "docs/release/rc2-2-30-physical-matrix.json",
  owner: "docs/release/rc2-2-30-owner-request-closure.json",
  play: "docs/release/rc2-2-30-play-internal.json",
  nn1: "docs/release/rc2-2-30-update-n-n1.json",
  learning: "docs/reports/rc2-2-30-human-learning-validation.md",
  firstSession: "docs/reports/rc2-2-30-first-session-observation.md",
  stability: "docs/reports/rc2-2-30-stability.md",
  burndown: "docs/reports/rc2-2-30-beta-burndown.md",
  report: "docs/reports/rc2-2-30-closed-beta-entry.md",
  curriculumFreeze: "src/lib/curriculumFreeze.ts",
  appGradle: "android/app/build.gradle",
  conversation: "src/features/lesson/ConversationSceneStep.tsx",
  guidedTry: "src/features/landing/GuidedTryPage.tsx",
  owner29: "docs/release/rc2-2-29-owner-request-closure.json",
};

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const optionalJson = (rel) => (exists(rel) ? JSON.parse(read(rel)) : null);

export async function loadState() {
  const src = Object.fromEntries(
    Object.entries(FILES)
      .filter(([, rel]) => rel.endsWith(".ts") || rel.endsWith(".tsx") || rel.endsWith(".gradle") || rel.endsWith(".md"))
      .map(([key, rel]) => [key, exists(rel) ? read(rel) : ""])
  );
  return {
    src,
    base: optionalJson(FILES.base),
    manifest: optionalJson(FILES.manifest),
    bugs: optionalJson(FILES.bugs),
    matrix: optionalJson(FILES.matrix),
    owner: optionalJson(FILES.owner),
    play: optionalJson(FILES.play),
    nn1: optionalJson(FILES.nn1),
    owner29: optionalJson(FILES.owner29),
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

const STATUS = ["PREPARING", "READY_FOR_INTERNAL", "INTERNAL_PASS", "READY_FOR_CLOSED", "CLOSED_ACTIVE", "BLOCKED"];

export async function validateReleaseTruth(s) {
  const { failures, fail } = collector();
  if (!s.base || s.base.RC2_2_30_BASE_SHA !== RC2_2_30_BASE_SHA) fail("BASE_SHA", FILES.base, RC2_2_30_BASE_SHA);
  if (!s.manifest || s.manifest.RC2_2_30_BASE_SHA !== RC2_2_30_BASE_SHA) fail("MANIFEST_SHA", FILES.manifest, RC2_2_30_BASE_SHA);
  if (s.base?.closedBetaEntry === true && (s.base?.status !== "CLOSED_ACTIVE")) {
    fail("CLOSED_BETA_PREMATURE", FILES.base, "closedBetaEntry true only in CLOSED_ACTIVE");
  }
  if (!STATUS.includes(s.base?.status)) fail("STATUS_INVALID", FILES.base, String(s.base?.status));
  if (s.base?.status === "CLOSED_ACTIVE" && s.manifest?.closedBetaEntry !== true) {
    fail("CLOSED_ACTIVE_WITHOUT_FLAG", FILES.manifest, "CLOSED_ACTIVE requires closedBetaEntry");
  }
  // release P1 open ⇒ cannot be READY_FOR_CLOSED / CLOSED_ACTIVE
  const p1 = s.bugs?.open?.P1?.length ?? 99;
  if (p1 > 0 && ["READY_FOR_CLOSED", "CLOSED_ACTIVE"].includes(s.base?.status)) {
    fail("P1_OPEN_ALLOWS_CLOSED", FILES.base, `release P1=${p1}`);
  }
  if ((s.bugs?.open?.P0 ?? 1) > 0 && ["READY_FOR_INTERNAL", "INTERNAL_PASS", "READY_FOR_CLOSED", "CLOSED_ACTIVE"].includes(s.base?.status)) {
    fail("P0_OPEN_ALLOWS_BETA", FILES.bugs, "P0 must be 0");
  }
  if (!/RC2_2_30_/.test(s.src.curriculumFreeze)) fail("FREEZE_EXCEPTION", FILES.curriculumFreeze, "exception");
  if (s.freeze?.fingerprint && s.freeze.fingerprint !== "cc66373bb602") fail("FINGERPRINT", FILES.curriculumFreeze, "[25]");
  if (/billingclient|BillingClient/i.test(s.src.appGradle)) fail("BILLING_ENABLED", FILES.appGradle, "[27]");
  if (!/applicationId\s+"longyu\.noba\.com"/.test(s.src.appGradle) && !/namespace\s+"longyu\.noba\.com"/.test(s.src.appGradle)) {
    // package must remain longyu.noba.com
    if (!/longyu\.noba\.com/.test(s.src.appGradle)) fail("PACKAGE_CHANGED", FILES.appGradle, "[26]");
  }
  return failures;
}

export async function validatePhysicalProof(s) {
  const { failures, fail } = collector();
  if (!s.matrix?.requiredChecks?.length) fail("MATRIX_MISSING", FILES.matrix, "matrix");
  else {
    for (const need of [
      "conversation20Transitions",
      "guidedTry10ColdStarts",
      "signupCleanInstall",
      "otpRecovery",
      "selfCompareOwnerHear",
      "noDebugLearnerUi",
      "conversationContinueClickTruth",
    ]) {
      if (!s.matrix.requiredChecks.some((c) => c.id === need)) fail("MATRIX_INCOMPLETE", FILES.matrix, need);
    }
    for (const check of s.matrix.requiredChecks) {
      if (check.result === "PASS" && check.evidence !== "PHYSICAL") {
        fail("CODE_READY_AUTO_APK", check.id, "CODE/Web cannot become Physical PASS [1][2]");
      }
      if (check.result === "APK_PASS" && check.evidence !== "PHYSICAL") {
        fail("FAKE_PHYSICAL_PASS", check.id, "auto APK_PASS");
      }
    }
    // Conversation 19/20 must not be accepted as pass
    const conv = s.matrix.requiredChecks.find((c) => c.id === "conversation20Transitions");
    if (conv && typeof conv.score === "number" && conv.score < 20 && conv.result === "PASS") {
      fail("CONVERSATION_19_OF_20", conv.id, "19/20 not enough [3]");
    }
    const gt = s.matrix.requiredChecks.find((c) => c.id === "guidedTry10ColdStarts");
    if (gt && typeof gt.score === "number" && gt.score < 10 && gt.result === "PASS") {
      fail("GUIDED_TRY_9_OF_10", gt.id, "9/10 not enough [4]");
    }
  }
  if ((s.matrix?.releaseP1Open?.length ?? 0) === 0 && (s.bugs?.open?.P1?.length ?? 0) > 0) {
    fail("P1_REGISTER_DRIFT", FILES.matrix, "matrix cleared P1 while bugs still open");
  }
  return failures;
}

export async function validatePlayInternal(s) {
  const { failures, fail } = collector();
  if (!s.play) fail("PLAY_MISSING", FILES.play, "play-internal");
  else {
    if (s.play.package !== "longyu.noba.com") fail("PACKAGE_CHANGED", FILES.play, s.play.package);
    if (s.play.installFromPlay?.status === "PASS" && /sideload/i.test(String(s.play.installFromPlay.evidence || ""))) {
      fail("SIDELOAD_AS_PLAY", FILES.play, "sideload ≠ Play install [11]");
    }
    if (s.play.installFromPlay?.status === "PASS" && /debug/i.test(String(s.play.installFromPlay.artifact || ""))) {
      fail("DEBUG_AS_INTERNAL", FILES.play, "debug APK ≠ Internal Play [12]");
    }
  }
  if (!s.nn1) fail("NN1_MISSING", FILES.nn1, "update n→n+1");
  else if (s.nn1.status === "PASS") {
    for (const key of ["account", "progress", "xp", "streak", "settings"]) {
      if (s.nn1.preserve?.[key] !== "PASS") fail("NN1_PROGRESS_LOST", FILES.nn1, key);
    }
  }
  return failures;
}

export async function validateConversation(s) {
  const { failures, fail } = collector();
  if (!/conversation_pointer_down/.test(s.src.conversation)) fail("CONV_TRACE", FILES.conversation, "pointer_down");
  if (!/forceReleaseTransitionLock|reuseTransitionId/.test(s.src.conversation)) fail("CONV_FAILSAFE", FILES.conversation, "failsafe");
  if (/playMandarinAudio|requestMandarinSpeech/.test(
    s.src.conversation.match(/function goTo\([\s\S]*?\n  failsafeRetryRef/)?.[0] ?? ""
  )) {
    fail("AUDIO_CONTROLS_STATE", FILES.conversation, "audio must not control goTo [22]");
  }
  return failures;
}

export async function validateGuidedTry(s) {
  const { failures, fail } = collector();
  if (!/GUIDED_TRY_NIHAO_AUDIO_ID/.test(s.src.guidedTry)) fail("GUIDED_CORE_AUDIO", FILES.guidedTry, "canonical asset");
  if (/TTS:\s*NATIVE|Copiar diagnóstico|guided-tts-qa/.test(s.src.guidedTry)) {
    fail("DEBUG_IN_LEARNER", FILES.guidedTry, "debug pollution");
  }
  return failures;
}

export async function validateAuth(s) {
  const { failures, fail } = collector();
  const signup = s.matrix?.requiredChecks?.find((c) => c.id === "signupCleanInstall");
  const otp = s.matrix?.requiredChecks?.find((c) => c.id === "otpRecovery");
  if (signup?.result === "PASS" && signup.evidence !== "PHYSICAL") fail("SIGNUP_FAKE_PASS", FILES.matrix, "[5]");
  if (otp?.result === "PASS" && otp.evidence !== "PHYSICAL") fail("OTP_FAKE_PASS", FILES.matrix, "[6]");
  if (["READY_FOR_CLOSED", "CLOSED_ACTIVE"].includes(s.base?.status)) {
    if (signup?.result === "NOT_RUN") fail("SIGNUP_NOT_RUN", FILES.matrix, "signup required before closed");
    if (otp?.result === "NOT_RUN") fail("OTP_NOT_RUN", FILES.matrix, "otp required before closed");
  }
  return failures;
}

export async function validateSelfCompare(s) {
  const { failures, fail } = collector();
  const sc = s.matrix?.requiredChecks?.find((c) => c.id === "selfCompareOwnerHear");
  if (sc?.result === "PASS" && sc.evidence !== "PHYSICAL") fail("SELF_COMPARE_FAKE", FILES.matrix, "[7]");
  if (sc?.result === "PASS" && sc.ownerHeard !== true) fail("SELF_COMPARE_NO_HEAR", FILES.matrix, "owner must hear recording");
  return failures;
}

export async function validateGuidance(s) {
  const { failures, fail } = collector();
  const tip = s.matrix?.requiredChecks?.find((c) => c.id === "toneGuidanceVisible" || c.id === "profileGuidanceVisible");
  if (tip?.result === "PASS" && tip.evidence !== "PHYSICAL") fail("COACHMARK_FAKE", FILES.matrix, "[10]");
  return failures;
}

export async function validateEnergy(s) {
  const { failures, fail } = collector();
  const z = s.matrix?.requiredChecks?.find((c) => c.id === "zeroChargesUsable");
  if (z?.result === "PASS" && z.evidence !== "PHYSICAL") fail("ZERO_CHARGE_FAKE", FILES.matrix, "[9]");
  if (z?.result === "PASS" && z.freePath === false) fail("ZERO_CHARGE_DEAD_END", FILES.matrix, "no free path");
  return failures;
}

export async function validateNavigation(s) {
  const { failures, fail } = collector();
  const jr = s.matrix?.requiredChecks?.find((c) => c.id === "journeyReturnExact");
  if (jr?.result === "PASS" && jr.evidence !== "PHYSICAL") fail("JOURNEY_RETURN_FAKE", FILES.matrix, "physical only");
  const loc = s.matrix?.requiredChecks?.find((c) => c.id === "noLocalIdentity");
  if (loc?.result === "PASS" && loc.evidence !== "PHYSICAL") fail("LOCAL_ID_FAKE", FILES.matrix, "[8]");
  return failures;
}

export async function validateCompletion(s) {
  const { failures, fail } = collector();
  const or60 = s.owner?.items?.find((i) => i.id === "OR60");
  if (or60?.ownerAccepted && or60.apkState !== "APK_PASS" && or60.apkState !== "OWNER_ACCEPTED") {
    fail("COMPLETION_FAKE_OWNER", FILES.owner, "[18]");
  }
  return failures;
}

export async function validateStability(s) {
  const { failures, fail } = collector();
  if (!exists(FILES.stability)) fail("STABILITY_REPORT", FILES.stability, "missing");
  if (!exists(FILES.burndown)) fail("BURNDOWN", FILES.burndown, "missing");
  return failures;
}

export async function validateHumanLearning(s) {
  const { failures, fail } = collector();
  if (!exists(FILES.learning)) fail("LEARNING_REPORT", FILES.learning, "missing");
  else {
    const text = s.src.learning || read(FILES.learning);
    if (!/OBSERVED/.test(text) || !/NOT_TESTED/.test(text)) fail("LEARNING_CLASSES", FILES.learning, "OBSERVED/INFERRED/NOT_TESTED");
    if (/retentionRate\s*[:=]\s*[1-9]/.test(text) && !/OBSERVED/.test(text)) {
      fail("INVENTED_METRIC", FILES.learning, "[17]");
    }
  }
  if (!exists(FILES.firstSession)) fail("FIRST_SESSION", FILES.firstSession, "missing");
  if (s.base?.status === "CLOSED_ACTIVE") {
    const fsObs = s.src.firstSession || read(FILES.firstSession);
    if (/NOT_TESTED/.test(fsObs) && !/T0[1-5]/.test(fsObs.replace(/NOT_TESTED[\s\S]*/, ""))) {
      fail("CLOSED_WITHOUT_COHORT", FILES.firstSession, "[24]");
    }
  }
  return failures;
}

export async function validateOwnerAcceptance(s) {
  const { failures, fail } = collector();
  if (!s.owner?.items?.length) fail("OWNER_MISSING", FILES.owner, "register");
  else {
    if (s.owner.items.length < 60) fail("OWNER_INCOMPLETE", FILES.owner, String(s.owner.items.length));
    // Must not reset relative to RC2.2.29 import
    if (s.owner29?.items?.length) {
      const byId = new Map(s.owner29.items.map((i) => [i.id, i]));
      for (const item of s.owner.items) {
        const prev = byId.get(item.id);
        if (!prev) continue;
        // Downgrade of a previously better state is suspicious reset
        const rank = { NOT_IMPLEMENTED: 0, PARTIAL: 1, CODE_READY: 2, WEB_PASS: 3, APK_PASS: 4, OWNER_ACCEPTED: 5, NOT_RUN: 0 };
        if ((rank[item.codeState] ?? 0) < (rank[prev.codeState] ?? 0) && item.notes?.includes("RESET")) {
          fail("OWNER_RESET", FILES.owner, item.id);
        }
      }
    }
    const bad = s.owner.items.find((i) => i.ownerAccepted && !i.ownerSaw);
    if (bad) fail("OWNER_FAKE_ACCEPT", FILES.owner, bad.id);
    for (const id of s.owner.criticalIds ?? ["OR34", "OR29", "OR30", "OR58", "OR60"]) {
      const item = s.owner.items.find((i) => i.id === id);
      if (item && item.codeState === "OWNER_ACCEPTED" && item.apkState !== "APK_PASS" && item.apkState !== "OWNER_ACCEPTED") {
        fail("CRITICAL_OR_AUTO_DONE", FILES.owner, id);
      }
    }
  }
  return failures;
}

export const VALIDATORS = {
  "release-truth": validateReleaseTruth,
  "physical-proof": validatePhysicalProof,
  "play-internal": validatePlayInternal,
  "play-upgrade": validatePlayInternal,
  conversation: validateConversation,
  "guided-try": validateGuidedTry,
  auth: validateAuth,
  recovery: validateAuth,
  "self-compare": validateSelfCompare,
  guidance: validateGuidance,
  energy: validateEnergy,
  navigation: validateNavigation,
  completion: validateCompletion,
  stability: validateStability,
  "human-learning": validateHumanLearning,
  "owner-acceptance": validateOwnerAcceptance,
};
