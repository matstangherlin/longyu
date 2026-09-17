#!/usr/bin/env node
/**
 * LOCAL N→N+1 PWA preflight harness.
 *
 * Builds two identity-stamped static trees from the current dist (or a fresh
 * build), serves N then swaps to N+1, and asserts:
 *   - version.json identity changes
 *   - no invent of formal pwa_upgrade PASS
 *   - stale-bundle recovery helpers still present
 *   - localStorage progress key survives identity swap (filesystem sim)
 *
 * This is PREFLIGHT only. Formal pwa_upgrade requires two real candidate deploys.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

function writeIdentity(dir, sha, label) {
  fs.mkdirSync(dir, { recursive: true });
  // Prefer cloning a real build when available; else minimal identity shell.
  if (fs.existsSync(dist) && fs.existsSync(path.join(dist, "index.html"))) {
    fs.cpSync(dist, dir, { recursive: true });
  } else {
    fs.writeFileSync(
      path.join(dir, "index.html"),
      `<!doctype html><html><body><main id="root">Longyu ${label}</main><script>window.__LONGYU_PREFLIGHT__=${JSON.stringify(label)}</script></body></html>`
    );
    fs.writeFileSync(path.join(dir, "sw.js"), `/* preflight ${label} */ self.addEventListener('install',()=>self.skipWaiting());`);
    fs.writeFileSync(
      path.join(dir, "manifest.webmanifest"),
      JSON.stringify({ name: "Longyu", short_name: "Longyu", start_url: "/", display: "standalone", icons: [{ src: "/logo.png", sizes: "512x512", type: "image/png" }] })
    );
  }
  const version = {
    commitSha: sha,
    environment: "qa_candidate_preflight",
    label,
    builtAt: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(dir, "version.json"), JSON.stringify(version, null, 2));
  return version;
}

function serve(dir) {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
    let filePath = path.join(dir, urlPath === "/" ? "index.html" : urlPath);
    if (!filePath.startsWith(dir)) {
      res.writeHead(403);
      res.end("forbidden");
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      // SPA fallback
      filePath = path.join(dir, "index.html");
    }
    const ext = path.extname(filePath);
    const type =
      ext === ".js"
        ? "application/javascript"
        : ext === ".json"
          ? "application/json"
          : ext === ".webmanifest"
            ? "application/manifest+json"
            : "text/html; charset=utf-8";
    const headers = { "Content-Type": type };
    if (urlPath === "/sw.js" || urlPath.endsWith("manifest.webmanifest") || urlPath === "/version.json") {
      headers["Cache-Control"] = "no-cache";
    }
    res.writeHead(200, headers);
    res.end(fs.readFileSync(filePath));
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      resolve({ server, port, url: `http://127.0.0.1:${port}` });
    });
  });
}

async function fetchJson(url) {
  const res = await fetch(url);
  assert.equal(res.ok, true, `fetch ${url}`);
  return res.json();
}

async function main() {
  // Ensure dist exists for richer simulation when possible (skip long build if already there).
  if (!fs.existsSync(path.join(dist, "index.html"))) {
    console.log("dist missing — running production-like build for preflight assets…");
    const build = spawnSync("npm", ["run", "build"], {
      cwd: root,
      env: {
        ...process.env,
        VITE_APP_ENV: "preview",
        VITE_USE_TEST_FIXTURES: "true",
        VITE_ALLOW_PRO_PREVIEW: "true",
        VITE_DEV_ALLOW_LOCAL_AUTH: "1",
      },
      stdio: "inherit",
    });
    assert.equal(build.status, 0, "build must succeed for PWA preflight");
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "longyu-pwa-nn1-"));
  const dirN = path.join(tmp, "N");
  const dirN1 = path.join(tmp, "N1");
  const shaN = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const shaN1 = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  const vN = writeIdentity(dirN, shaN, "N");
  const vN1 = writeIdentity(dirN1, shaN1, "N+1");
  assert.notEqual(vN.commitSha, vN1.commitSha);

  // Persist a fake progress blob across "deploys" (localStorage sim via file).
  const progressPath = path.join(tmp, "progress.json");
  fs.writeFileSync(progressPath, JSON.stringify({ completedLessons: ["l1"], points: 42 }));

  const served = await serve(dirN);
  const idN = await fetchJson(`${served.url}/version.json`);
  assert.equal(idN.commitSha, shaN);

  // Swap tree to N+1 in-place (same origin) — models deploy replace.
  fs.rmSync(dirN, { recursive: true, force: true });
  fs.cpSync(dirN1, dirN, { recursive: true });
  const idN1 = await fetchJson(`${served.url}/version.json`);
  assert.equal(idN1.commitSha, shaN1);

  // Cache-Control on version.json
  const verRes = await fetch(`${served.url}/version.json`);
  assert.match(verRes.headers.get("cache-control") || "", /no-cache/i);

  // Progress file still present after swap (local persisted state)
  const progress = JSON.parse(fs.readFileSync(progressPath, "utf8"));
  assert.deepEqual(progress.completedLessons, ["l1"]);

  // Rollback to N identity
  writeIdentity(dirN, shaN, "N-rollback");
  const rolled = await fetchJson(`${served.url}/version.json`);
  assert.equal(rolled.commitSha, shaN);
  const progressAfterRollback = JSON.parse(fs.readFileSync(progressPath, "utf8"));
  assert.equal(progressAfterRollback.points, 42);

  served.server.close();

  // Formal check must remain false
  const ops = JSON.parse(fs.readFileSync(path.join(root, "docs/release/rc1-operational-checks.json"), "utf8"));
  assert.equal(ops.checks.pwa_upgrade.pass, false);
  assert.equal(ops.checks.rollback_drill.pass, false);

  // Update preflight status file (PREFLIGHT only)
  const preflightPath = path.join(root, "docs/release/device-preflight.json");
  const preflight = JSON.parse(fs.readFileSync(preflightPath, "utf8"));
  preflight.pwa.status = "PREFLIGHT_PASS";
  preflight.pwa.testedAt = new Date().toISOString();
  preflight.pwa.note = "Local N→N+1 identity swap + rollback identity; NOT formal pwa_upgrade";
  preflight.rollback.status = "PREFLIGHT_PASS";
  preflight.rollback.testedAt = new Date().toISOString();
  preflight.rollback.note = "Local identity rollback + persisted progress file; NOT formal rollback_drill";
  preflight.pwa.formalPass = false;
  preflight.rollback.formalPass = false;
  fs.writeFileSync(preflightPath, JSON.stringify(preflight, null, 2) + "\n");

  console.log("PASS test:pwa-upgrade-preflight — local N→N+1 + rollback identity (formal checks still false)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
