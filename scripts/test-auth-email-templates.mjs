#!/usr/bin/env node
/**
 * LGY-013 — templates de Auth em pt-BR, recovery só com código, config local.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";

const root = process.cwd();
const read = (rel) => readFile(path.join(root, rel), "utf8");

const templates = {
  confirmation: { must: ["{{ .ConfirmationURL }}"], mustNot: [] },
  recovery: { must: ["{{ .Token }}"], mustNot: ["{{ .ConfirmationURL }}"] },
  email_change: { must: ["{{ .ConfirmationURL }}", "{{ .NewEmail }}"], mustNot: [] },
  magic_link: { must: ["{{ .ConfirmationURL }}"], mustNot: [] },
  invite: { must: ["{{ .ConfirmationURL }}"], mustNot: [] },
  reauthentication: { must: ["{{ .Token }}"], mustNot: ["{{ .ConfirmationURL }}"] },
};

const config = await read("supabase/config.toml");
const configure = await read("scripts/configure-supabase-auth.mjs");
assert.doesNotMatch(configure, /mailer_templates|content_path|templates\/recovery/);

for (const [type, rule] of Object.entries(templates)) {
  const file = `supabase/templates/${type}.html`;
  const html = await read(file);
  assert.match(html, /lang="pt-BR"/, file);
  assert.match(html, /Longyu/, file);
  assert.doesNotMatch(html, /<img|https?:\/\//i, file);
  for (const needle of rule.must) assert.ok(html.includes(needle), `${file} sem ${needle}`);
  for (const needle of rule.mustNot) assert.ok(!html.includes(needle), `${file} não pode ter ${needle}`);
  assert.match(config, new RegExp(`\\[auth\\.email\\.template\\.${type}\\]`), type);
  assert.match(
    config,
    new RegExp(`\\[auth\\.email\\.template\\.${type}\\][\\s\\S]*?content_path = "\\./supabase/templates/${type}\\.html"`),
    `${type} content_path`
  );
}

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-auth-link-"));
try {
  const program = ts.createProgram(["src/lib/auth/authLinkError.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) process.exit(1);
  const link = createRequire(import.meta.url)(path.join(outDir, "src/lib/auth/authLinkError.js"));
  assert.deepEqual(
    link.readAuthLinkError("", "#error=access_denied&error_code=otp_expired&error_description=used"),
    { code: "otp_expired" }
  );
  assert.equal(link.readAuthLinkError("?error_code=access_denied", "").code, "access_denied");
  assert.equal(link.readAuthLinkError("", ""), null);
  assert.equal(link.readAuthLinkEmail("?email=qa.free@longyu.app"), "qa.free@longyu.app");
  assert.equal(link.readAuthLinkEmail("?email=nao-e-email"), "");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

console.log("test:auth-email-templates PASS");
