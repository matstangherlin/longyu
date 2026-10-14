/**
 * RC2.3.10B — production schema fingerprint.
 *
 * Reads docs/launch/production-snapshot.json (and, when present, the
 * read-only live facts file docs/launch/rc2-3-10b-live-facts.json) and writes
 * docs/launch/rc2-3-10b-schema-fingerprint.json with one entry per table,
 * view and function listed in the snapshot:
 *
 *   { type, schema, name, definitionHash, hashBasis }
 *
 * definitionHash comes from the live facts when the object is there
 * (hashBasis "live-definition", an md5 of pg_get_functiondef / column+policy
 * facts / pg_get_viewdef computed inside Postgres). Otherwise it is a sha256
 * of the stable snapshot facts (hashBasis "snapshot-facts"; volatile row and
 * byte counts are excluded). Output is deterministic: no wall-clock fields.
 *
 * Never connects to a database or the network.
 *
 *   node scripts/release/build-schema-fingerprint.mjs            # write
 *   node scripts/release/build-schema-fingerprint.mjs --check    # exit 1 on drift
 *   node scripts/release/build-schema-fingerprint.mjs --no-live  # snapshot facts only
 *   node scripts/release/build-schema-fingerprint.mjs --snapshot <p> --live-facts <p> --out <p>
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const DEFAULT_SNAPSHOT = "docs/launch/production-snapshot.json";
const DEFAULT_LIVE = "docs/launch/rc2-3-10b-live-facts.json";
const DEFAULT_OUT = "docs/launch/rc2-3-10b-schema-fingerprint.json";
const SCHEMA = "public";

const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const abs = (p) => (path.isAbsolute(p) ? p : path.join(root, p));
const sha256 = (text) => createHash("sha256").update(text).digest("hex");

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((k) => [k, stable(value[k])]));
  }
  return value;
}
const canonical = (value) => JSON.stringify(stable(value));

function readJsonFile(p, label) {
  const file = abs(p);
  if (!fs.existsSync(file)) {
    console.error(`${label} not found: ${p}`);
    process.exit(2);
  }
  const text = fs.readFileSync(file, "utf8");
  return { json: JSON.parse(text), sha256: sha256(text), path: path.relative(root, file).split(path.sep).join("/") };
}

export function buildFingerprint({ snapshot, live }) {
  const liveTables = live?.json.tables ?? {};
  const liveViews = live?.json.views ?? {};
  const liveFunctions = live?.json.functions ?? {};

  const objects = [];
  const push = (type, name, snapshotFacts, liveHash, extra = {}) => {
    objects.push({
      type,
      schema: SCHEMA,
      name,
      definitionHash: liveHash ? `md5:${liveHash}` : `sha256:${sha256(canonical(snapshotFacts))}`,
      hashBasis: liveHash ? "live-definition" : "snapshot-facts",
      ...extra,
    });
  };

  for (const t of snapshot.tables ?? []) {
    push("table", t.name, { name: t.name, rls: t.rls, policies: t.policies }, liveTables[t.name]);
  }
  for (const v of snapshot.views ?? []) {
    push("view", v.name, v, liveViews[v.name]);
  }
  for (const f of snapshot.functions ?? []) {
    const liveFn = liveFunctions[f.name];
    push("function", f.name, f, liveFn?.md5, liveFn ? { overloads: liveFn.overloads } : {});
  }

  objects.sort((a, b) => `${a.type}:${a.schema}.${a.name}`.localeCompare(`${b.type}:${b.schema}.${b.name}`));

  const snapshotKeys = new Set(objects.map((o) => `${o.type}:${o.name}`));
  const liveKeys = [
    ...Object.keys(liveTables).map((n) => `table:${n}`),
    ...Object.keys(liveViews).map((n) => `view:${n}`),
    ...Object.keys(liveFunctions).map((n) => `function:${n}`),
  ];
  const liveOnly = liveKeys.filter((k) => !snapshotKeys.has(k)).sort();
  const snapshotOnly = live
    ? objects.filter((o) => o.hashBasis === "snapshot-facts").map((o) => `${o.type}:${o.name}`).sort()
    : [];

  const counts = {
    objects: objects.length,
    byType: Object.fromEntries(
      ["table", "view", "function"].map((type) => [type, objects.filter((o) => o.type === type).length]),
    ),
    byHashBasis: {
      "live-definition": objects.filter((o) => o.hashBasis === "live-definition").length,
      "snapshot-facts": objects.filter((o) => o.hashBasis === "snapshot-facts").length,
    },
  };

  const fingerprint = sha256(objects.map((o) => `${o.type}\t${o.schema}.${o.name}\t${o.definitionHash}`).join("\n"));

  return {
    schema: "longyu-production-schema-fingerprint/1",
    project: snapshot.project?.ref ?? null,
    snapshot: { path: DEFAULT_SNAPSHOT, readAt: snapshot.readAt ?? null },
    liveFacts: live ? { path: live.path, sha256: live.sha256, readAt: live.json.readAt ?? null } : null,
    privacy: "Hashes and object names only. No definitions, row content, emails or secret values.",
    note: "definitionHash with hashBasis live-definition is only comparable to another live-definition hash. Mixed fingerprints are valid for drift detection of the same objects, not for cross-basis comparison.",
    counts,
    consistency: {
      liveFactsOnlyObjects: liveOnly,
      objectsWithoutLiveDefinition: snapshotOnly,
    },
    fingerprint: `sha256:${fingerprint}`,
    objects,
  };
}

function main() {
  const snapshotPath = option("--snapshot", DEFAULT_SNAPSHOT);
  const outPath = option("--out", DEFAULT_OUT);
  const livePath = option("--live-facts", DEFAULT_LIVE);
  const snapshot = readJsonFile(snapshotPath, "snapshot");
  const live = flag("--no-live") || !fs.existsSync(abs(livePath)) ? null : readJsonFile(livePath, "live facts");

  const result = buildFingerprint({ snapshot: snapshot.json, live });
  result.snapshot.path = snapshot.path;
  const text = `${JSON.stringify(result, null, 2)}\n`;

  if (flag("--check")) {
    const existing = fs.existsSync(abs(outPath)) ? fs.readFileSync(abs(outPath), "utf8") : null;
    if (existing !== text) {
      console.error(`Schema fingerprint is stale or missing: ${outPath}. Run npm run fingerprint:production-schema.`);
      process.exit(1);
    }
    console.log(`Schema fingerprint up to date (${result.counts.objects} objects, ${result.fingerprint.slice(0, 19)}...).`);
    return;
  }

  fs.mkdirSync(path.dirname(abs(outPath)), { recursive: true });
  fs.writeFileSync(abs(outPath), text);
  console.log(`Wrote ${outPath}`);
  console.log(`  objects: ${result.counts.objects} (tables ${result.counts.byType.table}, views ${result.counts.byType.view}, functions ${result.counts.byType.function})`);
  console.log(`  live-definition hashes: ${result.counts.byHashBasis["live-definition"]}, snapshot-facts hashes: ${result.counts.byHashBasis["snapshot-facts"]}`);
  console.log(`  fingerprint: ${result.fingerprint}`);
  if (result.consistency.liveFactsOnlyObjects.length > 0) {
    console.warn(`  WARNING live facts list objects absent from the snapshot: ${result.consistency.liveFactsOnlyObjects.join(", ")}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
