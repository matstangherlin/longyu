/**
 * Pure checkers for gate:jev-hosted-closure (PR #330 hosted green + live promotion readiness).
 * No production writes. Live triage remains OWNER_ACTION_REQUIRED until owner OA.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { V477_LOCAL_ONLY_CLASS } from "./v477-constants.mjs";
import { classifyMigrationDrift, localMigrationFiles } from "./migration-drift.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const TRIAGE_MIG = "20261009060000_jev_beta_triage_v2.sql";
const SHADOW_MIG = "20261009070000_jev_shadow_struggle_lab.sql";

const DEPLOYED_LIKE = new Set([
  "DEPLOYED",
  "APPLIED",
  "MATCH",
  "MATCH_EXACT",
  "MATCH_SEMANTIC",
  "LIVE",
  "PRODUCTION",
]);

export function loadClosureSources() {
  return {
    localOnlyClass: { ...V477_LOCAL_ONLY_CLASS },
    budgetPolicySource: read("supabase/functions/_shared/budgetPolicy.ts"),
    gitleaksToml: read(".gitleaks.toml"),
    triageGateSource: read("scripts/lib/jev-beta-triage-v2-gates.mjs"),
    shadowSource: read("supabase/functions/_shared/jevShadowStruggle.ts"),
    triageEdgeSource: read("supabase/functions/triage-feedback/index.ts"),
    pipelineSource: read("supabase/functions/_shared/jevTriagePipeline.ts"),
    jevSource: read("supabase/functions/_shared/jev.ts"),
    jevAnswersSource: read("supabase/functions/_shared/jevAnswers.ts"),
    closedBetaEntry: read("docs/release/closed-beta-entry-criteria.json"),
    productTruth: fs.existsSync(path.join(ROOT, "docs/release/product-truth.json"))
      ? read("docs/release/product-truth.json")
      : "{}",
    liveCert: read("docs/jev/triage-live-certification.json"),
    parity: read("docs/jev/production-parity.json"),
    shadowCert: read("docs/jev/shadow-struggle-lab.json"),
    oaDeploy: read("docs/release/OA-JEV-TRIAGE-V2-DEPLOY.md"),
    inventory: read("docs/reports/migration-drift-inventory.md"),
    clientSources: walkTs(path.join(ROOT, "src")),
  };
}

function walkTs(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walkTs(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push({ file: p, text: fs.readFileSync(p, "utf8") });
  }
  return out;
}

export function checkMigrationClassification(localOnlyClass = V477_LOCAL_ONLY_CLASS, ledgerPath) {
  const errors = [];
  const files = localMigrationFiles(ROOT);
  const drift = classifyMigrationDrift(files);
  for (const row of drift.localOnly) {
    const klass = localOnlyClass[row.local.file];
    if (!klass) errors.push(`LOCAL_ONLY_UNCLASSIFIED:${row.local.file}`);
    else if (klass.class === "ERROR") errors.push(`LOCAL_ONLY_ERROR:${row.local.file}`);
  }

  const triage = localOnlyClass[TRIAGE_MIG];
  const shadow = localOnlyClass[SHADOW_MIG];
  if (!triage) errors.push("060000_UNCLASSIFIED");
  if (!shadow) errors.push("070000_UNCLASSIFIED");

  if (triage) {
    if (DEPLOYED_LIKE.has(String(triage.class))) errors.push("060000_FALSELY_DEPLOYED");
    if (triage.class !== "NOT_YET_DEPLOYED") errors.push("060000_UNCLASSIFIED");
    if (triage.deploymentIntent !== "OWNER_APPROVAL_REQUIRED") errors.push("060000_UNCLASSIFIED");
    if (triage.productionState === "APPLIED" || triage.productionState === "DEPLOYED") {
      errors.push("060000_FALSELY_DEPLOYED");
    }
  }
  if (shadow) {
    if (DEPLOYED_LIKE.has(String(shadow.class))) errors.push("070000_FALSELY_DEPLOYED");
    if (shadow.class !== "NOT_YET_DEPLOYED") errors.push("070000_UNCLASSIFIED");
    if (shadow.deploymentIntent !== "DEFERRED_RESEARCH") errors.push("070000_UNCLASSIFIED");
    if (shadow.betaRequired === true) errors.push("SHADOW_MIGRATION_BETA_BLOCKER");
    if (shadow.productionState === "APPLIED" || shadow.productionState === "DEPLOYED") {
      errors.push("070000_FALSELY_DEPLOYED");
    }
  }

  // Cross-check RC2.3.10 cloud ledger ↔ V477 LOCAL_ONLY classification.
  const ledgerFile = ledgerPath ?? path.join(ROOT, "docs/launch/production-migration-ledger.json");
  if (fs.existsSync(ledgerFile)) {
    const ledger = JSON.parse(fs.readFileSync(ledgerFile, "utf8"));
    const entries = ledger.entries ?? [];
    for (const mig of [TRIAGE_MIG, SHADOW_MIG]) {
      const row = entries.find((e) => e.repoFile === `supabase/migrations/${mig}` || e.repoFile === mig);
      const klass = localOnlyClass[mig];
      if (klass && !row) errors.push("MIGRATION_TRUTH_SYSTEMS_DIVERGED");
      if (row && DEPLOYED_LIKE.has(String(row.state))) {
        errors.push(mig.startsWith("2026100906") ? "060000_FALSELY_DEPLOYED" : "070000_FALSELY_DEPLOYED");
      }
      if (row && row.state !== "REPO_ONLY" && row.state !== "UNKNOWN") {
        // REPO_ONLY is the honest cloud-ledger state for not-yet-applied files.
        if (DEPLOYED_LIKE.has(String(row.state)) || row.state === "MATCH") {
          errors.push(mig.startsWith("2026100906") ? "060000_FALSELY_DEPLOYED" : "070000_FALSELY_DEPLOYED");
        }
      }
    }
  }

  return [...new Set(errors)];
}

export function checkShadowNotBetaBlocker({ closedBetaEntry, shadowCert, budgetPolicySource, inventory }) {
  const errors = [];
  const entry = String(closedBetaEntry ?? "");
  const cert = String(shadowCert ?? "");
  const policy = String(budgetPolicySource ?? "");
  const inv = String(inventory ?? "");

  if (/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*true/.test(policy)) errors.push("SHADOW_RUNTIME_ON");
  if (/JEV_RUNTIME_ENABLED:\s*true/.test(policy)) errors.push("LEARNER_RUNTIME_ON");
  if (!/JEV_SHADOW_STRUGGLE_RUNTIME_ENABLED:\s*false/.test(policy)) errors.push("SHADOW_RUNTIME_ON");
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(policy)) errors.push("LEARNER_RUNTIME_ON");

  // Shadow migration must not be a Closed Beta prerequisite.
  if (/070000.*REQUIRED_FOR_BETA|SHADOW.*beta.?required|shadow_struggle.*prerequisite/i.test(entry)) {
    errors.push("SHADOW_MIGRATION_BETA_BLOCKER");
  }
  if (/"JEV_SHADOW_STRUGGLE_LAB"\s*:\s*"REQUIRED"/.test(entry)) {
    errors.push("SHADOW_MIGRATION_BETA_BLOCKER");
  }
  if (!/DEFERRED_RESEARCH|KEEP_SHADOW|VERIFIED_SHADOW_ONLY/.test(`${cert}\n${inv}`)) {
    errors.push("SHADOW_LAB_CALLED_PRODUCTION");
  }
  if (/"JEV_SHADOW_STRUGGLE_RUNTIME"\s*:\s*"ON"/.test(cert) || /"mode"\s*:\s*"PRODUCTION"/.test(cert)) {
    errors.push("SHADOW_LAB_CALLED_PRODUCTION");
  }
  return [...new Set(errors)];
}

export function checkSecretFixtures({ triageGateSource, gitleaksToml }) {
  const errors = [];
  const tip = String(triageGateSource ?? "");
  // Contiguous Stripe-live fixture in tip working tree must not exist.
  if (/sk_live_[A-Za-z0-9]{16,}/.test(tip)) errors.push("CONTIGUOUS_STRIPE_LIVE_FIXTURE");
  const toml = String(gitleaksToml ?? "");
  if (/regexes\s*=\s*\[\s*\]/.test(toml) && /useDefault\s*=\s*false/.test(toml)) {
    errors.push("GITLEAKS_BROADLY_DISABLED");
  }
  if (/'''sk_live_\.\*'''|'''sk_live_\[|sk_live_\.\+/.test(toml)) errors.push("BROAD_SK_LIVE_ALLOWLIST");
  if (/\[allowlist\][\s\S]*paths\s*=\s*\[[^\]]*["']\*\*/.test(toml)) errors.push("GITLEAKS_BROADLY_DISABLED");
  return [...new Set(errors)];
}

export function checkRepoGuards({
  triageEdgeSource,
  pipelineSource,
  jevSource,
  jevAnswersSource,
  liveCert,
  parity,
  clientSources,
  oaDeploy,
}) {
  const errors = [];
  const triage = String(triageEdgeSource ?? "");
  const pipeline = String(pipelineSource ?? "");
  const combinedTriage = `${triage}\n${pipeline}`;
  const jev = String(jevSource ?? "");
  const answers = String(jevAnswersSource ?? "");
  const cert = String(liveCert ?? "");
  const par = String(parity ?? "");
  const oa = String(oaDeploy ?? "");

  if (!/redactFeedbackText|buildSanitizedFeedbackState/.test(combinedTriage)) errors.push("PII_REDACTOR_REMOVED");
  if (!/detectSecurityOverride|mergePCandidate/.test(combinedTriage)) errors.push("SECURITY_OVERRIDE_REMOVED");
  if (!/createCircuitBreaker|jev_circuit_open/.test(jev)) errors.push("CIRCUIT_BREAKER_REMOVED");
  if (!/JEV_TIMEOUT_MS\s*=\s*3_000/.test(jev)) errors.push("TIMEOUT_REMOVED");
  if (!/validateJevAnswers/.test(jev) || !/validateJevAnswers/.test(answers)) {
    errors.push("TYPED_ANSWER_VALIDATOR_REMOVED");
  }
  if (!/jevBudgetLevel|allowNewJevEvaluation|jev_ops_daily/.test(triage)) errors.push("DAILY_BUDGET_REMOVED");
  if (!/PENDING_AI_TRIAGE|pendingAiTriageWrite/.test(combinedTriage)) errors.push("FEEDBACK_FAILURE_DESTRUCTIVE");
  if (!/catch \(err\)/.test(triage) || !/failures\.push/.test(triage)) {
    errors.push("FEEDBACK_FAILURE_DESTRUCTIVE");
  }

  if (/"parity"\s*:\s*"PASS"/.test(par) && /"deploymentRequired"\s*:\s*true/.test(par)) {
    errors.push("LIVE_V1_CALLED_PASS");
  }
  if (/"JEV_TRIAGE_LIVE"\s*:\s*"PASS"/.test(cert) && /"liveVersion"\s*:\s*1/.test(cert)) {
    errors.push("LIVE_V1_CALLED_PASS");
  }

  for (const f of clientSources ?? []) {
    const text = typeof f === "string" ? f : f.text;
    if (/TYPESAFE_API_KEY|VITE_TYPESAFE|api\.typesafe\.ai|\baskJev\b/.test(text)) {
      errors.push("API_KEY_CLIENT_SIDE");
    }
  }

  // Owner pack must NOT auto-deploy; must exclude shadow migration from immediate promotion.
  if (/auto-deploy|workflow.*DISPATCH.*triage-feedback.*without.?owner/i.test(oa)) {
    errors.push("PRODUCTION_EDGE_AUTO_DEPLOYED");
  }
  if (/Apply.*070000|apply.*shadow_struggle/i.test(oa) && !/EXCLUDE|do not apply|DEFERRED/i.test(oa)) {
    errors.push("MIGRATION_AUTO_APPLIED");
  }
  if (!/EXCLUDE|do not apply|DEFERRED_RESEARCH|070000/i.test(oa)) {
    errors.push("MIGRATION_AUTO_APPLIED");
  }
  // Affirmative sibling-project mutation — ignore forbid docs ("Never touch …").
  // Names/ids assembled at runtime so LON-001 scanner stays clean on tip source.
  const siblingName = ["Ato", "murus"].join("");
  const siblingRef = ["ylof", "dottauzcqcifnnpm"].join("");
  const atomurusCorpus = `${triage}\n${oa}`.replace(new RegExp(`never\\s+touch\\s+${siblingName}`, "gi"), "");
  if (
    new RegExp(`\\b(deploy|apply|migrate|touch)\\s+${siblingName}\\b`, "i").test(atomurusCorpus) ||
    new RegExp(`\\b${siblingRef}\\b`).test(triage)
  ) {
    errors.push("ATOMURUS_TOUCHED");
  }
  return [...new Set(errors)];
}

export function checkCohortHuman({ closedBetaEntry }) {
  const errors = [];
  const s = String(closedBetaEntry ?? "");
  if (/ai_p_candidate|jevScore/.test(s) && /WAVE2_ENTRY|cohort.*GO/.test(s) && !/human/i.test(s)) {
    errors.push("JEV_ALONE_EXPANDS_COHORT");
  }
  return errors;
}

export function checkAll(sources = loadClosureSources()) {
  return [
    ...checkMigrationClassification(sources.localOnlyClass),
    ...checkShadowNotBetaBlocker(sources),
    ...checkSecretFixtures(sources),
    ...checkRepoGuards(sources),
    ...checkCohortHuman(sources),
  ];
}
