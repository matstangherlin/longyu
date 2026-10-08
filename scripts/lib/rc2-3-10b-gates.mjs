/**
 * RC2.3.10B — production reconciliation gates (pure checks).
 *
 * Every function takes already-loaded artifacts and returns `CODE[:detail]`
 * strings. Nothing here reads the network or production; the certification
 * script (scripts/rc2-3-10b-certification.mjs) loads the committed artifacts,
 * runs these checks (`validate`) and breaks copies of the same artifacts to
 * prove each check bites (`test`).
 */
import { productionMigrationReady } from "./rc2-3-10-cloud.mjs";

const has = (re, text) => re.test(String(text ?? ""));

// ---------------------------------------------------------------------------
// SQL helpers (comment-stripped, dollar-quote aware)
// ---------------------------------------------------------------------------

export function stripSqlComments(sql) {
  return String(sql).replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
}

/** Statements with function bodies kept intact (bodies never split on `;`). */
export function sqlStatements(sql) {
  const bodies = [];
  const masked = stripSqlComments(sql).replace(/(\$(?:[A-Za-z_]\w*)?\$)[\s\S]*?\1/g, (m) => {
    bodies.push(m);
    return `\u00a7${bodies.length - 1}\u00a7`;
  });
  return masked
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({
      masked: s.replace(/\s+/g, " ").toLowerCase(),
      full: s.replace(/\u00a7(\d+)\u00a7/g, (_, i) => bodies[Number(i)]).replace(/\s+/g, " ").toLowerCase(),
    }));
}

const bareName = (raw) => String(raw ?? "").replace(/^public\./, "").replace(/"/g, "");
const sqlAll = (files) => files.flatMap((f) => sqlStatements(f.text).map((s) => ({ ...s, file: f.file })));

// ---------------------------------------------------------------------------
// 1 · gitleaks bypass
// ---------------------------------------------------------------------------

export function checkGitleaksWorkflows({ workflows, gitleaksToml }) {
  const errors = [];
  let found = false;
  for (const [file, text] of Object.entries(workflows ?? {})) {
    if (/gitleaks[^\n]*\|\|\s*(true|:|exit 0)/i.test(text)) errors.push(`GITLEAKS_BYPASS:${file}:or-true`);
    const lines = text.split("\n");
    const jobStarts = lines.map((l, i) => (/^  [\w-]+:\s*$/.test(l) ? i : -1)).filter((i) => i >= 0);
    jobStarts.forEach((start, k) => {
      const job = lines.slice(start, jobStarts[k + 1] ?? lines.length).join("\n");
      if (!/gitleaks/i.test(job)) return;
      found = true;
      if (/continue-on-error:\s*true/.test(job)) errors.push(`GITLEAKS_BYPASS:${file}:continue-on-error`);
      if (/^\s+if:\s*(false|\$\{\{\s*false\s*\}\})/m.test(job)) errors.push(`GITLEAKS_BYPASS:${file}:if-false`);
      if (!/gitleaks\/gitleaks-action/.test(job) && !/gitleaks (detect|protect)/.test(job)) errors.push(`GITLEAKS_STEP_MISSING:${file}`);
    });
  }
  if (!found) errors.push("GITLEAKS_STEP_MISSING:no-workflow");
  for (const m of String(gitleaksToml ?? "").matchAll(/'''([^']*)'''/g)) {
    if (/\.\*|\.\+/.test(m[1])) errors.push(`GITLEAKS_ALLOWLIST_BROAD:${m[1].slice(0, 40)}`);
  }
  if (/^\s*paths\s*=/m.test(String(gitleaksToml ?? ""))) errors.push("GITLEAKS_ALLOWLIST_BROAD:paths");
  return errors;
}

// ---------------------------------------------------------------------------
// 2 · Product Truth freshness
// ---------------------------------------------------------------------------

export function checkProductTruthFreshness({ checkExitCode, packageScript }) {
  const errors = [];
  if (!/generate-product-truth\.mjs\s+--check/.test(String(packageScript ?? ""))) errors.push("PRODUCT_TRUTH_CHECK_NOT_ENFORCED");
  if (checkExitCode !== 0) errors.push("PRODUCT_TRUTH_STALE");
  return errors;
}

// ---------------------------------------------------------------------------
// 3 · migration reconciliation: no promotion without structural proof
// ---------------------------------------------------------------------------

export function checkReconciliationPromotion({ reconciliation, ledger, matrix }) {
  const errors = [];
  const entries = reconciliation?.entries ?? [];
  const recount = {};
  for (const e of entries) {
    recount[e.status] = (recount[e.status] ?? 0) + 1;
    const ev = (e.evidence ?? []).join(" | ");
    if (e.status === "MATCH_EXACT") {
      if (e.priorState !== "MATCH" || e.confidence !== 1 || !/re-verified equal/.test(ev)) errors.push(`MATCH_WITHOUT_STRUCTURAL_PROOF:${e.version}:${e.name}`);
    } else if (e.status === "MATCH_SEMANTIC") {
      if (!(/structural hash [0-9a-f]+ equal/.test(ev) && /structural objects identical/.test(ev) && e.confidence < 1)) errors.push(`MATCH_WITHOUT_STRUCTURAL_PROOF:${e.version}:${e.name}`);
    } else if (e.status === "PARTIAL_EQUIVALENT" || e.status === "UNKNOWN") {
      if (e.confidence >= 1) errors.push(`UNKNOWN_CONFIDENCE_INFLATED:${e.version ?? e.name}`);
    } else {
      errors.push(`RECONCILIATION_STATUS_VOCABULARY:${e.status}`);
    }
    if (/placeholder/.test(ev) && e.status !== "UNKNOWN") errors.push(`PLACEHOLDER_PROMOTED:${e.version}:${e.name}`);
  }
  for (const [status, n] of Object.entries(reconciliation?.counts?.byStatus ?? {})) {
    if ((recount[status] ?? 0) !== n) errors.push(`RECONCILIATION_COUNT_DRIFT:${status}`);
  }
  for (const l of ledger?.entries ?? []) {
    if (l.state === "MATCH" && !l.repoFile) errors.push(`LEDGER_MATCH_WITHOUT_REPO_FILE:${l.version}`);
  }
  const notMatch = entries.filter((e) => !String(e.status).startsWith("MATCH_")).length;
  if (notMatch > 0 && matrix?.gates?.MIGRATION_HISTORY_PASS?.status === "PASS") errors.push("MIGRATION_HISTORY_PASS_WITH_UNRECONCILED_ROWS");
  if (ledger?.status === "PASS" && notMatch > 0) errors.push("LEDGER_PASS_WITH_UNRECONCILED_ROWS");
  return errors;
}

// ---------------------------------------------------------------------------
// 4 · repo-only files are never applied without their dependencies
// ---------------------------------------------------------------------------

export function checkPlanDependencies({ plan }) {
  const errors = [];
  const deps = new Map();
  const klass = new Map();
  for (const b of plan?.batches ?? []) {
    for (const m of b.migrations ?? []) {
      deps.set(m.file, m.dependsOn ?? []);
      klass.set(m.file, m.class);
    }
  }
  const safe = plan?.minimumSafeSet?.migrations ?? [];
  safe.forEach((file, i) => {
    if (!deps.has(file)) errors.push(`PLAN_FILE_UNKNOWN:${file}`);
    for (const dep of deps.get(file) ?? []) {
      if (!safe.slice(0, i).includes(dep)) errors.push(`REPO_ONLY_APPLIED_WITHOUT_DEPENDENCY:${file} -> ${dep}`);
    }
    if (klass.get(file) === "UNSAFE_UNTIL_RECONCILED") errors.push(`UNSAFE_FILE_IN_SAFE_SET:${file}`);
  });
  const order = plan?.topologicalOrder ?? [];
  for (const [file, ds] of deps) {
    for (const dep of ds) {
      if (order.indexOf(dep) < 0 || order.indexOf(file) < 0 || order.indexOf(dep) > order.indexOf(file)) errors.push(`TOPOLOGICAL_ORDER_VIOLATION:${dep} -> ${file}`);
    }
  }
  if ((plan?.cycle ?? []).length) errors.push("PLAN_HAS_CYCLE");
  if (plan?.safety?.productionWrites !== false) errors.push("PLAN_CLAIMS_PRODUCTION_WRITE");
  return errors;
}

/** No workflow may apply migrations or deploy functions on push / PR / schedule. */
export function checkNoAutoApply({ workflows }) {
  const errors = [];
  for (const [file, text] of Object.entries(workflows ?? {})) {
    if (!/db:apply-api|deploy:leagues|supabase db push|supabase functions deploy|apply-migrations|apply-sql/.test(text)) continue;
    const m = /^on:\s*\n([\s\S]*?)(?=^\S)/m.exec(text);
    const triggers = m ? m[1] : /^on:.*$/m.exec(text)?.[0] ?? "";
    if (/(^|\n)\s*(push|pull_request|pull_request_target|schedule|workflow_run|release):?/.test(triggers)) errors.push(`MIGRATION_AUTO_APPLY_TRIGGER:${file}`);
    if (!/workflow_dispatch/.test(triggers)) errors.push(`MIGRATION_APPLY_NOT_MANUAL:${file}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 5 · PROD_ONLY rows are never ignored
// ---------------------------------------------------------------------------

export const PROD_ONLY_CLASSES = ["HOTFIX_NOT_BACKPORTED", "LEGIT_LEGACY", "SPLIT_CHUNK_OF_REPO_FILE", "UNKNOWN"];

export function checkProdOnlyForensics({ ledger, forensicsMd, classification }) {
  const errors = [];
  const prodOnly = (ledger?.entries ?? []).filter((e) => e.state === "PROD_ONLY");
  const rows = classification?.rows ?? [];
  for (const e of prodOnly) {
    if (!has(new RegExp(`${e.version}[^\\n]*${e.name}`), forensicsMd)) errors.push(`PROD_ONLY_NOT_IN_FORENSICS:${e.version}:${e.name}`);
    const row = rows.find((r) => r.version === e.version && r.name === e.name);
    if (!row) {
      errors.push(`PROD_ONLY_NOT_CLASSIFIED:${e.version}:${e.name}`);
      continue;
    }
    if (!PROD_ONLY_CLASSES.includes(row.classification)) errors.push(`PROD_ONLY_CLASS_VOCABULARY:${e.version}:${row.classification}`);
    if (!(Array.isArray(row.evidence) && row.evidence.length)) errors.push(`PROD_ONLY_WITHOUT_EVIDENCE:${e.version}`);
    if (row.classification === "UNKNOWN" && !row.requiredProof) errors.push(`PROD_ONLY_UNKNOWN_WITHOUT_PROOF_PLAN:${e.version}`);
    if (typeof row.action === "string" && /\b(repair|re-?run|rename)\b/i.test(row.action) && !/(do not|never)/i.test(row.action)) errors.push(`PROD_ONLY_ACTION_UNSAFE:${e.version}`);
  }
  if (rows.length !== prodOnly.length) errors.push(`PROD_ONLY_ROW_COUNT:${rows.length}/${prodOnly.length}`);
  return errors;
}

// ---------------------------------------------------------------------------
// 6 · call graph vs production snapshot
// ---------------------------------------------------------------------------

export function checkCallGraphTruth({ graph, snapshot, matrix }) {
  const errors = [];
  const fnNames = new Set((snapshot?.functions ?? []).map((f) => f.name));
  const tableNames = new Set([...(snapshot?.tables ?? []), ...(snapshot?.views ?? [])].map((t) => t.name));
  const edgeNames = new Set((snapshot?.edgeFunctions ?? []).map((e) => `functions/${e.slug}`));
  let missingOnPath = 0;
  for (const e of graph?.entries ?? []) {
    let present;
    if (e.kind === "rpc") present = fnNames.has(e.backendObject);
    else if (e.kind === "table") present = tableNames.has(e.backendObject);
    else if (e.kind === "edge") present = edgeNames.has(e.backendObject);
    else continue;
    if (e.productionStatus === "PRESENT" && !present) errors.push(`CALL_GRAPH_FALSE_PRESENT:${e.backendObject}`);
    if (e.productionStatus === "MISSING") {
      if (present) errors.push(`CALL_GRAPH_FALSE_MISSING:${e.backendObject}`);
      if (e.severity === "NONE" || !e.severity) errors.push(`CALL_GRAPH_MISSING_WITHOUT_SEVERITY:${e.backendObject}`);
      if (e.productionPath) missingOnPath += 1;
    }
  }
  if (missingOnPath !== (graph?.counts?.missingOnProductionPath ?? -1)) errors.push(`CALL_GRAPH_COUNT_DRIFT:${missingOnPath}/${graph?.counts?.missingOnProductionPath}`);
  if (missingOnPath > 0) {
    for (const id of ["PRODUCTION_SCHEMA_TRUTH_PASS", "EDGE_FUNCTIONS_PASS", "ISSUE_273_RESOLUTION_READY"]) {
      if (matrix?.gates?.[id]?.status === "PASS") errors.push(`FALSE_PASS_WITH_MISSING_CLIENT_OBJECTS:${id}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 7 · backup before any migration
// ---------------------------------------------------------------------------

export function checkBackupRequired({ plan, matrix, preflightSource, runbookExists }) {
  const errors = [];
  const safe = plan?.minimumSafeSet?.migrations ?? [];
  const pre = (plan?.minimumSafeSet?.preconditions ?? []).join(" ");
  if (safe.length && !/backup|export/i.test(pre)) errors.push("MIGRATION_WITHOUT_BACKUP_PRECONDITION");
  if (safe.length && !/PRODUCTION_MIGRATION_READY/.test(pre)) errors.push("MIGRATION_WITHOUT_READINESS_GATE");
  if (!runbookExists) errors.push("BACKUP_RUNBOOK_MISSING");
  if (!/DRY-RUN BY DEFAULT/.test(String(preflightSource ?? ""))) errors.push("BACKUP_PREFLIGHT_NOT_DRY_RUN");
  if (!/schema-only/.test(String(preflightSource ?? ""))) errors.push("BACKUP_PREFLIGHT_NOT_SCHEMA_ONLY");
  if (matrix?.gates?.BACKUP_EXPORT_PASS?.status !== "PASS" && matrix?.gates?.ISSUE_273_RESOLUTION_READY?.status === "PASS") errors.push("READY_WITHOUT_BACKUP");
  return errors;
}

/** The authority itself: a request without a verified backup must be BLOCKED. */
export function migrationAllowedWithoutBackup(request, now) {
  const r = productionMigrationReady({ ...request, backup: undefined }, now);
  return r.status === "PASS" ? ["MIGRATION_ALLOWED_WITHOUT_BACKUP"] : [];
}

// ---------------------------------------------------------------------------
// 8 · destructive SQL before approval
// ---------------------------------------------------------------------------

const DESTRUCTIVE = /^(drop (table|schema|column)|truncate|delete from|alter table (if exists )?(only )?[^ ]+ drop (column|constraint))/;

export function checkDestructiveSql({ pendingSql, plan }) {
  const errors = [];
  for (const f of pendingSql ?? []) {
    const stmts = sqlStatements(f.text);
    const created = new Set();
    const constraintReplaced = new Set();
    for (const s of stmts) {
      const mk = /^create table (?:if not exists )?([\w."]+)/.exec(s.masked);
      if (mk) created.add(bareName(mk[1]));
      const ac = /^alter table (?:if exists )?(?:only )?([\w."]+) add constraint/.exec(s.masked);
      if (ac) constraintReplaced.add(bareName(ac[1]));
    }
    for (const s of stmts) {
      if (!DESTRUCTIVE.test(s.masked)) continue;
      const target = bareName(/^(?:drop table(?: if exists)?|truncate(?: table)?|delete from|alter table(?: if exists)?(?: only)?) ([\w."]+)/.exec(s.masked)?.[1]);
      if (/ drop constraint/.test(s.masked) && constraintReplaced.has(target)) continue;
      if (!target || !created.has(target)) errors.push(`DESTRUCTIVE_SQL_IN_PENDING:${f.file}:${s.masked.slice(0, 60)}`);
    }
  }
  const pre = (plan?.minimumSafeSet?.preconditions ?? []).join(" ");
  const risky = [];
  for (const b of plan?.batches ?? []) {
    for (const m of b.migrations ?? []) {
      if ((plan?.minimumSafeSet?.migrations ?? []).includes(m.file) && (m.reversibility === "IRREVERSIBLE_WITHOUT_BACKUP" || (m.destructive ?? []).length)) risky.push(m.file);
    }
  }
  if (risky.length && !(/PRODUCTION_MIGRATION_READY/.test(pre) && /backup|export/i.test(pre))) errors.push(`DESTRUCTIVE_BEFORE_APPROVAL_GATE:${risky.join(",")}`);
  return errors;
}

// ---------------------------------------------------------------------------
// 9–15 · static SQL / security posture
// ---------------------------------------------------------------------------

export function checkRlsStatic({ sqlFiles, snapshot }) {
  const errors = [];
  const stmts = sqlAll(sqlFiles);
  const created = new Map();
  const enabled = new Set();
  for (const s of stmts) {
    const c = /^create table (?:if not exists )?([\w."]+)/.exec(s.masked);
    if (c && !/^(auth|storage|extensions|cron|vault)\./.test(c[1])) created.set(bareName(c[1]), s.file);
    const e = /^alter table (?:if exists )?(?:only )?([\w."]+) enable row level security/.exec(s.masked);
    if (e) enabled.add(bareName(e[1]));
  }
  for (const [t, file] of created) if (!enabled.has(t)) errors.push(`RLS_NOT_ENABLED:${t}:${file}`);
  for (const t of snapshot?.tables ?? []) if (t.rls !== true) errors.push(`RLS_OFF_IN_PRODUCTION:${t.name}`);
  return errors;
}

export function checkLeaguePolicy({ sqlFiles, plan, snapshot, matrix }) {
  const errors = [];
  let finalPolicy = null;
  for (const s of sqlAll(sqlFiles)) {
    if (/^create policy "?league_memberships_select_peers"? on (public\.)?league_memberships/.test(s.masked)) finalPolicy = s;
  }
  if (!finalPolicy) errors.push("LEAGUE_POLICY_MISSING");
  else if (/from (public\.)?league_memberships\b/.test(finalPolicy.masked)) errors.push(`LEAGUE_POLICY_RECURSIVE:${finalPolicy.file}`);
  const fix = "supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql";
  if (!(plan?.minimumSafeSet?.migrations ?? []).includes(fix)) errors.push("LEAGUE_FIX_NOT_IN_PLAN");
  if (snapshot?.rlsBehavior?.reads?.exceptions?.league_memberships && matrix?.gates?.PRODUCTION_RLS_PASS?.status === "PASS") errors.push("RLS_PASS_WITH_LEAGUE_RECURSION");
  return errors;
}

export function checkPublicExecute({ snapshot, classification, pendingSql }) {
  const errors = [];
  const intentional = new Set((classification?.anonSecurityDefiner?.functions ?? []).filter((f) => f.classification === "PUBLIC_INTENTIONAL" && (f.gates ?? []).length).map((f) => f.name));
  for (const f of snapshot?.functions ?? []) {
    if (f.securityDefiner && f.anonExecute && !intentional.has(f.name)) errors.push(`ANON_EXECUTE_UNCLASSIFIED:${f.name}`);
  }
  const stmts = sqlAll(pendingSql ?? []);
  const revoked = new Set();
  for (const s of stmts) {
    const m = /^revoke (?:all|execute)(?: privileges)? on function ([\w."]+)\s*\(.*\) from .*\bpublic\b/.exec(s.masked);
    if (m) revoked.add(bareName(m[1]));
  }
  for (const s of stmts) {
    const m = /^create (?:or replace )?function ([\w."]+)\s*\(/.exec(s.masked);
    if (m && /security definer/.test(s.masked) && !revoked.has(bareName(m[1]))) errors.push(`DEFINER_WITHOUT_PUBLIC_REVOKE:${bareName(m[1])}:${s.file}`);
  }
  return errors;
}

export function checkSearchPath({ sqlFiles }) {
  const errors = [];
  for (const s of sqlAll(sqlFiles)) {
    const m = /^create (?:or replace )?function ([\w."]+)\s*\(/.exec(s.masked);
    if (m && /security definer/.test(s.masked) && !/set search_path/.test(s.masked)) errors.push(`DEFINER_WITHOUT_SEARCH_PATH:${bareName(m[1])}:${s.file}`);
  }
  return errors;
}

const AUTHZ_NAME = /admin|entitle|role|plan|premium|subscri|billing|grant|owner|member|seat|league|is_pro|pro_/;
export function checkUserMetadataAuthz({ sqlFiles, edgeSources }) {
  const errors = [];
  for (const s of sqlAll(sqlFiles)) {
    if (!/user_meta_?data/.test(s.full)) continue;
    const fn = /^create (?:or replace )?function ([\w."]+)\s*\(/.exec(s.masked)?.[1] ?? "";
    if (/^create policy/.test(s.masked) || (fn && AUTHZ_NAME.test(fn))) errors.push(`USER_METADATA_AUTHZ:${s.file}:${(fn || s.masked.slice(0, 40)).slice(0, 60)}`);
  }
  for (const [name, text] of Object.entries(edgeSources ?? {})) {
    if (/\b(?:user|session\.user|data\.user)\??\.user_metadata\b|auth\.jwt\(\)\s*->>?\s*'user_metadata'/.test(text) || /\.user_metadata\??\.(role|plan|is_admin|admin|pro)\b/.test(text)) errors.push(`USER_METADATA_AUTHZ:edge:${name}`);
  }
  return errors;
}

export function checkWithCheck({ sqlFiles }) {
  const errors = [];
  for (const s of sqlAll(sqlFiles)) {
    if (!/^create policy/.test(s.masked)) continue;
    const cmd = / for (insert|update|all) /.exec(s.masked)?.[1];
    if (cmd && !/with check/.test(s.masked)) errors.push(`POLICY_WITHOUT_WITH_CHECK:${cmd}:${s.file}:${s.masked.slice(0, 60)}`);
  }
  return errors;
}

export function checkViews({ sqlFiles, snapshot }) {
  const errors = [];
  const stmts = sqlAll(sqlFiles);
  for (const s of stmts) {
    const m = /^create (?:or replace )?view ([\w."]+)/.exec(s.masked);
    if (!m) continue;
    const name = bareName(m[1]);
    const invoker = /security_invoker\s*=\s*(true|on)/.test(s.masked);
    const revoked = stmts.some((r) => new RegExp(`^revoke .* on (table )?(public\\.)?${name}\\b.* from .*(anon|authenticated)`).test(r.masked));
    if (!invoker && !revoked) errors.push(`VIEW_NOT_SECURITY_INVOKER:${name}:${s.file}`);
  }
  for (const v of snapshot?.views ?? []) {
    if (v.securityInvoker !== true) errors.push(`VIEW_NOT_INVOKER_IN_PRODUCTION:${v.name}`);
    if ((v.grants ?? []).some((g) => g === "anon" || g === "authenticated" || g === "PUBLIC")) errors.push(`VIEW_EXPOSED_TO_API_ROLES:${v.name}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 16–21 · Jev
// ---------------------------------------------------------------------------

export function checkJevNotInClient({ srcFiles, envExample }) {
  const errors = [];
  for (const f of srcFiles ?? []) {
    if (/api\.typesafe\.ai|TYPESAFE_API_KEY|VITE_TYPESAFE|VITE_JEV/.test(f.text)) errors.push(`JEV_KEY_OR_HOST_IN_CLIENT:${f.file}`);
  }
  if (/^\s*VITE_(TYPESAFE|JEV)\w*\s*=/m.test(String(envExample ?? ""))) errors.push("JEV_KEY_IN_VITE_ENV");
  return errors;
}

export function checkJevNoLearnerCall({ srcFiles, edgeSources, budgetPolicySource }) {
  const errors = [];
  for (const f of srcFiles ?? []) {
    if (/\baskJev\b|_shared\/jev|jevAllowed\(|LEARNER_RUNTIME/.test(f.text)) errors.push(`JEV_LEARNER_CALL_IN_CLIENT:${f.file}`);
  }
  for (const [name, text] of Object.entries(edgeSources ?? {})) {
    if (name === "triage-feedback") {
      if (/LEARNER_RUNTIME/.test(text)) errors.push("JEV_LEARNER_PURPOSE_IN_TRIAGE");
      continue;
    }
    if (/\baskJev\b|_shared\/jev\.ts|jevAllowed\(/.test(text)) errors.push(`JEV_CALLED_FROM_LEARNER_EDGE:${name}`);
  }
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(String(budgetPolicySource ?? ""))) errors.push("JEV_RUNTIME_ENABLED_BY_DEFAULT");
  return errors;
}

export function checkOldTriageNotPass({ matrix, snapshot }) {
  const errors = [];
  const triage = (snapshot?.edgeFunctions ?? []).find((e) => e.slug === "triage-feedback");
  const g = triage?.guardrails ?? {};
  const complete = g.killSwitch === true && g.circuitBreaker === true && g.dedupe === true && typeof g.timeoutMs === "number";
  if (matrix?.gates?.JEV_SERVER_TRIAGE_PASS?.status === "PASS" && !complete) errors.push("OLD_TRIAGE_ACCEPTED_AS_PASS");
  if (matrix?.gates?.EDGE_FUNCTIONS_PASS?.status === "PASS" && !complete) errors.push("OLD_TRIAGE_ACCEPTED_AS_PASS:EDGE_FUNCTIONS_PASS");
  return errors;
}

// ---------------------------------------------------------------------------
// 22 · edge deploy order / parity
// ---------------------------------------------------------------------------

export const EDGE_STATUSES = ["DEPLOYED_STALE", "DEPLOYED_STALE_WAIT_MIGRATION", "DEPLOYED_UNKNOWN_DIFF", "MISSING_WAIT_MIGRATION", "READY_TO_DEPLOY", "CURRENT"];
export const EDGE_DEPLOY_GATES = ["READY_TO_DEPLOY", "WAIT_MIGRATION", "DIFF_FIRST", "HOLD_MONETIZATION", "NO_ACTION"];

function definedBy(sqlByFile, name) {
  const files = [];
  for (const [file, text] of Object.entries(sqlByFile ?? {})) {
    const re = new RegExp(`^create (?:or replace )?(?:function|table(?: if not exists)?) (?:public\\.)?"?${name}"?\\s*(?:\\(|$|\\s)`);
    if (sqlStatements(text).some((s) => re.test(s.masked))) files.push(file);
  }
  return files;
}

export function checkEdgeDeployOrder({ plan, graph, sqlByFile, workflowAllowlist }) {
  const errors = [];
  const safe = plan?.minimumSafeSet?.migrations ?? [];
  const byEdge = new Map((graph?.entries ?? []).filter((e) => e.kind === "edge").map((e) => [e.backendObject.replace(/^functions\//, ""), e]));
  for (const fn of plan?.minimumSafeSet?.edgeFunctionsToDeploy ?? []) {
    const entry = byEdge.get(fn);
    if (!entry) {
      errors.push(`EDGE_DEPLOY_UNKNOWN_FUNCTION:${fn}`);
      continue;
    }
    for (const dep of (entry.backendDependencies ?? []).filter((d) => d.productionStatus === "MISSING")) {
      const files = definedBy(sqlByFile, dep.name);
      if (!files.some((f) => safe.includes(f))) errors.push(`EDGE_DEPLOY_BEFORE_MIGRATION_DEPENDENCY:${fn} needs ${dep.name}`);
    }
  }
  for (const fn of workflowAllowlist ?? []) {
    const entry = byEdge.get(fn);
    if (!entry) continue;
    const missing = (entry.backendDependencies ?? []).filter((d) => d.productionStatus === "MISSING");
    if (missing.length || entry.productionStatus === "MISSING") errors.push(`WORKFLOW_ALLOWLIST_HAS_UNMET_DEPENDENCY:${fn}`);
  }
  return errors;
}

export function checkEdgeParity({ parity, repoFunctions, snapshot, graph }) {
  const errors = [];
  const rows = parity?.functions ?? [];
  const prod = new Map((snapshot?.edgeFunctions ?? []).map((e) => [e.slug, e]));
  const byEdge = new Map((graph?.entries ?? []).filter((e) => e.kind === "edge").map((e) => [e.backendObject.replace(/^functions\//, ""), e]));
  if (parity?.safety?.redeployed !== false) errors.push("EDGE_PARITY_CLAIMS_REDEPLOY");
  for (const slug of repoFunctions) if (!rows.some((r) => r.slug === slug)) errors.push(`EDGE_PARITY_FUNCTION_MISSING:${slug}`);
  for (const r of rows) {
    if (!repoFunctions.includes(r.slug)) errors.push(`EDGE_PARITY_UNKNOWN_FUNCTION:${r.slug}`);
    if (!EDGE_STATUSES.includes(r.status)) errors.push(`EDGE_PARITY_STATUS_VOCABULARY:${r.slug}:${r.status}`);
    if (!EDGE_DEPLOY_GATES.includes(r.deployGate)) errors.push(`EDGE_PARITY_GATE_VOCABULARY:${r.slug}:${r.deployGate}`);
    if (!(r.evidence ?? []).length) errors.push(`EDGE_PARITY_WITHOUT_EVIDENCE:${r.slug}`);
    const deployed = prod.get(r.slug);
    if (!deployed && !/^MISSING_/.test(r.status)) errors.push(`EDGE_PARITY_MISSING_FUNCTION_MISCLASSIFIED:${r.slug}`);
    if (deployed && /^MISSING_/.test(r.status)) errors.push(`EDGE_PARITY_DEPLOYED_FUNCTION_MISCLASSIFIED:${r.slug}`);
    if (deployed && r.production?.version !== deployed.version) errors.push(`EDGE_PARITY_VERSION_DRIFT:${r.slug}`);
    if (r.status === "CURRENT" && r.production?.sourceCompared !== true) errors.push(`EDGE_PARITY_CURRENT_WITHOUT_SOURCE_COMPARE:${r.slug}`);
    const entry = byEdge.get(r.slug);
    const missingDeps = (entry?.backendDependencies ?? []).filter((d) => d.productionStatus === "MISSING");
    if ((missingDeps.length || entry?.productionStatus === "MISSING") && r.deployGate === "READY_TO_DEPLOY") errors.push(`EDGE_PARITY_READY_WITH_MISSING_DEPENDENCY:${r.slug}`);
    if (missingDeps.length && !(r.dependencies?.objectsMissingInProduction ?? []).length) errors.push(`EDGE_PARITY_DEPENDENCIES_NOT_LISTED:${r.slug}`);
    if (/WAIT_MIGRATION/.test(r.status) && r.deployGate !== "WAIT_MIGRATION") errors.push(`EDGE_PARITY_WAIT_MIGRATION_NOT_GATED:${r.slug}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 23–25 · Stripe
// ---------------------------------------------------------------------------

const STRIPE_LIVE_SHAPES = [
  ["STRIPE_LIVE_SECRET_IN_REPO", /\b(?:sk|rk)_live_[A-Za-z0-9]{24,}/],
  ["STRIPE_LIVE_PUBLISHABLE_IN_REPO", /\bpk_live_[A-Za-z0-9]{24,}/],
  ["STRIPE_WEBHOOK_SECRET_IN_REPO", /\bwhsec_[A-Za-z0-9]{24,}/],
];

export function checkStripeKeyShapes({ files }) {
  const errors = [];
  for (const f of files ?? []) {
    for (const [code, re] of STRIPE_LIVE_SHAPES) if (re.test(f.text)) errors.push(`${code}:${f.file}`);
  }
  return errors;
}

export function checkStripeWebhookSource({ webhookSource }) {
  const errors = [];
  const src = String(webhookSource ?? "");
  const sig = src.indexOf('req.headers.get("stripe-signature")');
  const construct = Math.max(src.indexOf("constructEventAsync("), src.indexOf("constructEvent("));
  const firstWrite = (() => {
    const i = [src.indexOf("admin.from("), src.indexOf("admin.rpc("), src.indexOf("persistTransaction(")].filter((n) => n >= 0);
    return i.length ? Math.min(...i) : -1;
  })();
  if (sig < 0) errors.push("WEBHOOK_SIGNATURE_HEADER_NOT_READ");
  if (construct < 0) errors.push("WEBHOOK_SIGNATURE_NOT_VERIFIED");
  if (sig >= 0 && !/if \(!signature\)[\s\S]{0,200}status: 400/.test(src)) errors.push("WEBHOOK_MISSING_SIGNATURE_NOT_REJECTED");
  if (construct >= 0 && firstWrite >= 0 && construct > firstWrite) errors.push("WEBHOOK_WRITES_BEFORE_VERIFICATION");
  if (!/STRIPE_WEBHOOK_SECRET/.test(src) || !/status: 501/.test(src)) errors.push("WEBHOOK_SECRET_NOT_REQUIRED");
  if (!/onConflict: "stripe_event_id"/.test(src)) errors.push("WEBHOOK_NOT_IDEMPOTENT");
  if (!/p_event_created/.test(src) || !/p_event_id/.test(src)) errors.push("WEBHOOK_NOT_ORDERED");
  return errors;
}

// ---------------------------------------------------------------------------
// 26–27 · OAuth redirects
// ---------------------------------------------------------------------------

export function checkOAuthRedirectConfig({ configureSources, oauthRedirectSource }) {
  const errors = [];
  for (const [file, text] of Object.entries(configureSources ?? {})) {
    for (const m of String(text).matchAll(/["'`]((?:https?:\/\/)?[^"'`\s,]*\*[^"'`\s,]*|https?:\/\/[^"'`\s,$]+)["'`]/g)) {
      const raw = m[1];
      if (!/^https?:\/\//.test(raw) && !/^\*+$/.test(raw.replace(/\/\*+$/, ""))) continue;
      const host = raw.replace(/^https?:\/\//, "").split("/")[0];
      if (/\*/.test(host) || /^\*+$/.test(raw)) errors.push(`OAUTH_REDIRECT_WILDCARD_HOST:${file}:${raw}`);
      if (/^http:\/\//.test(raw) && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host)) errors.push(`OAUTH_REDIRECT_INSECURE_HOST:${file}:${raw}`);
    }
  }
  const src = String(oauthRedirectSource ?? "");
  if (!/allowedWebOrigins\(\)\.includes\(/.test(src)) errors.push("OAUTH_REDIRECT_NOT_ALLOWLISTED");
  if (/startsWith\(|endsWith\(|new RegExp\(|\.match\(/.test(src.replace(/\/\*[\s\S]*?\*\/|\/\/[^\n]*/g, ""))) errors.push("OAUTH_REDIRECT_PATTERN_MATCHING");
  if (!/\.origin\b/.test(src) || !/WRONG_PATH/.test(src)) errors.push("OAUTH_CALLBACK_NOT_EXACT");
  return errors;
}

// ---------------------------------------------------------------------------
// 28 · SMTP / Resend secrets
// ---------------------------------------------------------------------------

export function checkSmtpSecrets({ files }) {
  const errors = [];
  const placeholder = /<|\.\.\.|\$\{|\$[A-Z_]|process\.env|secrets\.|REDACTED|\*{3}|xxx|example|changeme|your[-_]/i;
  for (const f of files ?? []) {
    if (/\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/.test(f.text)) errors.push(`RESEND_KEY_IN_REPO:${f.file}`);
    if (/smtps?:\/\/[^\s:@/]+:[^\s@/]{4,}@/.test(f.text)) errors.push(`SMTP_URL_WITH_PASSWORD:${f.file}`);
    for (const m of f.text.matchAll(/\bsmtp[_-]?(?:pass(?:word)?|pwd)["']?\s*[:=]\s*["']?([^\s"',;)]{6,})/gi)) {
      if (!placeholder.test(m[1]) && !placeholder.test(m[0])) errors.push(`SMTP_SECRET_IN_REPO:${f.file}`);
    }
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 29–31 · Resend / Sentry must never break learning; Sentry scrub
// ---------------------------------------------------------------------------

function blocksAfter(src, marker) {
  const out = [];
  let from = 0;
  for (;;) {
    const i = src.indexOf(marker, from);
    if (i < 0) break;
    let depth = 0;
    let j = src.indexOf("{", i);
    const start = j;
    for (; j < src.length; j += 1) {
      if (src[j] === "{") depth += 1;
      if (src[j] === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out.push(src.slice(start, j + 1));
    from = j;
  }
  return out;
}

export function checkResendFailSoft({ createAccountSource, srcFiles, edgeSources }) {
  const errors = [];
  const blocks = blocksAfter(String(createAccountSource ?? ""), "if (resendError)");
  if (!blocks.length) errors.push("RESEND_ERROR_NOT_HANDLED");
  for (const b of blocks) if (/\breturn\b|\bthrow\b/.test(b)) errors.push("RESEND_FAILURE_BREAKS_SIGNUP");
  for (const f of srcFiles ?? []) if (/api\.resend\.com|RESEND_API_KEY/.test(f.text)) errors.push(`RESEND_IN_CLIENT:${f.file}`);
  const critical = ["commit-placement", "finalize-onboarding", "stripe-webhook", "delete-account", "issue-anon-ingestion-session", "sign-in-identifier", "triage-feedback"];
  for (const name of critical) if (/api\.resend\.com|RESEND_API_KEY/.test(edgeSources?.[name] ?? "")) errors.push(`RESEND_ON_LEARNING_PATH:${name}`);
  return errors;
}

export function checkSentryFailSoft({ errorReportingSource, mainSource, boundarySource }) {
  const errors = [];
  const er = String(errorReportingSource ?? "");
  const init = /export async function initErrorReporting\(\)[\s\S]*?\n}\n/.exec(er)?.[0] ?? "";
  if (!/try\s*{[\s\S]*await import\("@sentry\/browser"\)[\s\S]*}\s*catch/.test(init)) errors.push("SENTRY_INIT_NOT_GUARDED");
  if (/catch\s*(\(\w*\))?\s*{[^}]*throw/.test(init)) errors.push("SENTRY_INIT_RETHROWS");
  if (!/export function captureError[\s\S]{0,120}if \(!sentry\) return;/.test(er)) errors.push("SENTRY_CAPTURE_NOT_NOOP_WITHOUT_SDK");
  if (!/\bvoid initErrorReporting\(\)/.test(String(mainSource ?? "")) || /await initErrorReporting\(\)/.test(String(mainSource ?? ""))) errors.push("SENTRY_INIT_BLOCKS_STARTUP");
  if (!/captureError\(/.test(String(boundarySource ?? ""))) errors.push("SENTRY_BOUNDARY_NOT_WIRED");
  return errors;
}

export function checkSentryScrub({ errorReportingSource, errorScrubSource }) {
  const errors = [];
  const er = String(errorReportingSource ?? "");
  if (!/beforeSend:\s*\(event\)\s*=>\s*scrubEvent\(event\)/.test(er)) errors.push("SENTRY_BEFORE_SEND_NOT_SCRUBBED");
  if (!/beforeBreadcrumb:\s*\(crumb\)\s*=>\s*scrubBreadcrumb\(crumb\)/.test(er)) errors.push("SENTRY_BREADCRUMB_NOT_SCRUBBED");
  if (!/sendDefaultPii:\s*false/.test(er)) errors.push("SENTRY_DEFAULT_PII_ON");
  if (/replaysSessionSampleRate|replayIntegration|tracesSampleRate|browserTracingIntegration/.test(er)) errors.push("SENTRY_REPLAY_OR_TRACING_ON");
  const sc = String(errorScrubSource ?? "");
  if (!/export function scrubEvent/.test(sc) || !/export function scrubBreadcrumb/.test(sc)) errors.push("SENTRY_SCRUB_FUNCTIONS_MISSING");
  return errors;
}

// ---------------------------------------------------------------------------
// 33–35 · build / provenance / QA / Turnstile config
// ---------------------------------------------------------------------------

export function checkBuildConfig({ netlifyToml, androidBuildYml, androidReleaseYml, workflows }) {
  const errors = [];
  if (!/rc2-3-10-cloud-certification\.mjs provenance/.test(String(androidBuildYml)) || !/--expect-sha/.test(String(androidBuildYml))) errors.push("APK_PROVENANCE_STEP_MISSING");
  if (!/validate-frontend-secrets\.mjs/.test(String(netlifyToml))) errors.push("NETLIFY_BUNDLE_SECRET_SCAN_MISSING");
  const productionCtx = /\[context\.production\.environment\]([\s\S]*?)(?=\n\[)/.exec(String(netlifyToml))?.[1] ?? "";
  if (!productionCtx) errors.push("NETLIFY_PRODUCTION_CONTEXT_MISSING");
  if (/VITE_DEVICE_QA\s*=\s*"?(true|1)/.test(productionCtx) || /VITE_BETA_QA\s*=\s*"?(true|1)/.test(productionCtx)) errors.push("QA_FLAG_IN_PRODUCTION_CONTEXT");
  if (/VITE_USE_TEST_FIXTURES\s*=\s*"?(true|1)/.test(productionCtx)) errors.push("TEST_FIXTURES_IN_PRODUCTION_CONTEXT");
  if (/VITE_ALLOW_PRO_PREVIEW\s*=\s*"?(true|1)/.test(productionCtx)) errors.push("PRO_PREVIEW_IN_PRODUCTION_CONTEXT");
  if (/VITE_DEVICE_QA:\s*"?(true|1)/.test(String(androidReleaseYml)) || /VITE_USE_TEST_FIXTURES:\s*"?(true|1)/.test(String(androidReleaseYml))) errors.push("QA_FLAG_IN_RELEASE_WORKFLOW");
  for (const [file, text] of Object.entries(workflows ?? {})) {
    if (/TURNSTILE_ALLOW_SKIP\s*[=:]\s*["']?1/.test(text) && !/backend-contract|rehears/.test(file)) errors.push(`TURNSTILE_SKIP_IN_WORKFLOW:${file}`);
  }
  return errors;
}

export function checkTurnstileBusinessLead({ businessLeadSource }) {
  const errors = [];
  if (!/TURNSTILE_ALLOW_SKIP"\)\?\.trim\(\) === "1"/.test(String(businessLeadSource))) errors.push("TURNSTILE_SKIP_NOT_EXPLICIT:submit-business-lead");
  return errors;
}

// ---------------------------------------------------------------------------
// 36–37 · cloud smoke
// ---------------------------------------------------------------------------

export function checkCloudSmoke({ smokeSource, workflowText }) {
  const errors = [];
  const src = String(smokeSource ?? "");
  const wf = String(workflowText ?? "");
  if (!/LONGYU_QA_EMAIL/.test(src) || !/LONGYU_QA_PASSWORD/.test(src)) errors.push("SMOKE_NOT_QA_ACCOUNT");
  if (/signInWithPassword\(\{\s*email:\s*["'`]/.test(src)) errors.push("SMOKE_HARDCODED_ACCOUNT");
  if (!/never a real learner/i.test(`${src}\n${wf}`)) errors.push("SMOKE_REAL_LEARNER_NOT_EXCLUDED");
  if (/checkout|billing-portal|create-checkout-session|create-account|delete-account|\.rpc\("(claim|grant|activate|spend)/.test(src.replace(/\/\*[\s\S]*?\*\//, ""))) errors.push("SMOKE_TOUCHES_MONEY_OR_ACCOUNTS");
  if (!/workflow_dispatch/.test(wf) || /^\s+(push|pull_request|schedule):/m.test(wf)) errors.push("SMOKE_NOT_MANUAL_ONLY");
  if (!/p_client_dedupe_key:\s*runId/.test(src) || !/randomUUID\(\)/.test(src)) errors.push("SMOKE_NOT_IDEMPOTENT");
  if (!/\[cloud-smoke\]/.test(src)) errors.push("SMOKE_WRITE_NOT_NAMESPACED");
  if ((src.match(/\.rpc\(/g) ?? []).length > 1) errors.push("SMOKE_MULTIPLE_WRITES");
  return errors;
}

// ---------------------------------------------------------------------------
// 38–39 · retention, PII
// ---------------------------------------------------------------------------

export function checkRetentionDryRun({ retentionSql }) {
  const errors = [];
  const sql = stripSqlComments(retentionSql ?? "").replace(/\s+/g, " ");
  if (!/p_dry_run boolean default true/i.test(sql)) errors.push("RETENTION_NOT_DRY_RUN_BY_DEFAULT");
  const cron = /cron\.schedule\([^;]*\)/i.exec(sql)?.[0] ?? "";
  if (!/cron\.schedule/i.test(sql)) errors.push("RETENTION_NOT_SCHEDULED");
  if (/run_telemetry_retention\(\s*\d+\s*,\s*false\s*\)/i.test(cron)) errors.push("RETENTION_SCHEDULED_AS_REAL_DELETE");
  if (!/run_telemetry_retention\(\s*\d+\s*,\s*true\s*\)/i.test(cron)) errors.push("RETENTION_SCHEDULE_NOT_DRY_RUN");
  if (!/if p_dry_run|v_dry|p_dry_run then/i.test(sql)) errors.push("RETENTION_NO_DRY_RUN_BRANCH");
  if (!/created_at\s*<\s*/i.test(sql)) errors.push("RETENTION_NO_TEMPORAL_PREDICATE");
  if (/delete from public\.beta_pedagogy_events\s*(;|$)/i.test(sql)) errors.push("RETENTION_UNBOUNDED_DELETE");
  return errors;
}

export function checkSnapshotEmailPii({ matrix, ownerActions, repositorySource, triageSource, scrubSource }) {
  const errors = [];
  const writesEmail = /account:\s*{[^}]*email/.test(String(repositorySource ?? "")) || /\bemail:\s*(?:user|account|session)/.test(String(repositorySource ?? ""));
  const oa = (ownerActions?.actions ?? []).find((a) => a.id === "OA-PRIVACY-SNAPSHOT-EMAIL");
  if (writesEmail && matrix?.gates?.DATA_PRIVACY_PASS?.status === "PASS") errors.push("PII_EMAIL_IN_SNAPSHOT_ACCEPTED_AS_PASS");
  if (writesEmail && oa?.status === "PASS") errors.push("PII_EMAIL_OWNER_ACTION_CLOSED_WITHOUT_CODE_CHANGE");
  if (/user_id|\.email|user\.email|profiles\b/.test(/function feedbackState[\s\S]*?\n}\n/.exec(String(triageSource ?? ""))?.[0] ?? "")) errors.push("PII_SENT_TO_JEV");
  if (!/email|EMAIL/.test(String(scrubSource ?? ""))) errors.push("SENTRY_SCRUB_WITHOUT_EMAIL_MASK");
  return errors;
}

// ---------------------------------------------------------------------------
// 40–41 · owner actions, #273
// ---------------------------------------------------------------------------

export function checkOwnerActions({ ownerActions, matrix }) {
  const errors = [];
  const byId = new Map((ownerActions?.actions ?? []).map((a) => [a.id, a]));
  for (const a of ownerActions?.actions ?? []) {
    if (a.status === "PASS") {
      const proof = (Array.isArray(a.evidence) && a.evidence.length) || /\b[0-9a-f]{7,40}\b|https?:\/\//.test(`${a.note ?? ""} ${a.ownerSignature ?? ""}`);
      if (!proof) errors.push(`OWNER_ACTION_PASS_WITHOUT_EVIDENCE:${a.id}`);
    }
  }
  for (const [id, gate] of Object.entries(matrix?.gates ?? {})) {
    if (!gate.ownerAction) continue;
    const oa = byId.get(gate.ownerAction);
    if (!oa) errors.push(`MATRIX_OWNER_ACTION_UNKNOWN:${id}:${gate.ownerAction}`);
    else if (gate.status === "PASS" && oa.status !== "PASS") errors.push(`OWNER_GATE_PASS_WITHOUT_OWNER_EVIDENCE:${id}:${gate.ownerAction}`);
  }
  return errors;
}

const ISSUE_273_BLOCKERS = ["MIGRATION_HISTORY_PASS", "PRODUCTION_SCHEMA_TRUTH_PASS", "BACKUP_EXPORT_PASS", "PRODUCTION_RLS_PASS", "EDGE_FUNCTIONS_PASS"];
export function checkIssue273({ matrix }) {
  const errors = [];
  const gate = matrix?.gates?.ISSUE_273_RESOLUTION_READY;
  const open = ISSUE_273_BLOCKERS.filter((id) => matrix?.gates?.[id]?.status !== "PASS");
  if (gate?.status === "PASS" && open.length) errors.push(`ISSUE_273_READY_WHILE_BLOCKED:${open.join(",")}`);
  if (!gate) errors.push("ISSUE_273_GATE_MISSING");
  return errors;
}

// ---------------------------------------------------------------------------
// 42–44 · monetization, Jev struggle, auto purchase
// ---------------------------------------------------------------------------

export function checkMonetizationOff({ certifications, productTruth, checkoutSource, ownerActions }) {
  const errors = [];
  if (certifications?.monetization != null) errors.push("MONETIZATION_CERTIFIED_BEFORE_DECISION");
  if (productTruth?.commercial?.stripe?.mode !== "test") errors.push("STRIPE_NOT_TEST_MODE");
  if (productTruth?.commercial?.pricingDecision !== "NOT_RUN") errors.push("PRICING_DECIDED_EARLY");
  if (!/startsWith\("sk_live_"\)/.test(String(checkoutSource ?? ""))) errors.push("STRIPE_LIVE_NOT_REFUSED_IN_CHECKOUT");
  const oa = (ownerActions?.actions ?? []).find((a) => a.id === "OA-STRIPE-ACCOUNT-CONFIRM");
  if (oa?.status === "PASS") errors.push("STRIPE_ACCOUNT_CONFIRMED_WITHOUT_OWNER");
  return errors;
}

export function checkJevStruggleOff({ budgetPolicySource, productTruth, srcFiles, featureFlags }) {
  const errors = [];
  if (!/JEV_RUNTIME_ENABLED:\s*false/.test(String(budgetPolicySource ?? ""))) errors.push("JEV_RUNTIME_ENABLED_BY_DEFAULT");
  if (productTruth?.jev?.learnerRuntimeEnabled !== false) errors.push("JEV_PRODUCT_TRUTH_RUNTIME_ON");
  for (const f of srcFiles ?? []) {
    if (/jev/i.test(f.text) && /struggle/i.test(f.text) && /(typesafe|askJev|systemone)/i.test(f.text)) errors.push(`JEV_STRUGGLE_RUNTIME:${f.file}`);
    if (/JEV_STRUGGLE\w*\s*[:=]\s*(true|"1"|'1')/.test(f.text)) errors.push(`JEV_STRUGGLE_FLAG_ON:${f.file}`);
  }
  if (/JEV_STRUGGLE\w*"[^}]*"defaultValue":\s*true/.test(JSON.stringify(featureFlags ?? {}))) errors.push("JEV_STRUGGLE_FLAG_DEFAULT_ON");
  return errors;
}

export function checkNoAutoPurchase({ files, budgetPolicySource }) {
  const errors = [];
  if (!/out\.ALLOW_PAID_OVERAGE\s*=\s*false/.test(String(budgetPolicySource ?? ""))) errors.push("PAID_OVERAGE_NOT_FORCED_OFF");
  const patterns = [
    ["PAID_OVERAGE_ENABLED_IN_CODE", /ALLOW_PAID_OVERAGE\s*[:=]\s*true/],
    ["SUPABASE_BILLING_API_CALL", /api\.supabase\.com\/v1\/[^"'`\s]*(billing|addons|upgrade|subscription)/],
    ["NETLIFY_PURCHASE_API_CALL", /api\.netlify\.com\/api\/v1\/[^"'`\s]*(billing|purchase|upgrade|plan)/],
    ["SPEND_CAP_DISABLED", /spend[_-]?cap["']?\s*[:=]\s*(false|off|0)\b/i],
    ["COMPUTE_UPGRADE_CALL", /compute_size["']?\s*[:=]\s*["'](?!micro)/],
  ];
  for (const f of files ?? []) {
    if (/^docs\//.test(f.file) || /\.md$/.test(f.file) || /rc2-3-10b-(gates|certification)/.test(f.file)) continue;
    for (const [code, re] of patterns) if (re.test(f.text)) errors.push(`${code}:${f.file}`);
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 45 · LON-001 (sibling projects of the organisation are never named)
// ---------------------------------------------------------------------------

const lonTokens = () => [
  new RegExp(`\\b${["at", "omurus"].join("")}\\b`, "i"),
  new RegExp(`\\b${["longyu", "-preview"].join("")}\\b`),
  new RegExp(["ylof", "dottauzcqcifnnpm"].join("")),
  new RegExp(["wpnmy", "gzxqvmpdlcuwrjp"].join("")),
  new RegExp(["LONGYU_", "FOREIGN_PROJECTS"].join("")),
];
export function checkLon001({ files }) {
  const errors = [];
  const tokens = lonTokens();
  for (const f of files ?? []) for (const t of tokens) if (t.test(f.text)) errors.push(`LON001_SIBLING_PROJECT_NAMED:${f.file}`);
  return errors;
}
export const lon001Probe = () => ["at", "omurus"].join("");

// ---------------------------------------------------------------------------
// Closure honesty (docs/reports/rc2-3-10b-closure.md)
// ---------------------------------------------------------------------------

export function checkClosureHonesty({ closureMd }) {
  const errors = [];
  const text = String(closureMd ?? "");
  const lines = text.split("\n").filter((l) => /cloud\.certification/.test(l));
  if (!lines.length) errors.push("CLOSURE_CLOUD_CERTIFICATION_NOT_STATED");
  for (const l of lines) {
    if (/cloud\.certification[^\n]*(=|:|\|)\s*`?\*{0,2}PASS\b/.test(l) || !/BLOCKED/.test(l)) errors.push(`CLOSURE_CLAIMS_CLOUD_PASS:${l.trim().slice(0, 80)}`);
  }
  for (const word of ["BLOCKED", "NOT_RUN", "OWNER_ACTION_REQUIRED", "CONFIG_REQUIRED"]) {
    if (!text.includes(word)) errors.push(`CLOSURE_MISSING_STATUS:${word}`);
  }
  return errors;
}
