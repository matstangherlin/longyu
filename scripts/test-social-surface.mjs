#!/usr/bin/env node
/**
 * LGY-032 / LGY-046 — superfície social e Business.
 * production_beta fica desligada mesmo se o backend for ligado.
 * O localStorage de e2e não liga nada em produção.
 */
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const out = await mkdtemp(path.join(os.tmpdir(), "longyu-social-"));
const files = [
  "src/lib/appEnvironment.ts",
  "src/lib/featureFlags.ts",
  "src/lib/cloud/backendCapability.ts",
];
try {
  const program = ts.createProgram(files, {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    resolveJsonModule: true,
    rootDir: root,
    outDir: out,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) process.exit(1);
  await writeFile(path.join(out, "package.json"), "{\"type\":\"commonjs\"}\n");
  const jsonSrc = path.join(root, "src/lib/cloud/knownMissingBackend.json");
  const jsonDest = path.join(out, "src/lib/cloud/knownMissingBackend.json");
  await mkdir(path.dirname(jsonDest), { recursive: true });
  await writeFile(jsonDest, await readFile(jsonSrc, "utf8"));
  for (const rel of files) {
    const file = path.join(out, rel.replace(/\.ts$/, ".js"));
    const js = (await readFile(file, "utf8")).replaceAll("import.meta.env", "({})");
    await writeFile(file, js);
  }
  const api = createRequire(import.meta.url)(path.join(out, "src/lib/cloud/backendCapability.js"));
  const prod = { VITE_APP_ENV: "production_beta", MODE: "production" };
  const preview = { VITE_APP_ENV: "preview", VITE_USE_TEST_FIXTURES: "true" };
  assert.equal(api.isSocialSurfaceEnabled(prod), false);
  assert.equal(api.isBusinessSurfaceEnabled(prod), false);
  assert.equal(api.isSocialSurfaceEnabled({ ...prod, VITE_BACKEND_SOCIAL_ENABLED: "true" }), false);
  assert.equal(
    api.isSocialSurfaceEnabled({ ...prod, VITE_ENABLE_SOCIAL: "true", VITE_BACKEND_SOCIAL_ENABLED: "true" }),
    true
  );
  assert.equal(api.isBusinessSurfaceEnabled({ ...prod, VITE_ENABLE_BUSINESS: "true", VITE_BACKEND_BUSINESS_ENABLED: "true" }), true);
  assert.equal(api.isSocialSurfaceEnabled(preview), true);
  assert.equal(api.isSocialSurfaceEnabled(preview, { getItem: () => "0" }), false);
  assert.equal(api.isSocialSurfaceEnabled(prod, { getItem: () => "1" }), false);
  assert.equal(api.isBusinessSurfaceEnabled(prod, { getItem: () => "1" }), false);
} finally {
  await rm(out, { recursive: true, force: true });
}

console.log("test:social-surface PASS");
