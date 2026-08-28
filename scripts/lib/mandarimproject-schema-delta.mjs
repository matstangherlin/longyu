/**
 * Read-only EXPECTED_REPO_STATE vs CURRENT_MANDARIMPROJECT_STATE.
 * Never apply this as DDL. Never treat ephemeral PASS as production apply.
 */
import { LONGYU_EDGE_FUNCTIONS } from "./edge-functions.mjs";
import {
  MANDARIMPROJECT_MISSING_ECONOMY_COLUMNS,
  MANDARIMPROJECT_MISSING_PROFILE_COLUMNS,
  MANDARIMPROJECT_MISSING_RPCS,
  MANDARIMPROJECT_MISSING_TABLES,
  MANDARIMPROJECT_READONLY_CAPTURED_AT,
  MANDARIMPROJECT_READONLY_EDGES,
  MANDARIMPROJECT_READONLY_MIGRATIONS,
} from "./mandarimproject-readonly-snapshot.mjs";
import { V476_PRODUCTION_WATERMARK } from "./v476-constants.mjs";

export const MANDARIMPROJECT_MISSING_EDGES = [
  "commit-placement",
  "finalize-onboarding",
  "submit-business-lead",
];

export const MANDARIMPROJECT_GRANT_DELTA = [
  {
    table: "profiles",
    class: "GRANT_DIFFERENT",
    production: "anon ALL; authenticated ALL including DELETE/TRUNCATE",
    planned: "anon none; authenticated SELECT/INSERT/UPDATE",
  },
  {
    table: "user_progress",
    class: "GRANT_DIFFERENT",
    production: "anon ALL; authenticated ALL including DELETE/TRUNCATE",
    planned: "anon none; authenticated SELECT/INSERT/UPDATE",
  },
  {
    table: "user_srs",
    class: "GRANT_DIFFERENT",
    production: "anon ALL; authenticated ALL including DELETE/TRUNCATE",
    planned: "anon none; authenticated SELECT/INSERT/UPDATE",
  },
  {
    table: "subscriptions",
    class: "GRANT_DIFFERENT",
    production: "anon ALL; authenticated ALL",
    planned: "anon none; authenticated SELECT",
  },
  {
    table: "transactions",
    class: "GRANT_DIFFERENT",
    production: "anon ALL; authenticated ALL",
    planned: "anon none; authenticated SELECT",
  },
  {
    table: "user_economy",
    class: "GRANT_DIFFERENT",
    production: "anon ALL; authenticated SELECT/REFERENCES/TRIGGER/TRUNCATE (writes already closed)",
    planned: "anon none; authenticated SELECT (no TRUNCATE)",
  },
];

export function describeProductionDelta() {
  const prodSlugs = new Set(MANDARIMPROJECT_READONLY_EDGES.map((row) => row.slug));
  const edges = LONGYU_EDGE_FUNCTIONS.map((slug) => {
    if (MANDARIMPROJECT_MISSING_EDGES.includes(slug)) {
      return { slug, class: "MISSING_IN_PRODUCTION" };
    }
    if (prodSlugs.has(slug)) return { slug, class: "MATCH_SLUG" };
    return { slug, class: "MISSING_IN_PRODUCTION" };
  });
  return {
    captured_at: MANDARIMPROJECT_READONLY_CAPTURED_AT,
    production_watermark: V476_PRODUCTION_WATERMARK,
    remote_migration_count: MANDARIMPROJECT_READONLY_MIGRATIONS.length,
    differences: [
      ...MANDARIMPROJECT_MISSING_TABLES.map((name) => ({ class: "TABLE_MISSING", name })),
      ...MANDARIMPROJECT_MISSING_PROFILE_COLUMNS.map((name) => ({
        class: "COLUMN_MISSING",
        name: `profiles.${name}`,
      })),
      ...MANDARIMPROJECT_MISSING_ECONOMY_COLUMNS.map((name) => ({
        class: "COLUMN_MISSING",
        name: `user_economy.${name}`,
      })),
      ...MANDARIMPROJECT_MISSING_RPCS.map((name) => ({ class: "FUNCTION_MISSING", name })),
      ...MANDARIMPROJECT_GRANT_DELTA,
      ...edges.filter((row) => row.class !== "MATCH_SLUG").map((row) => ({
        class: "EDGE_MISSING",
        name: row.slug,
      })),
    ],
    extra_production_object: [],
    edges,
    writes: "ZERO this remessa",
  };
}
