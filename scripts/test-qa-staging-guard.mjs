#!/usr/bin/env node
/**
 * LGY-039 — qa:staging recusa o projeto e o site de produção antes de qualquer passo.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LONGYU_PRODUCTION_PROJECT_ID, REFUSING_TO_USE_PRODUCTION_AS_STAGING } from "./lib/staging-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = path.join(root, "scripts", "qa-staging.mjs");

function run(env) {
  return spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: "utf8",
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME ?? "",
      LANG: process.env.LANG ?? "C.UTF-8",
      ...env,
    },
  });
}

function refused(result, label) {
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  assert.notEqual(result.status, 0, `${label} deveria falhar`);
  assert.match(output, new RegExp(REFUSING_TO_USE_PRODUCTION_AS_STAGING), label);
  assert.doesNotMatch(output, /qa:staging step=/, `${label} não pode chegar a um passo`);
}

const productionId = run({
  LONGYU_STAGING_PROJECT_ID: LONGYU_PRODUCTION_PROJECT_ID,
  SUPABASE_ACCESS_TOKEN: "",
  PLAYWRIGHT_BASE_URL: "https://staging.example.test",
});
refused(productionId, "ref de produção");

const productionUrl = run({
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
  STAGING_SUPABASE_URL: `https://${LONGYU_PRODUCTION_PROJECT_ID}.supabase.co`,
  SUPABASE_ACCESS_TOKEN: "",
  PLAYWRIGHT_BASE_URL: "https://staging.example.test",
});
refused(productionUrl, "URL Supabase de produção");

const productionWeb = run({
  LONGYU_STAGING_PROJECT_ID: "abcdefghijabcdefghij",
  STAGING_SUPABASE_URL: "https://abcdefghijabcdefghij.supabase.co",
  SUPABASE_ACCESS_TOKEN: "",
  PLAYWRIGHT_BASE_URL: "https://singular-meringue-7838cd.netlify.app",
});
refused(productionWeb, "site de produção");

const config = await import("node:fs").then((fs) =>
  fs.readFileSync(path.join(root, "playwright.config.ts"), "utf8")
);
assert.match(config, /webServer:\s*remoteBaseUrl\s*\?\s*undefined\s*:/);
assert.match(config, /VITE_USE_TEST_FIXTURES:\s*"true"/);

console.log("test:qa-staging-guard PASS");
