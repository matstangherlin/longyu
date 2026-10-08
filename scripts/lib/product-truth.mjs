/**
 * RC2.3.9 — Product Truth Manifest (docs/release/product-truth.json).
 *
 * `buildProductTruth(inputs)` is pure: every status is DERIVED from evidence
 * files (owner acceptance, external dependencies, provider registry, invariant
 * ownership, canonical suites) — never typed by hand. `checkProductTruth`
 * enforces the single status vocabulary and the no-false-PASS rules; the
 * convergence gate mutates inputs/manifests to prove each rule bites.
 */
import { createHash } from "node:crypto";

export const PRODUCT_TRUTH_SCHEMA = 1;

/** The only release-status words allowed (booleans only for real boolean facts). */
export const STATUS = Object.freeze([
  "PASS",
  "CODE_READY",
  "ACCOUNT_VERIFIED",
  "CONFIG_REQUIRED",
  "OWNER_ACTION_REQUIRED",
  "NOT_RUN",
  "BLOCKED",
  "PAID_PLAN_REQUIRED",
]);
const FORBIDDEN_WORDS = /^(READY|DONE|GOOD|OK|WORKS|YES|TRUE|VERIFIED|LIVE|GREEN)$/i;

/** Worst-first order used to roll several statuses up into one. */
const SEVERITY = ["BLOCKED", "PAID_PLAN_REQUIRED", "CONFIG_REQUIRED", "OWNER_ACTION_REQUIRED", "NOT_RUN", "CODE_READY", "ACCOUNT_VERIFIED", "PASS"];
export function worstOf(statuses) {
  const present = statuses.filter(Boolean);
  if (!present.length) return "NOT_RUN";
  return [...present].sort((a, b) => SEVERITY.indexOf(a) - SEVERITY.indexOf(b))[0];
}

/** Provider registry words (src/lib/auth/providers.ts) → release vocabulary. */
export function providerStatus(codeStatus, dependency) {
  if (codeStatus === "VERIFIED") return "PASS";
  const dep = dependency?.status;
  if (dep === "PASS" || dep === "ACCOUNT_VERIFIED") return codeStatus === "CODE_READY" ? "OWNER_ACTION_REQUIRED" : "PASS";
  if (codeStatus === "CODE_READY" || codeStatus === "PROVIDER_CONFIG_REQUIRED") return "CONFIG_REQUIRED";
  return "NOT_RUN";
}

function area(ownerAcceptance, id) {
  return ownerAcceptance?.areas?.[id]?.status ?? "NOT_RUN";
}

/**
 * @param {object} inputs
 *   identity: { version, applicationId, versionCode, fingerprint, chainHead, lessons, teachingTopics, cultureItems, cultureNativeLessons, journeyCultureNodes, historyItems }
 *   providers: [{ id, codeStatus }]
 *   ownerAcceptance, externalDependencies, ownerActions, invariantOwnership
 *   suites: [{ id, steps }]; jevRuntimeEnabled: boolean
 *   certification: { cloud: null | { wave, evidence }, monetization: null | { decision, evidence } }
 */
export function buildProductTruth(inputs) {
  const deps = inputs.externalDependencies?.dependencies ?? {};
  const inv = inputs.invariantOwnership?.invariants ?? {};
  const runs = new Set(inputs.suites.flatMap((suite) => suite.steps));
  const owned = (id) => (inv[id] && runs.has(inv[id].owner) ? "CODE_READY" : "BLOCKED");
  const pedagogy = (id, invariant) => ({ status: owned(invariant), invariant, owner: inv[invariant]?.owner ?? null });

  const providerDep = { google: deps.googleOAuth, apple: deps.appleSignIn, microsoft: deps.microsoftEntra };
  const identityProviders = Object.fromEntries(
    inputs.providers.map((p) => [p.id, { status: providerStatus(p.codeStatus, providerDep[p.id]), codeStatus: p.codeStatus }])
  );
  const androidOAuth = area(inputs.ownerAcceptance, "auth") === "PASS" && area(inputs.ownerAcceptance, "android") === "PASS" ? "PASS" : "NOT_RUN";

  const cloudProviders = Object.fromEntries(
    ["supabase", "netlify", "resend", "sentry", "cloudflare"].map((id) => [id, { status: deps[id]?.status ?? "NOT_RUN", tier: deps[id]?.tier ?? "n/a" }])
  );
  // Cloud is certified only by RC2.3.10 evidence — never by provider statuses alone.
  const cloudCertified = Boolean(inputs.certification?.cloud?.evidence?.length);
  const cloud = cloudCertified ? worstOf(Object.values(cloudProviders).map((p) => p.status)) : worstOf(["CONFIG_REQUIRED", ...Object.values(cloudProviders).map((p) => p.status)].filter((s) => s !== "PASS"));

  const monetizationDecided = Boolean(inputs.certification?.monetization?.decision);
  const ownerAreas = Object.fromEntries(["audio", "hanzi", "ux", "auth", "android"].map((id) => [id, area(inputs.ownerAcceptance, id)]));
  const physical = worstOf(Object.values(ownerAreas));
  const apk = ownerAreas.android === "PASS" ? "PASS" : "NOT_RUN";

  const release = {
    CODE: "CODE_READY",
    WEB: "CODE_READY",
    ANDROID_BUILD: "CODE_READY",
    APK: apk,
    PHYSICAL: physical,
    CLOUD: cloud,
    MONETIZATION: monetizationDecided ? "CODE_READY" : "NOT_RUN",
  };
  release.RC = worstOf([release.CODE, release.WEB, release.ANDROID_BUILD, release.APK, release.PHYSICAL, release.CLOUD]) === "PASS" ? "PASS" : "BLOCKED";
  release.BETA = release.RC === "PASS" && release.MONETIZATION !== "BLOCKED" ? "PASS" : "BLOCKED";

  return {
    schemaVersion: PRODUCT_TRUTH_SCHEMA,
    statusVocabulary: [...STATUS],
    product: {
      name: "Longyu",
      version: inputs.identity.version,
      applicationId: inputs.identity.applicationId,
      androidVersionCode: inputs.identity.versionCode,
      curriculumFingerprint: inputs.identity.fingerprint,
      fingerprintChainHead: inputs.identity.chainHead,
      lessons: inputs.identity.lessons,
      teachingTopics: inputs.identity.teachingTopics,
      culture: {
        items: inputs.identity.cultureItems,
        nativeLessons: inputs.identity.cultureNativeLessons,
        journeyNodes: inputs.identity.journeyCultureNodes,
        historyItems: inputs.identity.historyItems,
      },
    },
    pedagogy: {
      pedagogyV6: pedagogy("pedagogyV6", "PEDAGOGY_V6_PASS_BUDGETS"),
      teachBeforeTest: pedagogy("teachBeforeTest", "TEACH_BEFORE_TEST"),
      visualFirst: pedagogy("visualFirst", "VISUAL_FIRST_ASSOCIATION"),
      everydayMandarin: pedagogy("everydayMandarin", "CURRICULUM_LEAK"),
      culture: pedagogy("culture", "CULTURE_CONTENT_TRUTH"),
      hanzi: pedagogy("hanzi", "HANZI_WRITING_ELIGIBILITY"),
      speech: pedagogy("speech", "SPEECH_TECHNICAL_FAILURE_NON_PENALTY"),
      personalMastery: pedagogy("personalMastery", "PERSONAL_MASTERY_EVIDENCE_SEMANTICS"),
      guidance: pedagogy("guidance", "GUIDANCE_BUDGET_AND_SENSORY"),
    },
    platform: {
      web: { status: "CODE_READY" },
      pwa: { status: "CODE_READY" },
      android: { status: "CODE_READY", physical: ownerAreas.android },
    },
    identity: {
      providers: identityProviders,
      androidOAuthPhysical: androidOAuth,
      progressClaim: { status: owned("PROGRESS_CLAIM_LOSSLESS"), invariant: "PROGRESS_CLAIM_LOSSLESS" },
      accountIsolation: { status: owned("ACCOUNT_ISOLATION"), invariant: "ACCOUNT_ISOLATION" },
      deepLinks: { status: owned("OAUTH_REDIRECT_SAFETY"), invariant: "OAUTH_REDIRECT_SAFETY" },
    },
    cloud: { providers: cloudProviders, certification: cloudCertified ? "PASS" : "NOT_RUN", certificationWave: "RC2.3.10" },
    commercial: {
      entitlementArchitecture: { status: owned("ENTITLEMENT_SERVER_AUTHORITY"), invariant: "ENTITLEMENT_SERVER_AUTHORITY" },
      stripe: { status: deps.stripe?.status ?? "NOT_RUN", mode: "test" },
      play: { status: deps.googlePlay?.status ?? "NOT_RUN" },
      pricingDecision: monetizationDecided ? "CODE_READY" : "NOT_RUN",
      decisionWave: "RC2.3.11",
    },
    jev: {
      learnerRuntimeEnabled: inputs.jevRuntimeEnabled,
      learnerRuntime: inputs.jevRuntimeEnabled ? "BLOCKED" : "NOT_RUN",
      serverSideTriage: deps.typesafeJev?.status ?? "NOT_RUN",
    },
    ownerAcceptance: ownerAreas,
    pendingOwnerActions: (inputs.ownerActions?.actions ?? []).filter((a) => a.status !== "PASS").map((a) => a.id),
    release,
  };
}

/** Every status-looking string leaf must be in the vocabulary. */
function* statusLeaves(node, at = "") {
  if (node == null) return;
  if (Array.isArray(node)) {
    for (const [i, v] of node.entries()) yield* statusLeaves(v, `${at}[${i}]`);
    return;
  }
  if (typeof node === "object") {
    for (const [k, v] of Object.entries(node)) yield* statusLeaves(v, at ? `${at}.${k}` : k);
    return;
  }
  if (typeof node === "string") yield [at, node];
}

const STATUS_KEYS = /(^|\.)(status|physical|certification|pricingDecision|learnerRuntime|serverSideTriage|androidOAuthPhysical|CODE|WEB|ANDROID_BUILD|APK|PHYSICAL|CLOUD|MONETIZATION|RC|BETA|audio|hanzi|ux|auth|android)$/;

/** @returns {Array<{ code: string, detail: string }>} */
export function checkProductTruth(manifest, inputs) {
  const errors = [];
  const fail = (code, detail) => errors.push({ code, detail });
  if (manifest?.schemaVersion !== PRODUCT_TRUTH_SCHEMA) fail("PRODUCT_TRUTH_SCHEMA", `schemaVersion ${manifest?.schemaVersion}`);

  for (const [at, value] of statusLeaves(manifest)) {
    if (!STATUS_KEYS.test(at) || at.startsWith("statusVocabulary")) continue;
    if (FORBIDDEN_WORDS.test(value) || !STATUS.includes(value)) fail("STATUS_VOCABULARY", `${at} = ${value}`);
  }

  const expected = buildProductTruth(inputs);
  // No false PASS: each derived status may never be better than the evidence allows.
  const better = (a, b) => SEVERITY.indexOf(a) > SEVERITY.indexOf(b);
  const compare = (path, got, want) => {
    if (got !== want && better(got, want)) fail("FALSE_PASS", `${path}: manifest ${got} but evidence only supports ${want}`);
  };
  for (const [id, row] of Object.entries(expected.identity.providers)) compare(`identity.providers.${id}`, manifest.identity?.providers?.[id]?.status, row.status);
  compare("identity.androidOAuthPhysical", manifest.identity?.androidOAuthPhysical, expected.identity.androidOAuthPhysical);
  for (const [id, s] of Object.entries(expected.ownerAcceptance)) compare(`ownerAcceptance.${id}`, manifest.ownerAcceptance?.[id], s);
  for (const [id, s] of Object.entries(expected.release)) compare(`release.${id}`, manifest.release?.[id], s);
  for (const [id, row] of Object.entries(expected.cloud.providers)) compare(`cloud.providers.${id}`, manifest.cloud?.providers?.[id]?.status, row.status);
  compare("cloud.certification", manifest.cloud?.certification, expected.cloud.certification);
  compare("commercial.pricingDecision", manifest.commercial?.pricingDecision, expected.commercial.pricingDecision);

  if (inputs.jevRuntimeEnabled !== false) fail("JEV_RUNTIME_ENABLED", "JEV_RUNTIME_ENABLED must be false (learner runtime off)");
  if (manifest.jev?.learnerRuntimeEnabled !== false) fail("JEV_RUNTIME_ENABLED", "manifest reports Jev learner runtime enabled");
  if (manifest.product?.curriculumFingerprint !== inputs.identity.chainHead) {
    fail("UNKNOWN_FINGERPRINT", `curriculum fingerprint ${manifest.product?.curriculumFingerprint} is not the fingerprint chain head ${inputs.identity.chainHead}`);
  }
  return errors;
}

/** Stable digest of the manifest's inputs (freshness: generated == committed). */
export function digestInputs(inputs) {
  return createHash("sha256").update(JSON.stringify(inputs)).digest("hex").slice(0, 16);
}
