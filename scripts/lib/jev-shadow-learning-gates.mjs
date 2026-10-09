/**
 * Pure checkers for gate:jev-shadow-learning (20 kill codes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { require as tsRequire } from "./v495a-runtime.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

export function loadShadowModules() {
  return {
    shadow: tsRequire("../../supabase/functions/_shared/jevShadowStruggle.ts"),
    budget: tsRequire("../../supabase/functions/_shared/budgetPolicy.ts"),
  };
}

export function checkSources({
  shadowSource,
  budgetPolicySource,
  clientSources,
  reportJson,
  calibrationJson,
  certJson,
}) {
  const errors = [];
  const shadow = String(shadowSource ?? "");
  const policy = String(budgetPolicySource ?? "");
  const report = String(reportJson ?? "");
  const cal = String(calibrationJson ?? "");
  const cert = String(certJson ?? "");
  const combined = `${shadow}\n${policy}\n${report}\n${cal}\n${cert}`;

  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(policy)) errors.push("RUNTIME_ENABLED_WITHOUT_PROMOTION");
  if (!/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*false/.test(policy)) {
    errors.push("RUNTIME_ENABLED_WITHOUT_PROMOTION");
  }
  if (!/ABSTAIN/.test(shadow)) errors.push("NO_ABSTENTION");
  if (!/deterministicIntervention|deterministic/.test(shadow)) errors.push("NO_DETERMINISTIC_FALLBACK");
  if (!/shouldTriggerShadowCall/.test(shadow)) errors.push("CALL_ON_EVERY_TAP");
  if (!/containsForbiddenShadowPayload|FORBIDDEN/.test(shadow)) errors.push("EMAIL_OR_USER_ID_SENT");

  // Learner-visible / runtime promotion claims
  if (/appliedToLearner:\s*true/.test(combined) || /JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(combined)) {
    errors.push("LEARNER_VISIBLE_DURING_SHADOW");
  }
  if (/READY_FOR_CONTROLLED_EXPERIMENT/.test(cert) && /"JEV_SHADOW_STRUGGLE_RUNTIME"\s*:\s*"ON"/.test(cert)) {
    errors.push("EXPERIMENT_WITHOUT_OWNER_APPROVAL");
  }

  // Client must never hold API key or call askJev for struggle
  for (const f of clientSources ?? []) {
    const text = typeof f === "string" ? f : f.text;
    const file = typeof f === "string" ? "" : (f.file ?? "");
    if (/TYPESAFE_API_KEY|VITE_TYPESAFE|api\.typesafe\.ai/.test(text)) errors.push("API_KEY_CLIENT_SIDE");
    if (/askJev/.test(text) && /struggle|shadow/i.test(text)) errors.push("LEARNER_VISIBLE_DURING_SHADOW");
    if (/JEV_SHADOW_STRUGGLE\w*\s*[:=]\s*true/.test(text)) errors.push("RUNTIME_ENABLED_WITHOUT_PROMOTION");
    void file;
  }

  // Affirmative upload/send of raw media (not detector deny-lists).
  if (/\buploadRawAudio\b|\bsendRawAudioToJev\b|\baudioBlob\s*=/.test(shadow)) {
    errors.push("RAW_AUDIO_UPLOADED");
  }
  if (/\buploadStrokePath\b|\bsendHanziStrokes\b|\bstroke_points\s*=/.test(shadow)) {
    errors.push("HANZI_STROKES_UPLOADED");
  }

  if (!/assertNoMasteryWrite|appliedToLearner:\s*false|FORBIDDEN_SHADOW_WRITES/.test(shadow)) {
    errors.push("JEV_CHANGES_MASTERY");
  }
  if (/\bgradeCorrect\s*\(|\bsetGrade\s*\(/.test(shadow) && /\bwriteMastery\s*\(/.test(shadow)) {
    errors.push("JEV_GRADES_ANSWER");
  }
  if (/\bgradeTone\s*\(|tone was correct acoustically/.test(shadow)) errors.push("JEV_GRADES_TONE");
  if (!/unapproved_invention|ABSTAIN/.test(shadow)) errors.push("JEV_INVENTS_EXERCISE");
  if (!/lessonStage === \"teach\"|teach-before-test/.test(shadow)) {
    errors.push("BYPASSES_TEACH_BEFORE_TEST");
  }
  if (/\bunlockCurriculum\s*\(|\bexposeFuture\s*\(/.test(shadow)) {
    errors.push("EXPOSES_FUTURE_CURRICULUM");
  }
  if (!/costEstimate|costUnits|estimatedCallsPer100Sessions/.test(`${shadow}\n${report}`)) {
    errors.push("COST_UNCHECKED");
  }
  if (/sessionLength|engagement|xp/.test(report) && /recommendation/.test(report) && !/NON_LEARNING|not.*learning/i.test(combined)) {
    errors.push("ENGAGEMENT_AS_LEARNING_METRIC");
  }
  if (/applied_to_learner|appliedToLearner/.test(shadow) && /true/.test(shadow) && !/false/.test(shadow)) {
    errors.push("SHADOW_CHANGES_PROGRESSION");
  }
  // Progression: shadow records must force appliedToLearner false
  if (!/appliedToLearner:\s*false/.test(shadow) && !/applied_to_learner boolean not null default false/.test(combined)) {
    errors.push("SHADOW_CHANGES_PROGRESSION");
  }
  if (/\bAtomurus\b|\batomurus\b/.test(combined)) errors.push("ATOMURUS_TOUCHED");

  return [...new Set(errors)];
}

export function checkBehavioral(m, calibration) {
  const errors = [];
  const S = m.shadow;

  if (m.budget.COST_POLICY_DEFAULTS.JEV_RUNTIME_ENABLED !== false) {
    errors.push("RUNTIME_ENABLED_WITHOUT_PROMOTION");
  }
  if (m.budget.COST_POLICY_DEFAULTS.JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED !== false) {
    errors.push("RUNTIME_ENABLED_WITHOUT_PROMOTION");
  }

  const base = {
    competency: "listening",
    masteryState: "developing",
    errorCountBucket: "2",
    replayCountBucket: "1",
    helpUsed: false,
    activeTimeBucket: "medium",
    recentIndependentSuccessBucket: "0",
    currentExerciseFamily: "listening_choice",
    lessonStage: "practice",
  };

  const candidates = S.buildCandidateSet(base);
  if (!candidates.includes("ABSTAIN") || !candidates.includes("CONTINUE")) errors.push("NO_ABSTENTION");
  const det = S.deterministicIntervention(base, candidates);
  if (!candidates.includes(det)) errors.push("NO_DETERMINISTIC_FALLBACK");

  const state = S.buildShadowState(base, candidates);
  if (S.containsForbiddenShadowPayload(state).length) errors.push("EMAIL_OR_USER_ID_SENT");
  if (S.containsForbiddenShadowPayload("email user@x.com").includes("email_or_user_id")) {
    // detector works
  } else errors.push("EMAIL_OR_USER_ID_SENT");
  if (!S.containsForbiddenShadowPayload("raw_audio blob.wav").includes("raw_audio")) {
    errors.push("RAW_AUDIO_UPLOADED");
  }
  if (!S.containsForbiddenShadowPayload("strokePath=[1,2,3]").includes("hanzi_strokes")) {
    errors.push("HANZI_STROKES_UPLOADED");
  }

  // Invented intervention → abstain
  const invented = S.resolveShadowChoice({
    rawChoice: "MAKE_NEW_DRILL",
    confidence: 0.99,
    candidates,
  });
  if (!invented.abstained || invented.choice !== "ABSTAIN") errors.push("JEV_INVENTS_EXERCISE");

  // Low confidence → abstain (no future intervention)
  const low = S.resolveShadowChoice({ rawChoice: "REPLAY_MODEL", confidence: 0.3, candidates });
  if (!low.abstained) errors.push("NO_ABSTENTION");

  // Teach-before-test: SWITCH removed at teach stage
  const teach = S.buildCandidateSet({ ...base, lessonStage: "teach", errorCountBucket: "3plus" });
  if (teach.includes("SWITCH_TO_EASIER_EVIDENCE")) errors.push("BYPASSES_TEACH_BEFORE_TEST");

  // Sparse trigger
  if (S.shouldTriggerShadowCall({ ...base, errorCountBucket: "1", replayCountBucket: "0", helpUsed: false })) {
    errors.push("CALL_ON_EVERY_TAP");
  }
  if (!S.shouldTriggerShadowCall(base)) errors.push("CALL_ON_EVERY_TAP");

  // Mastery write forbidden
  const rec = {
    policyVersion: S.SHADOW_POLICY_VERSION,
    inputHash: "x",
    candidateSet: candidates,
    deterministicChoice: det,
    jevChoice: "CONTINUE",
    jevConfidence: 0.9,
    abstained: false,
    shouldInterveneNoul: 0.2,
    model: "jev-latest",
    learnerOutcome: "unknown",
    appliedToLearner: false,
    reused: false,
    costUnits: 1,
  };
  if (!S.assertNoMasteryWrite(rec)) errors.push("JEV_CHANGES_MASTERY");
  if (rec.appliedToLearner !== false) errors.push("SHADOW_CHANGES_PROGRESSION");

  // Engagement is not a learning metric for promotion
  if (S.isLearningRelevantMetric("engagement") || S.isLearningRelevantMetric("xp")) {
    errors.push("ENGAGEMENT_AS_LEARNING_METRIC");
  }

  // Calibration pass-through
  const records = simulateCalibration(S, calibration);
  const metrics = S.computeShadowMetrics(records, { jevAvailable: true });
  if (metrics.recommendation === "READY_FOR_CONTROLLED_EXPERIMENT" && records.length < 100) {
    errors.push("EXPERIMENT_WITHOUT_OWNER_APPROVAL");
  }
  if (typeof metrics.costEstimate !== "number") errors.push("COST_UNCHECKED");

  // Promotion criteria: <12 samples never runtime
  if (S.recommendShadowPromotion({
    events: 12,
    falseInterruptionRate: 0,
    missedStruggleRate: 0,
    agreementRate: 1,
    lowConfidenceRate: 0,
    jevAvailable: true,
  }) !== "KEEP_SHADOW") {
    errors.push("RUNTIME_ENABLED_WITHOUT_PROMOTION");
  }

  return [...new Set(errors)];
}

export function simulateCalibration(S, calibrationJson) {
  let data;
  try {
    data = typeof calibrationJson === "string" ? JSON.parse(calibrationJson) : calibrationJson;
  } catch {
    return [];
  }
  const records = [];
  for (const c of data.cases ?? []) {
    const candidates = S.buildCandidateSet(c.signals);
    const det = S.deterministicIntervention(c.signals, candidates);
    const resolved = S.resolveShadowChoice({
      rawChoice: c.mockJev?.choice,
      confidence: c.mockJev?.confidence,
      candidates,
      shouldInterveneNoul: c.mockJev?.shouldIntervene,
    });
    const state = S.buildShadowState(c.signals, candidates);
    records.push({
      policyVersion: S.SHADOW_POLICY_VERSION,
      inputHash: S.shadowInputHash(state, candidates),
      candidateSet: candidates,
      deterministicChoice: det,
      jevChoice: resolved.choice,
      jevConfidence: c.mockJev?.confidence ?? null,
      abstained: resolved.abstained,
      shouldInterveneNoul: c.mockJev?.shouldIntervene ?? null,
      model: "jev-shadow-sim",
      learnerOutcome: c.outcome ?? "unknown",
      appliedToLearner: false,
      reused: false,
      costUnits: c.expectNoTrigger || !S.shouldTriggerShadowCall(c.signals) ? 0 : 1,
    });
  }
  return records;
}

export function loadDefaultShadowSources() {
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
    shadowSource: read("supabase/functions/_shared/jevShadowStruggle.ts"),
    budgetPolicySource: read("supabase/functions/_shared/budgetPolicy.ts"),
    clientSources: walk(path.join(ROOT, "src")),
    reportJson: fs.existsSync(path.join(ROOT, "docs/research/jev-shadow-struggle-report.json"))
      ? read("docs/research/jev-shadow-struggle-report.json")
      : "{}",
    calibrationJson: read("docs/research/jev-shadow-calibration-dataset.json"),
    certJson: fs.existsSync(path.join(ROOT, "docs/jev/shadow-struggle-lab.json"))
      ? read("docs/jev/shadow-struggle-lab.json")
      : "{}",
    migrationSource: fs.existsSync(path.join(ROOT, "supabase/migrations/20261009070000_jev_shadow_struggle_lab.sql"))
      ? read("supabase/migrations/20261009070000_jev_shadow_struggle_lab.sql")
      : "",
  };
}
