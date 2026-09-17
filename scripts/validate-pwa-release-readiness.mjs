#!/usr/bin/env node
/**
 * PWA release readiness — manifest / SW / version identity / honest offline claims.
 * Does NOT mark pwa_upgrade.pass — that requires two real candidate deploys.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const vite = fs.readFileSync(path.join(root, "vite.config.ts"), "utf8");
const netlify = fs.readFileSync(path.join(root, "netlify.toml"), "utf8");
const build = fs.readFileSync(path.join(root, "scripts/vite-build.mjs"), "utf8");
const locales = fs.readFileSync(path.join(root, "src/locales/pt-BR.ts"), "utf8");

assert.match(vite, /VitePWA/, "vite-plugin-pwa required");
assert.match(vite, /manifest:\s*\{/, "manifest config required");
assert.match(vite, /name:\s*[\"']Longyu[\"']/, "manifest name");
assert.match(vite, /short_name:\s*[\"']Longyu[\"']/, "manifest short_name");
assert.match(vite, /start_url:\s*[\"']\/[\"']/, "manifest start_url");
assert.match(vite, /display:\s*[\"']standalone[\"']/, "manifest display standalone");
assert.match(vite, /theme_color:/, "manifest theme_color");
assert.match(vite, /icons:\s*\[/, "manifest icons");
assert.match(vite, /registerType:\s*[\"']autoUpdate[\"']/, "autoUpdate");
assert.match(vite, /skipWaiting:\s*true/, "skipWaiting");
assert.match(vite, /clientsClaim:\s*true/, "clientsClaim");
assert.match(vite, /cleanupOutdatedCaches:\s*true/, "cleanupOutdatedCaches");

assert.match(build, /version\.json/, "build must emit version.json");
assert.match(netlify, /sw\.js/, "netlify must mention sw.js");
assert.match(netlify, /manifest\.webmanifest/, "netlify must mention manifest");
assert.match(netlify, /no-cache/, "SW/manifest Cache-Control no-cache contract");

// Honest offline: shell may continue locally; must not claim full offline product.
assert.match(locales, /offlineCloud|offlineLocal|Sem conexão|offline/, "offline UX strings exist");
assert.doesNotMatch(
  locales,
  /funciona 100% offline|download all lessons|baixe todas as lições|works fully offline/i,
  "must not claim full offline curriculum"
);

const ops = JSON.parse(fs.readFileSync(path.join(root, "docs/release/rc1-operational-checks.json"), "utf8"));
assert.equal(ops.checks.pwa_upgrade.pass, false, "pwa_upgrade formal PASS forbidden from readiness gate alone");

console.log("PASS validate:pwa-release-readiness — structural only (not formal pwa_upgrade)");
