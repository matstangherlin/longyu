#!/usr/bin/env node
/**
 * LGY-042 — o contexto do relato leva versão, SHA, rota e plataforma,
 * e não leva e-mail, nome, token nem query.
 */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const root = process.cwd();
const source = await readFile(path.join(root, "src/lib/feedback.ts"), "utf8");
assert.match(source, /VITE_APP_VERSION \?\? "unknown"/);
assert.doesNotMatch(source, /0\.2\.0-rc\.5/);

const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-feedback-"));
try {
  const program = ts.createProgram(["src/lib/feedback.ts"], {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir: root,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: false,
  });
  if (program.emit().emitSkipped) process.exit(1);
  await writeFile(path.join(outDir, "package.json"), "{\"type\":\"commonjs\"}\n");
  const feedbackPath = path.join(outDir, "src/lib/feedback.js");
  const emitted = (await readFile(feedbackPath, "utf8")).replaceAll(
    "import.meta.env",
    "({ VITE_APP_VERSION: \"0.3.0-beta.1\", VITE_COMMIT_SHA: \"abcdef1234567890\", VITE_APP_ENV: \"preview\", DEV: false, VITE_ADMIN_EMAILS: \"\" })"
  );
  await writeFile(feedbackPath, emitted);
  const feedback = createRequire(import.meta.url)(feedbackPath);
  assert.equal(feedback.safeFeedbackRoute("/conta?email=qa.free@longyu.app&token=abc"), "/conta");
  assert.equal(feedback.safeFeedbackRoute("/licao/l1#segredo"), "/licao/l1");
  const tech = feedback.buildTechnicalContext({ route: "/revisao?token=segredo&email=qa.free@longyu.app" });
  assert.equal(tech.route, "/revisao");
  assert.ok(tech.appVersion);
  assert.equal(typeof tech.commitSha, "string");
  assert.ok(tech.platform);
  const blob = JSON.stringify(tech);
  assert.doesNotMatch(blob, /qa\.free@longyu\.app|token=segredo|senha/i);
  const mailto = feedback.buildFeedbackMailto({ route: "/jornada?access_token=abc" });
  assert.match(mailto, /^mailto:beta@longyu\.app\?/);
  assert.doesNotMatch(decodeURIComponent(mailto), /access_token|qa\.free@/);
  const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  assert.equal(pkg.version, "0.3.0-beta.1");
} finally {
  await rm(outDir, { recursive: true, force: true });
}

console.log("test:feedback-context PASS");
