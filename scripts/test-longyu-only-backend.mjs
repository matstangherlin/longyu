/**
 * LON-001 — this repository is Longyu. It must not name, id, or guard other products.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = path.resolve(import.meta.dirname, "..");
const forbidden = [
  ["LONGYU_", "FOREIGN_PROJECTS"].join(""),
  ["foreign", "ProductName"].join(""),
  ["isForeign", "ProductProjectId"].join(""),
  ["REFUSING_FOREIGN_", "PRODUCT_AS_STAGING"].join(""),
  ["LONGYU_INTENDED_", "STAGING_PROJECT_ID"].join(""),
  ["LONGYU_INTENDED_", "STAGING_PROJECT_NAME"].join(""),
  ["LONGYU_STAGING_", "ALLOWED_PROJECT_IDS"].join(""),
];
const forbiddenIds = [
  ["ylof", "dottauzcqcifnnpm"].join(""),
  ["wpnmy", "gzxqvmpdlcuwrjp"].join(""),
];
const forbiddenNames = [new RegExp("\\bat" + "omurus\\b", "i"), new RegExp("\\blongyu" + "-preview\\b", "i")];

const errors = [];
function fail(message) {
  errors.push(message);
}

const listed = spawnSync(
  "git",
  ["ls-files", "*.mjs", "*.js", "*.ts", "*.tsx", "*.md", "*.yml", "*.yaml", "*.example", "*.toml", "*.json"],
  { cwd: root, encoding: "utf8" }
);
const files = listed.stdout
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => !file.startsWith("reports/"));

for (const file of files) {
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const token of forbidden) {
    if (text.includes(token)) fail(`${file} contém ${token}`);
  }
  for (const id of forbiddenIds) {
    if (text.includes(id)) fail(`${file} contém project_id externo ${id}`);
  }
  for (const pattern of forbiddenNames) {
    if (pattern.test(text)) fail(`${file} contém nome de produto externo (${pattern})`);
  }
}

const guard = fs.readFileSync(path.join(root, "scripts/lib/staging-guard.mjs"), "utf8");
if (!guard.includes("LONGYU_PRODUCTION_PROJECT_ID = \"drjcfalvlbbeblmmyhwj\"")) {
  fail("staging-guard deve fixar MandarimProject");
}
if (!guard.includes("LONGYU_PRODUCTION_PROJECT_NAME = \"MandarimProject\"")) {
  fail("staging-guard deve nomear MandarimProject");
}
if (!guard.includes("BLOCKED_REMOTE_STAGING")) {
  fail("staging-guard deve expor BLOCKED_REMOTE_STAGING");
}

if (errors.length) {
  console.error("FAIL test:longyu-only-backend:");
  for (const item of errors) console.error(`  - ${item}`);
  process.exit(1);
}
console.log("OK: test:longyu-only-backend");
