import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { localMigrationFiles } from "./migration-drift.mjs";
import { LONGYU_EDGE_FUNCTIONS, verifyJwtForSlug, readSupabaseConfig } from "./edge-functions.mjs";

export function sha256Buffer(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

export function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

export function walkFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else acc.push(full);
  }
  return acc;
}

export function buildMigrationManifest(root) {
  const files = localMigrationFiles(root);
  return {
    frozen_at: "2026-08-28",
    remessa: "V4.7.8",
    rebaseline: "Edit this file in the same PR that intentionally changes a frozen migration. CI fails on silent hash drift.",
    migrations: files.map((row) => ({
      path: `supabase/migrations/${row.file}`,
      version: row.version,
      name: row.name,
      sha256: row.sha256,
      status: "FROZEN",
    })),
  };
}

export function loadMigrationManifest(root) {
  const full = path.join(root, "docs/backend/migration-manifest.json");
  return JSON.parse(fs.readFileSync(full, "utf8"));
}

export function assertFrozenMigrations(root) {
  const files = localMigrationFiles(root);
  const manifest = loadMigrationManifest(root);
  const errors = [];
  const byPath = new Map(manifest.migrations.map((row) => [row.path, row]));
  for (const row of files) {
    const key = `supabase/migrations/${row.file}`;
    const frozen = byPath.get(key);
    if (!frozen) {
      errors.push(`migration not in manifest (explicit add required): ${key}`);
      continue;
    }
    if (frozen.status === "FROZEN" && frozen.sha256 !== row.sha256) {
      errors.push(`FROZEN hash mismatch ${key}: manifest=${frozen.sha256} disk=${row.sha256}`);
    }
  }
  for (const frozen of manifest.migrations) {
    const disk = path.join(root, frozen.path);
    if (!fs.existsSync(disk)) errors.push(`manifest path missing on disk: ${frozen.path}`);
  }
  return errors;
}

export function edgeSourceCatalog(root) {
  const configText = readSupabaseConfig();
  return LONGYU_EDGE_FUNCTIONS.map((slug) => {
    const dir = path.join(root, "supabase/functions", slug);
    const files = walkFiles(dir).sort();
    const hash = crypto.createHash("sha256");
    for (const file of files) {
      hash.update(path.relative(root, file));
      hash.update("\0");
      hash.update(fs.readFileSync(file));
      hash.update("\n");
    }
    return {
      slug,
      verify_jwt: verifyJwtForSlug(slug, configText),
      files: files.map((file) => path.relative(root, file)),
      source_sha256: hash.digest("hex"),
    };
  });
}

export const CANONICAL_SCHEMA_SQL = `
select json_build_object(
  'tables', (
    select coalesce(json_agg(json_build_object(
      'name', c.relname,
      'rls', c.relrowsecurity
    ) order by c.relname), '[]'::json)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  ),
  'columns', (
    select coalesce(json_agg(json_build_object(
      'table', table_name,
      'column', column_name,
      'type', data_type,
      'nullable', is_nullable
    ) order by table_name, column_name), '[]'::json)
    from information_schema.columns
    where table_schema = 'public'
  ),
  'indexes', (
    select coalesce(json_agg(json_build_object(
      'name', indexname,
      'table', tablename,
      'def', indexdef
    ) order by tablename, indexname), '[]'::json)
    from pg_indexes
    where schemaname = 'public'
  ),
  'policies', (
    select coalesce(json_agg(json_build_object(
      'table', tablename,
      'name', policyname,
      'cmd', cmd,
      'roles', roles
    ) order by tablename, policyname), '[]'::json)
    from pg_policies
    where schemaname = 'public'
  ),
  'functions', (
    select coalesce(json_agg(json_build_object(
      'name', p.proname,
      'args', pg_get_function_identity_arguments(p.oid),
      'definer', p.prosecdef
    ) order by p.proname, pg_get_function_identity_arguments(p.oid)), '[]'::json)
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prokind = 'f'
  ),
  'grants', (
    select coalesce(json_agg(json_build_object(
      'table', table_name,
      'grantee', grantee,
      'privilege', privilege_type
    ) order by table_name, grantee, privilege_type), '[]'::json)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and grantee in ('anon', 'authenticated', 'service_role')
  )
);
`;

export function hashCanonicalSchema(payload) {
  const normalized = JSON.stringify(payload);
  return sha256Buffer(normalized);
}

export function normalizeRpcArgs(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/timestamp with time zone/g, "timestamptz")
    .replace(/\s+/g, " ")
    .trim();
}

export function compareRpcContract(liveFunctions, expected) {
  const errors = [];
  const byName = new Map();
  for (const row of liveFunctions ?? []) {
    const list = byName.get(row.name) ?? [];
    list.push(row);
    byName.set(row.name, list);
  }
  for (const rpc of expected) {
    const rows = byName.get(rpc.name) ?? [];
    if (!rows.length) {
      errors.push(`RPC missing: ${rpc.name}`);
      continue;
    }
    if (rpc.args == null || rpc.args === "") continue;
    const expectedArgs = normalizeRpcArgs(rpc.args);
    const match = rows.some((row) => normalizeRpcArgs(row.args) === expectedArgs);
    if (!match) {
      errors.push(
        `RPC signature drift ${rpc.name}: expected [${rpc.args}] live=[${rows.map((row) => row.args).join(" | ")}]`
      );
    }
  }
  return errors;
}
