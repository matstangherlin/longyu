#!/usr/bin/env node
/**
 * RC2.3.10B — column-level production schema diff.
 *
 *   node scripts/rc2-3-10b-schema-column-diff.mjs generate   recompute docs/launch/rc2-3-10b-schema-column-diff.json
 *   node scripts/rc2-3-10b-schema-column-diff.mjs validate   committed diff == recomputed diff; evidence is clean
 *   node scripts/rc2-3-10b-schema-column-diff.mjs test       mutations: each rule must fail when broken
 *
 * Offline. Inputs: supabase/migrations, supabase/pending, the committed production
 * catalog extract (docs/launch/rc2-3-10b-schema-column-extract.json, read through
 * Supabase MCP with SELECT on pg_catalog only), the migration reconciliation and the
 * client call graph. Writes one JSON file. Never connects to production.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { checkLon001 } from "./lib/rc2-3-10b-gates.mjs";
import {
  clientImpactMap,
  diffSchemas,
  fileReconciliation,
  listReplayFiles,
  loadProductionCatalog,
  replayMigrations,
  scanClientColumns,
} from "./lib/rc2-3-10b-schema-column-diff.mjs";

const root = process.cwd();
const mode = process.argv[2];
const OUT = "docs/launch/rc2-3-10b-schema-column-diff.json";
const EXTRACT = "docs/launch/rc2-3-10b-schema-column-extract.json";
const RECON = "docs/launch/rc2-3-10b-migration-reconciliation.json";
const GRAPH = "docs/launch/rc2-3-10b-client-backend-call-graph.json";
const PROD_ONLY = "docs/launch/rc2-3-10b-prod-only-classification.json";

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const sha256 = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, rel))).digest("hex");

const SEVERITY_ORDER = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

const ECONOMY_RPCS = [
  "get_server_economy", "consume_charge", "spend_qi", "grant_lesson_reward", "grant_story_energy", "start_story_energy_session",
  "claim_mission", "open_chest", "migrate_local_economy", "add_league_weekly_xp", "claim_league_week_reward",
  "economy_ensure_row", "economy_insert_ledger", "economy_ledger_exists", "economy_user_is_pro", "economy_verified_mission_metric",
  "league_xp_server_amount", "activate_pearl_pro_pass", "claim_pearl_milestone",
];

function build(extract = readJson(EXTRACT), { allowMutate } = {}) {
  const reconciliation = readJson(RECON);
  const graph = readJson(GRAPH);
  const files = listReplayFiles(root);
  const { state } = replayMigrations(root, [...files.applied, ...files.pending]);
  const production = loadProductionCatalog(extract);
  const recon = fileReconciliation(reconciliation);
  const prodTables = new Map([...production.relations].filter(([, r]) => r.kind === "table"));
  const client = scanClientColumns(root, prodTables);
  if (allowMutate) allowMutate({ state, production, client });

  const findings = diffSchemas({ expected: state, production, recon, callGraph: graph, clientColumns: client.uses });
  const rank = (s) => SEVERITY_ORDER.indexOf(s);
  findings.sort((a, b) => rank(a.severity) - rank(b.severity) || a.kind.localeCompare(b.kind) || a.object.localeCompare(b.object));
  findings.forEach((f, i) => {
    f.id = `SCD-${String(i + 1).padStart(3, "0")}`;
  });

  const bySeverity = Object.fromEntries(SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length]));
  const byKind = {};
  for (const f of findings) byKind[f.kind] = (byKind[f.kind] ?? 0) + 1;

  const shared = [];
  for (const [name, t] of state.tables) {
    const p = prodTables.get(name);
    if (!p) continue;
    const related = findings.filter((f) => f.object.includes(`${name}.`) || f.object === `table:${name}` || f.object.startsWith(`pk:${name}`) || f.object.startsWith(`unique:${name}(`) || f.object.startsWith(`fk:${name}(`));
    shared.push({
      table: name,
      definedBy: t.file,
      reconciliation: recon.get(t.file) ?? { status: "UNKNOWN", class: "REPO_ONLY_NOT_APPLIED" },
      repoColumns: t.cols.size,
      productionColumns: p.cols.size,
      matchedColumns: [...t.cols.keys()].filter((c) => p.cols.has(c)).length,
      missingInProduction: [...t.cols.keys()].filter((c) => !p.cols.has(c)),
      onlyInProduction: [...p.cols.keys()].filter((c) => !t.cols.has(c)),
      typeDrift: [...t.cols].filter(([c, v]) => p.cols.has(c) && p.cols.get(c).type !== v.type).map(([c]) => c),
      findings: related.map((f) => f.id),
      verdict: related.some((f) => ["CRITICAL", "HIGH"].includes(f.severity)) ? "DRIFT" : related.some((f) => f.severity === "MEDIUM") ? "MINOR_DRIFT" : "COLUMNS_MATCH",
    });
  }
  shared.sort((a, b) => a.table.localeCompare(b.table));

  const impact = clientImpactMap(graph);
  const missingTables = [...state.tables]
    .filter(([n]) => !prodTables.has(n))
    .map(([n, t]) => ({
      table: n,
      definedBy: t.file,
      reconciliation: recon.get(t.file) ?? { status: "UNKNOWN", class: "REPO_ONLY_NOT_APPLIED" },
      expectedColumns: t.cols.size,
      clientCalled: impact.has(`table:${n}`),
      clientImpact: impact.get(`table:${n}`) ? { severity: impact.get(`table:${n}`).severity, via: impact.get(`table:${n}`).via } : null,
    }))
    .sort((a, b) => a.table.localeCompare(b.table));

  const hotfixBodies = new Map(
    readJson(PROD_ONLY).rows
      .filter((r) => r.classification === "HOTFIX_NOT_BACKPORTED")
      .map((r) => [/function:public\.([a-z_0-9]+)\(/.exec(r.object)?.[1], r.version])
      .filter(([n]) => n),
  );
  const economy = ECONOMY_RPCS.map((name) => {
    const prodRows = [...production.functions.values()].filter((f) => f.name === name);
    const repoRows = [...state.functions.values()].filter((f) => f.name === name);
    if (!prodRows.length) {
      return { function: name, production: "ABSENT", repo: repoRows.map((r) => ({ n: r.n, file: r.file })), verdict: repoRows.length ? "MISSING_IN_PRODUCTION" : "NOT_IN_REPO" };
    }
    return prodRows.map((p) => {
      const r = state.functions.get(`${p.name}/${p.n}`);
      const drift = [];
      if (!r) drift.push("SIGNATURE_NOT_IN_REPLAYED_REPO");
      else {
        if (r.secDef !== p.secDef) drift.push("SECURITY_MODE");
        if (r.secDef && (r.searchPath ?? null) !== (p.searchPath === "" ? "" : p.searchPath)) drift.push("SEARCH_PATH");
      }
      return {
        function: name,
        inputArgs: p.n,
        production: {
          securityDefiner: p.secDef,
          searchPath: p.searchPath === "" ? "(empty)" : p.searchPath ?? "(unset)",
          executeAnon: p.anonExec,
          executeAuthenticated: p.authExec,
          executePublic: p.publicExec,
          executeServiceRole: p.serviceExec,
        },
        repo: r ? { securityDefiner: r.secDef, searchPath: r.searchPath ?? "(unset)", file: r.file } : null,
        verdict: drift.length ? `DRIFT:${drift.join("+")}` : "ATTRIBUTES_MATCH",
        bodyCaveat: hotfixBodies.has(name)
          ? `HOTFIX_NOT_BACKPORTED (history row ${hotfixBodies.get(name)}): the live body is not any repo definition; attributes match but behaviour is unproven until a pg_get_functiondef diff is reviewed`
          : "body not read in this pass; attributes only",
      };
    });
  }).flat();

  const defs = [...production.functions.values()];
  const files2 = state.tables.size;
  return {
    schema: "longyu-schema-column-diff/1",
    wave: "RC2.3.10B",
    project: extract.project,
    productionRead: { readAt: extract.readAt, extract: EXTRACT, extractSha256: sha256(EXTRACT), method: extract.readBy },
    safety: {
      productionWrites: false,
      rowData: false,
      secretValues: false,
      functionBodies: false,
      note: "Catalog metadata only. Nothing was applied, deployed or repaired. Findings are inputs to PRODUCTION_MIGRATION_READY, not a go-ahead.",
    },
    method: [
      "Production side: pg_catalog SELECTs (columns, constraints, indexes, policies, function attribute flags, privilege flags) saved verbatim as docs/launch/rc2-3-10b-schema-column-extract.json.",
      "Repo side: supabase/migrations then supabase/pending replayed statement by statement (CREATE/ALTER/DROP TABLE, columns, constraints, indexes, policies, functions, literal and DO-array anon grants). The result is the schema the repo describes if every file had been applied.",
      "Each repo file carries its reconciliation class from rc2-3-10b-migration-reconciliation.json: RECONCILED (MATCH_EXACT, MATCH_SEMANTIC or PARTIAL_EQUIVALENT), HISTORY_ROW_UNPROVEN (a production history row exists but is UNKNOWN) or REPO_ONLY_NOT_APPLIED.",
      "Client columns: literal .from('t') chains under src/ (select list, filters, insert/upsert/update object literals) are checked against production columns.",
    ],
    limits: [
      "Text-based replay; dynamic SQL (EXECUTE format) is not expanded except literal anon grant arrays. Objects created only that way surface as ONLY_IN_PRODUCTION or are listed under replay.unparsed.",
      "CHECK constraints are compared by name only; expressions are kept in the extract for human review.",
      "Defaults are compared by presence, not by expression.",
      "Function bodies were not read, so behavioural drift (HOTFIX_NOT_BACKPORTED economy functions) is not visible here; see rc2-3-10b-prod-only-classification.json and the pg_get_functiondef digests in rc2-3-10b-live-facts.json.",
      "Client payloads built in a variable (update(patch)) are listed under clientColumnScan.unresolved and are not checked.",
    ],
    replay: {
      appliedFiles: files.applied.length,
      pendingFiles: files.pending.length,
      expected: { tables: state.tables.size, views: state.views.size, functions: state.functions.size, indexes: state.indexes.size, policies: state.policies.size },
      unparsed: state.unparsed.map((u) => ({ file: u.file, table: u.table, why: u.why })),
    },
    production: {
      tables: prodTables.size,
      views: production.relations.size - prodTables.size,
      functionOverloads: defs.length,
      functionNames: new Set(defs.map((f) => f.name)).size,
      rlsEnabledTables: [...prodTables.values()].filter((t) => t.rls).length,
      securityDefinerFunctions: defs.filter((f) => f.secDef).length,
      definerWithoutSearchPath: defs.filter((f) => f.secDef && f.searchPath == null).map((f) => `${f.name}/${f.n}`),
      publicExecuteFunctions: defs.filter((f) => f.publicExec).map((f) => `${f.name}/${f.n}`),
      anonExecuteFunctions: defs.filter((f) => f.anonExec).map((f) => `${f.name}/${f.n}`),
      tablesWithAnonFullPrivileges: [...prodTables.values()].filter((t) => t.anon === "ALL").length,
      tablesWithoutAnyPolicy: [...prodTables.values()].filter((t) => t.policies.size === 0).map((t) => t.name),
    },
    summary: {
      findings: findings.length,
      bySeverity,
      byKind: Object.fromEntries(Object.entries(byKind).sort(([a], [b]) => a.localeCompare(b))),
      sharedTables: shared.length,
      sharedTablesColumnsMatch: shared.filter((s) => s.verdict === "COLUMNS_MATCH").length,
      sharedTablesWithDrift: shared.filter((s) => s.verdict !== "COLUMNS_MATCH").length,
      tablesMissingInProduction: missingTables.length,
      tablesMissingInProductionClientCalled: missingTables.filter((t) => t.clientCalled).length,
      clientColumnsMissingInProduction: findings.filter((f) => f.kind === "CLIENT_COLUMN_MISSING_IN_PRODUCTION").length,
      verdict: findings.some((f) => ["CRITICAL", "HIGH"].includes(f.severity)) ? "BLOCKED" : "REVIEW",
      verdictNote: "BLOCKED while any CRITICAL/HIGH finding is open. This file alone never makes PRODUCTION_SCHEMA_TRUTH_PASS true: that gate also needs the owner-approved diff of function bodies and the PRODUCTION_MIGRATION_READY request.",
    },
    sharedTables: shared,
    missingTables,
    economyRpcs: economy,
    clientColumnScan: { checkedTables: client.uses.length, unresolved: client.unresolved },
    findings,
  };
}

function lonCheck(text, file) {
  return checkLon001({ files: [{ file, text }] });
}

function evidenceProblems(out, extractText) {
  const errors = [];
  const text = JSON.stringify(out);
  const blob = `${text}\n${extractText}`;
  if (/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/.test(blob)) errors.push("EVIDENCE_CONTAINS_JWT");
  if (/sk_(live|test)_[A-Za-z0-9]{8,}|whsec_[A-Za-z0-9]{8,}|rk_(live|test)_[A-Za-z0-9]{8,}/.test(blob)) errors.push("EVIDENCE_CONTAINS_STRIPE_KEY");
  if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(blob)) errors.push("EVIDENCE_CONTAINS_PRIVATE_KEY");
  if (/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(blob.replace(/user@example\.com/g, ""))) errors.push("EVIDENCE_CONTAINS_EMAIL");
  if (/\bcreate\s+(or\s+replace\s+)?function\b|\$\$[\s\S]{20,}\$\$/i.test(blob)) errors.push("EVIDENCE_CONTAINS_FUNCTION_BODY");
  errors.push(...lonCheck(blob, "rc2-3-10b-schema-column-*.json"));
  if (out.safety.productionWrites !== false || out.safety.rowData !== false) errors.push("SAFETY_FLAGS_NOT_FALSE");
  return errors;
}

function validate() {
  const errors = [];
  if (!fs.existsSync(path.join(root, OUT))) return [`MISSING:${OUT}`];
  const committed = readJson(OUT);
  const extractText = fs.readFileSync(path.join(root, EXTRACT), "utf8");
  const fresh = build();
  const strip = (o) => JSON.stringify(o);
  if (committed.productionRead.extractSha256 !== fresh.productionRead.extractSha256) errors.push("STALE:extract sha256 differs from committed diff");
  if (strip(committed.findings) !== strip(fresh.findings)) errors.push("STALE:findings differ from a fresh replay (migrations, call graph or client code changed); run `npm run schema:column-diff`");
  if (strip(committed.sharedTables) !== strip(fresh.sharedTables)) errors.push("STALE:sharedTables differ from a fresh replay");
  if (strip(committed.summary) !== strip(fresh.summary)) errors.push("STALE:summary differs from a fresh replay");
  errors.push(...evidenceProblems(committed, extractText));
  const ids = new Set();
  for (const f of committed.findings) {
    if (ids.has(f.id)) errors.push(`DUPLICATE_FINDING_ID:${f.id}`);
    ids.add(f.id);
    if (!SEVERITY_ORDER.includes(f.severity)) errors.push(`BAD_SEVERITY:${f.id}`);
  }
  const ex = readJson(EXTRACT);
  if (ex.sanity.tables !== committed.production.tables) errors.push("EXTRACT_TABLE_COUNT_MISMATCH");
  const fp = readJson("docs/launch/rc2-3-10b-schema-fingerprint.json");
  if (fp.counts.byType.table !== committed.production.tables) errors.push("FINGERPRINT_TABLE_COUNT_MISMATCH");
  if (fp.counts.byType.function !== committed.production.functionNames) errors.push("FINGERPRINT_FUNCTION_COUNT_MISMATCH");
  if (committed.summary.verdict === "BLOCKED" && !committed.summary.verdictNote) errors.push("BLOCKED_WITHOUT_NOTE");
  return errors;
}

function mutationTests() {
  const failures = [];
  const expect = (name, errs) => {
    if (!errs.length) failures.push(`MUTATION_SURVIVED:${name}`);
  };
  const base = build();
  const extractText = fs.readFileSync(path.join(root, EXTRACT), "utf8");

  expect("jwt in evidence", evidenceProblems({ ...base, note: `eyJ${"a".repeat(30)}.${"b".repeat(30)}.sig` }, extractText));
  expect("stripe key in evidence", evidenceProblems(base, `${extractText}\n${["sk", "live", "abcdefgh12345678"].join("_")}`));
  expect("email in evidence", evidenceProblems(base, `${extractText}\nsomeone@${"example"}.org`));
  expect("function body in evidence", evidenceProblems(base, `${extractText}\ncreate or replace function f() returns int as $$ select 1 $$`));
  expect("sibling project name", evidenceProblems(base, `${extractText}\n${["at", "omurus"].join("")}`));
  expect("writes flag", evidenceProblems({ ...base, safety: { ...base.safety, productionWrites: true } }, extractText));

  const dropCol = build(undefined, { allowMutate: ({ production }) => production.relations.get("profiles").cols.delete("username") });
  if (!dropCol.findings.some((f) => f.kind === "COLUMN_MISSING_IN_PRODUCTION" && f.object === "column:profiles.username")) failures.push("MUTATION_SURVIVED:column removed in production not detected");

  const typeSwap = build(undefined, { allowMutate: ({ production }) => (production.relations.get("profiles").cols.get("name").type = "integer") });
  if (!typeSwap.findings.some((f) => f.kind === "COLUMN_TYPE_DRIFT" && f.object === "column:profiles.name")) failures.push("MUTATION_SURVIVED:type drift not detected");

  const rlsOff = build(undefined, { allowMutate: ({ production }) => (production.relations.get("user_progress").rls = false) });
  if (!rlsOff.findings.some((f) => f.kind === "RLS_DISABLED_IN_PRODUCTION")) failures.push("MUTATION_SURVIVED:RLS off not detected");

  const noSp = build(undefined, { allowMutate: ({ production }) => (production.functions.get("claim_mission/4").searchPath = null) });
  if (!noSp.findings.some((f) => f.kind === "DEFINER_WITHOUT_SEARCH_PATH_IN_PRODUCTION")) failures.push("MUTATION_SURVIVED:definer without search_path not detected");

  const pubExec = build(undefined, { allowMutate: ({ production }) => (production.functions.get("spend_qi/3").publicExec = true) });
  if (!pubExec.findings.some((f) => f.kind === "PUBLIC_EXECUTE_IN_PRODUCTION")) failures.push("MUTATION_SURVIVED:PUBLIC execute not detected");

  const anon = build(undefined, { allowMutate: ({ production }) => (production.functions.get("spend_qi/3").anonExec = true) });
  if (!anon.findings.some((f) => f.kind === "ANON_EXECUTE_NOT_BACKED_BY_REPO_GRANT" && f.object === "function:spend_qi/3")) failures.push("MUTATION_SURVIVED:anon execute without repo grant not detected");

  const secdef = build(undefined, { allowMutate: ({ production }) => (production.functions.get("claim_mission/4").secDef = false) });
  if (!secdef.findings.some((f) => f.kind === "FUNCTION_SECURITY_MODE_DRIFT")) failures.push("MUTATION_SURVIVED:security mode drift not detected");

  const noPk = build(undefined, { allowMutate: ({ production }) => (production.relations.get("user_economy").pk = null) });
  if (!noPk.findings.some((f) => f.kind === "PRIMARY_KEY_MISSING_IN_PRODUCTION")) failures.push("MUTATION_SURVIVED:missing PK not detected");

  const phantom = build(undefined, { allowMutate: ({ client }) => client.uses.push({ table: "profiles", columns: ["no_such_column_xyz"], paths: ["src/x.ts:1"], usage: ["select"] }) });
  if (!phantom.findings.some((f) => f.object === "client:profiles.no_such_column_xyz")) failures.push("MUTATION_SURVIVED:client phantom column not detected");

  if (base.summary.bySeverity.CRITICAL + base.summary.bySeverity.HIGH > 0 && base.summary.verdict !== "BLOCKED") failures.push("MUTATION_SURVIVED:open HIGH findings but verdict not BLOCKED");
  return failures;
}

if (mode === "generate") {
  const out = build();
  fs.writeFileSync(path.join(root, OUT), `${JSON.stringify(out, null, 2)}\n`);
  console.log(`[rc2-3-10b-schema-column-diff] wrote ${OUT}: ${out.summary.findings} findings ${JSON.stringify(out.summary.bySeverity)}; shared tables ${out.summary.sharedTables} (${out.summary.sharedTablesColumnsMatch} columns match); missing tables ${out.summary.tablesMissingInProduction}; verdict ${out.summary.verdict}`);
} else if (mode === "validate") {
  const errors = validate();
  if (errors.length) {
    console.error(`[rc2-3-10b-schema-column-diff] FAIL\n- ${errors.join("\n- ")}`);
    process.exit(1);
  }
  console.log("[rc2-3-10b-schema-column-diff] validate OK");
} else if (mode === "test") {
  const failures = mutationTests();
  if (failures.length) {
    console.error(`[rc2-3-10b-schema-column-diff] FAIL\n- ${failures.join("\n- ")}`);
    process.exit(1);
  }
  console.log("[rc2-3-10b-schema-column-diff] test OK: every mutation was detected");
} else {
  console.error("usage: rc2-3-10b-schema-column-diff.mjs generate|validate|test");
  process.exit(2);
}
