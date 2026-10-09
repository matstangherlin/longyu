#!/usr/bin/env node
/**
 * npm run gate:jev-beta-triage-v2
 *   validate — taxonomy/PII/severity/override/confidence/budget/cohort invariants
 *   test     — 20 mutation kills + false-negative / false-positive calibration
 *
 * Advisory only. Learner runtime stays OFF. No production deploy here.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkBehavioral,
  checkCalibration,
  checkSources,
  loadDefaultV2Sources,
  loadV2Modules,
} from "./lib/jev-beta-triage-v2-gates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.argv[2] === "test" ? "test" : "validate";
const CERT_PATH = path.join(root, "docs/jev/beta-triage-v2.json");

function validate() {
  const sources = loadDefaultV2Sources();
  const m = loadV2Modules();
  const errors = [
    ...checkSources(sources),
    ...checkBehavioral(m),
    ...checkCalibration(m, sources.calibrationJson),
  ];
  if (errors.length) {
    console.error("FAIL validate:jev-beta-triage-v2");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }

  const cert = fs.existsSync(CERT_PATH) ? JSON.parse(fs.readFileSync(CERT_PATH, "utf8")) : null;
  const status = cert?.JEV_BETA_TRIAGE ?? "UNKNOWN";
  const learner = cert?.JEV_LEARNER_RUNTIME ?? "UNKNOWN";
  if (learner !== "OFF") {
    console.error("FAIL validate:jev-beta-triage-v2 — LEARNER_RUNTIME must stay OFF");
    process.exit(1);
  }
  console.log(
    `PASS validate:jev-beta-triage-v2 · policy=feedback-v2 · learnerRuntime=OFF · JEV_BETA_TRIAGE=${status} · advisory-only`,
  );
}

function expectKill(label, code, run) {
  const errors = run();
  if (!errors.includes(code)) {
    console.error(`KILL MISS ${label} — expected ${code}, got [${errors.join(", ")}]`);
    process.exit(1);
  }
  console.log(`KILL OK ${label} → ${code}`);
}

function test() {
  const base = loadDefaultV2Sources();
  const m = loadV2Modules();

  expectKill("1 raw token sent", "RAW_TOKEN_SENT_TO_JEV", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/buildSanitizedFeedbackState|redactFeedbackText/g, "rawState"),
      pipelineSource: base.pipelineSource.replace(/buildSanitizedFeedbackState|redactFeedbackText/g, "rawState"),
    }),
  );

  expectKill("2 email unredacted", "EMAIL_UNREDACTED", () => {
    const fake = {
      ...m,
      pii: {
        ...m.pii,
        redactFeedbackText: (t) => ({ text: String(t), redacted: false, kinds: [] }),
        containsUnredactedSecrets: (t) => (/@/.test(t) ? ["email"] : []),
      },
    };
    return checkBehavioral(fake);
  });

  expectKill("3 OTP unredacted", "OTP_UNREDACTED", () => {
    const fake = {
      ...m,
      pii: {
        ...m.pii,
        redactFeedbackText: (t) => ({ text: String(t), redacted: false, kinds: [] }),
      },
    };
    return checkBehavioral(fake);
  });

  expectKill("4 card unredacted", "CARD_UNREDACTED", () => {
    const fake = {
      ...m,
      pii: {
        ...m.pii,
        redactFeedbackText: (t) => ({ text: String(t), redacted: false, kinds: [] }),
      },
    };
    return checkBehavioral(fake);
  });

  expectKill("5 severity equals P", "JEV_SEVERITY_EQUALS_P_LEVEL", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/ai_p_candidate|mapJevScoreToPCandidate/g, "ai_severity_only"),
      pipelineSource: base.pipelineSource.replace(/ai_p_candidate|mapJevScoreToPCandidate/g, "ai_severity_only"),
    }),
  );

  expectKill("6 AI downgrades security", "AI_DOWNGRADES_SECURITY_RULE", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/detectSecurityOverride|mergePCandidate/g, "noopOverride"),
      pipelineSource: base.pipelineSource.replace(/detectSecurityOverride|mergePCandidate/g, "noopOverride"),
    }),
  );

  expectKill("7 P0 auto-resolved", "P0_AUTO_RESOLVED", () =>
    checkSources({
      ...base,
      triageSource: `${base.triageSource
        .replace(/p0_auto_resolve_forbidden/g, "allowed")
        .replace(/never auto-confirm/g, "auto ok")}\nai_status: "HUMAN_CONFIRMED"; // P0 auto-resolve\n`,
    }),
  );

  expectKill("8 low confidence silent", "LOW_CONFIDENCE_SILENT", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/ai_human_review_required|needsHumanReviewFromConfidence/g, "neverReview"),
      pipelineSource: base.pipelineSource.replace(/ai_human_review_required|needsHumanReviewFromConfidence/g, "neverReview"),
    }),
  );

  expectKill("9 missing policy version", "MISSING_POLICY_VERSION", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/ai_policy_version|AI_POLICY_VERSION|feedback-v2/g, "x"),
      pipelineSource: base.pipelineSource.replace(/ai_policy_version|AI_POLICY_VERSION|feedback-v2/g, "x"),
    }),
  );

  expectKill("10 missing model", "MISSING_MODEL_VERSION", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/ai_model|result\.model/g, "noModel"),
      pipelineSource: base.pipelineSource.replace(/ai_model|result\.model/g, "noModel"),
    }),
  );

  expectKill("11 duplicate paid call", "DUPLICATE_PAID_CALL", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/jevInputHash|inFlight/g, "noDedupe"),
    }),
  );

  expectKill("12 Jev unavailable loses feedback", "JEV_UNAVAILABLE_LOSES_FEEDBACK", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/PENDING_AI_TRIAGE|pendingAiTriageWrite/g, "dropRow"),
      pipelineSource: base.pipelineSource.replace(/PENDING_AI_TRIAGE|pendingAiTriageWrite/g, "dropRow"),
    }),
  );

  expectKill("13 budget breaks feedback", "BUDGET_EXHAUSTION_BREAKS_FEEDBACK", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource.replace(/allowNewJevEvaluation|jevBudgetLevel|budget_exhausted/g, "ignoreBudget"),
    }),
  );

  expectKill("14 clustering merges releases", "CLUSTER_MERGES_RELEASES_BLINDLY", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource
        .replace(/app_version/g, "area_only")
        .replace(/rc_id/g, "area_only"),
      pipelineSource: base.pipelineSource.replace(/app_version|rc_id/g, "area_only"),
    }),
  );

  expectKill("15 semantic cluster auto-closes", "SEMANTIC_CLUSTER_AUTO_CLOSES", () =>
    checkSources({
      ...base,
      triageSource: base.triageSource
        .replace(/never auto-close/gi, "will auto-close")
        .replace(/suggestion only/gi, "binding")
        .replace(/do not close/gi, "do close")
        .replace(/p0_auto_resolve_forbidden/g, "allowed") +
        '\nclusterSuggestion auto-close; ai_status: "HUMAN_CONFIRMED";\n',
    }),
  );

  expectKill("16 raw feedback in repo", "RAW_FEEDBACK_IN_REPO", () =>
    checkSources({
      ...base,
      healthJson: JSON.stringify({ feedback: ["user said hello Bearer eyJhbGciOi.aaa.bbb"] }),
    }),
  );

  expectKill("17 email in analytics", "EMAIL_IN_ANALYTICS", () =>
    checkSources({
      ...base,
      healthJson: JSON.stringify({ email: "user@gmail.com", evaluations: 1 }),
    }),
  );

  expectKill("18 learner runtime", "LEARNER_RUNTIME_ENABLED", () =>
    checkSources({
      ...base,
      budgetPolicySource: base.budgetPolicySource.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"),
    }),
  );

  expectKill("19 cohort expands on Jev only", "COHORT_EXPANDS_ON_JEV_ONLY", () =>
    checkSources({
      ...base,
      waveEntrySource: `
        if (row.ai_p_candidate === "P0") { /* ignore */ }
        console.log("WAVE2_ENTRY=GO");
      `,
    }),
  );

  expectKill("20 sibling project", "ATOMURUS_TOUCHED", () => {
    const siblingName = ["Ato", "murus"].join("");
    return checkSources({ ...base, triageSource: `${base.triageSource}\n// ${siblingName}\n` });
  });

  // False-negative gate (must never classify as harmless)
  const cross = m.security.detectSecurityOverride("I can see another user's progress.");
  if (!cross || cross.pCandidate !== "P0") {
    console.error("KILL MISS 21 false-negative cross-account");
    process.exit(1);
  }
  console.log("KILL OK 21 false-negative cross-account blocked");

  if (!m.security.detectSecurityOverride("My progress disappeared.")) {
    console.error("KILL MISS 21b lost progress");
    process.exit(1);
  }
  console.log("KILL OK 21b lost progress escalates");

  if (!m.security.detectSecurityOverride("The app charged me twice.")) {
    console.error("KILL MISS 21c double charge");
    process.exit(1);
  }
  console.log("KILL OK 21c double charge escalates");

  const praise = m.pipeline.buildClassificationWrite({
    kind: "praise",
    area: "culture",
    severityScore: 0,
    needsHumanNoul: 0,
    kindConfidence: 0.95,
    areaConfidence: 0.9,
    severityConfidence: 0.9,
    model: "jev-latest",
    inputHash: "p",
    originalMessage: "Great app, I liked the Culture lesson.",
  });
  if (praise.ai_p_candidate === "P0" || praise.ai_p_candidate === "P1") {
    console.error("KILL MISS 22 praise false positive");
    process.exit(1);
  }
  console.log("KILL OK 22 praise not P0/P1");

  // Functional PII
  const red = m.pii.redactFeedbackText(
    "email joao@gmail.com Bearer abcdefghijklmnop OTP code 445566 card 4111111111111111",
  );
  if (/gmail\.com|Bearer abc|445566|4111111111111111/.test(red.text)) {
    console.error("KILL MISS pii still present", red.text);
    process.exit(1);
  }
  console.log("KILL OK 2–4 PII redaction holds");

  // Old release feedback: cluster candidates require app_version equality in source
  if (!/app_version/.test(base.triageSource)) {
    console.error("KILL MISS old-release cluster scope");
    process.exit(1);
  }
  console.log("KILL OK 24 release-aware clustering present");

  // Multilingual PT-BR
  if (!m.security.detectSecurityOverride("Não consigo apagar a conta nas configurações.")) {
    console.error("KILL MISS multilingual auth");
    process.exit(1);
  }
  console.log("KILL OK 23 multilingual PT-BR override");

  // Exact dedupe + budget fail-open smoke via behavioral
  const beh = checkBehavioral(m);
  if (beh.length) {
    console.error("KILL MISS behavioral clean", beh);
    process.exit(1);
  }
  console.log("KILL OK behavioral clean");

  console.log("PASS test:jev-beta-triage-v2 · 20 kills");
}

if (mode === "test") test();
else validate();
