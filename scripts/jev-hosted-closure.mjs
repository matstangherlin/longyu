#!/usr/bin/env node
/**
 * npm run gate:jev-hosted-closure
 * Hosted green + live promotion readiness for #330.
 * Does NOT deploy Edge or apply migrations.
 */
import {
  checkAll,
  checkCohortHuman,
  checkMigrationClassification,
  checkRepoGuards,
  checkSecretFixtures,
  checkShadowNotBetaBlocker,
  loadClosureSources,
} from "./lib/jev-hosted-closure-gates.mjs";
import { V477_LOCAL_ONLY_CLASS } from "./lib/v477-constants.mjs";

const mode = process.argv[2] === "test" ? "test" : "validate";

function validate() {
  const errors = checkAll();
  if (errors.length) {
    console.error("FAIL validate:jev-hosted-closure");
    for (const e of errors.slice(0, 40)) console.error(`- ${e}`);
    process.exit(1);
  }
  console.log(
    "PASS validate:jev-hosted-closure · migrations classified · shadow deferred · learner/shadow OFF · live OWNER_ACTION_REQUIRED · no auto-deploy",
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
  const base = loadClosureSources();
  const triageKey = "20261009060000_jev_beta_triage_v2.sql";
  const shadowKey = "20261009070000_jev_shadow_struggle_lab.sql";

  expectKill("1 060000 unclassified", "060000_UNCLASSIFIED", () => {
    const c = { ...V477_LOCAL_ONLY_CLASS };
    delete c[triageKey];
    return checkMigrationClassification(c);
  });
  expectKill("2 070000 unclassified", "070000_UNCLASSIFIED", () => {
    const c = { ...V477_LOCAL_ONLY_CLASS };
    delete c[shadowKey];
    return checkMigrationClassification(c);
  });
  expectKill("3 060000 falsely DEPLOYED", "060000_FALSELY_DEPLOYED", () => {
    const c = {
      ...V477_LOCAL_ONLY_CLASS,
      [triageKey]: { ...V477_LOCAL_ONLY_CLASS[triageKey], class: "DEPLOYED", productionState: "APPLIED" },
    };
    return checkMigrationClassification(c);
  });
  expectKill("4 070000 falsely DEPLOYED", "070000_FALSELY_DEPLOYED", () => {
    const c = {
      ...V477_LOCAL_ONLY_CLASS,
      [shadowKey]: { ...V477_LOCAL_ONLY_CLASS[shadowKey], class: "DEPLOYED", productionState: "DEPLOYED" },
    };
    return checkMigrationClassification(c);
  });
  expectKill("5 shadow migration beta blocker", "SHADOW_MIGRATION_BETA_BLOCKER", () => {
    const c = {
      ...V477_LOCAL_ONLY_CLASS,
      [shadowKey]: { ...V477_LOCAL_ONLY_CLASS[shadowKey], betaRequired: true },
    };
    return checkMigrationClassification(c);
  });
  expectKill("6 shadow runtime ON", "SHADOW_RUNTIME_ON", () =>
    checkShadowNotBetaBlocker({
      ...base,
      budgetPolicySource: base.budgetPolicySource.replace(
        "JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED: false",
        "JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED: true",
      ),
    }),
  );
  expectKill("7 learner runtime ON", "LEARNER_RUNTIME_ON", () =>
    checkShadowNotBetaBlocker({
      ...base,
      budgetPolicySource: base.budgetPolicySource.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"),
    }),
  );
  expectKill("8 contiguous Stripe-live fixture", "CONTIGUOUS_STRIPE_LIVE_FIXTURE", () => {
    // Build the contiguous synthetic token only at runtime so committed source stays clean for gitleaks.
    const fakeStripePrefix = ["sk", "live"].join("_");
    const fakeStripeFixture = `${fakeStripePrefix}_${"abcdefghijklmnopqrstuvwxyz99"}`;
    return checkSecretFixtures({
      ...base,
      triageGateSource: `${base.triageGateSource}\nconst x = ${JSON.stringify(fakeStripeFixture)};\n`,
    });
  });
  expectKill("9 gitleaks broadly disabled", "GITLEAKS_BROADLY_DISABLED", () =>
    checkSecretFixtures({
      ...base,
      gitleaksToml: 'useDefault = false\n[allowlist]\nregexes = []\npaths = ["**/*"]\n',
    }),
  );
  expectKill("10 broad sk_live allowlist", "BROAD_SK_LIVE_ALLOWLIST", () => {
    const broad = ["sk", "live", ".*"].join("_");
    return checkSecretFixtures({
      ...base,
      gitleaksToml: `${base.gitleaksToml}\n'''${broad}'''\n`,
    });
  });
  expectKill("11 PII redactor removed", "PII_REDACTOR_REMOVED", () =>
    checkRepoGuards({
      ...base,
      triageEdgeSource: base.triageEdgeSource.replace(/redactFeedbackText|buildSanitizedFeedbackState/g, "raw"),
      pipelineSource: base.pipelineSource.replace(/redactFeedbackText|buildSanitizedFeedbackState/g, "raw"),
    }),
  );
  expectKill("12 security override removed", "SECURITY_OVERRIDE_REMOVED", () =>
    checkRepoGuards({
      ...base,
      triageEdgeSource: base.triageEdgeSource.replace(/detectSecurityOverride|mergePCandidate/g, "noop"),
      pipelineSource: base.pipelineSource.replace(/detectSecurityOverride|mergePCandidate/g, "noop"),
    }),
  );
  expectKill("13 circuit breaker removed", "CIRCUIT_BREAKER_REMOVED", () =>
    checkRepoGuards({
      ...base,
      jevSource: base.jevSource.replace(/createCircuitBreaker|jev_circuit_open/g, "noop"),
    }),
  );
  expectKill("14 timeout removed", "TIMEOUT_REMOVED", () =>
    checkRepoGuards({
      ...base,
      jevSource: base.jevSource.replace("JEV_TIMEOUT_MS = 3_000", "JEV_TIMEOUT_MS = 30_000"),
    }),
  );
  expectKill("15 typed answer validator removed", "TYPED_ANSWER_VALIDATOR_REMOVED", () =>
    checkRepoGuards({
      ...base,
      jevSource: base.jevSource.replace(/validateJevAnswers/g, "noValidate"),
      jevAnswersSource: "export function noop() {}",
    }),
  );
  expectKill("16 daily budget removed", "DAILY_BUDGET_REMOVED", () =>
    checkRepoGuards({
      ...base,
      triageEdgeSource: base.triageEdgeSource.replace(/jevBudgetLevel|allowNewJevEvaluation|jev_ops_daily/g, "x"),
    }),
  );
  expectKill("17 feedback failure destructive", "FEEDBACK_FAILURE_DESTRUCTIVE", () =>
    checkRepoGuards({
      ...base,
      triageEdgeSource: base.triageEdgeSource
        .replace(/PENDING_AI_TRIAGE|pendingAiTriageWrite/g, "drop")
        .replace(/failures\.push/g, "ignore"),
      pipelineSource: base.pipelineSource.replace(/PENDING_AI_TRIAGE|pendingAiTriageWrite/g, "drop"),
    }),
  );
  expectKill("18 live v1 called PASS", "LIVE_V1_CALLED_PASS", () =>
    checkRepoGuards({
      ...base,
      liveCert: JSON.stringify({ JEV_TRIAGE_LIVE: "PASS", liveVersion: 1 }),
      parity: JSON.stringify({ parity: "PASS", deploymentRequired: true }),
    }),
  );
  expectKill("19 shadow lab called production", "SHADOW_LAB_CALLED_PRODUCTION", () =>
    checkShadowNotBetaBlocker({
      ...base,
      shadowCert: JSON.stringify({ mode: "PRODUCTION", JEV_SHADOW_STRUGGLE_RUNTIME: "ON" }),
      inventory: "no deferred note",
    }),
  );
  expectKill("20 Jev alone expands cohort", "JEV_ALONE_EXPANDS_COHORT", () =>
    checkCohortHuman({
      closedBetaEntry: JSON.stringify({ note: "ai_p_candidate drives WAVE2_ENTRY GO" }),
    }),
  );
  expectKill("21 production Edge auto-deployed", "PRODUCTION_EDGE_AUTO_DEPLOYED", () =>
    checkRepoGuards({
      ...base,
      oaDeploy: "workflow DISPATCH triage-feedback without owner approval; auto-deploy now",
    }),
  );
  expectKill("22 migration auto-applied", "MIGRATION_AUTO_APPLIED", () =>
    checkRepoGuards({
      ...base,
      oaDeploy: "Apply 070000 shadow_struggle immediately with triage",
    }),
  );
  expectKill("23 sibling project touched", "ATOMURUS_TOUCHED", () => {
    const siblingName = ["Ato", "murus"].join("");
    const siblingRef = ["ylof", "dottauzcqcifnnpm"].join("");
    return checkRepoGuards({
      ...base,
      oaDeploy: `${base.oaDeploy}\ndeploy ${siblingName} now\n`,
      triageEdgeSource: `${base.triageEdgeSource}\n// ${siblingRef}\n`,
    });
  });

  console.log("PASS test:jev-hosted-closure · 23 kills");
}

if (mode === "test") test();
else validate();
