/**
 * RC2.3.10B — REPO_ONLY migration dependency DAG and minimum safe set.
 *
 * For every ledger entry in state REPO_ONLY this script parses the SQL,
 * resolves what it defines and references, checks each object against the
 * production snapshot, finds who consumes it (edge functions, client call
 * graph), classifies it and orders the plan into batches A-D.
 *
 *   node scripts/release/build-migration-dependency-dag.mjs
 *
 * Read-only: no database, no network, nothing is applied.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  buildDefinitionIndex,
  dollarBlocks,
  executableSql,
  loadMigrationFiles,
  parseMigrationSql,
  scanEdgeFunctionSources,
  stripSqlComments,
} from "../lib/sql-object-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER_PATH = "docs/launch/production-migration-ledger.json";
const SNAPSHOT_PATH = "docs/launch/production-snapshot.json";
const RECONCILIATION_PATH = "docs/launch/rc2-3-10b-migration-reconciliation.json";
const CALL_GRAPH_PATH = "docs/launch/rc2-3-10b-client-backend-call-graph.json";
const OUT_JSON = "docs/launch/rc2-3-10b-migration-plan.json";

const PROVEN_STATUSES = new Set(["MATCH_EXACT", "MATCH_SEMANTIC"]);

/** Columns the owner confirmed present on production; the snapshot is table-level only. */
const OWNER_CONFIRMED_COLUMNS = new Set(["profiles.username", "profiles.avatar_key", "profiles.league_tier"]);

const DOMAIN_RULES = [
  { domain: "social", pattern: /user_follows|social_activity_events|public_profiles|search_public_profiles|get_public_profile|friend/ },
  { domain: "family", pattern: /famil/ },
  { domain: "business", pattern: /business|organization/ },
  { domain: "pearl", pattern: /pearl/ },
  { domain: "placement", pattern: /placement|onboarding/ },
  { domain: "telemetry", pattern: /telemetry|retention|mastery_pass|help_/ },
];

/**
 * Judgement calls the SQL alone cannot decide. Every entry carries the
 * evidence it rests on; anything not listed here is classified from the
 * snapshot, the SQL and the client call graph.
 */
const OVERRIDES = {
  "supabase/pending/rc2-3-10-league-memberships-policy-recursion.sql": {
    underlyingClass: "LAUNCH_REQUIRED",
    batch: "A",
    reason:
      "Fixes policy league_memberships_select_peers, which fails closed with 42P17 on every direct authenticated SELECT in production (snapshot rlsBehavior). The client only reads leagues through SECURITY DEFINER RPCs, so beta is not blocked; launch should not ship a broken policy.",
    clientEvidence: { table: "league_memberships" },
  },
  "supabase/pending/rc2-3-10-telemetry-retention.sql": {
    underlyingClass: "LAUNCH_REQUIRED",
    batch: "D",
    reason:
      "beta_pedagogy_events grows ~1.9k rows/10 weeks with cleanup unscheduled (snapshot telemetry.cleanupScheduled=false). Adds a dry-run weekly cron over the already-deployed cleanup_beta_pedagogy_events; needed before launch traffic, not for beta.",
  },
  "supabase/migrations/20260828013000_api_role_table_grants.sql": {
    underlyingClass: "SUPERSEDED",
    batch: null,
    reason:
      "Grants ALL on profiles/user_progress/user_srs/subscriptions/transactions to anon and authenticated. Its own header says production already has the platform default privileges, and 20260828020000_least_privilege_api_grants.sql explicitly walks that grant back. Applying it alone would widen privileges.",
  },
  "supabase/migrations/20260828020000_least_privilege_api_grants.sql": {
    underlyingClass: "LAUNCH_REQUIRED",
    batch: "A",
    reason:
      "Least-privilege Data API grants (revokes broad anon/authenticated DML). Security hardening for launch. Production's current table grants are not in the snapshot, so the delta cannot be shown yet.",
  },
};

const FILE_NOTES = {
  "supabase/pending/rc2-3-10-telemetry-retention.sql": [
    "Owner decision OA-TELEMETRY-RETENTION-DECISION is still open (recommended 30 days raw + daily aggregates). The cron it adds is a weekly DRY RUN; enabling real deletion is a separate owner-approved statement.",
  ],
  "supabase/migrations/20260828030000_progress_mastery_monotonic.sql": [
    "BEFORE UPDATE trigger on user_progress that rewrites client_snapshot. No client call references it, so it is FUTURE_FEATURE by the rules, but it guards against multi-device mastery regression; promote to LAUNCH_REQUIRED if that regression is observed. Rehearse against a copy of production user_progress first.",
  ],
  "supabase/migrations/20260828032249_progress_mastery_monotonic_clamp.sql": [
    "Supersedes 20260828030000 for the trigger function. Apply as a pair or not at all; same rehearsal requirement.",
  ],
  "supabase/migrations/20260914210000_family_entitlement.sql": [
    "Grants Pro through a family seat by replacing get_server_entitlement and economy_user_is_pro. PRODUCT_TRUTH says family_plan cannot be purchased yet, so nothing consumes it today.",
  ],
  "supabase/migrations/20260827023000_placement_onboarding_handoff.sql": [
    "Backfills profiles.country_code on production rows (update ... where country_code is null). Capture the affected row count before applying; the backfill is not reversible without a backup.",
    "Replaces ensure_own_profile. Production's current definition matches 021_ensure_own_profile.sql (ledger MATCH); diff the handoff version against it before apply.",
    "Needs the edge functions commit-placement and finalize-onboarding deployed; the deployed create-account already calls save_placement_onboarding_draft.",
  ],
  "supabase/migrations/20260826230000_placement_onboarding.sql": [
    "Adds a foreign key from profiles to placement_attempts (constraint added on a production table; validate existing rows).",
  ],
  "supabase/migrations/005_social.sql": [
    "Do not apply verbatim. 20260808070849_secure_social_profile_boundary.sql dropped profiles_select_social and replaced the public-profile RPCs with hardened versions, but it is already ledger-applied and its social block was a no-op in production (guarded by to_regclass('public.user_follows')). A safe social module needs a NEW forward migration: the 005 tables plus the hardened RPCs from the boundary migration, without the profiles_select_social policy, the public_profiles view, the v1 username constraint, or the older sync_profile_public_stats.",
  ],
  "supabase/migrations/20260828020000_least_privilege_api_grants.sql": [
    "Production's table grants are not in the snapshot. Capture them (information_schema.role_table_grants) before deciding the delta.",
  ],
};

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const exists = (rel) => fs.existsSync(path.join(root, rel));

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function qualifiedRefs(sqlText) {
  const text = stripSqlComments(sqlText);
  const doBlocks = dollarBlocks(text).filter((block) => block.kind === "do");
  const guarded = (index) =>
    doBlocks.some(
      (block) =>
        index > block.openAt &&
        index < block.closeAt &&
        /to_regclass|to_regprocedure|if\s+(not\s+)?exists|information_schema/i.test(text.slice(block.start, block.end))
    );
  const refs = [];
  for (const m of text.matchAll(/\bpublic\.("?)([a-z_][a-z0-9_]*)\1(\()?/gi)) {
    refs.push({ name: m[2], call: Boolean(m[3]), guarded: guarded(m.index) });
  }
  return refs;
}

function namesAfter(sqlText, verbRegex) {
  const text = executableSql(stripSqlComments(sqlText));
  const names = new Set();
  for (const stmt of text.matchAll(verbRegex)) {
    for (const m of stmt[0].matchAll(/\bpublic\.("?)([a-z_][a-z0-9_]*)\1/gi)) names.add(m[2]);
  }
  return names;
}

function droppedPolicies(sqlText) {
  const text = executableSql(stripSqlComments(sqlText));
  const out = new Set();
  for (const m of text.matchAll(/drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|[a-z_0-9]+)\s+on\s+(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi)) {
    out.add(`${m[2]}.${m[1].replace(/"/g, "")}`);
  }
  return out;
}

function domainOfObjects(names) {
  const counts = {};
  for (const name of names) {
    const rule = DOMAIN_RULES.find((entry) => entry.pattern.test(name));
    if (rule) counts[rule.domain] = (counts[rule.domain] ?? 0) + 1;
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function main() {
  const ledger = readJson(LEDGER_PATH);
  const snapshot = readJson(SNAPSHOT_PATH);
  const reconciliation = exists(RECONCILIATION_PATH) ? readJson(RECONCILIATION_PATH) : null;
  const callGraph = exists(CALL_GRAPH_PATH) ? readJson(CALL_GRAPH_PATH) : null;

  const present = {
    tables: new Set([...snapshot.tables.map((t) => t.name), ...(snapshot.views ?? []).map((v) => v.name)]),
    functions: new Set(snapshot.functions.map((f) => f.name)),
    edge: new Set(snapshot.edgeFunctions.map((f) => f.slug)),
    extensions: new Set(snapshot.extensionsInstalled ?? []),
  };

  const files = loadMigrationFiles(root);
  const byFile = new Map(files.map((entry) => [entry.file, entry]));
  const parsed = new Map(files.map((entry) => [entry.file, parseMigrationSql(entry.sql)]));
  const definitions = buildDefinitionIndex(files.map((entry) => ({ file: entry.file, parsed: parsed.get(entry.file) })));
  const edgeSources = scanEdgeFunctionSources(root);

  const repoOnly = ledger.entries.filter((entry) => entry.state === "REPO_ONLY" && entry.repoFile);
  const repoOnlyFiles = [...new Set(repoOnly.map((entry) => entry.repoFile))].filter((file) => byFile.has(file)).sort((a, b) => byFile.get(a).order - byFile.get(b).order);
  const repoOnlySet = new Set(repoOnlyFiles);

  const appliedFiles = new Set(ledger.entries.filter((entry) => entry.version && entry.repoFile && entry.state !== "REPO_ONLY").map((entry) => entry.repoFile));
  const reconByFile = new Map();
  for (const entry of reconciliation?.entries ?? []) {
    if (!entry.repoFile || !entry.version) continue;
    const list = reconByFile.get(entry.repoFile) ?? [];
    list.push({ version: entry.version, status: entry.status });
    reconByFile.set(entry.repoFile, list);
  }
  const provenApplied = (file) => (reconByFile.get(file) ?? []).some((entry) => PROVEN_STATUSES.has(entry.status)) || ledger.entries.some((e) => e.repoFile === file && e.version && e.state === "MATCH");

  const kindOf = (name, call) => {
    const isFn = present.functions.has(name) || definitions.function.has(name);
    const isTable = present.tables.has(name) || definitions.table.has(name) || definitions.view.has(name);
    if (isFn && !isTable) return "function";
    if (isTable && !isFn) return "table";
    return call ? "function" : "table";
  };
  const isPresent = (kind, name) => (kind === "function" ? present.functions.has(name) : present.tables.has(name));
  const introducingRepoOnly = (kind, name) => {
    const slot = kind === "function" ? definitions.function.get(name) : definitions.table.get(name) ?? definitions.view.get(name);
    if (!slot) return null;
    const candidates = slot.definers.filter((d) => repoOnlySet.has(d.file) && !d.conditional);
    return candidates.length ? candidates[0].file : null;
  };

  const nodes = [];
  for (const file of repoOnlyFiles) {
    const entry = byFile.get(file);
    const info = parsed.get(file);
    const exec = executableSql(stripSqlComments(entry.sql));

    const definedObjects = [
      ...info.defined.tables.map((d) => ({ kind: "table", ...d })),
      ...info.defined.views.map((d) => ({ kind: "view", ...d })),
      ...info.defined.functions.map((d) => ({ kind: "function", ...d })),
    ].map((d) => {
      const prodKind = d.kind === "function" ? "function" : "table";
      const presentInProduction = isPresent(prodKind, d.name);
      return {
        kind: d.kind,
        name: d.name,
        mode: d.mode,
        conditional: d.conditional,
        presentInProduction,
      };
    });
    const columnObjects = info.defined.columns.map((c) => ({
      name: c.name,
      presentInProduction: OWNER_CONFIRMED_COLUMNS.has(c.name) ? true : present.tables.has(c.name.split(".")[0]) ? "UNVERIFIED" : false,
    }));
    const missingObjects = definedObjects.filter((o) => !o.presentInProduction).map((o) => `${o.kind}:${o.name}`);
    const presentObjects = definedObjects.filter((o) => o.presentInProduction).map((o) => `${o.kind}:${o.name}`);

    const allRefs = qualifiedRefs(entry.sql);
    const ddlRefs = qualifiedRefs(exec);
    const definedNames = new Set(definedObjects.map((o) => o.name));
    const refInfo = new Map();
    for (const ref of allRefs) {
      if (definedNames.has(ref.name)) continue;
      const kind = kindOf(ref.name, ref.call);
      const key = `${kind}:${ref.name}`;
      const slot = refInfo.get(key) ?? { kind, name: ref.name, ddl: false, ddlUnguarded: false, guardedOnly: true };
      refInfo.set(key, slot);
    }
    for (const ref of ddlRefs) {
      if (definedNames.has(ref.name)) continue;
      const slot = refInfo.get(`${kindOf(ref.name, ref.call)}:${ref.name}`);
      if (!slot) continue;
      slot.ddl = true;
      if (!ref.guarded) slot.ddlUnguarded = true;
    }

    const dependencyDetail = [];
    const satisfiedByProduction = [];
    const unresolved = [];
    const addDependency = (file2, strength, via) => {
      const existing = dependencyDetail.find((d) => d.file === file2);
      const rank = { hard: 3, redefines: 2, runtime: 1, conditional: 0 };
      if (existing) {
        existing.via.push(via);
        if (rank[strength] > rank[existing.strength]) existing.strength = strength;
      } else dependencyDetail.push({ file: file2, strength, via: [via] });
    };
    for (const slot of refInfo.values()) {
      const label = `${slot.kind}:${slot.name}`;
      if (isPresent(slot.kind, slot.name)) {
        satisfiedByProduction.push(label);
        continue;
      }
      const definer = introducingRepoOnly(slot.kind, slot.name);
      if (definer && definer !== file) {
        const strength = slot.ddlUnguarded ? "hard" : slot.ddl ? "conditional" : "runtime";
        addDependency(definer, strength, label);
      } else if (!definer) {
        unresolved.push({ object: label, ddlTime: slot.ddlUnguarded, note: "absent in production and defined by no REPO_ONLY file" });
      }
    }
    for (const object of definedObjects.filter((o) => o.kind !== "table" && o.mode === "replace")) {
      const earlier = (object.kind === "function" ? definitions.function : definitions.table).get(object.name)?.definers.find((d) => repoOnlySet.has(d.file) && d.file !== file && byFile.get(d.file).order < entry.order);
      if (earlier) addDependency(earlier.file, "redefines", `${object.kind}:${object.name}`);
    }
    dependencyDetail.sort((a, b) => byFile.get(a.file).order - byFile.get(b.file).order);

    const hazards = [];
    const replacedProduction = definedObjects.filter((o) => o.presentInProduction && o.mode === "replace" && o.kind === "function");
    const staleOverwrites = [];
    const unprovenReplacements = [];
    for (const object of replacedProduction) {
      const laterApplied = (definitions.function.get(object.name)?.definers ?? []).filter((d) => appliedFiles.has(d.file) && byFile.get(d.file).order > entry.order);
      if (laterApplied.length) {
        staleOverwrites.push({ function: object.name, newerAppliedDefinitions: laterApplied.map((d) => d.file) });
        continue;
      }
      const priorApplied = (definitions.function.get(object.name)?.definers ?? []).filter((d) => appliedFiles.has(d.file));
      if (priorApplied.length && !priorApplied.every((d) => provenApplied(d.file))) {
        unprovenReplacements.push({ function: object.name, productionDefinitionSources: priorApplied.map((d) => d.file), note: "production definition came from a migration whose applied SQL is not proven equal to the repo file" });
      }
    }
    if (staleOverwrites.length) hazards.push({ code: "STALE_OVERWRITE", detail: `create or replace would overwrite ${staleOverwrites.length} production function(s) that a later applied migration redefined`, items: staleOverwrites });
    if (unprovenReplacements.length) hazards.push({ code: "REPLACES_UNPROVEN_PRODUCTION_FUNCTION", detail: `replaces ${unprovenReplacements.length} production function(s) whose current definition is not proven equal to any repo file`, items: unprovenReplacements });

    const createdPolicies = info.defined.policies.map((p) => p.name);
    const reintroducedPolicies = [];
    for (const policy of createdPolicies) {
      const droppers = files.filter((other) => other.file !== file && appliedFiles.has(other.file) && other.order > entry.order && droppedPolicies(other.sql).has(policy)).map((other) => other.file);
      if (droppers.length) reintroducedPolicies.push({ policy, droppedByLaterApplied: droppers });
    }
    if (reintroducedPolicies.length) hazards.push({ code: "REINTRODUCES_DROPPED_POLICY", detail: "creates a policy that a later applied migration deliberately dropped", items: reintroducedPolicies });

    const grantNames = namesAfter(entry.sql, /\bgrant\b[^;]+;/gi);
    const regrants = [];
    for (const other of files) {
      if (other.file === file || !appliedFiles.has(other.file) || other.order <= entry.order) continue;
      const revoked = namesAfter(other.sql, /\brevoke\b[^;]+;/gi);
      const overlap = [...grantNames].filter((name) => revoked.has(name) && isPresent(kindOf(name, false), name));
      if (overlap.length) regrants.push({ revokedBy: other.file, objects: overlap });
    }
    if (regrants.length) hazards.push({ code: "REGRANTS_REVOKED_PRIVILEGE", detail: "grants on objects that a later applied migration revoked (role-level precision not checked)", items: regrants });

    const absentUnguarded = unresolved.filter((u) => u.ddlTime);
    if (absentUnguarded.length) hazards.push({ code: "UNRESOLVED_DDL_REFERENCE", detail: "DDL references objects that are absent in production and defined by no REPO_ONLY file", items: absentUnguarded });
    const hardAbsent = [...refInfo.values()].filter((slot) => slot.ddlUnguarded && !isPresent(slot.kind, slot.name) && introducingRepoOnly(slot.kind, slot.name));
    if (hardAbsent.length) {
      hazards.push({
        code: "DDL_REFERENCES_ABSENT_OBJECTS",
        detail: "unguarded DDL (e.g. REVOKE/GRANT/ALTER) names objects absent in production; the migration fails unless their definers run first",
        items: hardAbsent.map((slot) => `${slot.kind}:${slot.name}`),
      });
    }
    const addedConstraints = info.hazards.addedConstraints;
    const reintroducedConstraints = [];
    for (const constraint of addedConstraints) {
      const droppers = files.filter((other) => other.file !== file && appliedFiles.has(other.file) && other.order > entry.order && parsed.get(other.file).hazards.droppedConstraints.includes(constraint)).map((other) => other.file);
      if (droppers.length) reintroducedConstraints.push({ constraint, droppedByLaterApplied: droppers });
    }
    if (reintroducedConstraints.length) hazards.push({ code: "REINTRODUCES_DROPPED_CONSTRAINT", detail: "adds a constraint that a later applied migration dropped and replaced", items: reintroducedConstraints });
    const constraintRewrites = addedConstraints.filter((c) => info.hazards.droppedConstraints.includes(c) && info.modifies.some((table) => present.tables.has(table)) && !reintroducedConstraints.some((r) => r.constraint === c));
    if (constraintRewrites.length) hazards.push({ code: "CONSTRAINT_REWRITE_ON_PRODUCTION_TABLE", detail: "drops and re-adds a constraint on a production table; existing rows must satisfy it (non-blocking)", items: constraintRewrites, blocking: false });
    const productionConstraintRewrite = constraintRewrites.length > 0 || reintroducedConstraints.length > 0;

    const policiesTouchedOnProduction = (info.defined.policies.some((p) => present.tables.has(p.name.split(".")[0])) || droppedPolicies(entry.sql).size > 0) && [...droppedPolicies(entry.sql)].some((p) => present.tables.has(p.split(".")[0]));
    const privilegeChanging = info.hazards.privilegeChanges.length > 0;
    const replacesProductionObjects = replacedProduction.map((o) => o.name);

    const fileTables = new Set(definedObjects.filter((o) => o.kind !== "function").map((o) => o.name));
    const seedData = info.hazards.dataMigration.filter((d) => fileTables.has(d.table));
    const backfill = info.hazards.dataMigration.filter((d) => !fileTables.has(d.table));
    const destructiveOnProduction = info.hazards.destructive.filter((d) => !d.table || present.tables.has(d.table));
    const destructiveOnNewObjects = info.hazards.destructive.filter((d) => d.table && !present.tables.has(d.table));
    const additive =
      destructiveOnProduction.length === 0 &&
      backfill.length === 0 &&
      replacesProductionObjects.length === 0 &&
      !policiesTouchedOnProduction &&
      !productionConstraintRewrite &&
      !privilegeChanging;
    let reversibility;
    if (destructiveOnProduction.length || backfill.length) reversibility = "IRREVERSIBLE_WITHOUT_BACKUP";
    else if (replacesProductionObjects.length || policiesTouchedOnProduction || productionConstraintRewrite || privilegeChanging) reversibility = "REVERSIBLE_WITH_CAPTURED_PRIOR_DEFINITIONS";
    else reversibility = "REVERSIBLE_BY_DROP";

    const objectNames = [...definedNames, ...info.defined.columns.map((c) => c.name)];
    const domain = domainOfObjects(objectNames.length ? objectNames : [path.basename(file)]) ?? domainOfObjects([path.basename(file)]);

    const partialChunks = (reconByFile.get(file) ?? []).filter((c) => !ledger.entries.some((e) => e.repoFile === file && e.version === c.version && e.state === "REPO_ONLY"));

    const ledgerRow = repoOnly.find((row) => row.repoFile === file);
    nodes.push({
      file,
      isBaseline: /pre-history baseline/i.test(ledgerRow?.action ?? ""),
      order: entry.order,
      domain,
      pending: entry.dir === "supabase/pending",
      defines: { objects: definedObjects, columns: columnObjects },
      definesTotal: definedObjects.length,
      definesPresentInProduction: presentObjects.length,
      missingObjects,
      references: {
        tables: [...refInfo.values()].filter((s) => s.kind === "table").map((s) => s.name).sort(),
        functions: [...refInfo.values()].filter((s) => s.kind === "function").map((s) => s.name).sort(),
        satisfiedByProduction: satisfiedByProduction.sort(),
        unresolved,
      },
      dependencyDetail,
      hazards,
      change: {
        additive,
        destructive: destructiveOnProduction.map((d) => d.statement),
        destructiveOnNewObjects: destructiveOnNewObjects.map((d) => d.statement),
        dataMigration: backfill.map((d) => d.statement),
        seedData: seedData.map((d) => d.statement),
        replacesProductionObjects,
        privilegeChanging,
        policiesTouchedOnProduction,
        reversibleDrops: info.hazards.reversibleDrops,
        reversibility,
        usesCron: info.flags.usesCron,
        usesAuthUsers: info.flags.usesAuthUsers,
        createsExtension: info.flags.createsExtension,
        wrapsTransaction: info.flags.wrapsTransaction,
      },
      productionChunks: partialChunks,
      consumers: { edgeFunctions: [], frontend: [] },
    });
  }
  const nodeByFile = new Map(nodes.map((n) => [n.file, n]));

  const definedBy = new Map();
  for (const node of nodes) {
    for (const object of node.defines.objects) {
      const key = `${object.kind === "function" ? "function" : "table"}:${object.name}`;
      const list = definedBy.get(key) ?? [];
      list.push(node.file);
      definedBy.set(key, list);
    }
  }

  for (const [slug, source] of Object.entries(edgeSources)) {
    const used = [
      ...[...source.tables, ...source.sharedTables].map((name) => `table:${name}`),
      ...[...source.rpcs, ...source.sharedRpcs].map((name) => `function:${name}`),
    ];
    for (const key of new Set(used)) {
      for (const file of definedBy.get(key) ?? []) {
        const node = nodeByFile.get(file);
        let consumer = node.consumers.edgeFunctions.find((c) => c.slug === slug);
        if (!consumer) {
          consumer = { slug, deployedInProduction: present.edge.has(slug), objects: [] };
          node.consumers.edgeFunctions.push(consumer);
        }
        if (!consumer.objects.includes(key)) consumer.objects.push(key);
      }
    }
  }

  if (callGraph) {
    for (const entry of callGraph.entries) {
      if (entry.kind === "table" || entry.kind === "rpc") {
        const key = `${entry.kind === "rpc" ? "function" : "table"}:${entry.backendObject}`;
        for (const file of definedBy.get(key) ?? []) {
          nodeByFile.get(file).consumers.frontend.push({
            clientCall: entry.clientCall,
            kind: entry.kind,
            backendObject: entry.backendObject,
            objectKey: key,
            productionStatus: entry.productionStatus,
            severity: entry.severity,
            productionPath: entry.productionPath,
            routes: entry.routes,
            inAppShell: entry.inAppShell,
            coreFlow: entry.coreFlow,
            via: null,
          });
        }
      } else if (entry.kind === "edge") {
        for (const dependency of entry.backendDependencies ?? []) {
          const key = `${dependency.kind === "rpc" ? "function" : "table"}:${dependency.name}`;
          for (const file of definedBy.get(key) ?? []) {
            nodeByFile.get(file).consumers.frontend.push({
              clientCall: entry.clientCall,
              kind: "edge",
              backendObject: `${entry.backendObject} -> ${dependency.name}`,
              objectKey: key,
              productionStatus: dependency.productionStatus,
              severity: entry.severity,
              productionPath: entry.productionPath,
              routes: entry.routes,
              inAppShell: entry.inAppShell,
              coreFlow: entry.coreFlow,
              via: entry.backendObject,
            });
          }
        }
      }
    }
  }

  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  for (const node of nodes) {
    const missingKeys = new Set(node.missingObjects.map((m) => m.replace(/^view:/, "table:")));
    const needed = node.consumers.frontend.filter((c) => c.productionPath && c.productionStatus === "MISSING" && missingKeys.has(c.objectKey));
    node.neededByProductionClient = dedupeBy(needed, (c) => `${c.clientCall}|${c.backendObject}`).sort((x, y) => severityRank[x.severity] - severityRank[y.severity]);
  }

  for (const node of nodes) {
    const override = OVERRIDES[node.file];
    const notes = [...(FILE_NOTES[node.file] ?? [])];
    node.notes = notes;
    let underlying;
    let reason;
    let batchOverride = null;

    if (override) {
      underlying = override.underlyingClass;
      reason = override.reason;
      batchOverride = override.batch;
      if (override.clientEvidence?.table && callGraph?.entries.some((e) => e.kind === "table" && e.backendObject === override.clientEvidence.table && e.productionPath)) {
        underlying = "BETA_REQUIRED";
        notes.push(`client reads ${override.clientEvidence.table} directly on a production path, so the fix is beta-blocking`);
      }
    } else if (node.definesTotal === 0 && node.defines.columns.length > 0 && node.defines.columns.every((c) => c.presentInProduction !== false)) {
      underlying = "SUPERSEDED";
      reason = `only adds ${node.defines.columns.length} column(s) with 'if not exists' to table(s) that exist in production; the snapshot is table-level, so column presence is UNVERIFIED`;
      node.verification = ["Read information_schema.columns for " + node.defines.columns.map((c) => c.name).join(", ")];
    } else if (node.definesTotal > 0 && node.missingObjects.length === 0) {
      const undecided = node.hazards.find((h) => h.code === "REPLACES_UNPROVEN_PRODUCTION_FUNCTION");
      const unreplacedDrift = node.change.replacesProductionObjects.filter((fn) => !node.hazards.some((h) => h.code === "STALE_OVERWRITE" && h.items.some((i) => i.function === fn)));
      if (node.isBaseline || !unreplacedDrift.length) {
        underlying = "SUPERSEDED";
        reason = node.isBaseline
          ? `pre-history baseline file; all ${node.definesTotal} objects it defines already exist in production (snapshot) and later applied migrations redefine/harden them, so re-applying would regress production`
          : `all ${node.definesTotal} objects it defines already exist in production and it replaces nothing that production could still be missing`;
      } else {
        underlying = "UNDETERMINED";
        reason = `every object it defines exists in production by name, but it replaces ${unreplacedDrift.join(", ")} and no later applied migration redefines them, so production may or may not carry this version of the definition`;
        node.driftFunctions = unreplacedDrift;
        if (undecided) node.notes.push("production definition source is not proven equal to a repo file (reconciliation PARTIAL/UNKNOWN)");
      }
    } else if (node.neededByProductionClient.length) {
      underlying = "BETA_REQUIRED";
      const worst = node.neededByProductionClient[0];
      reason = `production client path calls absent object(s) it defines: ${[...new Set(node.neededByProductionClient.map((c) => c.backendObject))].slice(0, 6).join(", ")} (worst severity ${worst.severity})`;
    } else if (node.missingObjects.length) {
      underlying = "FUTURE_FEATURE";
      reason = `defines ${node.missingObjects.length} object(s) absent in production that no production client path or deployed edge function calls`;
    } else {
      underlying = "UNSAFE_UNTIL_RECONCILED";
      reason = "defines no new objects and has no override; effect on production cannot be classified from SQL alone";
    }
    node.underlyingClass = underlying;
    node.classReason = reason;
    node.batchOverride = batchOverride;
    node.notes = notes;
  }

  const byFileClass = new Map(nodes.map((n) => [n.file, n]));
  const needs = new Set(["BETA_REQUIRED", "LAUNCH_REQUIRED"]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!needs.has(node.underlyingClass)) continue;
      for (const dependency of node.dependencyDetail) {
        if (dependency.strength === "conditional") continue;
        const target = byFileClass.get(dependency.file);
        if (!target || needs.has(target.underlyingClass) || target.underlyingClass === "SUPERSEDED") continue;
        target.underlyingClass = node.underlyingClass === "BETA_REQUIRED" ? "BETA_REQUIRED" : "LAUNCH_REQUIRED";
        target.classReason = `prerequisite (${dependency.strength}: ${dependency.via.slice(0, 4).join(", ")}) of ${node.file}; originally ${target.underlyingClass === "BETA_REQUIRED" ? "FUTURE_FEATURE" : "unclassified"}. ${target.classReason}`;
        changed = true;
      }
    }
  }

  const blockingCodes = new Set(["STALE_OVERWRITE", "REPLACES_UNPROVEN_PRODUCTION_FUNCTION", "REINTRODUCES_DROPPED_POLICY", "REINTRODUCES_DROPPED_CONSTRAINT", "UNRESOLVED_DDL_REFERENCE", "DDL_REFERENCES_ABSENT_OBJECTS"]);
  for (const node of nodes) {
    const blockers = node.hazards.filter((h) => blockingCodes.has(h.code));
    node.class = node.underlyingClass === "UNDETERMINED" ? "UNSAFE_UNTIL_RECONCILED" : node.underlyingClass;
    node.blockedUntil = [];
    if (node.underlyingClass === "UNDETERMINED") {
      node.blockedUntil.push({
        hazard: "PRODUCTION_DEFINITION_DRIFT_UNKNOWN",
        condition: "Read pg_get_functiondef for the listed functions from production (read-only) and diff against this file; if production already matches, record the migration as LEGACY_EQUIVALENT in the ledger instead of applying.",
        objects: node.driftFunctions ?? [],
      });
    }
    if (needs.has(node.underlyingClass) && blockers.length) {
      node.class = "UNSAFE_UNTIL_RECONCILED";
      for (const hazard of blockers) node.blockedUntil.push(unblockCondition(node, hazard));
    }
    if (node.underlyingClass === "FUTURE_FEATURE" && blockers.length) {
      node.blockedUntil.push(...blockers.map((hazard) => unblockCondition(node, hazard)));
    }
  }

  function unblockCondition(node, hazard) {
    switch (hazard.code) {
      case "STALE_OVERWRITE":
        return { hazard: hazard.code, condition: `Do not apply as written. Rebase the ${hazard.items.length} stale function definition(s) on the production definition (OA-SCHEMA-DIFF), then apply a new forward migration.`, objects: hazard.items.map((i) => i.function) };
      case "REPLACES_UNPROVEN_PRODUCTION_FUNCTION":
        return { hazard: hazard.code, condition: "Extract the applied production SQL for the replaced functions, diff against this file's definitions (npm run reconcile:production-migrations -- --prod-sql-dir=<dir>), and confirm the repo version is a superset.", objects: hazard.items.map((i) => i.function) };
      case "REINTRODUCES_DROPPED_POLICY":
        return { hazard: hazard.code, condition: "Write a forward migration that omits the dropped policy and uses the hardened boundary from the later applied migration; never apply this file verbatim.", objects: hazard.items.map((i) => i.policy) };
      case "DDL_REFERENCES_ABSENT_OBJECTS":
        return { hazard: hazard.code, condition: "Apply the defining migrations first, or guard the statements with to_regclass checks, and capture production's current grants (not in the snapshot) to show the delta.", objects: hazard.items };
      case "UNRESOLVED_DDL_REFERENCE":
        return { hazard: hazard.code, condition: "Find the missing definer (no repo migration creates these objects).", objects: hazard.items.map((i) => i.object) };
      case "REINTRODUCES_DROPPED_CONSTRAINT":
        return { hazard: hazard.code, condition: "Omit the superseded constraint in a forward migration; production carries the later definition.", objects: hazard.items.map((i) => i.constraint) };
      default:
        return { hazard: hazard.code, condition: "Reconcile before applying.", objects: [] };
    }
  }

  const needsClientGate = (node) => {
    const consumers = node.neededByProductionClient;
    if (!consumers.length) return null;
    const core = consumers.some((c) => c.coreFlow || c.severity === "CRITICAL");
    return { feasible: !core, routes: [...new Set(consumers.flatMap((c) => c.routes))].sort(), inAppShell: consumers.some((c) => c.inAppShell), calls: [...new Set(consumers.map((c) => c.clientCall))] };
  };

  const batchFor = (node) => {
    if (node.batchOverride) return node.batchOverride;
    if (node.class === "SUPERSEDED") return null;
    if (node.domain === "telemetry" || node.change.usesCron) return "D";
    if (node.definesTotal === 0 && (node.change.privilegeChanging || node.change.policiesTouchedOnProduction)) return "A";
    if (["social", "family", "business"].includes(node.domain)) return "C";
    return "B";
  };

  for (const node of nodes) {
    node.batch = node.underlyingClass === "FUTURE_FEATURE" || node.underlyingClass === "SUPERSEDED" ? null : batchFor(node);
    const gate = needsClientGate(node);
    node.clientGate = gate;
    if (node.class === "SUPERSEDED") node.recommendation = "DO_NOT_APPLY";
    else if (node.class === "FUTURE_FEATURE") node.recommendation = "DEFER";
    else if (node.underlyingClass === "UNDETERMINED") node.recommendation = "DIFF_PRODUCTION_THEN_DECIDE";
    else if (node.class === "UNSAFE_UNTIL_RECONCILED" && gate?.feasible) node.recommendation = "GATE_CLIENT_THEN_RECONCILE";
    else if (node.class === "UNSAFE_UNTIL_RECONCILED") node.recommendation = "RECONCILE_THEN_APPLY";
    else if (gate?.feasible && node.domain !== "placement") node.recommendation = "GATE_CLIENT_PREFERRED";
    else node.recommendation = "APPLY";
  }

  const edges = [];
  for (const node of nodes) {
    for (const dependency of node.dependencyDetail) {
      const prerequisite = nodeByFile.get(dependency.file);
      if (prerequisite?.underlyingClass === "SUPERSEDED") {
        dependency.ignored = "prerequisite is SUPERSEDED (production already carries it)";
        continue;
      }
      edges.push({ from: dependency.file, to: node.file, strength: dependency.strength, via: dependency.via });
    }
  }
  for (const node of nodes) {
    node.dependencyDetail = node.dependencyDetail.filter((d) => !d.ignored).concat(node.dependencyDetail.filter((d) => d.ignored));
  }
  for (const node of nodes) {
    if (node.recommendation !== "APPLY" || !/^prerequisite/.test(node.classReason)) continue;
    const dependents = edges.filter((e) => e.from === node.file && e.strength !== "conditional").map((e) => nodeByFile.get(e.to)).filter((d) => needs.has(d.underlyingClass));
    if (dependents.length && dependents.every((d) => /^GATE_CLIENT/.test(d.recommendation))) node.recommendation = "GATE_CLIENT_PREFERRED";
  }
  const batchRank = { A: 0, B: 1, C: 2, D: 3, null: 4 };
  const indegree = new Map(nodes.map((n) => [n.file, 0]));
  const successors = new Map(nodes.map((n) => [n.file, []]));
  for (const edge of edges) {
    indegree.set(edge.to, indegree.get(edge.to) + 1);
    successors.get(edge.from).push(edge.to);
  }
  const ready = nodes.filter((n) => indegree.get(n.file) === 0).map((n) => n.file);
  const sorted = [];
  const pick = () => {
    ready.sort((a, b) => {
      const na = nodeByFile.get(a);
      const nb = nodeByFile.get(b);
      return batchRank[na.batch] - batchRank[nb.batch] || na.order - nb.order;
    });
    return ready.shift();
  };
  while (ready.length) {
    const current = pick();
    sorted.push(current);
    for (const next of successors.get(current)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) ready.push(next);
    }
  }
  const cycle = sorted.length !== nodes.length ? nodes.filter((n) => !sorted.includes(n.file)).map((n) => n.file) : [];

  const position = new Map(sorted.map((file, index) => [file, index]));
  const batchOrderViolations = edges
    .filter((edge) => edge.strength !== "conditional")
    .filter((edge) => {
      const from = nodeByFile.get(edge.from);
      const to = nodeByFile.get(edge.to);
      return from.batch && to.batch && batchRank[from.batch] > batchRank[to.batch];
    })
    .map((edge) => ({ prerequisite: edge.from, prerequisiteBatch: nodeByFile.get(edge.from).batch, dependent: edge.to, dependentBatch: nodeByFile.get(edge.to).batch, via: edge.via }));

  const applicable = (node) => needs.has(node.class);
  const closureSafe = (node, seen = new Set()) => {
    for (const dependency of node.dependencyDetail) {
      if (dependency.strength === "conditional") continue;
      const target = nodeByFile.get(dependency.file);
      if (!target) continue;
      if (target.class === "SUPERSEDED") continue;
      if (!applicable(target) || target.class === "UNSAFE_UNTIL_RECONCILED") return { ok: false, because: target.file };
      if (seen.has(target.file)) continue;
      seen.add(target.file);
      const inner = closureSafe(target, seen);
      if (!inner.ok) return inner;
    }
    return { ok: true };
  };

  const minimumSafe = [];
  const gatedInstead = [];
  const blockedByDependency = [];
  for (const node of nodes) {
    if (!applicable(node)) continue;
    if (node.recommendation === "GATE_CLIENT_PREFERRED") {
      gatedInstead.push(node);
      continue;
    }
    const closure = closureSafe(node);
    if (!closure.ok) {
      blockedByDependency.push({ node, because: closure.because });
      continue;
    }
    minimumSafe.push(node);
  }

  const fileEntry = (node) => ({
    file: node.file,
    class: node.class,
    reason: node.classReason,
    dependsOn: node.dependencyDetail.filter((d) => d.strength !== "conditional" && !d.ignored).map((d) => d.file),
    ...(node.underlyingClass !== node.class ? { underlyingClass: node.underlyingClass } : {}),
    domain: node.domain,
    recommendation: node.recommendation,
    order: position.get(node.file),
    dependencyDetail: node.dependencyDetail,
    definesTotal: node.definesTotal,
    definesPresentInProduction: node.definesPresentInProduction,
    missingObjects: node.missingObjects,
    referencedTables: node.references.tables,
    referencedFunctions: node.references.functions,
    satisfiedByProduction: node.references.satisfiedByProduction,
    unresolvedReferences: node.references.unresolved,
    additive: node.change.additive,
    destructive: node.change.destructive,
    destructiveOnNewObjects: node.change.destructiveOnNewObjects,
    dataMigration: node.change.dataMigration,
    seedData: node.change.seedData,
    replacesProductionObjects: node.change.replacesProductionObjects,
    privilegeChanging: node.change.privilegeChanging,
    reversibility: node.change.reversibility,
    hazards: node.hazards,
    blockedUntil: node.blockedUntil,
    productionChunks: node.productionChunks,
    consumers: {
      edgeFunctions: node.consumers.edgeFunctions,
      frontend: dedupeBy(node.consumers.frontend, (c) => `${c.clientCall}|${c.backendObject}`),
    },
    neededByProductionClient: node.neededByProductionClient.map((c) => ({ clientCall: c.clientCall, backendObject: c.backendObject, severity: c.severity, routes: c.routes, inAppShell: c.inAppShell, via: c.via })),
    clientGate: node.clientGate,
    notes: node.notes,
  });

  const batchMeta = {
    A: "Security and blockers: league recursion policy fix and least-privilege API grants. Nothing here adds product surface.",
    B: "Core backend the current product already calls: onboarding/placement, economy (pearl). Includes edge functions that must be deployed alongside.",
    C: "Social, family and business schema. Apply only if the client keeps exposing those routes; otherwise gate the routes and defer.",
    D: "Observability and retention: telemetry cleanup scheduling and telemetry schema.",
  };
  const batches = ["A", "B", "C", "D"].map((id) => ({
    id,
    purpose: batchMeta[id],
    migrations: nodes
      .filter((n) => n.batch === id)
      .sort((a, b) => position.get(a.file) - position.get(b.file))
      .map(fileEntry),
  }));

  const deferred = nodes
    .filter((n) => !n.batch)
    .sort((a, b) => a.order - b.order)
    .map((n) => ({ ...fileEntry(n), deferredBecause: n.class === "SUPERSEDED" ? "production already realises it or a later migration supersedes it" : n.class === "FUTURE_FEATURE" ? "no production client path or deployed edge function needs it" : "classification pending reconciliation" }));

  const blockedUntil = nodes
    .filter((n) => n.blockedUntil.length)
    .map((n) => ({ file: n.file, class: n.class, underlyingClass: n.underlyingClass, batch: n.batch, conditions: n.blockedUntil }))
    .concat(blockedByDependency.map(({ node, because }) => ({ file: node.file, class: node.class, underlyingClass: node.underlyingClass, batch: node.batch, conditions: [{ hazard: "BLOCKED_BY_DEPENDENCY", condition: `Depends on ${because}, which is not safe to apply yet.`, objects: [] }] })));

  const clientGatingInsteadOfApply = gatedInstead.map((n) => {
    const dependents = edges.filter((e) => e.from === n.file && e.strength !== "conditional").map((e) => nodeByFile.get(e.to).clientGate).filter(Boolean);
    const gates = [n.clientGate, ...dependents].filter(Boolean);
    return {
      file: n.file,
      domain: n.domain,
      gateRoutes: [...new Set(gates.flatMap((g) => g.routes))].sort(),
      gateCalls: [...new Set(gates.flatMap((g) => g.calls))].sort(),
      inAppShell: gates.some((g) => g.inAppShell),
      resultingClassIfGated: "FUTURE_FEATURE",
    };
  });

  const safeFiles = new Set(minimumSafe.map((n) => n.file));
  const deployed = new Set(minimumSafe.flatMap((n) => n.consumers.edgeFunctions.map((c) => c.slug)));
  const residual = [];
  for (const entry of callGraph?.entries ?? []) {
    const edgeNeedsDeploy = entry.kind === "edge" && entry.productionStatus === "MISSING";
    const gapObjects = entry.kind === "edge" ? (entry.backendDependencies ?? []).filter((d) => d.productionStatus === "MISSING").map((d) => ({ key: `${d.kind === "rpc" ? "function" : "table"}:${d.name}`, name: d.name })) : entry.productionStatus === "MISSING" ? [{ key: `${entry.kind === "rpc" ? "function" : "table"}:${entry.backendObject}`, name: entry.backendObject }] : [];
    if (!gapObjects.length || !entry.productionPath) continue;
    const unresolved = gapObjects.filter((g) => !(definedBy.get(g.key) ?? []).some((file) => safeFiles.has(file)));
    const deployable = entry.kind !== "edge" || !edgeNeedsDeploy || deployed.has(entry.backendObject.replace("functions/", ""));
    if (!unresolved.length && deployable) continue;
    residual.push({
      clientCall: entry.clientCall,
      backendObject: entry.backendObject,
      severity: entry.severity,
      routes: entry.routes,
      inAppShell: entry.inAppShell,
      stillMissing: unresolved.map((g) => g.name),
      reason: unresolved.every((g) => !(definedBy.get(g.key) ?? []).length)
        ? "no REPO_ONLY migration defines it (the only repo definition is a ledger-applied conditional no-op); needs a new forward migration"
        : "its migration is not in the safe set (blocked, deferred or gate-preferred)",
      action: "gate the client path (feature flag / route gate) until the backend object exists",
    });
  }

  const factChecks = buildFactChecks({ nodes, present, snapshot, definitions, ledger });

  const plan = {
    schema: "longyu-migration-plan/1",
    generatedAt: new Date().toISOString(),
    generatedFromSha: gitSha(),
    inputs: {
      ledger: { path: LEDGER_PATH, productionReadAt: ledger.productionReadAt, status: ledger.status },
      snapshot: { path: SNAPSHOT_PATH, readAt: snapshot.readAt },
      reconciliation: reconciliation ? { path: RECONCILIATION_PATH, counts: reconciliation.counts?.byStatus ?? null } : null,
      callGraph: callGraph ? { path: CALL_GRAPH_PATH, counts: callGraph.counts } : null,
    },
    safety: {
      productionWrites: false,
      note: "This plan is advisory. Nothing here was applied. Apply only through PRODUCTION_MIGRATION_READY (schema diff + verified export + owner approval).",
    },
    rules: [
      "A REPO_ONLY file whose every defined object already exists in production is SUPERSEDED (recording gap), never re-applied.",
      "A file that defines an absent object which a production client path (or an edge function it invokes) calls is BETA_REQUIRED.",
      "A file that defines absent objects nothing calls is FUTURE_FEATURE and is not applied blindly.",
      "A needed file that would overwrite newer production definitions, reintroduce a dropped policy, rewrite a production constraint, or run DDL against absent objects is UNSAFE_UNTIL_RECONCILED; its underlyingClass records what it is needed for.",
      "Where the client call is non-core, gating the client path is preferred over applying schema (recommendation GATE_CLIENT_PREFERRED); the resulting class if gated is FUTURE_FEATURE.",
      "Edges: hard = unguarded DDL reference to an absent object; redefines = later create-or-replace of an object an earlier REPO_ONLY file defines; runtime = function-body reference; conditional = guarded DO block (ordering only).",
    ],
    counts: {
      repoOnlyFiles: nodes.length,
      byClass: countBy(nodes, (n) => n.class),
      byUnderlyingClass: countBy(nodes, (n) => n.underlyingClass),
      byRecommendation: countBy(nodes, (n) => n.recommendation),
      edges: edges.length,
      hardEdges: edges.filter((e) => e.strength === "hard").length,
    },
    factChecks,
    batches,
    topologicalOrder: sorted,
    topologicalOrderDetail: sorted.map((file) => ({ file, batch: nodeByFile.get(file).batch, class: nodeByFile.get(file).class, recommendation: nodeByFile.get(file).recommendation })),
    cycle,
    batchOrderViolations,
    minimumSafeSet: {
      definition: "BETA_REQUIRED or LAUNCH_REQUIRED files that are safe to apply as written, whose non-conditional prerequisites are all safe, and for which gating the client is not the preferred route. Ordered by topologicalOrder.",
      migrations: sorted.filter((file) => minimumSafe.some((n) => n.file === file)),
      migrationDetail: sorted.filter((file) => minimumSafe.some((n) => n.file === file)).map((file) => ({ file, batch: nodeByFile.get(file).batch, class: nodeByFile.get(file).class, reversibility: nodeByFile.get(file).change.reversibility, additive: nodeByFile.get(file).change.additive, reason: nodeByFile.get(file).classReason })),
      edgeFunctionsToDeploy: [...new Set(minimumSafe.flatMap((n) => n.consumers.edgeFunctions.filter((c) => !c.deployedInProduction).map((c) => c.slug)))].sort(),
      clientGatingInsteadOfApply,
      residualMissingClientCalls: residual,
      preconditions: [
        "PRODUCTION_MIGRATION_READY: schema diff, verified export and owner approval (supabase/pending/README.md).",
        "Take a verified backup/export; the placement handoff migration backfills profiles.country_code and is not reversible without it.",
        "Capture pg_get_functiondef, policies and grants for every object a file replaces (change.replacesProductionObjects) so the Down step is real.",
        "Deploy the edge functions listed in edgeFunctionsToDeploy in the same window; they are absent in production today.",
        "Refresh docs/launch/production-snapshot.json after applying, then rerun npm run analyze:client-backend-graph and npm run analyze:migration-dag.",
      ],
      stillBlocked: blockedUntil.map((b) => ({ file: b.file, underlyingClass: b.underlyingClass, batch: b.batch })),
      emptyReason: minimumSafe.length ? null : "No BETA/LAUNCH_REQUIRED file is safe to apply as written; see blockedUntil.",
    },
    deferred,
    blockedUntil,
  };

  fs.mkdirSync(path.dirname(path.join(root, OUT_JSON)), { recursive: true });
  fs.writeFileSync(path.join(root, OUT_JSON), `${JSON.stringify(plan, null, 2)}\n`);

  console.log(`migration dependency DAG: ${nodes.length} REPO_ONLY files, ${edges.length} edges (${plan.counts.hardEdges} hard)${cycle.length ? `, CYCLE: ${cycle.join(", ")}` : ""}`);
  console.log(`  by class: ${JSON.stringify(plan.counts.byClass)}`);
  console.log(`  minimum safe set: ${plan.minimumSafeSet.migrations.length} migration(s); gate-instead: ${clientGatingInsteadOfApply.length}; blocked: ${blockedUntil.length}; deferred: ${deferred.length}`);
  console.log(`  wrote ${OUT_JSON}`);
  if (!callGraph) console.warn(`  warning: ${CALL_GRAPH_PATH} not found; client consumers are empty. Run npm run analyze:client-backend-graph first.`);
}

function buildFactChecks({ nodes, present, snapshot, definitions, ledger }) {
  const checks = [];
  const absent = (name) => !present.tables.has(name);
  const owner = ["friendships", "friend_requests", "placement_onboarding", "pearl_wallets"];
  for (const name of owner) {
    checks.push({
      claim: `${name} is absent in production`,
      result: absent(name) ? "CONFIRMED_ABSENT" : "CONTRADICTED",
      repoDefinition: definitions.table.get(name)?.introducing ?? null,
      note: definitions.table.has(name) ? null : `no repo migration defines a table named ${name}; ${name === "placement_onboarding" ? "the repo uses placement_onboarding_drafts and placement_attempts" : name === "pearl_wallets" ? "pearls live in user_economy (dragon_pearls) and pearl-pass tables" : "the repo social module is user_follows + social_activity_events (005_social.sql)"}`,
    });
  }
  for (const prefix of ["family_", "business_"]) {
    const repoTables = [...definitions.table.keys()].filter((t) => t.startsWith(prefix));
    checks.push({
      claim: `${prefix}* tables are absent in production`,
      result: repoTables.every(absent) ? "CONFIRMED_ABSENT" : "CONTRADICTED",
      repoTables,
    });
  }
  const orgTables = [...definitions.table.keys()].filter((t) => t.startsWith("organization"));
  checks.push({ claim: "organization* tables (business module) are absent in production", result: orgTables.every(absent) ? "CONFIRMED_ABSENT" : "CONTRADICTED", repoTables: orgTables });
  checks.push({
    claim: "profiles.username / avatar_key / league_tier are present",
    result: "OWNER_ASSERTED",
    note: "The snapshot lists tables, not columns. Treated as present when evaluating 005_social.sql; verify with a column-level read before relying on it.",
  });
  const baseline = nodes.filter((n) => /\/0(0[1-9]|10)_/.test(n.file));
  checks.push({
    claim: "baseline 001-010 objects mostly exist except the 005 social tables",
    result: baseline.every((n) => n.file.includes("005_social") || n.missingObjects.length === 0) ? "CONFIRMED" : "PARTLY_CONTRADICTED",
    perFile: baseline.map((n) => ({ file: n.file, defined: n.definesTotal, present: n.definesPresentInProduction, missing: n.missingObjects })),
  });
  checks.push({ claim: "league_memberships SELECT fails with 42P17 in production", result: snapshot.rlsBehavior?.reads?.exceptions?.league_memberships ? "CONFIRMED_BY_SNAPSHOT" : "NOT_IN_SNAPSHOT", evidence: snapshot.rlsBehavior?.reads?.exceptions?.league_memberships ?? null });
  return checks;
}

function dedupeBy(list, keyFn) {
  const seen = new Set();
  return list.filter((item) => {
    const key = keyFn(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countBy(list, fn) {
  const out = {};
  for (const item of list) out[fn(item)] = (out[fn(item)] ?? 0) + 1;
  return out;
}

main();
