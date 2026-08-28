/**
 * LON-023 — correlation ID RNG contract.
 * randomUUID present, getRandomValues fallback, Web Crypto absent → throw before invoke.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import ts from "typescript";

const root = path.resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const source = fs.readFileSync(path.join(root, "src/lib/opsCorrelation.ts"), "utf8");

assert.match(source, /randomUUID/, "randomUUID first");
assert.match(source, /getRandomValues/, "getRandomValues fallback");
assert.match(source, /Web Crypto RNG unavailable for ops correlation/, "throws if RNG absent");
assert.doesNotMatch(source, /Math\.random/, "no Math.random");

const compilerOptions = {
  target: ts.ScriptTarget.ES2020,
  module: ts.ModuleKind.CommonJS,
  esModuleInterop: true,
  skipLibCheck: true,
  strict: false,
};
const js = ts.transpileModule(source, { compilerOptions, fileName: "opsCorrelation.ts" }).outputText;
const outDir = await mkdtemp(path.join(os.tmpdir(), "longyu-ops-crypto-"));
const modulePath = path.join(outDir, "ops.cjs");

function withCrypto(cryptoValue, fn) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    writable: true,
    value: cryptoValue,
  });
  try {
    delete require.cache[modulePath];
    const mod = require(modulePath);
    return fn(mod);
  } finally {
    if (previous) Object.defineProperty(globalThis, "crypto", previous);
    else delete globalThis.crypto;
  }
}

try {
  await mkdir(outDir, { recursive: true });
  await writeFile(modulePath, js);

  withCrypto(
    {
      randomUUID() {
        return "11111111-2222-4333-8444-555555555555";
      },
    },
    (mod) => {
      const fromUuid = mod.newOpsCorrelationId();
      assert.equal(fromUuid, "11111111-2222-4333-8444-555555555555", "usa randomUUID quando presente");
      const init = mod.edgeOpsInit("signup");
      assert.equal(init.headers["x-longyu-correlation-id"], fromUuid);
      assert.ok(init.headers["x-longyu-session-id"]);
      assert.equal(init.headers["x-longyu-op"], "signup");
    }
  );

  const fill = randomBytes(16);
  withCrypto(
    {
      getRandomValues(target) {
        target.set(fill.subarray(0, target.length));
        return target;
      },
    },
    (mod) => {
      const fallbackId = mod.newOpsCorrelationId();
      assert.match(
        fallbackId,
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
        "UUID v4 via getRandomValues"
      );
    }
  );

  withCrypto(undefined, (mod) => {
    let invokeCalled = false;
    let threw = false;
    try {
      const ops = mod.edgeOpsInit("placement");
      invokeCalled = true;
      void ops;
    } catch (error) {
      threw = true;
      assert.match(String(error.message), /Web Crypto RNG unavailable for ops correlation/);
    }
    assert.equal(threw, true, "sem Web Crypto lança");
    assert.equal(invokeCalled, false, "request não é enviado parcialmente");
  });

  console.log("OK: test:ops-correlation-crypto");
} finally {
  await rm(outDir, { recursive: true, force: true });
}
