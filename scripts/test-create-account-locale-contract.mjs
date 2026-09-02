#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import ts from "typescript";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "supabase/functions/create-account/index.ts"), "utf8");
const localeSource = fs.readFileSync(path.join(root, "supabase/functions/create-account/locales.ts"), "utf8");
const authSource = fs.readFileSync(path.join(root, "src/services/authService.ts"), "utf8");

for (const clientField of ["interfaceLocale", "instructionLocale", "nativeLanguage", "targetLanguage"]) {
  assert.match(authSource, new RegExp(`${clientField}:`), `frontend sends ${clientField}`);
  assert.match(source, new RegExp(`${clientField}\\?: unknown`), `Edge accepts ${clientField}`);
}
for (const dbField of ["interface_locale", "instruction_locale", "native_language", "target_language"]) {
  assert.match(source, new RegExp(`${dbField}: locales\\.value\\.${dbField}`), `Edge persists ${dbField}`);
}
assert.match(source, /code: "profile_persist_failed"/, "profile failure is not reported as signup success");
assert.match(source, /code: "placement_draft_failed"/, "placement draft failure is not reported as signup success");
assert.match(source, /admin\.auth\.admin\.deleteUser\(userId\)/, "partial Auth account is cleaned up");
assert.doesNotMatch(source, /interface_locale:\s*"pt-BR"/, "Edge no longer hardcodes interface locale");
assert.doesNotMatch(source, /instruction_locale:\s*"pt-BR"/, "Edge no longer hardcodes instruction locale");

const out = await mkdtemp(path.join(os.tmpdir(), "longyu-create-account-locales-"));
try {
  const compiled = ts.transpileModule(localeSource, {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, strict: true },
    fileName: "locales.ts",
  }).outputText;
  const target = path.join(out, "locales.js");
  await writeFile(target, compiled);
  const require = createRequire(import.meta.url);
  const { resolveSignupLocales } = require(target);

  assert.deepEqual(resolveSignupLocales({
    interfaceLocale: "pt-BR",
    instructionLocale: "pt-BR",
    nativeLanguage: "pt-BR",
    targetLanguage: "zh-CN",
  }), {
    ok: true,
    value: {
      interface_locale: "pt-BR",
      instruction_locale: "pt-BR",
      native_language: "pt-BR",
      target_language: "zh-CN",
    },
  });

  assert.deepEqual(resolveSignupLocales({
    interfaceLocale: "en",
    instructionLocale: "en",
    nativeLanguage: "en",
    targetLanguage: "zh-CN",
  }), {
    ok: true,
    value: {
      interface_locale: "en",
      instruction_locale: "en",
      native_language: "en",
      target_language: "zh-CN",
    },
  });

  assert.equal(resolveSignupLocales({ interfaceLocale: "en-US" }).ok, false, "unknown UI locale rejected");
  assert.equal(resolveSignupLocales({ targetLanguage: "en" }).ok, false, "unknown target rejected");
  assert.equal(resolveSignupLocales({ instructionLocale: 7 }).ok, false, "wrong type rejected");
  assert.deepEqual(resolveSignupLocales({}).value, {
    interface_locale: "pt-BR",
    instruction_locale: "pt-BR",
    native_language: "pt-BR",
    target_language: "zh-CN",
  }, "legacy omitted fields keep the explicit launch default");
} finally {
  await rm(out, { recursive: true, force: true });
}

console.log("OK: test:create-account-locale-contract (PT/EN persisted; invalid values fail closed)");
