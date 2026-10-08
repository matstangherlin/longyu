/**
 * RC2.3.10B — static client -> backend call graph.
 *
 * Scans src/ for every Supabase call the shipped client can make
 * (.from / .rpc / functions.invoke / auth / storage), resolves the migration
 * that introduces each backend object, and cross-references the production
 * snapshot. Read-only: never talks to a database or the network.
 *
 *   node scripts/release/build-client-backend-call-graph.mjs [--strict]
 *
 * --strict exits 1 when a MISSING backend object is reachable from a
 * production client path (use in a gate once the backend is reconciled).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import {
  buildDefinitionIndex,
  loadMigrationFiles,
  parseMigrationSql,
  scanEdgeFunctionSources,
} from "../lib/sql-object-index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SNAPSHOT_PATH = "docs/launch/production-snapshot.json";
const LEDGER_PATH = "docs/launch/production-migration-ledger.json";
const OUT_JSON = "docs/launch/rc2-3-10b-client-backend-call-graph.json";
const OUT_MD = "docs/reports/rc2-3-10b-client-backend-gate.md";
const strict = process.argv.includes("--strict");

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));

/**
 * Domains the owner already knows are absent from production. Used only to
 * label entries and to flag a contradiction if the snapshot ever disagrees;
 * presence/absence itself always comes from the snapshot.
 */
const KNOWN_MISSING_DOMAINS = [
  { domain: "social", pattern: /(^|_)(user_follows|social_activity_events|friend|friendships?|friend_requests?)|search_public_profiles|get_public_profile/ },
  { domain: "family", pattern: /family/ },
  { domain: "business", pattern: /business|organization|submit-business-lead/ },
  { domain: "pearl", pattern: /pearl/ },
  { domain: "placement", pattern: /placement|finalize-onboarding/ },
];

/** Auth methods whose behavior depends on dashboard config the agent cannot read. */
const AUTH_CONFIG_DEPENDENT = {
  signInWithOAuth: "providersConfig",
  linkIdentity: "providersConfig",
  unlinkIdentity: "providersConfig",
  getUserIdentities: "providersConfig",
  resend: "smtpConfig",
  resetPasswordForEmail: "smtpConfig",
  verifyOtp: "smtpConfig",
  exchangeCodeForSession: "providersConfig",
};

const CORE_FLOW_FILE = /(^|\/)(services\/(authService|postAuthOnboarding|finalizeOnboarding|placementCommit|oauthService)|features\/(auth|onboarding)\/|lib\/auth\/)/;

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.(test|spec)\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      acc.push(full);
    }
  }
  return acc;
}

/** Blank out comments but keep offsets and newlines so line numbers stay exact. */
function blankComments(text) {
  return text
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/[^\n]*/g, (m, lead) => lead + " ".repeat(m.length - lead.length));
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

function resolveImport(fromFile, spec, fileSet) {
  let base;
  if (spec.startsWith("@/")) base = path.join(root, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(fromFile), spec);
  else return null;
  const candidates = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")];
  return candidates.find((candidate) => fileSet.has(candidate)) ?? null;
}

function buildImportGraph(files, texts) {
  const fileSet = new Set(files);
  const graph = new Map();
  for (const file of files) {
    const text = texts.get(file);
    const staticDeps = new Set();
    const dynamicDeps = new Set();
    for (const m of text.matchAll(/(?:import|export)\s+(?:type\s+)?(?:[\w*\s{},$]+?\s+from\s+)?["']([^"']+)["']/g)) {
      const resolved = resolveImport(file, m[1], fileSet);
      if (resolved) staticDeps.add(resolved);
    }
    for (const m of text.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) {
      const resolved = resolveImport(file, m[1], fileSet);
      if (resolved) dynamicDeps.add(resolved);
    }
    graph.set(file, { staticDeps, dynamicDeps });
  }
  return graph;
}

function reach(graph, starts, { followDynamic, stopAt = null }) {
  const seen = new Set(starts);
  const queue = [...starts];
  while (queue.length) {
    const current = queue.pop();
    const node = graph.get(current);
    if (!node) continue;
    if (stopAt && stopAt.has(current) && !starts.includes(current)) continue;
    const next = followDynamic ? [...node.staticDeps, ...node.dynamicDeps] : [...node.staticDeps];
    for (const dep of next) {
      if (!seen.has(dep)) {
        seen.add(dep);
        queue.push(dep);
      }
    }
  }
  return seen;
}

function parseRoutes(routesFile, text, fileSet) {
  const lazy = new Map();
  for (const m of text.matchAll(/const\s+(\w+)\s*=\s*lazyNamed\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']\s*\)/g)) {
    const resolved = resolveImport(routesFile, m[2], fileSet);
    if (resolved) lazy.set(m[1], resolved);
  }
  const staticComponents = new Map();
  for (const m of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']/g)) {
    const resolved = resolveImport(routesFile, m[2], fileSet);
    if (!resolved) continue;
    for (const name of m[1].split(",").map((s) => s.trim().split(/\s+as\s+/).pop()).filter(Boolean)) staticComponents.set(name, resolved);
  }
  const routes = [];
  const routeStart = text.indexOf("export const routes");
  const body = routeStart >= 0 ? text.slice(routeStart) : text;
  for (const m of body.matchAll(/path:\s*"([^"]*)"/g)) {
    const rest = body.slice(m.index + m[0].length);
    const end = rest.search(/\}\s*,?\s*(?:\n|$)/);
    const segment = end >= 0 ? rest.slice(0, end) : rest.slice(0, 400);
    const components = [...segment.matchAll(/<([A-Z]\w*)/g)].map((c) => c[1]);
    const files = [...new Set(components.map((name) => lazy.get(name) ?? staticComponents.get(name)).filter(Boolean))];
    routes.push({ path: m[1].startsWith("/") ? m[1] : `/${m[1]}`, files });
  }
  return routes;
}

function collectBackendCalls(file, rel, rawText) {
  const text = blankComments(rawText);
  const calls = [];
  const dynamic = [];
  const usesSupabase = /supabase|getSupabaseClient|SupabaseClient|\.auth\.|\.rpc\(|functions\s*\.invoke|\.invoke\s*[<(]/i.test(text);
  if (!usesSupabase) return { calls, dynamic };

  const add = (kind, name, clientCall, index, extra = {}) => {
    calls.push({ kind, name, clientCall, file: rel, line: lineOf(text, index), ...extra });
  };

  for (const m of text.matchAll(/\.storage\s*\.from\(\s*(["'`])([^"'`]+)\1\s*\)/g)) {
    add("storage", m[2], `.storage.from("${m[2]}")`, m.index);
  }

  for (const m of text.matchAll(/\.from\(\s*(["'`])([a-z_][a-z0-9_]*)\1\s*\)/g)) {
    const before = text.slice(Math.max(0, m.index - 24), m.index);
    if (/storage\s*$/.test(before)) continue;
    const owner = before.trimEnd().match(/([A-Za-z_$][\w$]*)$/)?.[1];
    if (owner && /^[A-Z]/.test(owner)) continue;
    add("table", m[2], `.from("${m[2]}")`, m.index);
  }

  for (const m of text.matchAll(/\.rpc\(\s*(["'`])([a-z_][a-z0-9_]*)\1/g)) add("rpc", m[2], `.rpc("${m[2]}")`, m.index);

  for (const m of text.matchAll(/\.invoke\s*(?:<[\s\S]{0,900}?>)?\s*\(\s*(["'`])([a-z0-9][a-z0-9-]*)\1/g)) {
    const before = text.slice(Math.max(0, m.index - 80), m.index);
    if (!/functions\s*$/.test(before.trimEnd()) && !/functions/.test(before)) continue;
    add("edge", m[2], `functions.invoke("${m[2]}")`, m.index);
  }

  for (const m of text.matchAll(/\/functions\/v1\/([a-z0-9][a-z0-9-]*)/g)) add("edge", m[1], `fetch /functions/v1/${m[1]}`, m.index);
  for (const m of text.matchAll(/\/rest\/v1\/rpc\/([a-z_][a-z0-9_]*)/g)) add("rpc", m[1], `fetch /rest/v1/rpc/${m[1]}`, m.index);

  for (const m of text.matchAll(/\.auth\s*\.\s*([A-Za-z]+)\s*\(/g)) add("auth", `auth.${m[1]}`, `auth.${m[1]}()`, m.index, { method: m[1] });

  const wrappers = { rpc: new Set(), edge: new Set() };
  const wrapperParams = new Set();
  for (const m of text.matchAll(/function\s+(\w+)\s*(?:<[^()]*>)?\s*\(\s*(\w+)\s*:\s*string/g)) {
    const window = text.slice(m.index, m.index + 900);
    if (new RegExp(`\\.(?:rpc|invoke)\\s*(?:<[\\s\\S]{0,200}?>)?\\(\\s*${m[2]}\\b`).test(window)) wrapperParams.add(m[2]);
    if (new RegExp(`\\.rpc\\(\\s*${m[2]}\\b`).test(window)) wrappers.rpc.add(m[1]);
    if (new RegExp(`\\.invoke\\s*(?:<[\\s\\S]{0,200}?>)?\\(\\s*${m[2]}\\b`).test(window)) wrappers.edge.add(m[1]);
  }
  for (const [kind, names] of Object.entries(wrappers)) {
    for (const wrapper of names) {
      for (const m of text.matchAll(new RegExp(`\\b${wrapper}\\s*(?:<[\\s\\S]{0,200}?>)?\\(\\s*(["'\`])([a-z0-9_-]+)\\1`, "g"))) {
        add(kind, m[2], `${kind === "rpc" ? `.rpc("${m[2]}")` : `functions.invoke("${m[2]}")`} via ${wrapper}()`, m.index, { via: wrapper });
      }
    }
  }

  for (const m of text.matchAll(/\.(rpc|from|invoke)\s*(?:<[^()]*>)?\(\s*([A-Za-z_$][\w$.]*)\s*[,)]/g)) {
    const before = text.slice(Math.max(0, m.index - 24), m.index).trimEnd();
    const owner = before.match(/([A-Za-z_$][\w$]*)$/)?.[1];
    if (m[1] === "from" && (!owner || /^[A-Z]/.test(owner))) continue;
    if (m[1] === "invoke" && !/functions/.test(text.slice(Math.max(0, m.index - 80), m.index))) continue;
    if (wrapperParams.has(m[2])) continue;
    dynamic.push({ method: m[1], argument: m[2], file: rel, line: lineOf(text, m.index) });
  }

  return { calls, dynamic };
}

function domainOf(name) {
  return KNOWN_MISSING_DOMAINS.find((entry) => entry.pattern.test(name))?.domain ?? null;
}

function main() {
  const snapshot = readJson(SNAPSHOT_PATH);
  const ledger = readJson(LEDGER_PATH);

  const present = {
    table: new Set([...snapshot.tables.map((t) => t.name), ...(snapshot.views ?? []).map((v) => v.name)]),
    rpc: new Set(snapshot.functions.map((f) => f.name)),
    edge: new Set(snapshot.edgeFunctions.map((f) => f.slug)),
    bucket: snapshot.storage?.buckets ?? 0,
  };

  const migrationFiles = loadMigrationFiles(root);
  const parsed = migrationFiles.map((entry) => ({ file: entry.file, parsed: parseMigrationSql(entry.sql) }));
  const definitions = buildDefinitionIndex(parsed);

  const ledgerByFile = new Map();
  for (const entry of ledger.entries) {
    if (!entry.repoFile) continue;
    const list = ledgerByFile.get(entry.repoFile) ?? [];
    list.push(entry.state);
    ledgerByFile.set(entry.repoFile, list);
  }
  const ledgerStateOf = (file) => {
    const states = ledgerByFile.get(file) ?? [];
    if (states.includes("MATCH") || states.includes("LEGACY_EQUIVALENT")) return "APPLIED_MATCH";
    if (states.includes("UNKNOWN") && states.every((s) => s !== "REPO_ONLY")) return "APPLIED_UNPROVEN";
    if (states.includes("REPO_ONLY")) return "REPO_ONLY";
    if (states.length) return states[0];
    return "NOT_IN_LEDGER";
  };

  const edgeSources = scanEdgeFunctionSources(root);

  const srcRoot = path.join(root, "src");
  const files = walk(srcRoot);
  const texts = new Map(files.map((file) => [file, blankComments(fs.readFileSync(file, "utf8"))]));
  const graph = buildImportGraph(files, texts);
  const fileSet = new Set(files);

  const routesFile = path.join(srcRoot, "routes.tsx");
  const routes = parseRoutes(routesFile, texts.get(routesFile) ?? "", fileSet);
  const linkedPaths = new Set();
  for (const route of routes) {
    const staticPrefix = route.path.split(":")[0];
    if (!staticPrefix || staticPrefix === "/") continue;
    const needle = new RegExp(`["'\`]${staticPrefix.replace(/[/.*+?^${}()|[\]\\]/g, "\\$&")}`);
    for (const [file, text] of texts) {
      if (file === routesFile || /\/(features|components)\/qa\//.test(file)) continue;
      if (needle.test(text)) {
        linkedPaths.add(route.path);
        break;
      }
    }
  }

  const mainFile = path.join(srcRoot, "main.tsx");
  const shellReach = reach(graph, [mainFile], { followDynamic: false });
  const routeReach = routes.map((route) => ({
    ...route,
    reach: reach(graph, route.files, { followDynamic: true, stopAt: shellReach }),
    qaOnly: /^\/qa(\/|$)/.test(route.path),
    navExposed: linkedPaths.has(route.path),
  }));

  const rawCalls = [];
  const dynamicCalls = [];
  for (const file of files) {
    const rel = path.relative(root, file);
    const found = collectBackendCalls(file, rel, fs.readFileSync(file, "utf8"));
    for (const call of found.calls) rawCalls.push({ ...call, abs: file });
    dynamicCalls.push(...found.dynamic);
  }

  const reachInfo = (abs) => {
    const matching = routeReach.filter((route) => route.reach.has(abs));
    const prodRoutes = matching.filter((route) => !route.qaOnly);
    const inShell = shellReach.has(abs);
    const qaFile = /\/features\/qa\/|\/components\/qa\//.test(abs);
    const productionPath = !qaFile && (inShell || prodRoutes.length > 0);
    return {
      shell: inShell,
      routes: [...new Set(prodRoutes.map((route) => route.path))].sort(),
      linkedRoutes: [...new Set(prodRoutes.filter((route) => route.navExposed).map((route) => route.path))].sort(),
      productionPath,
    };
  };

  const grouped = new Map();
  for (const call of rawCalls) {
    const key = `${call.kind}|${call.name}|${call.clientCall.replace(/ via .*/, "")}`;
    const slot = grouped.get(key) ?? { kind: call.kind, name: call.name, clientCall: call.clientCall.replace(/ via .*/, ""), calls: [], wrappers: new Set() };
    slot.calls.push(call);
    if (call.via) slot.wrappers.add(call.via);
    grouped.set(key, slot);
  }

  const objectStatus = (kind, name, method) => {
    if (kind === "table") return present.table.has(name) ? "PRESENT" : "MISSING";
    if (kind === "rpc") return present.rpc.has(name) ? "PRESENT" : "MISSING";
    if (kind === "edge") return present.edge.has(name) ? "PRESENT" : "MISSING";
    if (kind === "storage") return present.bucket > 0 ? "UNKNOWN" : "MISSING";
    if (kind === "auth") return AUTH_CONFIG_DEPENDENT[method] ? "UNKNOWN" : "PRESENT";
    return "UNKNOWN";
  };

  const definitionOf = (kind, name) => {
    const map = kind === "table" ? [definitions.table, definitions.view] : kind === "rpc" ? [definitions.function] : [];
    for (const m of map) {
      const slot = m.get(name);
      if (slot) return slot;
    }
    return null;
  };

  const entries = [];
  for (const slot of [...grouped.values()].sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name))) {
    const method = slot.calls[0].method;
    const backendObject = slot.kind === "auth" ? `supabase.auth.${method}` : slot.kind === "edge" ? `functions/${slot.name}` : slot.name;
    const productionStatus = objectStatus(slot.kind, slot.name, method);
    const definition = definitionOf(slot.kind, slot.name);
    const edgeSource = slot.kind === "edge" ? edgeSources[slot.name] ?? null : null;

    const sites = slot.calls
      .map((call) => ({ call, info: reachInfo(call.abs) }))
      .sort((a, b) => `${a.call.file}:${a.call.line}`.localeCompare(`${b.call.file}:${b.call.line}`));
    const clientPaths = sites.map(({ call }) => `${call.file}:${call.line}`);
    const productionSites = sites.filter(({ info }) => info.productionPath);
    const routesReached = [...new Set(productionSites.flatMap(({ info }) => info.routes))].sort();
    const linkedRoutes = [...new Set(productionSites.flatMap(({ info }) => info.linkedRoutes))].sort();
    const inShell = productionSites.some(({ info }) => info.shell);
    const coreFlow = productionSites.some(({ call }) => CORE_FLOW_FILE.test(call.file.replace(/^src\//, "")));
    const productionPath = productionSites.length > 0;

    const dependencies = edgeSource
      ? [
          ...[...edgeSource.tables, ...edgeSource.sharedTables].map((name) => ({ kind: "table", name, productionStatus: present.table.has(name) ? "PRESENT" : "MISSING" })),
          ...[...edgeSource.rpcs, ...edgeSource.sharedRpcs].map((name) => ({ kind: "rpc", name, productionStatus: present.rpc.has(name) ? "PRESENT" : "MISSING" })),
        ].filter((dep, i, list) => list.findIndex((o) => o.kind === dep.kind && o.name === dep.name) === i)
      : [];
    const dependencyGaps = dependencies.filter((dep) => dep.productionStatus === "MISSING");

    const domain = domainOf(slot.name);
    const notes = [];
    if (domain && productionStatus === "PRESENT" && slot.kind !== "auth") {
      notes.push(`contradiction: ${domain} domain is declared absent from production but the snapshot lists this object`);
    }
    if (productionStatus === "MISSING" && !definition && slot.kind !== "edge" && slot.kind !== "storage") {
      notes.push("object is neither in the production snapshot nor defined by any repo migration");
    }
    if (productionStatus === "MISSING" && slot.kind === "edge" && !edgeSource) {
      notes.push("edge function has no source in supabase/functions");
    }
    const introducing = definition?.introducing ?? null;
    const introducingState = introducing ? ledgerStateOf(introducing) : null;
    if (productionStatus === "MISSING" && introducingState === "APPLIED_MATCH") {
      notes.push("introducing migration is recorded as applied in production but the object is absent (conditional no-op or later drop)");
    }
    if (slot.kind === "edge" && productionStatus === "PRESENT" && dependencyGaps.length) {
      notes.push(`deployed edge function reads objects absent in production: ${dependencyGaps.map((d) => d.name).join(", ")}`);
    }
    if (slot.kind === "edge" && productionStatus === "MISSING" && dependencyGaps.length) {
      notes.push(`repo source also needs absent objects: ${dependencyGaps.map((d) => d.name).join(", ")}`);
    }
    if (slot.kind === "auth" && AUTH_CONFIG_DEPENDENT[method]) {
      notes.push(`depends on ${AUTH_CONFIG_DEPENDENT[method]}, which is NOT_READABLE_FROM_AGENT in the snapshot`);
    }

    let severity;
    let severityReason;
    if (productionStatus === "PRESENT") {
      if (dependencyGaps.length && productionPath) {
        severity = coreFlow ? "CRITICAL" : "HIGH";
        severityReason = coreFlow
          ? "deployed edge function sits on the sign-up / login / onboarding path and its repo source calls objects absent in production"
          : "deployed edge function present, but its repo source depends on objects absent in production";
      } else {
        severity = "NONE";
        severityReason = "object present in production snapshot";
      }
    } else if (productionStatus === "UNKNOWN") {
      severity = productionPath ? "MEDIUM" : "LOW";
      severityReason = productionPath ? "cannot be verified from the snapshot; reachable from a production path" : "cannot be verified; not on a production path";
    } else if (!productionPath) {
      severity = "LOW";
      severityReason = "missing, but only referenced from QA-only or unreachable code";
    } else if (coreFlow) {
      severity = "CRITICAL";
      severityReason = "missing object sits on the sign-up / login / onboarding path";
    } else if (inShell || linkedRoutes.length) {
      severity = "HIGH";
      severityReason = inShell && !linkedRoutes.length ? "missing object reachable from the always-mounted app shell" : "missing object behind a route that the UI links to";
    } else {
      severity = "MEDIUM";
      severityReason = "missing object behind a route no other screen links to";
    }

    entries.push({
      clientCall: slot.clientCall,
      backendObject,
      kind: slot.kind,
      introducingMigration: introducing ?? (edgeSource ? edgeSource.source : null),
      introducingMigrationKind: introducing ? "migration" : edgeSource ? "edge-function-source" : null,
      introducingMigrationLedgerState: introducingState,
      definedIn: definition ? definition.definers.map((d) => `${d.file}${d.conditional ? " (conditional)" : ""}`) : [],
      productionStatus,
      clientPaths,
      severity,
      severityReason,
      productionPath,
      routes: routesReached,
      linkedRoutes,
      inAppShell: inShell,
      coreFlow,
      domain,
      wrappers: [...slot.wrappers],
      backendDependencies: dependencies,
      notes,
    });
  }

  const severityRank = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, NONE: 4 };
  entries.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.kind.localeCompare(b.kind) || a.backendObject.localeCompare(b.backendObject));

  const missing = entries.filter((entry) => entry.productionStatus === "MISSING");
  const missingOnProductionPath = missing.filter((entry) => entry.productionPath);
  const dependencyGapEntries = entries.filter((entry) => entry.kind === "edge" && entry.productionStatus === "PRESENT" && entry.backendDependencies.some((d) => d.productionStatus === "MISSING"));

  const counts = {
    entries: entries.length,
    byKind: countBy(entries, (e) => e.kind),
    byStatus: countBy(entries, (e) => e.productionStatus),
    bySeverity: countBy(entries, (e) => e.severity),
    missingBackendObjects: missing.length,
    missingOnProductionPath: missingOnProductionPath.length,
    presentEdgeFunctionsWithMissingDependencies: dependencyGapEntries.length,
    dynamicCallSites: dynamicCalls.length,
    filesScanned: files.length,
  };

  const graphDoc = {
    schema: "longyu-client-backend-call-graph/1",
    generatedAt: new Date().toISOString(),
    generatedFromSha: gitSha(),
    productionSnapshot: { path: SNAPSHOT_PATH, readAt: snapshot.readAt, project: snapshot.project?.ref ?? null },
    ledger: { path: LEDGER_PATH, productionReadAt: ledger.productionReadAt, status: ledger.status },
    method: [
      "Static scan of src/**/*.{ts,tsx} (tests excluded) for .from('t'), .rpc('f'), functions.invoke('e'), .storage.from('b') and .auth.* calls, including literal calls routed through local wrapper functions (e.g. invokeRpc).",
      "Backend object -> introducing migration comes from scripts/lib/sql-object-index.mjs over supabase/migrations and supabase/pending (earliest non-conditional create).",
      "productionStatus is read from the production snapshot only: tables/views, functions, edge functions, storage buckets. Auth methods are PRESENT unless they depend on provider/SMTP config the snapshot marks NOT_READABLE_FROM_AGENT.",
      "productionPath = the calling file is reachable from src/main.tsx (static imports) or from a non-/qa route in src/routes.tsx (static + lazy imports). Static reachability is an upper bound on runtime usage.",
      "Edge functions list the tables/rpcs their repo source reads, resolved against the same snapshot.",
    ],
    limits: [
      "Calls with a non-literal name cannot be resolved; they are listed under dynamicCalls.",
      "Column-level drift (e.g. a selected column missing from an existing table) is not detected; the snapshot has table-level facts only.",
      "Deployed edge-function source is not compared to the repo copy; PRESENT means a function with that slug is deployed.",
    ],
    counts,
    entries,
    dynamicCalls,
  };

  fs.mkdirSync(path.dirname(path.join(root, OUT_JSON)), { recursive: true });
  fs.writeFileSync(path.join(root, OUT_JSON), `${JSON.stringify(graphDoc, null, 2)}\n`);
  fs.mkdirSync(path.dirname(path.join(root, OUT_MD)), { recursive: true });
  fs.writeFileSync(path.join(root, OUT_MD), renderReport(graphDoc, { missing, missingOnProductionPath, dependencyGapEntries }));

  console.log(`client->backend call graph: ${entries.length} entries from ${files.length} files`);
  console.log(`  by status: ${JSON.stringify(counts.byStatus)}`);
  console.log(`  MISSING_BACKEND_OBJECT: ${missing.length} (${missingOnProductionPath.length} on production paths)`);
  console.log(`  wrote ${OUT_JSON}`);
  console.log(`  wrote ${OUT_MD}`);
  if (strict && missingOnProductionPath.length) {
    console.error("strict: MISSING backend objects are reachable from production client paths");
    process.exit(1);
  }
}

function countBy(list, fn) {
  const out = {};
  for (const item of list) out[fn(item)] = (out[fn(item)] ?? 0) + 1;
  return out;
}

function renderReport(doc, { missing, missingOnProductionPath, dependencyGapEntries }) {
  const lines = [];
  const sites = (entry, limit = 4) => {
    const shown = entry.clientPaths.slice(0, limit).map((p) => `\`${p}\``).join("<br>");
    return entry.clientPaths.length > limit ? `${shown}<br>+${entry.clientPaths.length - limit} more` : shown;
  };
  lines.push("# RC2.3.10B — client to backend gate");
  lines.push("");
  lines.push(`Generated by \`npm run analyze:client-backend-graph\` from \`${doc.generatedFromSha?.slice(0, 12) ?? "unknown"}\`. Production facts come from \`${doc.productionSnapshot.path}\` (read ${doc.productionSnapshot.readAt}, project \`${doc.productionSnapshot.project}\`). Static analysis only; no database or network access, no production writes.`);
  lines.push("");
  lines.push("## Verdict");
  lines.push("");
  if (missingOnProductionPath.length) {
    lines.push(`**BLOCKED.** ${missingOnProductionPath.length} backend object(s) that the shipped client calls on a production path are absent from production. Each one is a \`MISSING_BACKEND_OBJECT\`: the call will fail at runtime until the object is applied or the client path is gated.`);
  } else {
    lines.push("**CLEAR.** No production client path calls a backend object that is absent from the snapshot.");
  }
  lines.push("");
  lines.push("| Metric | Count |");
  lines.push("|---|---|");
  lines.push(`| Distinct client calls | ${doc.counts.entries} |`);
  lines.push(`| PRESENT | ${doc.counts.byStatus.PRESENT ?? 0} |`);
  lines.push(`| MISSING | ${doc.counts.byStatus.MISSING ?? 0} |`);
  lines.push(`| UNKNOWN | ${doc.counts.byStatus.UNKNOWN ?? 0} |`);
  lines.push(`| MISSING on a production path | ${missingOnProductionPath.length} |`);
  lines.push(`| Present edge functions that read absent objects | ${dependencyGapEntries.length} |`);
  lines.push(`| Dynamic call sites (not resolvable) | ${doc.counts.dynamicCallSites} |`);
  lines.push("");
  lines.push("## MISSING_BACKEND_OBJECT on production paths");
  lines.push("");
  if (!missingOnProductionPath.length) {
    lines.push("None.");
  } else {
    lines.push("| Severity | Kind | Backend object | Client call | Introducing migration (ledger state) | Routes | Client paths |");
    lines.push("|---|---|---|---|---|---|---|");
    for (const entry of missingOnProductionPath) {
      const migration = entry.introducingMigration
        ? `\`${entry.introducingMigration}\`${entry.introducingMigrationLedgerState ? ` (${entry.introducingMigrationLedgerState})` : ""}`
        : "none found";
      const routes = entry.inAppShell && !entry.routes.length ? "app shell" : entry.routes.map((r) => `\`${r}\``).join(" ") + (entry.inAppShell ? " + shell" : "");
      lines.push(`| ${entry.severity} | ${entry.kind} | \`${entry.backendObject}\` | \`${entry.clientCall}\` | ${migration} | ${routes || "-"} | ${sites(entry)} |`);
    }
    lines.push("");
    lines.push("### Why each is rated as it is");
    lines.push("");
    for (const entry of missingOnProductionPath) {
      const dependencies = entry.backendDependencies.filter((d) => d.productionStatus === "MISSING");
      const extra = dependencies.length ? ` Needs absent: ${dependencies.map((d) => `\`${d.name}\``).join(", ")}.` : "";
      const domain = entry.domain ? ` Domain: ${entry.domain}.` : "";
      lines.push(`- \`${entry.backendObject}\` (${entry.severity}): ${entry.severityReason}.${domain}${extra}${entry.notes.length ? ` Note: ${entry.notes.join("; ")}.` : ""}`);
    }
  }
  lines.push("");
  lines.push("## Present edge functions whose repo source reads absent objects");
  lines.push("");
  if (!dependencyGapEntries.length) {
    lines.push("None.");
  } else {
    for (const entry of dependencyGapEntries) {
      lines.push(`- \`${entry.backendObject}\` (${entry.severity}): ${entry.backendDependencies.filter((d) => d.productionStatus === "MISSING").map((d) => `\`${d.kind}:${d.name}\``).join(", ")}. Deployed source was not compared with the repo copy.`);
    }
  }
  lines.push("");
  lines.push("## MISSING but not on a production path");
  lines.push("");
  const offPath = missing.filter((entry) => !entry.productionPath);
  if (!offPath.length) lines.push("None.");
  for (const entry of offPath) lines.push(`- \`${entry.backendObject}\` (${entry.kind}) from ${sites(entry, 3)}`);
  lines.push("");
  lines.push("## UNKNOWN (cannot be proven from the snapshot)");
  lines.push("");
  for (const entry of doc.entries.filter((e) => e.productionStatus === "UNKNOWN")) {
    lines.push(`- \`${entry.backendObject}\`: ${entry.notes.join("; ") || "not verifiable"}.`);
  }
  if (!doc.entries.some((e) => e.productionStatus === "UNKNOWN")) lines.push("None.");
  lines.push("");
  lines.push("## Anomalies");
  lines.push("");
  const anomalies = doc.entries.filter((e) => e.notes.some((n) => /contradiction|recorded as applied|neither/.test(n)));
  if (!anomalies.length) lines.push("None.");
  for (const entry of anomalies) lines.push(`- \`${entry.backendObject}\`: ${entry.notes.filter((n) => /contradiction|recorded as applied|neither/.test(n)).join("; ")}.`);
  lines.push("");
  lines.push("## Reading this report");
  lines.push("");
  lines.push("- `productionPath` is static reachability from `src/main.tsx` or a non-QA route, so it is an upper bound: a gated or error-tolerant call still counts. Gate the client path or apply the migration, then rerun.");
  lines.push("- The owner-supplied absent list names `friendships`/`friend_requests`; the repo's social module actually uses `user_follows` and `social_activity_events` (migration `005_social.sql`). Those are the objects reported.");
  lines.push("- Resolution (apply the migration batch vs. gate the client) is decided in `docs/launch/rc2-3-10b-migration-plan.json`.");
  lines.push("");
  return `${lines.join("\n")}\n`;
}

main();
