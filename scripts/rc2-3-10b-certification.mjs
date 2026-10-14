#!/usr/bin/env node
/**
 * RC2.3.10B — production reconciliation certification gates.
 *
 *   node scripts/rc2-3-10b-certification.mjs validate   committed artifacts + code satisfy every rule
 *   node scripts/rc2-3-10b-certification.mjs test       mutations: every rule must fail when broken
 *
 * Reads only committed files. Never talks to production, never applies SQL,
 * never deploys. Production facts come from docs/launch/production-snapshot.json
 * and the rc2-3-10b-* artifacts derived from it.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";
import {
  checkBackupRequired,
  checkBuildConfig,
  checkCallGraphTruth,
  checkClosureHonesty,
  checkCloudSmoke,
  checkDestructiveSql,
  checkEdgeDeployOrder,
  checkEdgeParity,
  checkGitleaksWorkflows,
  checkIssue273,
  checkJevNoLearnerCall,
  checkJevNotInClient,
  checkJevStruggleOff,
  checkLeaguePolicy,
  checkLon001,
  checkMonetizationOff,
  checkNoAutoApply,
  checkNoAutoPurchase,
  checkOAuthRedirectConfig,
  checkOldTriageNotPass,
  checkOwnerActions,
  checkPlanDependencies,
  checkProdOnlyForensics,
  checkProductTruthFreshness,
  checkPublicExecute,
  checkReconciliationPromotion,
  checkResendFailSoft,
  checkRlsStatic,
  checkSearchPath,
  checkSentryFailSoft,
  checkSentryScrub,
  checkSmtpSecrets,
  checkSnapshotEmailPii,
  checkStripeKeyShapes,
  checkStripeWebhookSource,
  checkRetentionDryRun,
  checkTurnstileBusinessLead,
  checkUserMetadataAuthz,
  checkViews,
  checkWithCheck,
  lon001Probe,
  migrationAllowedWithoutBackup,
} from "./lib/rc2-3-10b-gates.mjs";
import {
  checkArtifactProvenance,
  checkCloudMatrix,
  checkJevGuardrails,
  checkTurnstileFailClosed,
  productionMigrationReady,
} from "./lib/rc2-3-10-cloud.mjs";

const root = process.cwd();
const mode = process.argv[2];
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readIf = (rel) => (fs.existsSync(path.join(root, rel)) ? read(rel) : "");
const readJson = (rel) => JSON.parse(read(rel));

const TEXT_EXT = /\.(mjs|cjs|js|ts|tsx|json|md|yml|yaml|toml|sql|sh|html|txt|example|properties|gradle|xml)$/;
const SKIP_DIR = /^(node_modules|dist|\.git|android\/app\/build|android\/build|reports|playwright-report|test-results)\//;

function listRepoFiles() {
  const out = spawnSync("git", ["ls-files", "-co", "--exclude-standard"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return out.stdout
    .split("\n")
    .map((l) => l.trim())
    .filter((rel) => rel && !SKIP_DIR.test(rel) && (TEXT_EXT.test(rel) || /^\.env/.test(path.basename(rel))))
    .filter((rel) => {
      try {
        const st = fs.statSync(path.join(root, rel));
        return st.isFile() && st.size < 3_000_000;
      } catch {
        return false;
      }
    });
}

function dirFiles(dir, ext) {
  return fs.existsSync(path.join(root, dir)) ? fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(ext)).sort() : [];
}

function loadWorld() {
  const repoFiles = listRepoFiles();
  const allText = repoFiles.map((file) => ({ file, text: read(file) }));
  const workflows = Object.fromEntries(dirFiles(".github/workflows", ".yml").map((f) => [`.github/workflows/${f}`, read(`.github/workflows/${f}`)]));
  const sqlFiles = [
    ...dirFiles("supabase/migrations", ".sql").map((f) => `supabase/migrations/${f}`),
    ...dirFiles("supabase/pending", ".sql").map((f) => `supabase/pending/${f}`),
  ].map((file) => ({ file, text: read(file) }));
  const functionSlugs = fs
    .readdirSync(path.join(root, "supabase/functions"), { withFileTypes: true })
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name)
    .sort();
  const edgeSources = Object.fromEntries(functionSlugs.map((s) => [s, read(`supabase/functions/${s}/index.ts`)]));
  const srcFiles = allText.filter((f) => /^src\/.*\.(ts|tsx)$/.test(f.file) && !/\.(test|spec)\.(ts|tsx)$/.test(f.file) && !/\/__tests__\//.test(f.file));
  const configureSources = {
    "scripts/configure-supabase-auth.mjs": read("scripts/configure-supabase-auth.mjs"),
    ...(workflows[".github/workflows/configure-supabase-auth.yml"] ? { ".github/workflows/configure-supabase-auth.yml": workflows[".github/workflows/configure-supabase-auth.yml"] } : {}),
  };
  const deployAllowlist = (() => {
    const m = /options:\s*\[([^\]]*)\]/.exec(workflows[".github/workflows/deploy-edge-function.yml"] ?? "");
    return m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [];
  })();
  const sqlByFile = Object.fromEntries(sqlFiles.map((f) => [f.file, f.text]));
  return {
    allText,
    workflows,
    gitleaksToml: read(".gitleaks.toml"),
    packageJson: readJson("package.json"),
    reconciliation: readJson("docs/launch/rc2-3-10b-migration-reconciliation.json"),
    ledger: readJson("docs/launch/production-migration-ledger.json"),
    plan: readJson("docs/launch/rc2-3-10b-migration-plan.json"),
    graph: readJson("docs/launch/rc2-3-10b-client-backend-call-graph.json"),
    snapshot: readJson("docs/launch/production-snapshot.json"),
    classification: readJson("docs/launch/rc2-3-10b-security-advisor-classification.json"),
    matrix: readJson("docs/release/rc2-3-10-cloud-matrix.json"),
    ownerActions: readJson("docs/release/owner-actions.json"),
    certifications: readJson("docs/release/certifications.json"),
    productTruth: readJson("docs/release/product-truth.json"),
    featureFlags: readJson("docs/release/feature-flags.json"),
    forensicsMd: read("docs/reports/rc2-3-10b-migration-forensics.md"),
    prodOnly: readJson("docs/launch/rc2-3-10b-prod-only-classification.json"),
    edgeParity: readJson("docs/launch/rc2-3-10b-edge-parity.json"),
    closureMd: read("docs/reports/rc2-3-10b-closure.md"),
    sqlFiles,
    sqlByFile,
    pendingSql: sqlFiles.filter((f) => f.file.startsWith("supabase/pending/")),
    functionSlugs,
    edgeSources,
    srcFiles,
    configureSources,
    deployAllowlist,
    jevSource: read("supabase/functions/_shared/jev.ts"),
    budgetPolicySource: read("supabase/functions/_shared/budgetPolicy.ts"),
    createAccountSource: edgeSources["create-account"],
    triageSource: edgeSources["triage-feedback"],
    pipelineSource: read("supabase/functions/_shared/jevTriagePipeline.ts"),
    webhookSource: edgeSources["stripe-webhook"],
    checkoutSource: edgeSources["create-checkout-session"],
    stripeLiveGuardSource: read("supabase/functions/_shared/stripeLiveGuard.ts"),
    businessLeadSource: edgeSources["submit-business-lead"],
    errorReportingSource: read("src/lib/observability/errorReporting.ts"),
    errorScrubSource: read("src/lib/observability/errorScrub.ts"),
    mainSource: read("src/main.tsx"),
    boundarySource: read("src/components/system/ErrorBoundary.tsx"),
    oauthRedirectSource: read("src/lib/auth/oauthRedirect.ts"),
    repositorySource: read("src/lib/repositories/supabaseLearningRepository.ts"),
    smokeSource: read("scripts/cloud-smoke.mjs"),
    preflightSource: read("scripts/production-backup-preflight.mjs"),
    retentionSql: read("supabase/pending/rc2-3-10-telemetry-retention.sql"),
    netlifyToml: read("netlify.toml"),
    androidBuildYml: workflows[".github/workflows/android-build.yml"] ?? "",
    androidReleaseYml: workflows[".github/workflows/android-release.yml"] ?? "",
    envExample: readIf(".env.example"),
    backupRunbookExists: fs.existsSync(path.join(root, "docs/launch/production-backup-runbook.md")),
  };
}

function productTruthExit() {
  const r = spawnSync(process.execPath, ["scripts/generate-product-truth.mjs", "--check"], { cwd: root, encoding: "utf8" });
  if (r.status !== 0) process.stderr.write(r.stderr);
  return r.status;
}

/** Every rule, evaluated on a world. Keys are stable ids used by the mutation table. */
function evaluate(w, { checkExitCode }) {
  const errors = {};
  const add = (id, list) => {
    errors[id] = list;
  };
  add("R01_gitleaks", checkGitleaksWorkflows({ workflows: w.workflows, gitleaksToml: w.gitleaksToml }));
  add("R02_product_truth", checkProductTruthFreshness({ checkExitCode, packageScript: w.packageJson.scripts["validate:product-truth"] }));
  add("R03_reconciliation", checkReconciliationPromotion({ reconciliation: w.reconciliation, ledger: w.ledger, matrix: w.matrix }));
  add("R04_plan", [...checkPlanDependencies({ plan: w.plan }), ...checkNoAutoApply({ workflows: w.workflows })]);
  add("R05_prod_only", checkProdOnlyForensics({ ledger: w.ledger, forensicsMd: w.forensicsMd, classification: w.prodOnly }));
  add("R06_call_graph", checkCallGraphTruth({ graph: w.graph, snapshot: w.snapshot, matrix: w.matrix }));
  add("R07_backup", checkBackupRequired({ plan: w.plan, matrix: w.matrix, preflightSource: w.preflightSource, runbookExists: w.backupRunbookExists }));
  add("R08_destructive", checkDestructiveSql({ pendingSql: w.pendingSql, plan: w.plan }));
  add("R09_rls", checkRlsStatic({ sqlFiles: w.sqlFiles, snapshot: w.snapshot }));
  add("R10_league", checkLeaguePolicy({ sqlFiles: w.sqlFiles, plan: w.plan, snapshot: w.snapshot, matrix: w.matrix }));
  add("R11_public_execute", checkPublicExecute({ snapshot: w.snapshot, classification: w.classification, pendingSql: w.pendingSql }));
  add("R12_search_path", checkSearchPath({ sqlFiles: w.sqlFiles }));
  add("R13_user_metadata", checkUserMetadataAuthz({ sqlFiles: w.sqlFiles, edgeSources: w.edgeSources }));
  add("R14_with_check", checkWithCheck({ sqlFiles: w.sqlFiles }));
  add("R15_views", checkViews({ sqlFiles: w.sqlFiles, snapshot: w.snapshot }));
  add("R16_jev_client", checkJevNotInClient({ srcFiles: w.srcFiles, envExample: w.envExample }));
  add("R17_jev_learner", checkJevNoLearnerCall({ srcFiles: w.srcFiles, edgeSources: w.edgeSources, budgetPolicySource: w.budgetPolicySource }));
  add("R18_jev_guardrails", checkJevGuardrails({ jevSource: w.jevSource, budgetPolicySource: w.budgetPolicySource, triageSource: w.triageSource }));
  add("R21_old_triage", checkOldTriageNotPass({ matrix: w.matrix, snapshot: w.snapshot }));
  add("R22_edge_order", checkEdgeDeployOrder({ plan: w.plan, graph: w.graph, sqlByFile: w.sqlByFile, workflowAllowlist: w.deployAllowlist }));
  add("R22b_edge_parity", checkEdgeParity({ parity: w.edgeParity, repoFunctions: w.functionSlugs, snapshot: w.snapshot, graph: w.graph }));
  add("R23_stripe_keys", checkStripeKeyShapes({ files: w.allText }));
  add("R25_stripe_webhook", checkStripeWebhookSource({ webhookSource: w.webhookSource }));
  add("R26_oauth", checkOAuthRedirectConfig({ configureSources: w.configureSources, oauthRedirectSource: w.oauthRedirectSource }));
  add("R28_smtp", checkSmtpSecrets({ files: w.allText }));
  add("R29_resend", checkResendFailSoft({ createAccountSource: w.createAccountSource, srcFiles: w.srcFiles, edgeSources: w.edgeSources }));
  add("R30_sentry_soft", checkSentryFailSoft({ errorReportingSource: w.errorReportingSource, mainSource: w.mainSource, boundarySource: w.boundarySource }));
  add("R31_sentry_scrub", checkSentryScrub({ errorReportingSource: w.errorReportingSource, errorScrubSource: w.errorScrubSource }));
  add("R32_cloud_matrix", checkCloudMatrix(w.matrix));
  add("R33_build", checkBuildConfig({ netlifyToml: w.netlifyToml, androidBuildYml: w.androidBuildYml, androidReleaseYml: w.androidReleaseYml, workflows: w.workflows }));
  add("R35_turnstile", [
    ...checkTurnstileFailClosed(w.createAccountSource, {
      "netlify.toml": w.netlifyToml,
      ...Object.fromEntries(Object.entries(w.workflows).filter(([f, t]) => /drjcfalvlbbeblmmyhwj/.test(t) || /(release|deploy)/.test(f))),
    }),
    ...checkTurnstileBusinessLead({ businessLeadSource: w.businessLeadSource }),
  ]);
  add("R36_smoke", checkCloudSmoke({ smokeSource: w.smokeSource, workflowText: w.workflows[".github/workflows/cloud-smoke.yml"] }));
  add("R38_retention", checkRetentionDryRun({ retentionSql: w.retentionSql }));
  add("R39_pii", checkSnapshotEmailPii({ matrix: w.matrix, ownerActions: w.ownerActions, repositorySource: w.repositorySource, triageSource: w.triageSource, pipelineSource: w.pipelineSource, scrubSource: w.errorScrubSource }));
  add("R40_owner_actions", checkOwnerActions({ ownerActions: w.ownerActions, matrix: w.matrix }));
  add("R41_issue273", checkIssue273({ matrix: w.matrix }));
  add("R42_monetization", checkMonetizationOff({ certifications: w.certifications, productTruth: w.productTruth, checkoutSource: w.checkoutSource, ownerActions: w.ownerActions, stripeLiveGuardSource: w.stripeLiveGuardSource }));
  add("R43_jev_struggle", checkJevStruggleOff({ budgetPolicySource: w.budgetPolicySource, productTruth: w.productTruth, srcFiles: w.srcFiles, featureFlags: w.featureFlags }));
  add("R44_auto_purchase", checkNoAutoPurchase({ files: w.allText.filter((f) => /^(scripts|src|supabase\/functions|\.github)\//.test(f.file)), budgetPolicySource: w.budgetPolicySource }));
  add("R45_lon001", checkLon001({ files: w.allText.filter((f) => /rc2-3-10b/.test(f.file) || /^docs\/release\/OWNER_NEXT_ACTIONS\.md$/.test(f.file)) }));
  add("R46_closure", checkClosureHonesty({ closureMd: w.closureMd }));
  return errors;
}

const clone = (v) => structuredClone(v);

if (mode === "validate") {
  const w = loadWorld();
  const result = evaluate(w, { checkExitCode: productTruthExit() });
  let bad = 0;
  for (const [id, list] of Object.entries(result)) {
    for (const e of list) {
      console.error(`FAIL ${id}: ${e}`);
      bad += 1;
    }
  }
  if (bad) {
    console.error(`FAIL validate:rc2-3-10b — ${bad} violation(s)`);
    process.exit(1);
  }
  console.log(`PASS validate:rc2-3-10b · ${Object.keys(result).length} rule groups · cloud matrix overall ${w.matrix.overall} · plan production writes ${w.plan.safety.productionWrites} · ${w.functionSlugs.length} edge functions classified`);
  process.exit(0);
}

if (mode === "test") {
  const w = loadWorld();
  const baseline = evaluate(w, { checkExitCode: 0 });
  const dirty = Object.entries(baseline).flatMap(([id, list]) => list.map((e) => `${id}:${e}`));
  if (dirty.length) {
    console.error(`FAIL test:rc2-3-10b — baseline not clean:\n  ${dirty.join("\n  ")}`);
    process.exit(1);
  }

  const results = [];
  const covered = new Set();
  /** Apply `mutate` to a copy of the world, re-run every rule, require `code` to fire. */
  const kill = (n, label, code, mutate, opts = {}) => {
    const m = mutate({ ...w }, w);
    const out = evaluate(m, { checkExitCode: opts.checkExitCode ?? 0 });
    const flat = Object.values(out).flat();
    const killed = flat.some((e) => e.startsWith(code));
    results.push(killed);
    if (killed) covered.add(n);
    console.log(`${killed ? "KILLED" : "SURVIVED"} #${String(n).padStart(2, "0")} ${label}: ${code}`);
  };
  /** Shorthand: deep-clone one key, edit it, leave the rest shared. */
  const edit = (key, fn) => (copy, orig) => {
    const v = clone(orig[key]);
    const r = fn(v);
    return { ...copy, [key]: r === undefined ? v : r };
  };
  const editText = (key, from, to) => edit(key, (v) => {
    const next = typeof from === "string" ? v.replace(from, to) : v.replace(from, to);
    if (next === v) throw new Error(`mutation target not found in ${key}: ${String(from)}`);
    return next;
  });
  const withFile = (key, file, fn) => edit(key, (list) => {
    const f = list.find((x) => x.file === file);
    if (!f) throw new Error(`file ${file} not in ${key}`);
    f.text = fn(f.text);
  });
  const sqlEdit = (file, fn) => (copy, orig) => {
    const sqlFiles = orig.sqlFiles.map((f) => (f.file === file ? { ...f, text: fn(f.text) } : f));
    return { ...copy, sqlFiles, sqlByFile: Object.fromEntries(sqlFiles.map((f) => [f.file, f.text])), pendingSql: sqlFiles.filter((f) => f.file.startsWith("supabase/pending/")) };
  };
  const addSql = (file, text) => (copy, orig) => {
    const sqlFiles = [...orig.sqlFiles, { file, text }];
    return { ...copy, sqlFiles, sqlByFile: Object.fromEntries(sqlFiles.map((f) => [f.file, f.text])), pendingSql: sqlFiles.filter((f) => f.file.startsWith("supabase/pending/")) };
  };
  const setGate = (id, patch) => edit("matrix", (m) => {
    m.gates[id] = { ...m.gates[id], ...patch };
  });
  const setWorkflow = (file, fn) => (copy, orig) => {
    const workflows = { ...orig.workflows, [file]: fn(orig.workflows[file]) };
    return { ...copy, workflows, androidBuildYml: workflows[".github/workflows/android-build.yml"], androidReleaseYml: workflows[".github/workflows/android-release.yml"] };
  };
  const addFile = (file, text) => (copy, orig) => ({ ...copy, allText: [...orig.allText, { file, text }] });
  const addSrc = (file, text) => (copy, orig) => ({ ...copy, srcFiles: [...orig.srcFiles, { file, text }], allText: [...orig.allText, { file, text }] });
  const editEdge = (slug, fn) => (copy, orig) => {
    const edgeSources = { ...orig.edgeSources, [slug]: fn(orig.edgeSources[slug]) };
    return {
      ...copy,
      edgeSources,
      createAccountSource: edgeSources["create-account"],
      triageSource: edgeSources["triage-feedback"],
      webhookSource: edgeSources["stripe-webhook"],
      checkoutSource: edgeSources["create-checkout-session"],
      businessLeadSource: edgeSources["submit-business-lead"],
    };
  };
  const compose = (...fns) => (copy, orig) => fns.reduce((acc, f) => f(acc, orig), copy);

  // 1 gitleaks bypass
  const orTrue = ["|", "|", " true"].join("");
  const continueOnError = ["continue-on-error", ": true"].join("");
  kill(1, "gitleaks step continues on error", "GITLEAKS_BYPASS", setWorkflow(".github/workflows/security.yml", (t) => t.replace("uses: gitleaks/gitleaks-action@v2", `uses: gitleaks/gitleaks-action@v2\n        ${continueOnError}`)));
  kill(1, "gitleaks step replaced by a shell that cannot fail", "GITLEAKS_BYPASS", setWorkflow(".github/workflows/security.yml", (t) => `${t}\n      - run: gitleaks detect --source . ${orTrue}\n`));
  kill(1, "gitleaks broad allowlist", "GITLEAKS_ALLOWLIST_BROAD", editText("gitleaksToml", "'''sk_live_abcdefghijklmnop1234'''", "'''sk_live_.*'''"));
  // 2 stale Product Truth
  kill(2, "stale Product Truth", "PRODUCT_TRUTH_STALE", (c) => c, { checkExitCode: 1 });
  kill(2, "Product Truth check not enforced", "PRODUCT_TRUTH_CHECK_NOT_ENFORCED", edit("packageJson", (p) => {
    p.scripts["validate:product-truth"] = "node scripts/generate-product-truth.mjs";
  }));
  // 3 unknown promoted to MATCH
  const unknownIdx = (r) => r.entries.findIndex((e) => e.status === "UNKNOWN" && e.priorState === "UNKNOWN");
  kill(3, "UNKNOWN promoted to MATCH_EXACT", "MATCH_WITHOUT_STRUCTURAL_PROOF", edit("reconciliation", (r) => {
    const e = r.entries[unknownIdx(r)];
    e.status = "MATCH_EXACT";
    e.confidence = 1;
  }));
  kill(3, "placeholder promoted to MATCH_SEMANTIC by name", "PLACEHOLDER_PROMOTED", edit("reconciliation", (r) => {
    const e = r.entries.find((x) => (x.evidence ?? []).some((l) => /placeholder/.test(l)));
    e.status = "MATCH_SEMANTIC";
    e.confidence = 0.95;
    e.evidence = [...e.evidence, "structural hash aaaaaaaaaaaaaaaa equal", "9 structural objects identical"];
  }));
  kill(3, "MIGRATION_HISTORY_PASS with unreconciled rows", "MIGRATION_HISTORY_PASS_WITH_UNRECONCILED_ROWS", setGate("MIGRATION_HISTORY_PASS", { status: "PASS", evidence: ["x"] }));
  // 4 repo-only applied without dependencies
  kill(4, "dependent applied before its dependency", "REPO_ONLY_APPLIED_WITHOUT_DEPENDENCY", edit("plan", (p) => {
    p.minimumSafeSet.migrations = [...p.minimumSafeSet.migrations].reverse();
  }));
  kill(4, "dependency dropped from the safe set", "REPO_ONLY_APPLIED_WITHOUT_DEPENDENCY", edit("plan", (p) => {
    p.minimumSafeSet.migrations = p.minimumSafeSet.migrations.filter((f) => !/20260826230000_placement_onboarding\.sql$/.test(f));
  }));
  kill(4, "unsafe file in the safe set", "UNSAFE_FILE_IN_SAFE_SET", edit("plan", (p) => {
    const unsafe = p.batches.flatMap((b) => b.migrations).find((m) => m.class === "UNSAFE_UNTIL_RECONCILED");
    p.minimumSafeSet.migrations.push(unsafe.file);
  }));
  kill(4, "workflow auto-applies migrations on push", "MIGRATION_AUTO_APPLY_TRIGGER", setWorkflow(".github/workflows/apply-beta-feedback.yml", (t) => t.replace("on:\n  workflow_dispatch:", "on:\n  push:\n  workflow_dispatch:")));
  kill(4, "plan claims production write", "PLAN_CLAIMS_PRODUCTION_WRITE", edit("plan", (p) => {
    p.safety.productionWrites = true;
  }));
  // 5 PROD_ONLY ignored
  kill(5, "PROD_ONLY row dropped from classification", "PROD_ONLY_NOT_CLASSIFIED", edit("prodOnly", (c) => {
    c.rows = c.rows.slice(1);
  }));
  kill(5, "PROD_ONLY row missing from forensics", "PROD_ONLY_NOT_IN_FORENSICS", editText("forensicsMd", /harden_economy_grant_story_energy/g, "redacted_row"));
  kill(5, "PROD_ONLY classified without evidence", "PROD_ONLY_WITHOUT_EVIDENCE", edit("prodOnly", (c) => {
    c.rows[0].evidence = [];
  }));
  kill(5, "PROD_ONLY UNKNOWN without proof plan", "PROD_ONLY_UNKNOWN_WITHOUT_PROOF_PLAN", edit("prodOnly", (c) => {
    c.rows[0].classification = "UNKNOWN";
    delete c.rows[0].requiredProof;
  }));
  // 6 schema missing client RPC but PASS
  kill(6, "missing client RPC called PRESENT", "CALL_GRAPH_FALSE_PRESENT", edit("graph", (g) => {
    g.entries.find((e) => e.kind === "rpc" && e.productionStatus === "MISSING").productionStatus = "PRESENT";
  }));
  kill(6, "missing client object with severity NONE", "CALL_GRAPH_MISSING_WITHOUT_SEVERITY", edit("graph", (g) => {
    g.entries.find((e) => e.productionStatus === "MISSING").severity = "NONE";
  }));
  kill(6, "schema truth PASS with missing client objects", "FALSE_PASS_WITH_MISSING_CLIENT_OBJECTS", setGate("PRODUCTION_SCHEMA_TRUTH_PASS", { status: "PASS", evidence: ["x"] }));
  // 7 backup absent
  {
    // The authority must reject; surface a violation only if it ever stops doing so.
    const sha = "a".repeat(40);
    const now = Date.parse("2026-10-08T00:00:00Z");
    const request = {
      candidateSha: sha,
      schemaDiff: { status: "PASS", readAt: "2026-10-07" },
      ledger: { status: "PASS" },
      backup: { verified: true, sourceProject: "drjcfalvlbbeblmmyhwj", takenAt: "2026-10-07" },
      review: { reviewer: "owner", migrations: ["x.sql"] },
      down: { strategy: "restore export" },
      ownerApproval: { by: "owner", at: "2026-10-07" },
    };
    const blocked = productionMigrationReady({ ...request, backup: undefined }, now).status === "BLOCKED";
    const unverified = productionMigrationReady({ ...request, backup: { ...request.backup, verified: false } }, now).status === "BLOCKED";
    results.push(blocked && unverified);
    if (blocked && unverified) covered.add(7);
    console.log(`${blocked && unverified ? "KILLED" : "SURVIVED"} #07 PRODUCTION_MIGRATION_READY without a verified backup: BLOCKED`);
  }
  kill(7, "plan without backup precondition", "MIGRATION_WITHOUT_BACKUP_PRECONDITION", edit("plan", (p) => {
    p.minimumSafeSet.preconditions = p.minimumSafeSet.preconditions.filter((l) => !/backup|export/i.test(l)).map((l) => l.replace(/PRODUCTION_MIGRATION_READY: schema diff, verified export and owner approval/, "PRODUCTION_MIGRATION_READY: schema diff and owner approval"));
  }));
  kill(7, "backup preflight executes by default", "BACKUP_PREFLIGHT_NOT_DRY_RUN", editText("preflightSource", "DRY-RUN BY DEFAULT", "RUNS BY DEFAULT"));
  kill(7, "issue #273 ready without backup", "READY_WITHOUT_BACKUP", setGate("ISSUE_273_RESOLUTION_READY", { status: "PASS", evidence: ["x"] }));
  // 8 destructive SQL before approval
  kill(8, "destructive statement in pending SQL", "DESTRUCTIVE_SQL_IN_PENDING", addSql("supabase/pending/zz-destructive.sql", "drop table public.user_progress;\ntruncate public.subscriptions;"));
  kill(8, "irreversible migration without approval gate", "DESTRUCTIVE_BEFORE_APPROVAL_GATE", edit("plan", (p) => {
    p.minimumSafeSet.preconditions = ["Apply whenever convenient."];
  }));
  // 9..15 static SQL posture
  kill(9, "table without RLS", "RLS_NOT_ENABLED", addSql("supabase/migrations/99999999999999_zz_probe.sql", "create table public.zz_probe (id uuid primary key);"));
  kill(9, "production table with RLS off", "RLS_OFF_IN_PRODUCTION", edit("snapshot", (s) => {
    s.tables[0].rls = false;
  }));
  kill(10, "league policy recursion restored as final policy", "LEAGUE_POLICY_RECURSIVE", addSql("supabase/migrations/99999999999998_zz_league.sql", 'create policy "league_memberships_select_peers" on public.league_memberships for select to authenticated using (league_tier_id = (select league_tier_id from public.league_memberships where user_id = auth.uid()));'));
  kill(10, "league fix dropped from plan", "LEAGUE_FIX_NOT_IN_PLAN", edit("plan", (p) => {
    p.minimumSafeSet.migrations = p.minimumSafeSet.migrations.filter((f) => !/league-memberships-policy-recursion/.test(f));
  }));
  kill(10, "RLS PASS despite league recursion", "RLS_PASS_WITH_LEAGUE_RECURSION", setGate("PRODUCTION_RLS_PASS", { status: "PASS", evidence: ["x"] }));
  kill(11, "anon-executable definer unclassified", "ANON_EXECUTE_UNCLASSIFIED", edit("snapshot", (s) => {
    s.functions.push({ name: "zz_new_public_rpc", securityDefiner: true, anonExecute: true, authenticatedExecute: true });
  }));
  kill(11, "new pending definer without PUBLIC revoke", "DEFINER_WITHOUT_PUBLIC_REVOKE", addSql("supabase/pending/zz-definer.sql", "create or replace function public.zz_open() returns int language sql security definer set search_path = public as $$ select 1 $$;"));
  kill(12, "definer without search_path", "DEFINER_WITHOUT_SEARCH_PATH", addSql("supabase/migrations/99999999999997_zz_definer.sql", "create or replace function public.zz_x() returns int language sql security definer as $$ select 1 $$;"));
  kill(13, "policy trusting user_metadata", "USER_METADATA_AUTHZ", addSql("supabase/migrations/99999999999996_zz_policy.sql", "create policy zz_admin on public.profiles for select using ((auth.jwt() -> 'user_metadata' ->> 'role') = 'admin');"));
  kill(13, "edge function reading user_metadata for role", "USER_METADATA_AUTHZ", editEdge("delete-account", (t) => `${t}\nconst isAdmin = user.user_metadata?.role === "admin";`));
  kill(14, "update policy without WITH CHECK", "POLICY_WITHOUT_WITH_CHECK", addSql("supabase/migrations/99999999999995_zz_policy.sql", "create policy zz_upd on public.profiles for update to authenticated using (id = auth.uid());"));
  kill(15, "view without security_invoker", "VIEW_NOT_SECURITY_INVOKER", addSql("supabase/migrations/99999999999994_zz_view.sql", "create view public.zz_open_view as select id from public.profiles;"));
  kill(15, "production view exposed to anon", "VIEW_EXPOSED_TO_API_ROLES", edit("snapshot", (s) => {
    s.views[0].grants.push("anon");
  }));
  // 16-21 Jev
  kill(16, "Jev key in client source", "JEV_KEY_OR_HOST_IN_CLIENT", addSrc("src/lib/zz.ts", "const k = import.meta.env.VITE_TYPESAFE_API_KEY;"));
  {
    const errors = checkArtifactProvenance({ versionJson: { commitSha: "a".repeat(40), curriculumFingerprint: "5a64821d0b7d", buildChannel: "production" }, expectedSha: "a".repeat(40), expectedFingerprint: "5a64821d0b7d", files: { "dist/a.js": "fetch('https://api.typesafe.ai/v1/systemone')" } });
    const killed = errors.some((e) => e.startsWith("SECRET_IN_BUNDLE:JEV_CLIENT_CALL"));
    results.push(killed);
    if (killed) covered.add(16);
    console.log(`${killed ? "KILLED" : "SURVIVED"} #16 Jev host in a shipped bundle: SECRET_IN_BUNDLE:JEV_CLIENT_CALL`);
  }
  kill(17, "learner path calls Jev", "JEV_LEARNER_CALL_IN_CLIENT", addSrc("src/lib/zz.ts", 'import { askJev } from "../../supabase/functions/_shared/jev";'));
  kill(17, "other edge function calls Jev", "JEV_CALLED_FROM_LEARNER_EDGE", editEdge("commit-placement", (t) => `${t}\nawait askJev(k, s, q, "LEARNER_RUNTIME");`));
  kill(17, "learner runtime on by default", "JEV_RUNTIME_ENABLED_BY_DEFAULT", editText("budgetPolicySource", "JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"));
  kill(18, "Jev without timeout", "JEV_TIMEOUT_MISSING", editText("jevSource", /AbortController/g, "Nothing"));
  kill(19, "Jev without circuit breaker", "JEV_CIRCUIT_BREAKER_MISSING", editText("jevSource", /jev_circuit_open/g, "x"));
  kill(20, "triage without dedupe", "JEV_DEDUPE_MISSING", editEdge("triage-feedback", (t) => t.replace(/jevInputHash\(/g, "noHash(")));
  kill(21, "old triage v1 accepted as PASS", "OLD_TRIAGE_ACCEPTED_AS_PASS", setGate("JEV_SERVER_TRIAGE_PASS", { status: "PASS", evidence: ["x"] }));
  // 22 edge deploy before migration dependency
  kill(22, "edge deployed before its migration", "EDGE_DEPLOY_BEFORE_MIGRATION_DEPENDENCY", edit("plan", (p) => {
    p.minimumSafeSet.migrations = p.minimumSafeSet.migrations.filter((f) => !/placement_onboarding/.test(f));
  }));
  kill(22, "workflow allowlist includes a function with unmet dependency", "WORKFLOW_ALLOWLIST_HAS_UNMET_DEPENDENCY", (c) => ({ ...c, deployAllowlist: [...c.deployAllowlist, "commit-placement"] }));
  kill(22, "parity marks missing-dependency function READY_TO_DEPLOY", "EDGE_PARITY_READY_WITH_MISSING_DEPENDENCY", edit("edgeParity", (e) => {
    e.functions.find((f) => f.slug === "finalize-onboarding").deployGate = "READY_TO_DEPLOY";
  }));
  kill(22, "parity drops a repo function", "EDGE_PARITY_FUNCTION_MISSING", edit("edgeParity", (e) => {
    e.functions = e.functions.filter((f) => f.slug !== "submit-business-lead");
  }));
  kill(22, "parity calls an unproven function CURRENT", "EDGE_PARITY_CURRENT_WITHOUT_SOURCE_COMPARE", edit("edgeParity", (e) => {
    e.functions.find((f) => f.slug === "delete-account").status = "CURRENT";
  }));
  // 23-25 Stripe
  const liveShape = (prefix) => `${prefix}_${"A1b2".repeat(8)}`;
  kill(23, "Stripe live secret key in a report", "STRIPE_LIVE_SECRET_IN_REPO", addFile("docs/reports/zz.md", `key ${["sk", "live", "A1b2".repeat(8)].join("_")}`));
  kill(24, "Stripe webhook secret in repo", "STRIPE_WEBHOOK_SECRET_IN_REPO", addFile("scripts/zz.mjs", `const s = "${["whsec", "A1b2".repeat(8)].join("_")}";`));
  kill(24, "Stripe publishable live key in repo", "STRIPE_LIVE_PUBLISHABLE_IN_REPO", addFile("docs/zz.md", `${["pk", "live", "A1b2".repeat(8)].join("_")}`));
  kill(25, "webhook accepts unsigned events", "WEBHOOK_SIGNATURE_NOT_VERIFIED", editEdge("stripe-webhook", (t) => t.replace(/constructEventAsync\(/g, "JSON.parse(")));
  kill(25, "webhook missing signature not rejected", "WEBHOOK_MISSING_SIGNATURE_NOT_REJECTED", editEdge("stripe-webhook", (t) => t.replace("if (!signature)", "if (false)")));
  kill(25, "webhook not idempotent", "WEBHOOK_NOT_IDEMPOTENT", editEdge("stripe-webhook", (t) => t.replace('onConflict: "stripe_event_id"', 'onConflict: "id"')));
  kill(25, "webhook secret not required", "WEBHOOK_SECRET_NOT_REQUIRED", editEdge("stripe-webhook", (t) => t.replace(/STRIPE_WEBHOOK_SECRET/g, "WHATEVER")));
  // 26-27 OAuth
  kill(26, "wildcard host in Auth redirect allowlist", "OAUTH_REDIRECT_WILDCARD_HOST", (c, o) => ({ ...c, configureSources: { ...o.configureSources, "scripts/configure-supabase-auth.mjs": `${o.configureSources["scripts/configure-supabase-auth.mjs"]}\nconst x = "https://*.netlify.app/**";` } }));
  kill(26, "bare wildcard in Auth redirect allowlist", "OAUTH_REDIRECT_WILDCARD_HOST", (c, o) => ({ ...c, configureSources: { ...o.configureSources, "scripts/configure-supabase-auth.mjs": `${o.configureSources["scripts/configure-supabase-auth.mjs"]}\nconst x = "*";` } }));
  kill(26, "http redirect on a public host", "OAUTH_REDIRECT_INSECURE_HOST", (c, o) => ({ ...c, configureSources: { ...o.configureSources, "scripts/configure-supabase-auth.mjs": `${o.configureSources["scripts/configure-supabase-auth.mjs"]}\nconst x = "http://longyu.example.org/**";` } }));
  kill(27, "OAuth redirect by prefix match", "OAUTH_REDIRECT_PATTERN_MATCHING", editText("oauthRedirectSource", "allowedWebOrigins().includes(clean)", "allowedWebOrigins().some((o) => clean.startsWith(o))"));
  kill(27, "OAuth redirect not allowlisted", "OAUTH_REDIRECT_NOT_ALLOWLISTED", editText("oauthRedirectSource", /allowedWebOrigins\(\)\.includes\(/g, "(() => true)("));
  // 28 SMTP
  kill(28, "SMTP password in repo", "SMTP_SECRET_IN_REPO", addFile("docs/zz.md", `smtp_password = "${"Zq9" + "xK2mP7vR4"}"`));
  kill(28, "Resend key in repo", "RESEND_KEY_IN_REPO", addFile("scripts/zz.mjs", `const k = "${["re", "AbCdEfGh1", "A1b2C3d4E5f6G7h8I9"].join("_")}";`));
  // 29-31
  kill(29, "Resend failure aborts signup", "RESEND_FAILURE_BREAKS_SIGNUP", editEdge("create-account", (t) => t.replace('console.error("create-account resend:", resendError.message);', 'return json(req, { error: "mail" }, 500);')));
  kill(29, "Resend on a learning path", "RESEND_ON_LEARNING_PATH", editEdge("commit-placement", (t) => `${t}\nawait fetch("https://api.resend.com/emails");`));
  kill(30, "Sentry init not guarded", "SENTRY_INIT_NOT_GUARDED", editText("errorReportingSource", /\} catch \{\n    \/\/ Reporting must never break the app\.\n    sentry = null;\n  \}/, "} finally {\n    sentry = sentry;\n  }"));
  kill(30, "Sentry init blocks startup", "SENTRY_INIT_BLOCKS_STARTUP", editText("mainSource", "void initErrorReporting();", "await initErrorReporting();"));
  kill(31, "Sentry without scrub", "SENTRY_BEFORE_SEND_NOT_SCRUBBED", editText("errorReportingSource", "beforeSend: (event) => scrubEvent(event),", ""));
  kill(31, "Sentry default PII on", "SENTRY_DEFAULT_PII_ON", editText("errorReportingSource", "sendDefaultPii: false", "sendDefaultPii: true"));
  // 32 production web SHA unknown cannot be overall PASS
  kill(32, "overall PASS with unknown production web SHA", "FALSE_PASS:overall", edit("matrix", (m) => {
    m.overall = "PASS";
  }));
  kill(32, "production web SHA PASS without evidence", "FALSE_PASS:PRODUCTION_WEB_SHA_IDENTIFIED", setGate("PRODUCTION_WEB_SHA_IDENTIFIED", { status: "PASS", evidence: [] }));
  kill(32, "production web SHA PASS without owner proof", "OWNER_GATE_PASS_WITHOUT_OWNER_EVIDENCE", setGate("PRODUCTION_WEB_SHA_IDENTIFIED", { status: "PASS", evidence: ["x"] }));
  // 33-35
  kill(33, "APK provenance step removed", "APK_PROVENANCE_STEP_MISSING", setWorkflow(".github/workflows/android-build.yml", (t) => t.replace(/rc2-3-10-cloud-certification\.mjs provenance/g, "echo skip")));
  {
    const sha = "a".repeat(40);
    const wrong = checkArtifactProvenance({ versionJson: { commitSha: "b".repeat(40), curriculumFingerprint: "5a64821d0b7d", buildChannel: "production" }, expectedSha: sha, expectedFingerprint: "5a64821d0b7d", files: {} });
    const ok = checkArtifactProvenance({ versionJson: { commitSha: sha, curriculumFingerprint: "5a64821d0b7d", buildChannel: "production" }, expectedSha: sha, expectedFingerprint: "5a64821d0b7d", files: {} });
    const killed = wrong.includes("WRONG_SHA") && ok.length === 0;
    results.push(killed);
    if (killed) covered.add(33);
    console.log(`${killed ? "KILLED" : "SURVIVED"} #33 APK built from another SHA: WRONG_SHA`);
    const qa = checkArtifactProvenance({ versionJson: { commitSha: sha, curriculumFingerprint: "5a64821d0b7d", buildChannel: "production", deviceQaBuild: true }, expectedSha: sha, expectedFingerprint: "5a64821d0b7d", files: {} });
    const qaKilled = qa.includes("QA_FLAG_IN_PRODUCTION");
    results.push(qaKilled);
    if (qaKilled) covered.add(34);
    console.log(`${qaKilled ? "KILLED" : "SURVIVED"} #34 QA flag in a production artifact: QA_FLAG_IN_PRODUCTION`);
  }
  kill(34, "QA flag in production Netlify context", "QA_FLAG_IN_PRODUCTION_CONTEXT", editText("netlifyToml", '  VITE_USE_TEST_FIXTURES = "false"\n  # Cloudflare', '  VITE_USE_TEST_FIXTURES = "false"\n  VITE_DEVICE_QA = "true"\n  # Cloudflare'));
  kill(34, "QA flag in release workflow", "QA_FLAG_IN_RELEASE_WORKFLOW", setWorkflow(".github/workflows/android-release.yml", (t) => `${t}\n          VITE_DEVICE_QA: "true"\n`));
  kill(35, "Turnstile skip in production config", "TURNSTILE_SKIP_IN_PRODUCTION_CONFIG", editText("netlifyToml", '  VITE_ALLOW_PRO_PREVIEW = "false"\n  VITE_USE_TEST_FIXTURES = "false"\n  # Cloudflare', '  VITE_ALLOW_PRO_PREVIEW = "false"\n  VITE_USE_TEST_FIXTURES = "false"\n  TURNSTILE_ALLOW_SKIP = "1"\n  # Cloudflare'));
  kill(35, "Turnstile not fail-closed", "TURNSTILE_NOT_FAIL_CLOSED", editEdge("create-account", (t) => t.replace(/captcha_unavailable/g, "ok")));
  kill(35, "business lead Turnstile skip by default", "TURNSTILE_SKIP_NOT_EXPLICIT", editEdge("submit-business-lead", (t) => t.replace('TURNSTILE_ALLOW_SKIP")?.trim() === "1"', 'TURNSTILE_ALLOW_SKIP") !== "0"')));
  // 36-37 smoke
  kill(36, "smoke signs in a hardcoded account", "SMOKE_NOT_QA_ACCOUNT", editText("smokeSource", /LONGYU_QA_EMAIL/g, "LEARNER_EMAIL"));
  kill(36, "smoke touches checkout", "SMOKE_TOUCHES_MONEY_OR_ACCOUNTS", (c, o) => ({ ...c, smokeSource: `${o.smokeSource}\nawait client.functions.invoke("create-checkout-session");` }));
  kill(36, "smoke runs on schedule", "SMOKE_NOT_MANUAL_ONLY", setWorkflow(".github/workflows/cloud-smoke.yml", (t) => t.replace("on:\n  workflow_dispatch:", "on:\n  schedule:\n    - cron: '0 * * * *'\n  workflow_dispatch:")));
  kill(37, "smoke without idempotency key", "SMOKE_NOT_IDEMPOTENT", editText("smokeSource", "p_client_dedupe_key: runId", "p_client_dedupe_key: null"));
  kill(37, "smoke write not namespaced", "SMOKE_WRITE_NOT_NAMESPACED", editText("smokeSource", /\[cloud-smoke\]/g, "smoke"));
  // 38-39
  kill(38, "retention deletes by default", "RETENTION_NOT_DRY_RUN_BY_DEFAULT", editText("retentionSql", "p_dry_run boolean default true", "p_dry_run boolean default false"));
  kill(38, "retention scheduled as real delete", "RETENTION_SCHEDULED_AS_REAL_DELETE", editText("retentionSql", /run_telemetry_retention\(30, true\)/g, "run_telemetry_retention(30, false)"));
  kill(39, "e-mail snapshot accepted as PASS", "PII_EMAIL_IN_SNAPSHOT_ACCEPTED_AS_PASS", setGate("DATA_PRIVACY_PASS", { status: "PASS", evidence: ["x"] }));
  kill(39, "PII sent to Jev", "PII_SENT_TO_JEV", editText(
    "pipelineSource",
    "export function buildSanitizedFeedbackState(row: FeedbackRowV2): {",
    "export function buildSanitizedFeedbackState(row: FeedbackRowV2): {\n  const leak = `user ${row.user_id}`;",
  ));
  // 40-41
  kill(40, "owner action PASS without evidence", "OWNER_ACTION_PASS_WITHOUT_EVIDENCE", edit("ownerActions", (o) => {
    o.actions.find((a) => a.id === "OA-DATA-EXPORT").status = "PASS";
  }));
  kill(40, "gate PASS while its owner action is open", "OWNER_GATE_PASS_WITHOUT_OWNER_EVIDENCE", setGate("BACKUP_EXPORT_PASS", { status: "PASS", evidence: ["x"] }));
  kill(41, "#273 ready while blockers remain", "ISSUE_273_READY_WHILE_BLOCKED", setGate("ISSUE_273_RESOLUTION_READY", { status: "PASS", evidence: ["x"] }));
  // 42-45
  kill(42, "monetization certified early", "MONETIZATION_CERTIFIED_BEFORE_DECISION", edit("certifications", (c) => {
    c.monetization = { status: "PASS" };
  }));
  kill(42, "Stripe not in test mode", "STRIPE_NOT_TEST_MODE", edit("productTruth", (p) => {
    p.commercial.stripe.mode = "live";
  }));
  kill(42, "checkout accepts live key", "STRIPE_LIVE_NOT_REFUSED_IN_CHECKOUT", editEdge("create-checkout-session", (t) => t.replaceAll("refuseStripeLive", "allowStripeLive")));
  kill(43, "Jev struggle runtime flag on", "JEV_STRUGGLE_FLAG_ON", addSrc("src/lib/zz.ts", "export const JEV_STRUGGLE_RUNTIME = true;"));
  kill(43, "Product Truth shows learner runtime on", "JEV_PRODUCT_TRUTH_RUNTIME_ON", edit("productTruth", (p) => {
    p.jev.learnerRuntimeEnabled = true;
  }));
  kill(44, "paid overage switched on", "PAID_OVERAGE_ENABLED_IN_CODE", addFile("scripts/zz.mjs", "const policy = { ALLOW_PAID_OVERAGE: true };"));
  kill(44, "script buys a plan", "SUPABASE_BILLING_API_CALL", addFile("scripts/zz.mjs", 'await fetch("https://api.supabase.com/v1/organizations/x/billing/subscription", { method: "PUT" });'));
  kill(44, "overage force-off removed", "PAID_OVERAGE_NOT_FORCED_OFF", editText("budgetPolicySource", "out.ALLOW_PAID_OVERAGE = false;", "// removed"));
  kill(45, "sibling project named in a 10B report", "LON001_SIBLING_PROJECT_NAMED", addFile("docs/reports/rc2-3-10b-zz.md", `sibling ${lon001Probe()} project`));
  // closure honesty
  kill(46, "closure claims cloud PASS", "CLOSURE_CLAIMS_CLOUD_PASS", editText("closureMd", /cloud\.certification[^\n]*BLOCKED[^\n]*/, "cloud.certification = PASS"));

  const missing = [];
  for (let n = 1; n <= 45; n += 1) if (!covered.has(n)) missing.push(n);
  const survived = results.filter((r) => !r).length;
  if (survived || missing.length) {
    console.error(`FAIL test:rc2-3-10b — ${survived} mutation(s) survived; uncovered classes: ${missing.join(",") || "none"}`);
    process.exit(1);
  }
  console.log(`PASS test:rc2-3-10b (${results.length} mutações, classes 1-45 cobertas)`);
  process.exit(0);
}

console.error("usage: rc2-3-10b-certification.mjs validate | test");
process.exit(2);
