#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  assertReadOnlyMethod,
  classifyEdge,
  classifyRest,
  createGuardedFetch,
  runSchemaHealth,
} from "./lib/schema-health.mjs";

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`ok: ${name}`);
  } catch (error) {
    failures += 1;
    console.error(`FALHOU: ${name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

check("coluna 200 é ok", () => {
  assert.equal(classifyRest(200, []), "ok");
});

check("42703 é coluna ausente", () => {
  assert.equal(classifyRest(400, { code: "42703" }), "missing_column");
});

check("PGRST205 é tabela ausente", () => {
  assert.equal(classifyRest(404, { code: "PGRST205" }), "missing_table");
});

check("401 é RLS, não é ausência", () => {
  assert.equal(classifyRest(401, { code: "42501" }), "rls_protected");
});

check("OPTIONS 404 é função ausente", () => {
  assert.equal(classifyEdge(404), "missing_function");
});

check("POST é recusado antes do fetch", () => {
  assert.throws(() => assertReadOnlyMethod("POST"), /recusa o método POST/);
  const guarded = createGuardedFetch(() => {
    throw new Error("fetch não deveria rodar");
  });
  assert.throws(() => guarded("https://example.test", { method: "POST", body: "{}" }), /recusa o método POST/);
});

check("PATCH e DELETE também", () => {
  assert.throws(() => assertReadOnlyMethod("PATCH"), /PATCH/);
  assert.throws(() => assertReadOnlyMethod("DELETE"), /DELETE/);
});

const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
const servicePayload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
const anonPayload = Buffer.from(JSON.stringify({ role: "anon" })).toString("base64url");

const manifest = {
  origin: "https://example.test",
  columns: [{ table: "profiles", column: "instruction_locale", gated: false }],
  rpcs: [{ name: "search_public_profiles", gated: true }],
  edges: [{ name: "commit-placement", gated: false }],
};

function jsonResponse(status, body, headers = {}) {
  return {
    status,
    text: async () => (body == null ? "" : JSON.stringify(body)),
    headers,
  };
}

const pending = [];
function later(name, fn) {
  pending.push(fn().then(
    () => console.log(`ok: ${name}`),
    (error) => {
      failures += 1;
      console.error(`FALHOU: ${name}`);
      console.error(error instanceof Error ? error.stack || error.message : error);
    }
  ));
}

later("sem URL ou chave o runner recusa", async () => {
  await assert.rejects(
    () => runSchemaHealth({ baseUrl: "", anonKey: "x", manifest, fetchImpl: async () => jsonResponse(200, []) }),
    /exige SUPABASE_URL/
  );
});

later("service_role é recusada", async () => {
  await assert.rejects(
    () =>
      runSchemaHealth({
        baseUrl: "https://example.test",
        anonKey: `${header}.${servicePayload}.x`,
        manifest,
        fetchImpl: async () => jsonResponse(200, []),
      }),
    /service_role/
  );
});

later("coluna ausente sem gate falha; RPC gated é aviso; função 404 falha", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, method: init.method, body: init.body });
    if (url.includes("/rest/v1/profiles")) return jsonResponse(400, { code: "42703" });
    if (url.endsWith("/rest/v1/")) return jsonResponse(200, { paths: {} });
    if (url.includes("/functions/v1/")) return jsonResponse(404, {});
    throw new Error(`url inesperada ${url}`);
  };
  const result = await runSchemaHealth({
    baseUrl: "https://example.test",
    anonKey: `${header}.${anonPayload}.x`,
    manifest,
    fetchImpl,
  });
  assert.equal(result.ok, false);
  assert.deepEqual(result.blocking.sort(), ["commit-placement", "profiles.instruction_locale"]);
  assert.equal(result.rows.find((row) => row.name === "search_public_profiles").state, "missing_rpc");
  assert.ok(calls.every((call) => call.body == null));
  assert.ok(calls.every((call) => ["GET", "OPTIONS"].includes(call.method)));
});

await Promise.all(pending);
if (failures) process.exit(1);
console.log("OK: test:schema-health");
