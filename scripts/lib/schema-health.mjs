/**
 * Health check de schema. Só GET, HEAD e OPTIONS. Sem corpo. Sem service_role.
 * A classificação mora aqui para o teste simular o fetch.
 */

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export function assertReadOnlyMethod(method) {
  const normalized = String(method || "GET").toUpperCase();
  if (!READ_METHODS.has(normalized)) {
    throw new Error(`schema-health recusa o método ${normalized}`);
  }
  return normalized;
}

export function assertAnonKey(key) {
  const value = String(key || "").trim();
  if (!value) throw new Error("schema-health exige SUPABASE_URL e SUPABASE_ANON_KEY (ou VITE_*)");
  const role = jwtRole(value);
  if (role === "service_role") throw new Error("schema-health recusa chave service_role");
  return value;
}

function jwtRole(key) {
  const parts = key.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

export function createGuardedFetch(fetchImpl) {
  return (url, init = {}) => {
    const method = assertReadOnlyMethod(init.method || "GET");
    if (init.body != null) throw new Error("schema-health não envia corpo");
    return fetchImpl(url, { ...init, method });
  };
}

export function classifyRest(status, body) {
  const code = body && typeof body === "object" ? body.code : undefined;
  if (status === 200 || status === 204) return "ok";
  if (status === 400 && code === "42703") return "missing_column";
  if (status === 404 || code === "PGRST205") return "missing_table";
  if (status === 401 || status === 403) return "rls_protected";
  return "unexpected";
}

export function classifyEdge(status) {
  if (status === 404) return "missing_function";
  if (status === 200 || status === 204) return "ok";
  return "unexpected";
}

function missing(kind) {
  return kind === "missing_column" || kind === "missing_table" || kind === "missing_function" || kind === "missing_rpc";
}

export function pgProcQuery(name) {
  return (
    "select n.nspname, p.proname from pg_proc p " +
    "join pg_namespace n on n.oid = p.pronamespace " +
    `where n.nspname = 'public' and p.proname = '${name.replace(/'/g, "''")}';`
  );
}

async function readJson(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function runSchemaHealth({ baseUrl, anonKey, manifest, fetchImpl, origin }) {
  const url = String(baseUrl || "").replace(/\/$/, "");
  const key = assertAnonKey(anonKey);
  if (!url) throw new Error("schema-health exige SUPABASE_URL e SUPABASE_ANON_KEY (ou VITE_*)");
  const guarded = createGuardedFetch(fetchImpl);
  const headers = {
    apikey: key,
    authorization: `Bearer ${key}`,
    accept: "application/json",
  };
  const rows = [];

  for (const item of manifest.columns) {
    const response = await guarded(
      `${url}/rest/v1/${item.table}?select=${encodeURIComponent(item.column)}&limit=0`,
      { method: "GET", headers }
    );
    const body = await readJson(response);
    const state = classifyRest(response.status, body);
    rows.push({
      kind: "column",
      name: `${item.table}.${item.column}`,
      gated: Boolean(item.gated),
      state,
      http: response.status,
    });
  }

  const specResponse = await guarded(`${url}/rest/v1/`, {
    method: "GET",
    headers: { ...headers, accept: "application/openapi+json" },
  });
  const spec = specResponse.status === 200 ? await readJson(specResponse) : null;
  const paths = spec && spec.paths ? spec.paths : null;

  for (const item of manifest.rpcs) {
    if (!paths) {
      rows.push({
        kind: "rpc",
        name: item.name,
        gated: Boolean(item.gated),
        state: "not_verifiable",
        http: specResponse.status,
        sql: pgProcQuery(item.name),
      });
      continue;
    }
    const present = Object.prototype.hasOwnProperty.call(paths, `/rpc/${item.name}`);
    rows.push({
      kind: "rpc",
      name: item.name,
      gated: Boolean(item.gated),
      state: present ? "ok" : "missing_rpc",
      http: specResponse.status,
    });
  }

  for (const item of manifest.edges) {
    const response = await guarded(`${url}/functions/v1/${item.name}`, {
      method: "OPTIONS",
      headers: { origin: origin || manifest.origin, accept: "application/json" },
    });
    rows.push({
      kind: "edge",
      name: item.name,
      gated: Boolean(item.gated),
      state: classifyEdge(response.status),
      http: response.status,
    });
  }

  const blocking = rows.filter((row) => !row.gated && missing(row.state));
  return { rows, ok: blocking.length === 0, blocking: blocking.map((row) => row.name) };
}

export function formatTable(result) {
  const lines = ["estado        gated  tipo    nome"];
  for (const row of result.rows) {
    lines.push(
      `${row.state.padEnd(14)} ${row.gated ? "sim" : "não"}    ${row.kind.padEnd(6)}  ${row.name}`
    );
    if (row.sql) lines.push(`  sql: ${row.sql}`);
  }
  if (!result.ok) lines.push(`faltando sem gate: ${result.blocking.join(", ")}`);
  return lines.join("\n");
}
