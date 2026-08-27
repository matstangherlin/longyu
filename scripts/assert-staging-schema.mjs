/**
 * STG-006 — afirma schema no staging isolado. Recusa produção e atomurus.
 * Sem ACTIVE_HEALTHY não envia SQL.
 */
import process from "node:process";
import { mergedEnv } from "./lib/env-local.mjs";
import { fetchSupabaseProject, queryStagingSql } from "./lib/staging-api.mjs";
import {
  V476_REQUIRED_PROFILE_COLUMNS,
  V476_REQUIRED_TABLES,
} from "./lib/v476-constants.mjs";
import {
  StagingGuardError,
  failClosed,
  requireHealthyStagingStatus,
  requireStagingProjectId,
} from "./lib/staging-guard.mjs";

const IDENT = /^[a-z_][a-z0-9_]*$/;

function sqlStringList(values, label) {
  const safe = [];
  for (const value of values) {
    if (!IDENT.test(value)) {
      throw new StagingGuardError(`STG-006 identificador inválido em ${label}`);
    }
    safe.push(`'${value}'`);
  }
  return safe.join(", ");
}

function asList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item));
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map((item) => String(item)) : [];
    } catch {
      return [];
    }
  }
  return [];
}

const env = mergedEnv();
const token = String(env.SUPABASE_ACCESS_TOKEN ?? "").trim();

try {
  const stagingId = requireStagingProjectId(env);
  if (!token) {
    throw new StagingGuardError(
      "STG-006 BLOCKED: SUPABASE_ACCESS_TOKEN ausente. Schema live não verificado."
    );
  }
  const project = await fetchSupabaseProject(token, stagingId);
  requireHealthyStagingStatus(project.status, stagingId);

  const tableList = sqlStringList(V476_REQUIRED_TABLES, "tables");
  const columnList = sqlStringList(V476_REQUIRED_PROFILE_COLUMNS, "columns");
  const query = `
    select
      (select coalesce(json_agg(table_name order by table_name), '[]'::json)
         from information_schema.tables
        where table_schema = 'public'
          and table_name in (${tableList})) as tables,
      (select coalesce(json_agg(column_name order by column_name), '[]'::json)
         from information_schema.columns
        where table_schema = 'public'
          and table_name = 'profiles'
          and column_name in (${columnList})) as profile_columns
  `;
  const rows = await queryStagingSql(token, stagingId, query);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const tables = asList(row?.tables);
  const columns = asList(row?.profile_columns);
  const missingTables = V476_REQUIRED_TABLES.filter((name) => !tables.includes(name));
  const missingColumns = V476_REQUIRED_PROFILE_COLUMNS.filter((name) => !columns.includes(name));
  if (missingTables.length || missingColumns.length) {
    throw new StagingGuardError(
      `STG-006 FAIL: ausentes tables=[${missingTables.join(",")}] columns=[${missingColumns.join(",")}]`
    );
  }
  console.log("STG-006 tables=PASS");
  console.log("STG-006 profiles_columns=PASS");
  console.log("OK: STG-006 schema assertions.");
} catch (error) {
  failClosed(error);
}
