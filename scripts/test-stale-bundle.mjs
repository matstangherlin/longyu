import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-stale-bundle-"));

try {
  const program = ts.createProgram(["src/lib/staleBundle.ts", "src/lib/srs.ts"], {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.CommonJS,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    rootDir,
    outDir,
    esModuleInterop: true,
    skipLibCheck: true,
    strict: true,
  });
  const emit = program.emit();
  assert.equal(emit.emitSkipped, false, "compile staleBundle + srs");

  const {
    isStaleBundleError,
    reloadOnceForStaleBundle,
    importWithStaleBundleRetry,
    STALE_BUNDLE_RELOAD_KEY,
  } = require(path.join(outDir, "src/lib/staleBundle.js"));
  const { dueItems } = require(path.join(outDir, "src/lib/srs.js"));

  assert.equal(isStaleBundleError(new Error("Failed to fetch dynamically imported module: /assets/JourneyPage.js")), true);
  assert.equal(isStaleBundleError({ name: "ChunkLoadError", message: "Loading chunk 7 failed" }), true);
  assert.equal(isStaleBundleError(new Error("Unable to preload CSS for /assets/JourneyPage.css")), true);
  assert.equal(isStaleBundleError(new Error("Cannot read properties of undefined (reading 'claimed')")), false);

  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
  };
  let reloads = 0;
  globalThis.window = { location: { reload: () => { reloads += 1; } } };

  assert.equal(reloadOnceForStaleBundle(), true);
  assert.equal(reloads, 1);
  assert.equal(store.get(STALE_BUNDLE_RELOAD_KEY), "1");
  assert.equal(reloadOnceForStaleBundle(), false);
  assert.equal(reloads, 1);

  globalThis.window = { location: { reload: () => { reloads += 1; } }, navigator: { webdriver: true } };
  store.delete(STALE_BUNDLE_RELOAD_KEY);
  assert.equal(reloadOnceForStaleBundle(), false, "Playwright/webdriver não auto-reload");
  assert.equal(reloads, 1);
  globalThis.window = { location: { reload: () => { reloads += 1; } } };

  store.clear();
  reloads = 0;
  let settled = false;
  const pending = importWithStaleBundleRetry(() =>
    Promise.reject(new Error("Failed to fetch dynamically imported module: /assets/x.js"))
  );
  void pending.then(() => {
    settled = true;
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(reloads, 1, "primeiro import stale recarrega");
  assert.equal(settled, false, "promise fica pendente durante o reload");

  await assert.rejects(
    () => importWithStaleBundleRetry(() => Promise.reject(new Error("Failed to fetch dynamically imported module: /assets/x.js"))),
    /Failed to fetch dynamically imported module/,
    "segundo import stale não recarrega de novo"
  );
  assert.equal(reloads, 1);

  const loaded = await importWithStaleBundleRetry(() => Promise.resolve({ JourneyPage: true }));
  assert.equal(loaded.JourneyPage, true);
  assert.equal(store.has(STALE_BUNDLE_RELOAD_KEY), false, "sucesso limpa a flag");

  store.clear();
  reloads = 0;
  await assert.rejects(
    () => importWithStaleBundleRetry(() => Promise.reject(Object.assign(new Error("NS_BINDING_ABORTED"), { name: "AbortError" }))),
    /NS_BINDING_ABORTED/,
    "aborto de navegação não dispara reload"
  );
  assert.equal(reloads, 0);

  const now = Date.now();
  assert.deepEqual(dueItems(null, now), []);
  assert.deepEqual(dueItems({ bad: null, empty: {}, ok: { due: now - 1, type: "chunk", itemId: "nihao", reps: 1, lapses: 0, ease: 2.5, intervalDays: 1, id: "chunk:nihao" } }, now).map((item) => item.id), ["chunk:nihao"]);

  console.log("OK: test:stale-bundle");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
