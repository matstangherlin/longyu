import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { normalizedMigrationHash, migrationStem } from "../lib/rc2-3-10-cloud.mjs";
import {
  COMPARE_STATUS,
  compareMigrations,
  coverageByUnion,
  extractStructuralSignature,
  isPlaceholderSql,
  objectLabel,
} from "../lib/migration-semantic-reconcile.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const LEDGER_PATH = "docs/launch/production-migration-ledger.json";
const SNAPSHOT_PATH = "docs/launch/production-snapshot.json";
const OUT_JSON = "docs/launch/rc2-3-10b-migration-reconciliation.json";
const OUT_MD = "docs/reports/rc2-3-10b-migration-forensics.md";
const RANK = Object.fromEntries([...COMPARE_STATUS].reverse().map((status, index) => [status, index]));

const args = process.argv.slice(2);
const option = (name) => args.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3) ?? null;
const prodSqlDir = option("prod-sql-dir");

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), "utf8"));
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function loadRepoFiles() {
  const files = [];
  for (const dir of ["supabase/migrations", "supabase/pending"]) {
    const abs = path.join(root, dir);
    if (!fs.existsSync(abs)) continue;
    for (const name of fs.readdirSync(abs).filter((f) => f.endsWith(".sql")).sort()) {
      const file = `${dir}/${name}`;
      const sql = read(file);
      files.push({ file, sql, hash: normalizedMigrationHash(sql) });
    }
  }
  return files;
}

function loadProdSql(dir) {
  const byKey = new Map();
  if (!dir) return byKey;
  const abs = path.resolve(dir);
  if (!fs.existsSync(abs)) {
    console.warn(`prod SQL directory not found: ${abs}`);
    return byKey;
  }
  for (const name of fs.readdirSync(abs).filter((f) => f.endsWith(".sql")).sort()) {
    const m = /^(\d{10,})_(.+)\.sql$/.exec(name);
    if (m) byKey.set(`${m[1]}_${m[2]}`, { file: name, sql: fs.readFileSync(path.join(abs, name), "utf8") });
  }
  return byKey;
}

const summarizeObjects = (sql) => {
  const objects = extractStructuralSignature(sql).map(objectLabel);
  return { count: objects.length, objects };
};

function compareAgainstRepo(prodSql, repoFiles, preferred) {
  const results = repoFiles.map((repo) => ({ repo, result: compareMigrations(prodSql, repo.sql) }));
  const proven = results
    .filter(({ result }) => result.status !== "UNKNOWN")
    .sort((a, b) => RANK[b.result.status] - RANK[a.result.status] || b.result.confidence - a.result.confidence || (b.repo.file === preferred) - (a.repo.file === preferred));
  return { results, proven };
}

function actionFor(status, { hasProdSql, priorState }) {
  if (status === "MATCH_EXACT") return "none";
  if (status === "MATCH_SEMANTIC") return "reviewer confirms; then record as LEGACY_EQUIVALENT in the ledger (formatting-only difference)";
  if (status === "PARTIAL_EQUIVALENT") return "repo file and production chunk overlap fully on one side; reviewer confirms the remainder, then record the mapping in the ledger";
  if (!hasProdSql) {
    return priorState === "REPO_ONLY"
      ? "no production SQL covers this file: schema diff its objects against production before treating as applied"
      : "extract the applied SQL from supabase_migrations.schema_migrations (read-only) into --prod-sql-dir and rerun";
  }
  return "manual object-level diff against production; do not repair or re-run blindly";
}

function reconcileProductionEntry(entry, prod, repoFiles, repoByFile) {
  const priorState = entry.state;
  const repoFile = entry.repoFile ?? null;
  const nameCandidates = repoFiles.filter((f) => migrationStem(f.file) === migrationStem(entry.name)).map((f) => f.file);
  const base = { version: entry.version, name: entry.name, repoFile, priorState };

  if (prod && !isPlaceholderSql(prod.sql)) {
    const { results, proven } = compareAgainstRepo(prod.sql, repoFiles, repoFile);
    const best = proven[0];
    const candidates = proven.slice(0, 5).map(({ repo, result }) => ({ file: repo.file, status: result.status, confidence: result.confidence }));
    if (best) {
      return {
        ...base,
        repoFile: repoFile && proven.some(({ repo }) => repo.file === repoFile) ? repoFile : best.repo.file,
        status: best.result.status,
        confidence: best.result.confidence,
        evidence: [`production SQL ${prod.file} vs ${best.repo.file}`, ...best.result.evidence],
        structuralObjects: summarizeObjects(prod.sql),
        candidateRepoFiles: candidates,
        action: actionFor(best.result.status, { hasProdSql: true, priorState }),
      };
    }
    const named = repoFile ? results.find(({ repo }) => repo.file === repoFile) : null;
    return {
      ...base,
      status: "UNKNOWN",
      confidence: named?.result.confidence ?? 0,
      evidence: [`production SQL ${prod.file} matches no repo file structurally`, ...(named ? [`closest by name ${repoFile}: ${named.result.evidence.join("; ")}`] : []), "name or description alone is not evidence"],
      structuralObjects: summarizeObjects(prod.sql),
      candidateRepoFiles: nameCandidates.map((file) => ({ file, status: "UNKNOWN", confidence: 0, basis: "name only" })),
      action: actionFor("UNKNOWN", { hasProdSql: true, priorState }),
    };
  }

  if (priorState === "MATCH" && repoFile && repoByFile.has(repoFile)) {
    const repoHash = repoByFile.get(repoFile).hash;
    if (repoHash === entry.normalizedMd5) {
      return {
        ...base,
        status: "MATCH_EXACT",
        confidence: 1,
        evidence: [`ledger normalized md5 ${entry.normalizedMd5} re-verified equal to current ${repoFile}`, "production SQL not re-read in this run"],
        structuralObjects: summarizeObjects(repoByFile.get(repoFile).sql),
        candidateRepoFiles: [{ file: repoFile, status: "MATCH_EXACT", confidence: 1 }],
        action: "none",
      };
    }
  }

  const placeholder = prod && isPlaceholderSql(prod.sql);
  const evidence = [
    placeholder ? `production SQL file ${prod.file} is a placeholder` : "production SQL not provided",
    `prior ledger state ${priorState}: ${entry.evidence ?? "no evidence recorded"}`,
    "name or description alone is not evidence",
  ];
  const repoSql = repoFile && repoByFile.has(repoFile) ? repoByFile.get(repoFile).sql : null;
  return {
    ...base,
    status: "UNKNOWN",
    confidence: 0,
    evidence,
    structuralObjects: repoSql ? { source: "repo", ...summarizeObjects(repoSql) } : { count: 0, objects: [] },
    candidateRepoFiles: [...new Set([repoFile, ...nameCandidates].filter(Boolean))].map((file) => ({ file, status: "UNKNOWN", confidence: 0, basis: "name only" })),
    action: actionFor("UNKNOWN", { hasProdSql: false, priorState }),
  };
}

function reconcileRepoOnlyEntry(entry, repoByFile, prodEntries, prodSqlList) {
  const repo = repoByFile.get(entry.repoFile);
  const base = { version: null, name: entry.name, repoFile: entry.repoFile, priorState: entry.state };
  const structuralObjects = repo ? { source: "repo", ...summarizeObjects(repo.sql) } : { count: 0, objects: [] };
  if (!repo || !prodSqlList.length) {
    return {
      ...base,
      status: "UNKNOWN",
      confidence: 0,
      evidence: [repo ? "no production SQL available to compare against" : "repo file missing", `prior ledger state ${entry.state}`],
      structuralObjects,
      candidateRepoFiles: [],
      action: actionFor("UNKNOWN", { hasProdSql: false, priorState: "REPO_ONLY" }),
    };
  }
  const claimedBy = prodEntries.filter((p) => p.repoFile === entry.repoFile && p.status !== "UNKNOWN");
  if (claimedBy.length) {
    const best = claimedBy.sort((a, b) => RANK[b.status] - RANK[a.status])[0];
    return {
      ...base,
      status: best.status,
      confidence: best.confidence,
      evidence: [`production migration ${best.version}_${best.name} is ${best.status} to this file`, ...best.evidence.slice(1)],
      structuralObjects,
      candidateRepoFiles: [{ file: entry.repoFile, status: best.status, confidence: best.confidence }],
      action: actionFor(best.status, { hasProdSql: true, priorState: "REPO_ONLY" }),
    };
  }
  const coverage = coverageByUnion(repo.sql, prodSqlList.map((p) => p.sql));
  if (coverage.total && coverage.covered === coverage.total) {
    return {
      ...base,
      status: "PARTIAL_EQUIVALENT",
      confidence: 0.6,
      evidence: [`all ${coverage.total} structural objects of this file appear with identical attributes in the union of ${prodSqlList.length} production migrations`, "coverage is spread across several migrations; ordering was not verified"],
      structuralObjects,
      candidateRepoFiles: [],
      action: actionFor("PARTIAL_EQUIVALENT", { hasProdSql: true, priorState: "REPO_ONLY" }),
    };
  }
  return {
    ...base,
    status: "UNKNOWN",
    confidence: 0,
    evidence: [`${coverage.covered}/${coverage.total} structural objects found in production SQL`, ...(coverage.missing.length ? [`missing from production SQL: ${coverage.missing.slice(0, 5).join(", ")}${coverage.missing.length > 5 ? ", ..." : ""}`] : [])],
    structuralObjects,
    candidateRepoFiles: [],
    action: actionFor("UNKNOWN", { hasProdSql: true, priorState: "REPO_ONLY" }),
  };
}

function countBy(entries, key, values) {
  return Object.fromEntries(values.map((value) => [value, entries.filter((e) => e[key] === value).length]));
}

function renderMarkdown(report) {
  const cell = (text) => String(text ?? "").replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [
    "# RC2.3.10B migration forensics",
    "",
    `Generated ${report.generatedAt} from \`${report.generatedFromSha ?? "unknown"}\`.`,
    "",
    `Method: ${report.method}`,
    "",
    "## Counts",
    "",
    "| Status | Entries |",
    "| --- | ---: |",
    ...COMPARE_STATUS.map((s) => `| ${s} | ${report.counts.byStatus[s]} |`),
    "",
    `Production SQL provided for ${report.counts.productionSqlProvided} of ${report.counts.productionRows} production rows.`,
    "",
    "| Prior ledger state | Entries |",
    "| --- | ---: |",
    ...Object.entries(report.counts.byPriorState).map(([s, n]) => `| ${s} | ${n} |`),
    "",
    "## Entries",
    "",
    "| Version | Name | Repo file | Prior | Status | Confidence | Action |",
    "| --- | --- | --- | --- | --- | ---: | --- |",
    ...report.entries.map((e) => `| ${e.version ?? "-"} | ${cell(e.name)} | ${cell(e.repoFile ?? "-")} | ${e.priorState} | ${e.status} | ${e.confidence} | ${cell(e.action)} |`),
    "",
    "## Evidence for entries not proven exact",
    "",
  ];
  for (const e of report.entries.filter((x) => x.status !== "MATCH_EXACT")) {
    lines.push(`### ${e.version ?? "repo-only"} ${e.name} (${e.status})`, "", ...e.evidence.map((line) => `- ${cell(line)}`), "");
  }
  return `${lines.join("\n")}\n`;
}

function main() {
  const ledger = readJson(LEDGER_PATH);
  const snapshot = readJson(SNAPSHOT_PATH);
  const repoFiles = loadRepoFiles();
  const repoByFile = new Map(repoFiles.map((f) => [f.file, f]));
  const prodSql = loadProdSql(prodSqlDir);
  const snapshotKeys = new Set((snapshot.migrations ?? []).map((m) => `${m.version}_${m.name}`));

  const productionEntries = ledger.entries.filter((e) => e.version);
  const prodResults = productionEntries.map((entry) => reconcileProductionEntry(entry, prodSql.get(`${entry.version}_${entry.name}`) ?? null, repoFiles, repoByFile));
  const providedSql = productionEntries
    .map((entry) => prodSql.get(`${entry.version}_${entry.name}`))
    .filter((p) => p && !isPlaceholderSql(p.sql));
  const repoOnlyResults = ledger.entries.filter((e) => !e.version).map((entry) => reconcileRepoOnlyEntry(entry, repoByFile, prodResults, providedSql));

  const resultOf = new Map([...productionEntries, ...ledger.entries.filter((e) => !e.version)].map((e, i) => [e, [...prodResults, ...repoOnlyResults][i]]));
  const entries = ledger.entries.map((entry) => {
    const e = resultOf.get(entry);
    return { version: e.version, name: e.name, repoFile: e.repoFile, priorState: e.priorState, status: e.status, confidence: e.confidence, evidence: e.evidence, structuralObjects: e.structuralObjects, candidateRepoFiles: e.candidateRepoFiles, action: e.action };
  });

  const report = {
    generatedAt: new Date().toISOString(),
    generatedFromSha: gitSha(),
    method:
      "Per ledger entry: when the applied production SQL is available (--prod-sql-dir), compare it with every repo migration by normalized md5 (MATCH_EXACT), structural signature hash (MATCH_SEMANTIC) and structural subset (PARTIAL_EQUIVALENT). Without production SQL, only an unchanged ledger md5 re-verified against the current repo file counts as MATCH_EXACT. Names and descriptions are never evidence.",
    prodSqlDir: prodSqlDir ?? null,
    counts: {
      total: entries.length,
      productionRows: productionEntries.length,
      productionRowsInSnapshot: productionEntries.filter((e) => snapshotKeys.has(`${e.version}_${e.name}`)).length,
      productionSqlProvided: providedSql.length,
      byStatus: countBy(entries, "status", COMPARE_STATUS),
      byPriorState: countBy(entries, "priorState", ["MATCH", "LEGACY_EQUIVALENT", "PROD_ONLY", "REPO_ONLY", "UNKNOWN"]),
    },
    entries,
  };

  fs.mkdirSync(path.dirname(path.join(root, OUT_JSON)), { recursive: true });
  fs.mkdirSync(path.dirname(path.join(root, OUT_MD)), { recursive: true });
  fs.writeFileSync(path.join(root, OUT_JSON), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(root, OUT_MD), renderMarkdown(report));

  console.log(`reconciled ${entries.length} ledger entries (production SQL provided for ${providedSql.length}/${productionEntries.length} rows)`);
  for (const status of COMPARE_STATUS) console.log(`  ${status.padEnd(20)} ${report.counts.byStatus[status]}`);
  console.log(`wrote ${OUT_JSON}`);
  console.log(`wrote ${OUT_MD}`);
}

main();
