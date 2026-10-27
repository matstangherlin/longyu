#!/usr/bin/env node
/**
 * LGY-030 — o orçamento falha quando o entry passa do teto
 * e quando a meta de 300 KB está ligada e estoura.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const toml = readFileSync(path.join(root, "netlify.toml"), "utf8");
assert.match(toml, /for = "\/assets\/\*"/);
assert.match(toml, /Cache-Control = "public, max-age=31536000, immutable"/);
assert.match(toml, /for = "\/index.html"/);
assert.match(toml, /frame-ancestors 'none'/);
assert.match(toml, /script-src 'self'/);
const csp = toml.match(/Content-Security-Policy = "([^"]+)"/)?.[1] ?? "";
assert.ok(csp.includes("https://*.supabase.co"), "CSP de connect-src");
assert.equal(toml.split('Content-Security-Policy = "').length, 2);

function run(dist, budget) {
  return spawnSync(process.execPath, ["scripts/check-bundle-budget.mjs", `--dist=${dist}`, `--budget=${budget}`], {
    cwd: root,
    encoding: "utf8",
  });
}

const dir = mkdtempSync(path.join(os.tmpdir(), "longyu-budget-"));
try {
  const assets = path.join(dir, "assets");
  mkdirSync(assets);
  writeFileSync(path.join(assets, "vendor.js"), "export const vendor = 1;\n");
  writeFileSync(path.join(assets, "entry.js"), 'import "./vendor.js";\nexport const app = 1;\n');
  writeFileSync(path.join(dir, "index.html"), '<script type="module" crossorigin src="/assets/entry.js"></script>');

  const loose = path.join(dir, "loose.json");
  writeFileSync(loose, JSON.stringify({ goalGzipBytes: 307200, enforceGoal: false, entryRawCeilingBytes: 100000 }));
  const ok = run(dir, loose);
  assert.equal(ok.status, 0, ok.stderr || ok.stdout);

  const tight = path.join(dir, "tight.json");
  writeFileSync(tight, JSON.stringify({ goalGzipBytes: 307200, enforceGoal: false, entryRawCeilingBytes: 1 }));
  const over = run(dir, tight);
  assert.equal(over.status, 1, over.stdout);
  assert.match(over.stderr, /FAIL entry/);

  const goal = path.join(dir, "goal.json");
  writeFileSync(goal, JSON.stringify({ goalGzipBytes: 1, enforceGoal: true, entryRawCeilingBytes: 100000 }));
  const goalFail = run(dir, goal);
  assert.equal(goalFail.status, 1, goalFail.stdout);
  assert.match(goalFail.stderr, /FAIL gzip/);
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log("test:bundle-budget PASS");
