/**
 * Production backup preflight (PRE_MIGRATION_BACKUP_REQUIRED).
 *
 * DRY-RUN BY DEFAULT. Without --execute this script never opens a network
 * connection, never runs pg_dump and writes nothing unless --write-manifest is
 * given. It:
 *
 *   1. verifies the destination exists, is a writable directory, lives OUTSIDE
 *      this repo (and outside any git work tree) and has enough free space;
 *   2. prints encryption guidance (the dump is highly sensitive);
 *   3. prints the schema-only dump command (`pg_dump --schema-only`);
 *   4. prints (or, with --write-manifest, writes) a manifest TEMPLATE with
 *      timestamp, project ref, candidate SHA, and files/sizes/sha256 - never
 *      any table data.
 *
 * It only runs pg_dump when BOTH `--execute` and BACKUP_DATABASE_URL are set,
 * and only ever with --schema-only. Data dumps are owner-run (see
 * docs/launch/production-backup-runbook.md); this script never takes one.
 *
 *   npm run backup:production-preflight -- --dest /secure/path
 *   npm run backup:production-preflight -- --dest /secure/path --write-manifest
 *   BACKUP_DATABASE_URL=... npm run backup:production-preflight -- --dest /secure/path --execute
 *
 * Options:
 *   --dest <dir>          destination directory (or BACKUP_DEST_DIR)
 *   --min-free-mb <n>     required free space, default 512
 *   --candidate-sha <sha> default: git rev-parse HEAD
 *   --project-ref <ref>   default: docs/launch/production-snapshot.json project.ref
 *   --write-manifest      write <dest>/production-backup-manifest.json (template in dry-run)
 *   --execute             run pg_dump --schema-only (needs BACKUP_DATABASE_URL)
 *   --json                machine-readable report on stdout
 *
 * Exit codes: 0 preflight passed, 1 a check failed, 2 missing input.
 */
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SNAPSHOT_PATH = "docs/launch/production-snapshot.json";
const MANIFEST_SCHEMA = "longyu-production-backup-manifest/1";
const MANIFEST_NAME = "production-backup-manifest.json";
const DEFAULT_MIN_FREE_MB = 512;
const DUMP_SCHEMAS = ["public", "auth", "storage"];
const SYNCED_FOLDER_HINTS = [/dropbox/i, /onedrive/i, /icloud/i, /google ?drive/i, /\bbox\b/i, /sync/i, /mobile documents/i];

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

export function isInside(parent, child) {
  const rel = path.relative(parent, child);
  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

function realpathOrSelf(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function gitOutput(cwd, gitArgs) {
  try {
    return execFileSync("git", gitArgs, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

export function checkDestination(dest, { minFreeMb = DEFAULT_MIN_FREE_MB } = {}) {
  const checks = [];
  const add = (id, ok, detail) => checks.push({ id, ok, detail });

  if (!dest) {
    add("destination-provided", false, "pass --dest <dir> (or BACKUP_DEST_DIR); the preflight cannot pass without a destination");
    return checks;
  }
  const resolved = path.resolve(dest);
  const exists = fs.existsSync(resolved);
  add("destination-exists", exists, exists ? resolved : `${resolved} does not exist; create it first (the script never creates it)`);
  if (!exists) return checks;

  const stat = fs.statSync(resolved);
  add("destination-is-directory", stat.isDirectory(), stat.isDirectory() ? "directory" : "not a directory");
  if (!stat.isDirectory()) return checks;

  const real = realpathOrSelf(resolved);
  const repoReal = realpathOrSelf(root);
  add(
    "destination-outside-repo",
    !isInside(repoReal, real),
    isInside(repoReal, real) ? `${real} is inside the repo ${repoReal}; a dump must never live in the repo` : `${real} is outside ${repoReal}`,
  );

  const worktree = gitOutput(real, ["rev-parse", "--is-inside-work-tree"]);
  add(
    "destination-not-in-any-git-worktree",
    worktree !== "true",
    worktree === "true" ? `${real} is inside a git work tree; use a plain directory` : "not inside a git work tree",
  );

  let writable = true;
  try {
    fs.accessSync(real, fs.constants.W_OK);
  } catch {
    writable = false;
  }
  add("destination-writable", writable, writable ? "writable" : "not writable by this user");

  try {
    const fsStat = fs.statfsSync(real);
    const freeBytes = Number(fsStat.bavail) * Number(fsStat.bsize);
    const freeMb = Math.floor(freeBytes / (1024 * 1024));
    add("destination-free-space", freeMb >= minFreeMb, `${freeMb} MiB free, ${minFreeMb} MiB required`);
  } catch (error) {
    add("destination-free-space", false, `could not read free space: ${error.message}`);
  }

  const synced = SYNCED_FOLDER_HINTS.find((re) => re.test(real));
  checks.push({
    id: "destination-not-shared-cloud-folder",
    ok: !synced,
    severity: "warn",
    detail: synced ? `${real} looks like a synced/shared folder (${synced}); the runbook forbids shared cloud storage for dumps` : "no synced-folder hint in path",
  });
  return checks;
}

export function parseDatabaseUrl(rawUrl) {
  const url = new URL(rawUrl);
  if (!/^postgres(ql)?:$/.test(url.protocol)) throw new Error("BACKUP_DATABASE_URL must be a postgres:// URL");
  return {
    host: url.hostname,
    port: url.port || "5432",
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "") || "postgres",
  };
}

/** The URL must name the production project; never dump a sibling project by accident. */
export function urlMatchesProject(parts, projectRef) {
  return parts.host.includes(projectRef) || parts.user.includes(projectRef);
}

function readSnapshotProjectRef() {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, SNAPSHOT_PATH), "utf8")).project?.ref ?? null;
  } catch {
    return null;
  }
}

function sha256File(file) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(file));
  return hash.digest("hex");
}

export function buildManifest({ projectRef, candidateSha, timestamp, files }) {
  return {
    schema: MANIFEST_SCHEMA,
    status: files.length > 0 ? "SCHEMA_DUMP_CREATED" : "TEMPLATE_NOT_A_BACKUP",
    takenAt: timestamp,
    sourceProject: projectRef,
    candidateSha,
    containsData: false,
    note: "Manifest only: names, sizes and sha256. Never table data, emails or secrets. A schema-only dump does not satisfy BACKUP_EXPORT_PASS; the owner still runs the data export (OA-DATA-EXPORT) and verifies it per docs/launch/production-backup-runbook.md.",
    files,
    ownerVerification: {
      dataExportTaken: null,
      encryptedAtRest: null,
      storedOutsideRepoAndSharedCloud: null,
      restoreTestedLocally: null,
      perTableCountsRecordedInPr: null,
      verifiedBy: null,
      verifiedAt: null,
    },
  };
}

export function fileTemplate(kind, name) {
  return { name, kind, bytes: null, sha256: null };
}

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
}

function printGuidance(dest, schemaFile) {
  const d = dest ?? "<dest>";
  console.log("\nEncryption guidance (the dump is highly sensitive; auth data and feedback text are not public):");
  console.log(`  age:  age -r <recipient-public-key> -o ${d}/${schemaFile}.age ${d}/${schemaFile} && shred -u ${d}/${schemaFile}`);
  console.log(`  gpg:  gpg --symmetric --cipher-algo AES256 -o ${d}/${schemaFile}.gpg ${d}/${schemaFile} && shred -u ${d}/${schemaFile}`);
  console.log("  Keep the key/passphrase in a password manager, not next to the dump. Never commit a dump; never put it in shared cloud storage.");
  console.log("  Retain until the next migration is validated (advisors + cloud smoke) and at least 30 days.");
}

function printSchemaDumpInstructions(dest, schemaFile, projectRef) {
  const d = dest ?? "<dest>";
  const schemaFlags = DUMP_SCHEMAS.map((s) => `--schema=${s}`).join(" ");
  console.log("\nSchema-only dump (read-only against production; run from the owner's machine):");
  console.log(`  pg_dump --schema-only --no-password ${schemaFlags} -f ${d}/${schemaFile} "$BACKUP_DATABASE_URL"`);
  console.log("  or with the Supabase CLI (no data flag => schema only):");
  console.log(`  npx supabase link --project-ref ${projectRef ?? "<project-ref>"}`);
  console.log(`  npx supabase db dump --linked --schema ${DUMP_SCHEMAS.join(",")} -f ${d}/${schemaFile}`);
  console.log("  Data export is NOT done by this script. Use the runbook (section 3) and record counts, not rows.");
}

function runSchemaDump({ dest, schemaFile, parts }) {
  const probe = spawnSync("pg_dump", ["--version"], { encoding: "utf8" });
  if (probe.error || probe.status !== 0) {
    return { ok: false, detail: "pg_dump not found on PATH; install postgresql-client matching the server major version (17)" };
  }
  const out = path.join(dest, schemaFile);
  const dumpArgs = ["--schema-only", "--no-password", ...DUMP_SCHEMAS.map((s) => `--schema=${s}`), "-f", out];
  const result = spawnSync("pg_dump", dumpArgs, {
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      PGHOST: parts.host,
      PGPORT: parts.port,
      PGUSER: parts.user,
      PGPASSWORD: parts.password,
      PGDATABASE: parts.database,
      PGSSLMODE: "require",
    },
  });
  if (result.status !== 0) {
    const reason = String(result.stderr ?? "").replace(parts.password, "***").slice(0, 400);
    return { ok: false, detail: `pg_dump failed (exit ${result.status}): ${reason}` };
  }
  return { ok: true, file: out, version: probe.stdout.trim() };
}

function main() {
  const json = flag("--json");
  const execute = flag("--execute");
  const writeManifest = flag("--write-manifest");
  const dest = option("--dest") ?? process.env.BACKUP_DEST_DIR ?? null;
  const minFreeMb = Number(option("--min-free-mb", DEFAULT_MIN_FREE_MB));
  const projectRef = option("--project-ref") ?? readSnapshotProjectRef();
  const candidateSha = option("--candidate-sha") ?? gitOutput(root, ["rev-parse", "HEAD"]);
  const timestamp = new Date().toISOString();
  const schemaFile = `prod-schema-${stamp()}.sql`;
  const databaseUrl = process.env.BACKUP_DATABASE_URL ?? "";

  const report = {
    mode: execute ? "EXECUTE" : "DRY_RUN",
    projectRef,
    candidateSha,
    destination: dest ? path.resolve(dest) : null,
    checks: [],
    executed: false,
    manifest: null,
    exitCode: 0,
  };

  if (!projectRef) report.checks.push({ id: "project-ref", ok: false, detail: `no project ref (snapshot ${SNAPSHOT_PATH} missing?)` });
  else report.checks.push({ id: "project-ref", ok: true, detail: projectRef });
  report.checks.push({ id: "candidate-sha", ok: Boolean(candidateSha), detail: candidateSha ?? "git rev-parse HEAD failed" });
  report.checks.push(...checkDestination(dest, { minFreeMb }));

  let parts = null;
  if (execute) {
    if (!databaseUrl) {
      report.checks.push({ id: "backup-database-url", ok: false, detail: "--execute needs BACKUP_DATABASE_URL (not read from .env files on purpose)" });
    } else {
      try {
        parts = parseDatabaseUrl(databaseUrl);
        const matches = projectRef ? urlMatchesProject(parts, projectRef) : false;
        report.checks.push({
          id: "backup-database-url-names-production-project",
          ok: matches,
          detail: matches ? `URL names ${projectRef}` : `URL does not contain project ref ${projectRef}; refusing to dump another project`,
        });
      } catch (error) {
        report.checks.push({ id: "backup-database-url", ok: false, detail: error.message });
      }
    }
  } else {
    report.checks.push({
      id: "database-connection",
      ok: true,
      severity: "info",
      detail: databaseUrl ? "BACKUP_DATABASE_URL is set but ignored: dry-run never connects" : "dry-run: no connection attempted",
    });
  }

  const hardFailures = report.checks.filter((c) => !c.ok && c.severity !== "warn" && c.severity !== "info");
  let files = [];
  if (execute && hardFailures.length === 0 && parts) {
    const dump = runSchemaDump({ dest: path.resolve(dest), schemaFile, parts });
    report.checks.push({ id: "pg_dump-schema-only", ok: dump.ok, detail: dump.ok ? `${dump.version} -> ${dump.file}` : dump.detail });
    if (dump.ok) {
      report.executed = true;
      files = [{ name: schemaFile, kind: "schema-only", bytes: fs.statSync(dump.file).size, sha256: sha256File(dump.file) }];
    }
  }

  const finalFailures = report.checks.filter((c) => !c.ok && c.severity !== "warn" && c.severity !== "info");
  const manifest = buildManifest({ projectRef, candidateSha, timestamp, files });
  if (files.length === 0) manifest.files = [fileTemplate("schema-only", schemaFile)];
  report.manifest = manifest;

  if (writeManifest || report.executed) {
    const targetOk = finalFailures.every((c) => !c.id.startsWith("destination"));
    if (!dest || !targetOk) {
      report.checks.push({ id: "manifest-written", ok: false, detail: "destination checks failed; manifest not written" });
    } else {
      const manifestPath = path.join(path.resolve(dest), MANIFEST_NAME);
      fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600 });
      report.checks.push({ id: "manifest-written", ok: true, detail: manifestPath });
    }
  }

  report.exitCode = report.checks.some((c) => !c.ok && c.severity !== "warn" && c.severity !== "info")
    ? (dest ? 1 : 2)
    : 0;

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    process.exit(report.exitCode);
  }

  console.log(`Production backup preflight - ${report.mode}`);
  console.log(`  project ref : ${projectRef ?? "(unknown)"}`);
  console.log(`  candidate   : ${candidateSha ?? "(unknown)"}`);
  console.log(`  destination : ${report.destination ?? "(none)"}`);
  console.log("\nChecks:");
  for (const check of report.checks) {
    const mark = check.ok ? "PASS" : check.severity === "warn" ? "WARN" : "FAIL";
    console.log(`  [${mark}] ${check.id}: ${check.detail}`);
  }
  printGuidance(dest, schemaFile);
  printSchemaDumpInstructions(dest, schemaFile, projectRef);
  if (!report.executed) {
    console.log("\nManifest template (no data; fill bytes/sha256 after the dump exists):");
    console.log(JSON.stringify(manifest, null, 2));
  }
  console.log(
    report.exitCode === 0
      ? `\nPreflight ${report.executed ? "executed (schema only)" : "passed (dry-run, nothing was dumped)"}. BACKUP_EXPORT_PASS stays OWNER_ACTION_REQUIRED until the data export is verified.`
      : "\nPreflight NOT passed. Fix the FAIL items above.",
  );
  process.exit(report.exitCode);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
