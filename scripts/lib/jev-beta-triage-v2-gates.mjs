/**
 * Pure checkers for gate:jev-beta-triage-v2 (20 kill codes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { require as tsRequire } from "./v495a-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

export function loadV2Modules() {
  return {
    pii: tsRequire("../../supabase/functions/_shared/jevPiiRedact.ts"),
    severity: tsRequire("../../supabase/functions/_shared/jevSeverityMap.ts"),
    security: tsRequire("../../supabase/functions/_shared/jevSecurityOverride.ts"),
    confidence: tsRequire("../../supabase/functions/_shared/jevConfidencePolicy.ts"),
    budget: tsRequire("../../supabase/functions/_shared/jevDailyBudget.ts"),
    pipeline: tsRequire("../../supabase/functions/_shared/jevTriagePipeline.ts"),
    taxonomy: tsRequire("../../supabase/functions/_shared/jevTriageTaxonomy.ts"),
  };
}

export function checkSources({
  triageSource,
  pipelineSource,
  budgetPolicySource,
  clientSources,
  healthJson,
  calibrationJson,
  waveEntrySource,
}) {
  const errors = [];
  const triage = String(triageSource ?? "");
  const pipeline = String(pipelineSource ?? "");
  const policy = String(budgetPolicySource ?? "");
  const combined = `${triage}\n${pipeline}`;

  if (!/buildSanitizedFeedbackState|redactFeedbackText/.test(combined)) {
    errors.push("RAW_TOKEN_SENT_TO_JEV");
  }
  if (!/ai_policy_version|AI_POLICY_VERSION|feedback-v2/.test(combined)) {
    errors.push("MISSING_POLICY_VERSION");
  }
  if (!/ai_model|result\.model/.test(combined)) {
    errors.push("MISSING_MODEL_VERSION");
  }
  if (!/mapJevScoreToPCandidate|ai_p_candidate/.test(combined)) {
    errors.push("JEV_SEVERITY_EQUALS_P_LEVEL");
  }
  if (!/detectSecurityOverride|mergePCandidate/.test(combined)) {
    errors.push("AI_DOWNGRADES_SECURITY_RULE");
  }
  if (!/PENDING_AI_TRIAGE|pendingAiTriageWrite/.test(combined)) {
    errors.push("JEV_UNAVAILABLE_LOSES_FEEDBACK");
  }
  if (!/allowNewJevEvaluation|jevBudgetLevel|budget_exhausted/.test(combined)) {
    errors.push("BUDGET_EXHAUSTION_BREAKS_FEEDBACK");
  }
  if (!/jevInputHash|inFlight/.test(combined)) {
    errors.push("DUPLICATE_PAID_CALL");
  }
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(policy)) {
    errors.push("LEARNER_RUNTIME_ENABLED");
  }
  if (!/ai_human_review_required|needsHumanReviewFromConfidence/.test(combined)) {
    errors.push("LOW_CONFIDENCE_SILENT");
  }
  // Clustering must scope by release (app_version / rc) — never merge blindly.
  if (/loadClusterCandidates|buildClusterQuestions/.test(combined) && !/app_version|rc_id/.test(combined)) {
    errors.push("CLUSTER_MERGES_RELEASES_BLINDLY");
  }
  // Semantic cluster is suggestion only — flag affirmative auto-close (not "never auto-close" comments).
  if (
    /clusterSuggestion|ai_cluster_suggestion/.test(combined) &&
    (/\bauto[-_ ]?clos(?:e|es|ing)\b/i.test(combined) || /\bauto[-_ ]?resolv/i.test(combined)) &&
    !/never auto-close|suggestion only|do not close/i.test(combined)
  ) {
    errors.push("SEMANTIC_CLUSTER_AUTO_CLOSES");
  }
  if (
    /clusterSuggestion|ai_cluster_suggestion/.test(combined) &&
    /ai_status:\s*"HUMAN_CONFIRMED"/.test(combined) &&
    !/p0_auto_resolve_forbidden/.test(combined)
  ) {
    errors.push("SEMANTIC_CLUSTER_AUTO_CLOSES");
  }
  // AI path must never write HUMAN_CONFIRMED / auto-resolve P0 (operator confirms).
  if (
    (/ai_status:\s*"HUMAN_CONFIRMED"/.test(combined) && !/p0_auto_resolve_forbidden/.test(combined)) ||
    /auto.?resolv(?:e|ed)?\s+P0|P0\s+auto.?resolv/i.test(combined)
  ) {
    errors.push("P0_AUTO_RESOLVED");
  }

  for (const f of clientSources ?? []) {
    const text = typeof f === "string" ? f : f.text;
    const file = typeof f === "string" ? "" : (f.file ?? "");
    if (/api\.typesafe\.ai|TYPESAFE_API_KEY|VITE_TYPESAFE|\baskJev\b/.test(text) && !/feedbackService\.ts$/.test(file)) {
      errors.push("LEARNER_RUNTIME_ENABLED");
    }
  }

  const health = String(healthJson ?? "");
  if (/Bearer |eyJ[A-Za-z0-9_-]+\./.test(health) || (/"feedback"\s*:/.test(health) && /@/.test(health))) {
    errors.push("RAW_FEEDBACK_IN_REPO");
  }
  if (/@gmail\.com|@example\.com/.test(health) || /"email"\s*:\s*"[^"]+@"/.test(health)) {
    errors.push("EMAIL_IN_ANALYTICS");
  }

  const cal = String(calibrationJson ?? "");
  if (/\bAtomurus\b|\batomurus\b/.test(`${combined}\n${cal}\n${health}\n${policy}`)) {
    errors.push("ATOMURUS_TOUCHED");
  }

  errors.push(...checkCohortNotJevOnly({ waveEntrySource }));

  return [...new Set(errors)];
}

export function checkBehavioral(m) {
  const errors = [];

  const jwtSample =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaaaaaaaaaaaa.bbbbbbbbbbbbbbbbbbbb";
  if (!m.pii.containsUnredactedSecrets(jwtSample).includes("jwt")) {
    errors.push("RAW_TOKEN_SENT_TO_JEV");
  }
  const cleanedJwt = m.pii.redactFeedbackText(`token ${jwtSample}`);
  if (m.pii.containsUnredactedSecrets(cleanedJwt.text).includes("jwt")) {
    errors.push("RAW_TOKEN_SENT_TO_JEV");
  }

  // Construct Stripe-like fixture at runtime — never commit a contiguous sk_live_… literal.
  const fakeStripeLiveKey = ["sk", "live", "abcdefghijklmnopqrstuvwxyz12"].join("_");
  const cleaned = m.pii.redactFeedbackText(
    `Contact me at person@mail.com Bearer ${fakeStripeLiveKey}`,
  );
  if (m.pii.containsUnredactedSecrets(cleaned.text).includes("email")) errors.push("EMAIL_UNREDACTED");
  if (/Bearer\s+[A-Za-z0-9]{8,}/i.test(cleaned.text)) errors.push("RAW_TOKEN_SENT_TO_JEV");

  const otp = m.pii.redactFeedbackText("My OTP code 123456 failed");
  if (/\b123456\b/.test(otp.text)) errors.push("OTP_UNREDACTED");

  const card = m.pii.redactFeedbackText("card 4111 1111 1111 1111");
  if (/4111/.test(card.text)) errors.push("CARD_UNREDACTED");

  const mapped = m.severity.mapJevScoreToPCandidate(3);
  if (mapped.pCandidate !== "P0" || mapped.jevScore !== 3) errors.push("JEV_SEVERITY_EQUALS_P_LEVEL");
  if (String(mapped.pCandidate) === String(mapped.jevScore)) errors.push("JEV_SEVERITY_EQUALS_P_LEVEL");

  const cross = m.security.detectSecurityOverride("I can see another user's progress");
  const merged = m.security.mergePCandidate("P3", cross);
  if (!cross || merged.pCandidate !== "P0") errors.push("AI_DOWNGRADES_SECURITY_RULE");
  // AI praise / low score cannot downgrade override
  const praiseWrite = m.pipeline.buildClassificationWrite({
    kind: "praise",
    area: "other",
    severityScore: 0,
    needsHumanNoul: 0,
    kindConfidence: 0.99,
    areaConfidence: 0.99,
    severityConfidence: 0.99,
    model: "jev",
    inputHash: "sec",
    originalMessage: "I can see another user's progress",
  });
  if (praiseWrite.ai_p_candidate !== "P0" || !praiseWrite.ai_override_reason) {
    errors.push("AI_DOWNGRADES_SECURITY_RULE");
  }

  if (!m.confidence.needsHumanReviewFromConfidence(0.4)) errors.push("LOW_CONFIDENCE_SILENT");

  if (m.budget.allowNewJevEvaluation(m.budget.jevBudgetLevel(999))) {
    errors.push("BUDGET_EXHAUSTION_BREAKS_FEEDBACK");
  }
  if (!m.pipeline.pendingAiTriageWrite || m.pipeline.pendingAiTriageWrite().ai_status !== "PENDING_AI_TRIAGE") {
    errors.push("JEV_UNAVAILABLE_LOSES_FEEDBACK");
  }

  const write = m.pipeline.buildClassificationWrite({
    kind: "praise",
    area: "culture",
    severityScore: 0,
    needsHumanNoul: 0,
    kindConfidence: 0.9,
    areaConfidence: 0.9,
    severityConfidence: 0.9,
    model: "jev-latest",
    inputHash: "abcd",
    originalMessage: "Great app, I liked the Culture lesson.",
  });
  if (write.ai_p_candidate === "P0" || write.ai_p_candidate === "P1") errors.push("P0_AUTO_RESOLVED");
  if (write.ai_status === "HUMAN_CONFIRMED") errors.push("P0_AUTO_RESOLVED");
  if (write.ai_policy_version !== "feedback-v2") errors.push("MISSING_POLICY_VERSION");
  if (!write.ai_model) errors.push("MISSING_MODEL_VERSION");
  if (write.ai_severity === write.ai_p_candidate) errors.push("JEV_SEVERITY_EQUALS_P_LEVEL");

  // Multilingual (PT-BR) security override
  const pt = m.security.detectSecurityOverride("Meu progresso sumiu depois de trocar de celular.");
  if (!pt) errors.push("AI_DOWNGRADES_SECURITY_RULE");

  return [...new Set(errors)];
}

export function checkCohortNotJevOnly({ waveEntrySource }) {
  const errors = [];
  const s = String(waveEntrySource ?? "");
  if (!s) return errors;
  // Must not authorize cohort expansion solely from raw Jev fields.
  if (/\b(ai_p_candidate|ai_severity|jevScore)\b/.test(s) && /WAVE2_ENTRY=GO|WAVE3_ENTRY=GO/.test(s) && !/humanConfirm|human.?confirm|p0|p1Core/.test(s)) {
    errors.push("COHORT_EXPANDS_ON_JEV_ONLY");
  }
  if (/JEV_TRIAGE_LIVE\s*===\s*"PASS"\s*&&\s*entryResult/.test(s)) {
    errors.push("COHORT_EXPANDS_ON_JEV_ONLY");
  }
  if (/ai_p_candidate\s*===\s*"P0"/.test(s) && /WAVE2_ENTRY=GO/.test(s)) {
    errors.push("COHORT_EXPANDS_ON_JEV_ONLY");
  }
  return errors;
}

export function checkCalibration(m, calibrationJson) {
  const errors = [];
  let data;
  try {
    data = typeof calibrationJson === "string" ? JSON.parse(calibrationJson) : calibrationJson;
  } catch {
    return ["MISSING_POLICY_VERSION"];
  }
  if (data.policyVersion !== "feedback-v2") errors.push("MISSING_POLICY_VERSION");
  for (const c of data.cases ?? []) {
    if (c.expectOverride) {
      const hit = m.security.detectSecurityOverride(c.message);
      if (!hit || hit.reason !== c.expectOverride) {
        errors.push("AI_DOWNGRADES_SECURITY_RULE");
      }
      if (c.expectPMin === "P0" && hit?.pCandidate !== "P0") {
        errors.push("AI_DOWNGRADES_SECURITY_RULE");
      }
    }
    if (c.expectRedact?.includes("email")) {
      const red = m.pii.redactFeedbackText(c.message);
      if (m.pii.containsUnredactedSecrets(red.text).includes("email")) {
        errors.push("EMAIL_UNREDACTED");
      }
    }
    if (c.expectNotP0) {
      const w = m.pipeline.buildClassificationWrite({
        kind: c.expectKind ?? "praise",
        area: c.expectAreaHint ?? "culture",
        severityScore: 0,
        needsHumanNoul: 0,
        kindConfidence: 0.95,
        areaConfidence: 0.9,
        severityConfidence: 0.9,
        model: "jev-cal",
        inputHash: c.id,
        originalMessage: c.message,
      });
      if (w.ai_p_candidate === "P0" || w.ai_p_candidate === "P1") {
        errors.push("P0_AUTO_RESOLVED");
      }
    }
  }
  return [...new Set(errors)];
}

export function loadDefaultV2Sources() {
  const walk = (dir, out = []) => {
    if (!fs.existsSync(dir)) return out;
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p, out);
      else if (/\.(ts|tsx)$/.test(e.name)) out.push({ file: p, text: fs.readFileSync(p, "utf8") });
    }
    return out;
  };
  return {
    triageSource: read("supabase/functions/triage-feedback/index.ts"),
    pipelineSource: read("supabase/functions/_shared/jevTriagePipeline.ts"),
    budgetPolicySource: read("supabase/functions/_shared/budgetPolicy.ts"),
    clientSources: walk(path.join(ROOT, "src")),
    healthJson: fs.existsSync(path.join(ROOT, "docs/beta/jev-triage-health.json"))
      ? read("docs/beta/jev-triage-health.json")
      : "{}",
    calibrationJson: read("docs/beta/jev-calibration-dataset.json"),
    waveEntrySource: fs.existsSync(path.join(ROOT, "scripts/beta-wave-entry.mjs"))
      ? read("scripts/beta-wave-entry.mjs")
      : "",
  };
}
