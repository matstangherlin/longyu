#!/usr/bin/env node
/**
 * RC2.3.10 — Cloud Launch Certification gates.
 *
 *   node scripts/rc2-3-10-cloud-certification.mjs ledger          write docs/launch/production-migration-ledger.json
 *   node scripts/rc2-3-10-cloud-certification.mjs validate        ledger fresh + matrix + Jev/Turnstile guarantees
 *   node scripts/rc2-3-10-cloud-certification.mjs provenance [--dist dist] [--expect-sha <sha>]
 *                                                                 built artifact identity + bundle secret scan
 *   node scripts/rc2-3-10-cloud-certification.mjs test            mutations: every rule must fail when broken
 *
 * Production facts come only from docs/launch/production-snapshot.json (a
 * read-only, schema-level snapshot). This script never talks to production.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { journeyFingerprint } from "./lib/report-meta.mjs";
import {
  buildMigrationLedger,
  checkArtifactProvenance,
  checkCloudMatrix,
  checkEvidenceFiles,
  checkJevGuardrails,
  checkMigrationLedger,
  checkTurnstileFailClosed,
  normalizedMigrationHash,
  overallCloud,
  productionMigrationReady,
  summarizeLedger,
} from "./lib/rc2-3-10-cloud.mjs";

const root = process.cwd();
const SNAPSHOT = "docs/launch/production-snapshot.json";
const LEDGER = "docs/launch/production-migration-ledger.json";
const MATRIX = "docs/release/rc2-3-10-cloud-matrix.json";
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const readJson = (rel) => JSON.parse(read(rel));

function repoMigrations() {
  const files = [];
  for (const dir of ["supabase/migrations", "supabase/pending"]) {
    for (const name of fs.readdirSync(path.join(root, dir)).filter((f) => f.endsWith(".sql")).sort()) {
      const rel = `${dir}/${name}`;
      files.push({ file: rel, hash: normalizedMigrationHash(read(rel)) });
    }
  }
  return files;
}

function ledgerDocument() {
  const snapshot = readJson(SNAPSHOT);
  const repo = repoMigrations();
  const entries = buildMigrationLedger({ production: snapshot.migrations, repo });
  const summary = summarizeLedger(entries);
  return {
    schema: "longyu-migration-ledger/1",
    project: snapshot.project.ref,
    productionReadAt: snapshot.readAt,
    method: snapshot.migrationHashMethod,
    counts: { productionRows: snapshot.migrations.length, repoFiles: repo.length, ...summary.byState },
    status: summary.status,
    rule: "MATCH only on equal normalized content. Name-only or placeholder rows are UNKNOWN. Nothing here changes supabase_migrations.",
    entries,
  };
}

/** Bundle a src/ TypeScript module (relative imports resolved) and load it. */
async function loadTs(rel) {
  const result = await build({
    entryPoints: [path.join(root, rel)],
    bundle: true,
    write: false,
    format: "cjs",
    platform: "node",
    logLevel: "silent",
    define: { "import.meta.env": "{}" },
  });
  const mod = { exports: {} };
  new Function("module", "exports", "require", result.outputFiles[0].text)(mod, mod.exports, createRequire(import.meta.url));
  return mod.exports;
}

function fail(errors, label) {
  for (const e of errors) console.error(`FAIL ${label}: ${e}`);
  return errors.length;
}

const mode = process.argv[2];

if (mode === "ledger") {
  fs.writeFileSync(path.join(root, LEDGER), `${JSON.stringify(ledgerDocument(), null, 1)}\n`);
  const doc = readJson(LEDGER);
  console.log(`ledger written · ${JSON.stringify(doc.counts)} · ${doc.status}`);
  process.exit(0);
}

if (mode === "validate") {
  let bad = 0;
  const fresh = ledgerDocument();
  const committed = fs.existsSync(path.join(root, LEDGER)) ? readJson(LEDGER) : null;
  if (!committed || JSON.stringify(committed.entries) !== JSON.stringify(fresh.entries) || committed.status !== fresh.status) {
    bad += fail(["LEDGER_STALE — run: node scripts/rc2-3-10-cloud-certification.mjs ledger"], "ledger");
  }
  bad += fail(checkMigrationLedger(committed ?? fresh, { production: readJson(SNAPSHOT).migrations, repo: repoMigrations() }), "ledger");
  const matrix = readJson(MATRIX);
  bad += fail(checkCloudMatrix(matrix), "matrix");
  bad += fail(checkEvidenceFiles(matrix, (rel) => fs.existsSync(path.join(root, rel))), "matrix");
  if (matrix.gates?.MIGRATION_HISTORY_PASS?.status === "PASS" && fresh.status !== "PASS") bad += fail(["MIGRATION_HISTORY_PASS without a reconciled ledger"], "matrix");
  bad += fail(
    checkJevGuardrails({
      jevSource: read("supabase/functions/_shared/jev.ts"),
      budgetPolicySource: read("supabase/functions/_shared/budgetPolicy.ts"),
      triageSource: read("supabase/functions/triage-feedback/index.ts"),
    }),
    "jev"
  );
  // Production config = what builds/serves production or targets the production project
  // ref. Ephemeral test backends (backend-contract.yml) legitimately skip Turnstile.
  const productionWorkflows = fs
    .readdirSync(path.join(root, ".github/workflows"))
    .map((f) => `.github/workflows/${f}`)
    .filter((rel) => /drjcfalvlbbeblmmyhwj/.test(read(rel)) || /(release|deploy)/.test(rel));
  const productionConfigs = Object.fromEntries(
    ["netlify.toml", ".env.production", "supabase/config.toml", ...productionWorkflows]
      .filter((rel) => fs.existsSync(path.join(root, rel)))
      .map((rel) => [rel, read(rel)])
  );
  bad += fail(checkTurnstileFailClosed(read("supabase/functions/create-account/index.ts"), productionConfigs), "turnstile");
  if (bad) process.exit(1);
  console.log(`PASS validate:rc2-3-10-cloud · ledger ${fresh.status} ${JSON.stringify(fresh.counts)} · matrix overall ${overallCloud(matrix)} · Jev guardrails · Turnstile fail-closed`);
  process.exit(0);
}

if (mode === "provenance") {
  const arg = (name, fallback) => {
    const i = process.argv.indexOf(name);
    return i > 0 ? process.argv[i + 1] : fallback;
  };
  const dist = path.resolve(root, arg("--dist", "dist"));
  let expectedSha = arg("--expect-sha", "");
  if (!expectedSha) {
    try {
      expectedSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
    } catch {
      expectedSha = "";
    }
  }
  const versionFile = path.join(dist, "version.json");
  if (!fs.existsSync(versionFile)) {
    console.error(`FAIL provenance: ${path.relative(root, versionFile)} missing — build first (npm run build)`);
    process.exit(1);
  }
  const files = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(js|mjs|html|json|txt|map)$/.test(entry.name)) files[path.relative(root, full)] = fs.readFileSync(full, "utf8");
    }
  };
  walk(dist);
  const versionJson = JSON.parse(fs.readFileSync(versionFile, "utf8"));
  const errors = checkArtifactProvenance({ versionJson, expectedSha, expectedFingerprint: journeyFingerprint(root), files });
  if (fail(errors, "provenance")) process.exit(1);
  console.log(
    `PASS validate:apk-provenance · ${path.relative(root, dist)} · sha ${versionJson.commitSha.slice(0, 12)} · fp ${versionJson.curriculumFingerprint} · channel ${versionJson.buildChannel} · ${Object.keys(files).length} files scanned, no secret shape`
  );
  process.exit(0);
}

if (mode === "test") {
  const results = [];
  const kill = (label, code, errors) => {
    const killed = errors.some((e) => e.startsWith(code));
    results.push(killed);
    console.log(`${killed ? "KILLED" : "SURVIVED"} ${label}: ${code}`);
  };
  const sha = "a".repeat(40);
  const base = { commitSha: sha, curriculumFingerprint: "5a64821d0b7d", buildChannel: "production", deviceQaBuild: false, testFixtures: false };
  const ok = (v, files = {}) => checkArtifactProvenance({ versionJson: v, expectedSha: sha, expectedFingerprint: "5a64821d0b7d", files });
  if (ok(base).length) throw new Error(`baseline provenance must pass: ${ok(base)}`);
  // build provenance
  kill("wrong SHA", "WRONG_SHA", ok({ ...base, commitSha: "b".repeat(40) }));
  kill("wrong fingerprint", "WRONG_FINGERPRINT", ok({ ...base, curriculumFingerprint: "000000000000" }));
  kill("QA flag in production", "QA_FLAG_IN_PRODUCTION", ok({ ...base, deviceQaBuild: true }));
  kill("test fixtures in production", "TEST_FIXTURES_IN_PRODUCTION", ok({ ...base, testFixtures: true }));
  kill("no channel", "ARTIFACT_CHANNEL_MISSING", ok({ ...base, buildChannel: undefined }));
  // security regression: secrets in bundle
  const serviceJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "service_role", iss: "supabase" })).toString("base64url")}.c2lnbmF0dXJlc2ln`;
  kill("service role in bundle", "SECRET_IN_BUNDLE:SUPABASE_SERVICE_ROLE_JWT", ok(base, { "dist/assets/a.js": `const k='${serviceJwt}'` }));
  kill("Jev key/host in bundle", "SECRET_IN_BUNDLE:JEV_CLIENT_CALL", ok(base, { "dist/assets/a.js": "fetch('https://api.typesafe.ai/v1/systemone')" }));
  kill("SMTP password name in bundle", "SECRET_IN_BUNDLE:SECRET_ENV_NAME", ok(base, { "dist/assets/a.js": "SMTP_PASSWORD" }));
  // Fixture shapes assembled at runtime so gitleaks never sees a contiguous
  // sntrys_/sk_live_ literal in this source (FALSE_POSITIVE otherwise).
  const fakeSentryAuth = ["sntrys", "abcdefghijklmnopqrstuvwxyz012345"].join("_");
  const fakeStripeLive = ["sk", "live", "abcdefghijklmnop1234"].join("_");
  kill("Sentry auth token in bundle", "SECRET_IN_BUNDLE:SENTRY_AUTH_TOKEN", ok(base, { "dist/assets/a.js": fakeSentryAuth }));
  kill("DB connection string in bundle", "SECRET_IN_BUNDLE:POSTGRES_CONNECTION_STRING", ok(base, { "dist/assets/a.js": "postgresql://postgres:hunter2@db.example.supabase.co:5432/postgres" }));
  kill("Stripe secret in bundle", "SECRET_IN_BUNDLE:STRIPE_SECRET_KEY", ok(base, { "dist/assets/a.js": fakeStripeLive }));
  const anonJwt = `eyJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({ role: "anon", iss: "supabase" })).toString("base64url")}.c2lnbmF0dXJlc2ln`;
  if (ok(base, { "dist/assets/a.js": `const k='${anonJwt}'` }).length) throw new Error("the public anon key must not be flagged");

  // migration ledger
  const production = [
    { version: "1", name: "alpha", normalizedMd5: normalizedMigrationHash("create table a();"), length: 900 },
    { version: "2", name: "beta", normalizedMd5: normalizedMigrationHash("create table b();"), length: 900 },
  ];
  const repo = [
    { file: "supabase/migrations/001_alpha.sql", hash: normalizedMigrationHash("create table a();") },
    { file: "supabase/migrations/002_beta.sql", hash: normalizedMigrationHash("create table b();") },
  ];
  const entries = buildMigrationLedger({ production, repo });
  const good = { status: summarizeLedger(entries).status, entries };
  if (checkMigrationLedger(good, { production, repo }).length) throw new Error(`baseline ledger must pass: ${checkMigrationLedger(good, { production, repo })}`);
  kill("duplicate mapping", "DUPLICATE_MAPPING", checkMigrationLedger({ ...good, entries: entries.map((e) => ({ ...e, repoFile: e.state === "MATCH" ? repo[0].file : e.repoFile })) }, { production, repo }));
  kill("unknown migration (row dropped)", "PRODUCTION_ROW_MISSING", checkMigrationLedger({ ...good, entries: entries.slice(1) }, { production, repo }));
  kill("content mismatch called MATCH", "MATCH_WITHOUT_EQUAL_CONTENT", checkMigrationLedger(good, { production: [production[0], { ...production[1], normalizedMd5: "f".repeat(32) }], repo }));
  kill("missing repo migration", "REPO_FILE_MISSING", checkMigrationLedger(good, { production, repo: [...repo, { file: "supabase/migrations/003_gamma.sql", hash: "e".repeat(32) }] }));
  kill("ledger PASS with UNKNOWN", "FALSE_PASS:ledger", checkMigrationLedger({ status: "PASS", entries: buildMigrationLedger({ production: [{ ...production[0], normalizedMd5: "f".repeat(32) }], repo: [repo[0]] }) }, { production: [{ ...production[0], normalizedMd5: "f".repeat(32) }], repo: [repo[0]] }));
  const placeholderLedger = buildMigrationLedger({ production: [{ version: "9", name: "alpha", normalizedMd5: normalizedMigrationHash("select 1"), length: 40, placeholderText: "select 1" }], repo: [repo[0]] });
  if (placeholderLedger[0].state !== "UNKNOWN") throw new Error("a placeholder history row must never be MATCH");

  // cloud matrix / Product Truth semantics
  const matrix = readJson(MATRIX);
  if (checkCloudMatrix(matrix).length) throw new Error(`committed matrix must pass: ${checkCloudMatrix(matrix)}`);
  const firstNonPass = Object.keys(matrix.gates).find((id) => matrix.gates[id].status !== "PASS" && id !== "OWNER_CLOUD_ACCEPTANCE");
  kill("false PASS (no evidence)", "FALSE_PASS", checkCloudMatrix({ ...matrix, gates: { ...matrix.gates, [firstNonPass]: { status: "PASS", evidence: [] } } }));
  kill("owner acceptance auto-PASS", "OWNER_ACCEPTANCE_AUTO", checkCloudMatrix({ ...matrix, gates: { ...matrix.gates, OWNER_CLOUD_ACCEPTANCE: { status: "PASS", evidence: ["x"] } } }));
  kill("stale evidence", "STALE_EVIDENCE", checkCloudMatrix({ ...matrix, gates: { ...matrix.gates, [firstNonPass]: { status: "PASS", evidence: ["x"], readAt: "2020-01-01" } } }));
  kill("missing cloud evidence (gate dropped)", "MISSING_GATE", checkCloudMatrix({ ...matrix, gates: Object.fromEntries(Object.entries(matrix.gates).filter(([id]) => id !== "CLOUD_SMOKE_PASS")) }));
  kill("evidence file never written", "MISSING_CLOUD_EVIDENCE", checkEvidenceFiles({ gates: { X: { status: "NOT_RUN", evidence: ["docs/reports/never-written.md"] } } }, (rel) => fs.existsSync(path.join(root, rel))));
  kill("overall PASS while blocked", "FALSE_PASS:overall", checkCloudMatrix({ ...matrix, overall: "PASS" }));
  kill("synonym status", "STATUS_VOCABULARY", checkCloudMatrix({ ...matrix, gates: { ...matrix.gates, [firstNonPass]: { status: "READY", evidence: [] } } }));
  kill("old APK certifies release", "INVALID_RELEASE_EVIDENCE", checkCloudMatrix({ ...matrix, provenance: { certifiedSha: sha, surfaces: [{ surface: "APK", sha: "b".repeat(40), verified: "PASS" }] } }));

  // PRODUCTION_MIGRATION_READY fails closed
  const now = Date.parse("2026-10-08T00:00:00Z");
  const ready = {
    candidateSha: sha,
    schemaDiff: { status: "PASS", readAt: "2026-10-07" },
    ledger: { status: "PASS" },
    backup: { verified: true, sourceProject: "drjcfalvlbbeblmmyhwj", takenAt: "2026-10-07" },
    review: { reviewer: "owner", migrations: ["x.sql"] },
    down: { strategy: "restore export" },
    ownerApproval: { by: "owner", at: "2026-10-07" },
  };
  if (productionMigrationReady(ready, now).status !== "PASS") throw new Error("complete request must be ready");
  for (const step of ["candidateSha", "schemaDiff", "ledger", "backup", "review", "down", "ownerApproval"]) {
    const broken = { ...ready, [step]: undefined };
    kill(`migration without ${step}`, "BLOCKED", [productionMigrationReady(broken, now).status]);
  }
  kill("stale schema diff", "BLOCKED", [productionMigrationReady({ ...ready, schemaDiff: { status: "PASS", readAt: "2026-09-01" } }, now).status]);

  // Jev / Turnstile
  const jevSource = read("supabase/functions/_shared/jev.ts");
  const budgetPolicySource = read("supabase/functions/_shared/budgetPolicy.ts");
  const triageSource = read("supabase/functions/triage-feedback/index.ts");
  if (checkJevGuardrails({ jevSource, budgetPolicySource, triageSource }).length) throw new Error("repo Jev guardrails must pass");
  kill("Jev without timeout", "JEV_TIMEOUT_MISSING", checkJevGuardrails({ jevSource: jevSource.replace(/AbortController/g, "X"), budgetPolicySource, triageSource }));
  kill("Jev without circuit breaker", "JEV_CIRCUIT_BREAKER_MISSING", checkJevGuardrails({ jevSource: jevSource.replace(/jev_circuit_open/g, "x"), budgetPolicySource, triageSource }));
  kill("Jev learner runtime on", "JEV_RUNTIME_ENABLED_BY_DEFAULT", checkJevGuardrails({ jevSource, budgetPolicySource: budgetPolicySource.replace("JEV_RUNTIME_ENABLED: false", "JEV_RUNTIME_ENABLED: true"), triageSource }));
  kill("Jev budget/kill switch removed", "JEV_KILL_SWITCH_MISSING", checkJevGuardrails({ jevSource, budgetPolicySource, triageSource: triageSource.replace('jevAllowed("DEV_AUDIT")', "true") }));
  kill("Jev key moved to client env", "JEV_KEY_NOT_SERVER_ONLY", checkJevGuardrails({ jevSource: `${jevSource}\nimport.meta.env.VITE_TYPESAFE_API_KEY`, budgetPolicySource, triageSource }));
  const createAccount = read("supabase/functions/create-account/index.ts");
  if (checkTurnstileFailClosed(createAccount, {}).length) throw new Error("create-account must fail closed");
  kill("Turnstile skip in production config", "TURNSTILE_SKIP_IN_PRODUCTION_CONFIG", checkTurnstileFailClosed(createAccount, { "netlify.toml": 'TURNSTILE_ALLOW_SKIP = "1"' }));
  kill("Turnstile not fail-closed", "TURNSTILE_NOT_FAIL_CLOSED", checkTurnstileFailClosed(createAccount.replace(/captcha_unavailable/g, "ok"), {}));

  // App-side provenance + physical QA (src/lib/releaseProvenance.ts, src/lib/deviceQa.ts)
  const prov = await loadTs("src/lib/releaseProvenance.ts");
  const fullSha = "c".repeat(40);
  const build_ = { buildSha: fullSha, curriculumFingerprint: "5a64821d0b7d" };
  if (prov.compareProvenance(build_, { sha: fullSha.slice(0, 7), fingerprint: "5a64821d0b7d" }).verdict !== "MATCH") throw new Error("same build must MATCH");
  kill("app: other SHA", "MISMATCH", [prov.compareProvenance(build_, { sha: "d".repeat(40), fingerprint: "5a64821d0b7d" }).verdict]);
  kill("app: other fingerprint", "MISMATCH", [prov.compareProvenance(build_, { sha: fullSha, fingerprint: "000000000000" }).verdict]);
  kill("app: no expected SHA is never MATCH", "UNKNOWN", [prov.compareProvenance(build_, { sha: "", fingerprint: "5a64821d0b7d" }).verdict]);
  kill("app: QA flag in production build", "VITE_DEVICE_QA_IN_PRODUCTION", prov.productionProvenanceViolations({ ...build_, versionName: null, versionCode: null, channel: "production", qaBuild: true, testFixtures: false }));
  kill("app: fixtures in production build", "VITE_USE_TEST_FIXTURES_IN_PRODUCTION", prov.productionProvenanceViolations({ ...build_, versionName: null, versionCode: null, channel: "production", qaBuild: false, testFixtures: true }));
  const qa = await loadTs("src/lib/deviceQa.ts");
  const pass = { status: "PASS", testedAt: "2026-10-08T00:00:00Z", buildSha: "e".repeat(40), versionCode: 2, deviceClass: qa.DEVICE_QA_DEVICE_CLASSES[0], evidenceType: qa.DEVICE_QA_EVIDENCE_TYPES[0], note: null };
  if (qa.validateDeviceQaResult(pass, { native: true, emulator: false, expectedSha: "e".repeat(40) }).length) throw new Error("physical PASS on the certified build must be accepted");
  kill("physical PASS on an old APK", "PHYSICAL_QA_INVALID_WRONG_BUILD", qa.validateDeviceQaResult(pass, { native: true, emulator: false, expectedSha: "f".repeat(40) }));

  // Sentry privacy (src/lib/observability/errorScrub.ts)
  const scrub = await loadTs("src/lib/observability/errorScrub.ts");
  const dsn = "https://abc123@o1.ingest.us.sentry.io/42";
  if (!scrub.errorReportingConfig({ VITE_SENTRY_DSN: dsn, VITE_APP_ENV: "production_beta" }, sha).enabled) throw new Error("production with DSN must report");
  kill("Sentry on without DSN", "NO_DSN", [scrub.errorReportingConfig({ VITE_APP_ENV: "production_beta" }, sha).reason]);
  kill("Sentry on in preview", "NON_PRODUCTION_ENV", [scrub.errorReportingConfig({ VITE_SENTRY_DSN: dsn, VITE_APP_ENV: "preview" }, sha).reason]);
  // Synthetic JWT for scrub assertions — parts joined at runtime so the jwt
  // gitleaks rule does not flag this test source (FALSE_POSITIVE).
  const scrubJwt = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxMjM0NTY3ODkwIn0", "c2lnbmF0dXJlc2lnbmF0dXJl"].join(".");
  const dirty = scrub.scrubEvent({
    message: `failed for ana@example.com with ${scrubJwt}`,
    user: { id: "u1", email: "ana@example.com" },
    request: { url: "https://longyu.app/licao?token=abc#x", data: { password: "p" }, cookies: "c", headers: { authorization: "Bearer x" } },
    extra: { answer: "你好", strokes: [[1, 2]], recording: "blob:", lessonId: "l1" },
    breadcrumbs: [{ category: "console", message: "x" }, { category: "ui.input", message: "typed" }, { category: "fetch", data: { url: "https://x.supabase.co/rest/v1/a?apikey=k" } }],
  });
  const leaked = JSON.stringify(dirty);
  kill("Sentry leaks e-mail", "LEAK", /ana@example\.com/.test(leaked) ? [] : ["LEAK"]);
  kill("Sentry leaks learner answer/strokes/recording", "LEAK", /你好|strokes|recording/.test(leaked) ? [] : ["LEAK"]);
  kill("Sentry leaks token/query string", "LEAK", /token=abc|apikey=k|eyJhbGci|Bearer/.test(leaked) ? [] : ["LEAK"]);
  kill("Sentry keeps console/input breadcrumbs", "LEAK", (dirty.breadcrumbs ?? []).some((b) => b.category === "console" || b.category === "ui.input") ? [] : ["LEAK"]);
  if (dirty.extra?.lessonId !== "l1") throw new Error("scrubber must keep non-sensitive context");

  const survived = results.filter((r) => !r).length;
  if (survived) {
    console.error(`FAIL test:rc2-3-10-cloud — ${survived} mutation(s) survived`);
    process.exit(1);
  }
  console.log(`PASS test:rc2-3-10-cloud (${results.length} mutações)`);
  process.exit(0);
}

console.error("usage: rc2-3-10-cloud-certification.mjs ledger | validate | provenance [--dist dist] [--expect-sha sha] | test");
process.exit(2);
